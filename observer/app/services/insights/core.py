import json
import logging
from typing import Any, Dict, List, Optional, cast
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.emotion_definition import EmotionDefinition
from app.services.clinical_alert_service import ClinicalAlertService
from app.services.emotion_resolver import EmotionResolver

# Sub-modules
from app.services.insights import clinical, prosody, warm
from app.services.insights.utils import analyze_vac_coordinates
from app.services.recommendation_engine import RecommendationEngine
from app.services.session_analytics_service import SessionAnalyticsService

logger = logging.getLogger(__name__)


class InsightGenerator:
    # pylint: disable=too-many-locals,too-many-branches,too-many-statements
    """Generate multi-modal emotional insights (Refactored Modular Version)."""

    def __init__(self, db: AsyncSession):
        """Initialize InsightGenerator."""
        self.db = db
        self.recommendation_engine = RecommendationEngine(db)

    async def generate_insights(
        self,
        emotion_name: str,
        vac_data: Dict[str, float],
        confidence: float,
        tone_mode: str = "warm",
        prosody_data: Optional[Dict[str, Any]] = None,
        reasoning: Optional[str] = None,
        use_emotion_mapping: bool = True,
        session_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate comprehensive insights from analysis data.

        Args:
            emotion_name: Detected emotion name
            vac_data: VAC coordinates {valence, arousal, connection}
            confidence: Confidence score (0-1)
            tone_mode: 'clinical' or 'warm'
            prosody_data: Optional voice prosody features
            reasoning: Optional reasoning from semantic analyzer
            use_emotion_mapping: If True, use VAC-based fallback for unmapped emotions
            session_id: Optional chat session ID for clinical alert tracking

        Returns:
            Dictionary containing structured insights
        """
        # ═══════════════════════════════════════════════════════════════════════
        # STEP 1: Resolve emotion name to full emotion definition
        # ═══════════════════════════════════════════════════════════════════════
        emotion = await self._get_emotion_details(
            emotion_name, vac_coords=vac_data, use_emotion_mapping=use_emotion_mapping
        )

        # Fallback if emotion can't be resolved
        if not emotion:
            return self._generate_fallback_insights(emotion_name, vac_data, tone_mode)

        # ═══════════════════════════════════════════════════════════════════════
        # STEP 2: Get message count for alternating invitation patterns
        # ═══════════════════════════════════════════════════════════════════════
        message_count = 1
        if session_id:
            try:
                analytics_service = SessionAnalyticsService(self.db)
                session_analytics = await analytics_service.get_or_create(session_id)
                message_count = session_analytics.emotion_count or 1
            except Exception as e:
                logger.warning("Could not get message count: %s", e)
                message_count = 1

        # ═══════════════════════════════════════════════════════════════════════
        # STEP 3: Build base insights structure
        # ═══════════════════════════════════════════════════════════════════════
        insights = {
            "structured": True,  # Frontend detection flag (new structured format)
            "mode": tone_mode,
            "emotion": emotion_name,
            "category": emotion.get("category"),
            "vac": vac_data,
            "confidence": confidence,
        }

        # ═══════════════════════════════════════════════════════════════════════
        # STEP 4: Generate tone-appropriate insights (WARM vs CLINICAL)
        # ═══════════════════════════════════════════════════════════════════════
        if tone_mode == "warm":
            # Generate structured warm insights
            warm_structured = warm.generate_warm_summary_structured(
                emotion, vac_data, confidence, prosody_data, reasoning, message_count
            )
            insights.update(warm_structured)

            # Legacy format (backwards compatibility)
            insights["summary"] = warm.generate_warm_summary_legacy(
                emotion, vac_data, confidence, prosody_data, reasoning
            )
        else:
            # Clinical mode - structured format
            clinical_structured = clinical.generate_clinical_summary_structured(
                emotion, vac_data, confidence, prosody_data, reasoning, message_count
            )
            insights.update(clinical_structured)

            # Legacy format (backwards compatibility)
            insights["summary"] = clinical.generate_clinical_summary_legacy(
                emotion, vac_data, confidence, prosody_data, reasoning
            )

        # ═══════════════════════════════════════════════════════════════════════
        # STEP 5: Add detailed VAC coordinate analysis
        # ═══════════════════════════════════════════════════════════════════════
        insights["vac_analysis"] = analyze_vac_coordinates(vac_data)

        # ═══════════════════════════════════════════════════════════════════════
        # STEP 6: Add prosody analysis if voice input available
        # ═══════════════════════════════════════════════════════════════════════
        if prosody_data:
            insights["prosody_analysis"] = prosody.analyze_prosody_features(prosody_data)
            insights["voice_content_correlation"] = prosody.analyze_voice_content_correlation(
                prosody_data, vac_data, tone_mode
            )

        # ═══════════════════════════════════════════════════════════════════════
        # STEP 7: Get personalized recommendations
        # ═══════════════════════════════════════════════════════════════════════
        try:
            emotion_id = emotion.get("id")
            if emotion_id:
                recommendations = await self.recommendation_engine.get_recommendations(
                    context="healing", current_emotion_id=emotion_id, limit=3
                )
                insights["recommendations"] = self._format_recommendations(
                    recommendations, tone_mode
                )
            else:
                insights["recommendations"] = []
        except Exception as e:
            logger.warning("Failed to get recommendations: %s", e)
            insights["recommendations"] = []

        # ═══════════════════════════════════════════════════════════════════════
        # STEP 8: Add contextual guidance
        # ═══════════════════════════════════════════════════════════════════════
        insights["guidance"] = self._generate_guidance(emotion, vac_data, tone_mode)

        # ═══════════════════════════════════════════════════════════════════════
        # STEP 9: Evaluate clinical alerts (if session_id provided)
        # ═══════════════════════════════════════════════════════════════════════
        alerts = []
        if session_id:
            try:
                alert_service = ClinicalAlertService(self.db)
                alerts = await alert_service.evaluate_alerts(
                    session_id=session_id,
                    vac_data=vac_data,
                    prosody_data=prosody_data,
                    confidence=confidence,
                    insights=insights,
                )

                # Add to insights for immediate display
                insights["clinical_alerts"] = [alert.to_dict() for alert in alerts]
                insights["overall_status"] = alert_service.determine_overall_status(alerts)
                logger.info(
                    "Generated %d clinical alerts for session %s",
                    len(alerts),
                    session_id,
                )
            except Exception as e:  # pylint: disable=broad-exception-caught
                logger.error("Failed to generate clinical alerts: %s", e, exc_info=True)
                insights["clinical_alerts"] = []
                insights["overall_status"] = "stable"

            # ═══════════════════════════════════════════════════════════════════
            # STEP 10: Update session analytics (real-time metrics)
            # ═══════════════════════════════════════════════════════════════════
            try:
                analytics_service = SessionAnalyticsService(self.db)
                session_analytics = await analytics_service.update_metrics(
                    session_id=session_id,
                    emotion_name=emotion_name,
                    category=cast(str, insights["category"]),
                    vac_data=vac_data,
                    confidence=confidence,
                    alerts=alerts,
                )

                insights["session_analytics"] = session_analytics.to_dict()
                logger.info("Updated session analytics for %s", session_id)
            except Exception as e:  # pylint: disable=broad-exception-caught
                logger.error("Failed to update session analytics: %s", e, exc_info=True)

        return insights

    async def _get_emotion_details(
        self,
        emotion_name: str,
        vac_coords: Optional[Dict[str, float]] = None,
        use_emotion_mapping: bool = True,
    ) -> Optional[Dict[str, Any]]:
        """Get emotion details from collection using EmotionResolver."""
        if not use_emotion_mapping:
            # Simple exact match only
            stmt = select(EmotionDefinition).where(
                EmotionDefinition.emotion_name.ilike(f"%{emotion_name}%")
            )
            result = await self.db.execute(stmt)
            emotion = result.scalar_one_or_none()

            if emotion:
                vac_list = None
                if emotion.vac_vector is not None:
                    if isinstance(emotion.vac_vector, str):
                        vac_list = json.loads(emotion.vac_vector)
                    else:
                        vac_list = emotion.vac_vector

                return {
                    "id": emotion.id,
                    "name": emotion.emotion_name,
                    "category": emotion.category,
                    "definition": emotion.definition,
                    "vac": (
                        [float(vac_list[0]), float(vac_list[1]), float(vac_list[2])]
                        if vac_list is not None
                        else None
                    ),
                    "matched_by": "exact",
                }
            return None

        # Use EmotionResolver for comprehensive matching
        resolver = EmotionResolver(self.db)
        mapping = await resolver.resolve_emotion(emotion_name, vac=vac_coords)

        if mapping.emotion_name:
            # Fetch full emotion details
            try:
                emotion_id = UUID(mapping.emotion_id)
                stmt = select(EmotionDefinition).where(EmotionDefinition.id == emotion_id)
                result = await self.db.execute(stmt)
                emotion = result.scalar_one_or_none()

                if emotion:
                    return {
                        "id": emotion.id,
                        "name": emotion.emotion_name,
                        "category": emotion.category,
                        "definition": emotion.definition,
                        "vac": mapping.vac,
                        "matched_by": mapping.match_method,
                        "original_emotion": (
                            mapping.original_name if mapping.match_method != "exact" else None
                        ),
                        "match_confidence": mapping.match_confidence,
                    }
            except Exception as e:  # pylint: disable=broad-exception-caught
                logger.error("Error fetching emotion details: %s", e)

        return None

    def _format_recommendations(
        self, recommendations: Dict[str, Any], tone_mode: str
    ) -> List[Dict[str, Any]]:
        """Format recommendations for display."""
        formatted = []

        # Get similar emotions
        similar = recommendations.get("similar_emotions", [])
        if similar:
            formatted.append(
                {
                    "type": "similar_emotions",
                    "title": (
                        "Related Emotions"
                        if tone_mode == "clinical"
                        else "You might also be feeling..."
                    ),
                    "items": [
                        {
                            "name": emotion["name"],
                            "category": emotion["category"],
                            "distance": emotion.get("distance", 0),
                        }
                        for emotion in similar[:3]
                    ],
                }
            )

        # Get curated journeys
        journeys = recommendations.get("curated_journeys", [])
        if journeys:
            formatted.append(
                {
                    "type": "journeys",
                    "title": (
                        "Therapeutic Paths" if tone_mode == "clinical" else "Paths to explore..."
                    ),
                    "items": [
                        {
                            "from": journey["from"]["name"],
                            "to": journey["to"]["name"],
                            "description": journey.get("description", ""),
                        }
                        for journey in journeys[:2]
                    ],
                }
            )

        return formatted

    def _generate_guidance(
        self, emotion: Dict[str, Any], vac_data: Dict[str, float], tone_mode: str
    ) -> str:
        """Generate contextual guidance."""
        valence = vac_data.get("valence", 0.0)
        arousal = vac_data.get("arousal", 0.0)
        connection = vac_data.get("connection", 0.0)

        if tone_mode == "clinical":
            guidance = f"Emotional state analysis indicates {emotion['name']} with "

            if arousal > 0.5:
                guidance += "high arousal suggesting activation. Consider grounding techniques. "
            elif arousal < -0.3:
                guidance += "low arousal suggesting deactivation. Consider energizing activities. "

            if connection < -0.3:
                guidance += "Disconnection pattern detected - social support may be beneficial."
            elif connection > 0.5:
                guidance += "Strong connection orientation - leverage social resources."
        else:
            guidance = ""

            if arousal > 0.7 and valence < 0:
                guidance = (
                    "When emotions feel this intense, it can help to take a few deep breaths and "
                    "ground yourself in the present moment."
                )
            elif arousal < -0.5:
                guidance = (
                    "Low energy can be a signal to rest, or sometimes it means we need gentle "
                    "movement or connection with others."
                )
            elif connection < -0.3:
                guidance = (
                    "Feeling disconnected is really hard. You don't have to face this alone - "
                    "consider reaching out to someone you trust."
                )
            elif valence > 0.5:
                guidance = (
                    "This is a positive state - take a moment to notice and appreciate what's "
                    "contributing to these feelings."
                )
            else:
                guidance = (
                    "Whatever you're feeling right now is valid. Take your time exploring what "
                    "this emotion is telling you."
                )

        return guidance

    def _generate_fallback_insights(
        self, emotion_name: str, vac_data: Dict[str, float], tone_mode: str
    ) -> Dict[str, Any]:
        """Generate fallback insights when emotion not found in atlas."""
        return {
            "emotion": emotion_name,
            "category": "Unknown",
            "vac": vac_data,
            "confidence": 0.0,
            "summary": (
                f"Detected emotion '{emotion_name}' but unable to find detailed information in "
                "canonical definitions."
            ),
            "vac_analysis": analyze_vac_coordinates(vac_data),
            "recommendations": [],
            "guidance": "Consider exploring the emotion collection to find related emotions.",
        }
