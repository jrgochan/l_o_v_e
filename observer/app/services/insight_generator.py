"""Insight Generator Service.

Generates natural language insights from emotional analysis data, supporting dual
communication modes (warm/clinical) and integrating VAC coordinates, voice prosody,
and therapeutic recommendations. Central to Observer's human-centered emotional guidance.

Dual Communication Modes:

    Warm Mode (Default):
        - Empathetic, conversational language
        - "I notice..." vs "Analysis indicates..."
        - Validation and normalization
        - Gentle suggestions vs directives
        - Examples and metaphors
        - Used for: Consumer app, self-exploration

    Clinical Mode:
        - Professional, structured language
        - Objective observations
        - Risk assessments
        - Evidence-based recommendations
        - Diagnostic language when appropriate
        - Used for: Therapist dashboards, clinical tools

Insight Generation Architecture:

    For each emotional state, generate::

        1. Opening (Warm or Clinical)
           - Warm: "I sense you're experiencing anxiety right now, and that's completely valid"
           - Clinical: "High confidence detection of Anxiety (92%) within category"

        2. Emotion Understanding
           - Warm: Accessible explanation with validation
           - Clinical: Definition, diagnostic criteria, differential

        3. VAC Interpretation
           - Warm: "Your voice has a lot of intensity right now"
           - Clinical: "Arousal: +0.8 (high activation state)"

        4. Voice Observations (if prosody available)
           - Warm: Natural language observations
           - Clinical: Structured metrics with clinical thresholds

        5. Gentle Invitations / Recommendations
           - Warm: Questions + suggestions ("You might try...")
           - Clinical: Evidence-based interventions with citations

        6. Guidance
           - Warm: Encouraging, validating closure
           - Clinical: Clinical recommendations, risk notes

Deep Feeling Mode:

    Extended exploration with layered depth::

        Depth 0: Surface emotion
        "What are you feeling right now?"

        Depth 1: Underlying layers
        "What might be underneath this feeling?"

        Depth 2: Core needs/values
        "What does this emotion need from you?"

        Depth 3: Integration
        "What have you learned from exploring this?"

    Each depth unlocks different question types and guidance strategies.

Prosody Integration:

    Voice features inform insights::

        High energy + High pitch → "Your voice has tension and intensity"
        Low energy + Monotone → "Your voice sounds flat - sometimes happens when overwhelmed"
        Rapid speech → "You're speaking quickly - thoughts might be racing"

        Voice-Content Correlation:
        - Aligned: "Voice and content match"
        - Discrepant: "Your voice shows more intensity than words suggest"

Example Usage:

    Generate warm insights::

        generator = InsightGenerator(db_session)

        insights = await generator.generate_insights(
            emotion_name="Anxiety",
            vac_data={"valence": -0.4, "arousal": 0.8, "connection": -0.2},
            confidence=0.92,
            tone_mode='warm',
            prosody_data={
                "pitch_mean": 185,
                "energy": 0.75,
                "rate": 5.5
            }
        )

        print(insights["opening"])
        # "I sense you're experiencing anxiety right now, and I want you to
        #  know that's completely valid. This is your system trying to protect you."

        print(insights["gentle_invitations"][0])
        # {"type": "reflection", "text": "What would it feel like to slow down..."}

    Generate clinical insights::

        insights = await generator.generate_insights(
            emotion_name="Anxiety",
            vac_data={"valence": -0.4, "arousal": 0.8, "connection": -0.2},
            confidence=0.92,
            tone_mode='clinical',
            prosody_data=prosody_data,
            session_id="session123"  # Enables clinical alerts
        )

        print(insights["vac_assessment"])
        # {
        #   "quadrant": "Quadrant II: High Arousal, Negative Valence",
        #   "clinical_note": "Activated negative affect - monitor for anxiety",
        #   "risk_indicators": ["High arousal + negative valence (potential crisis)"]
        # }

Clinical Alert Integration:

    When session_id provided, evaluates clinical alerts::

        - Distress level (VAC-based)
        - Voice quality concerns (prosody-based)
        - Voice-content discrepancy
        - Confidence level (low confidence may indicate confusion)

        Alerts stored in clinical_alerts table for therapist review

Session Analytics:

    Updates session metrics in real-time::

        - Message count
        - Average VAC coordinates
        - Dominant emotion
        - Elasticity/rigidity trends

        Used for: Session summaries, therapist dashboards

Performance:
    - Warm insight generation: ~10-20ms (pure logic)
    - Clinical insight generation: ~15-25ms (includes queries)
    - With clinical alerts: ~30-40ms (additional DB writes)
    - With session analytics: ~40-50ms total
    - Bottleneck: Database queries for recommendations

Integration Points:

    Used by::

        - Chat Service: Generate insights for each message
        - State API: Provide insights when storing state
        - WebSocket: Real-time insight streaming
        - Experience UI: Display insights to user

    Calls::

        - RecommendationEngine: Get similar emotions, journeys
        - ClinicalAlertService: Evaluate and store alerts
        - SessionAnalyticsService: Update session metrics
        - EmotionResolver: Map emotion names to atlas

References:
    - Motivational Interviewing: Miller & Rollnick (2012)
    - Trauma-informed language: Van der Kolk (2014)
    - Clinical documentation standards: APA (2013)
    - See docs/modules/observer/senior-developers/05-websocket-realtime.md
"""

import logging
from typing import Any, Dict, List, Optional, cast

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.emotion_definition import EmotionDefinition
from app.services.emotion_resolver import EmotionResolver
from app.services.clinical_alert_service import ClinicalAlertService
from app.services.recommendation_engine import RecommendationEngine
from app.services.session_analytics_service import SessionAnalyticsService

logger = logging.getLogger(__name__)


class InsightGenerator:
    """Generate multi-modal emotional insights."""

    def __init__(self, db: AsyncSession):
        """Initialize InsightGenerator."""
        self.db = db
        self.recommendation_engine = RecommendationEngine(db)

    # ============================================================================
    # WARM MODE - Structured Insight Generation Helpers
    # ============================================================================

    def _generate_warm_opening(self, emotion_name: str, valence: float) -> str:
        """Generate empathetic opening with validation."""
        emotion_lower = emotion_name.lower()

        # Validation phrase
        if valence < -0.3:
            validation = "and I want you to know that's completely valid"
        elif valence > 0.3:
            validation = "and that's wonderful"
        else:
            validation = "and that's meaningful"

        # Purpose/context
        if emotion_lower in ["anxiety", "fear", "worry"]:
            context = "This is your system trying to protect you."
        elif emotion_lower in ["sadness", "grie"]:
            context = "Sadness is how we honor what matters to us."
        elif emotion_lower in ["joy", "delight", "excitement"]:
            context = "You're experiencing something that lights you up."
        else:
            context = "This emotion is telling you something important."

        return f"I sense you're experiencing {emotion_lower} right now, {validation}. {context}"

    def _generate_voice_observations_warm(
        self, prosody_data: Dict[str, Any], vac_data: Dict[str, float]
    ) -> List[str]:
        """Generate natural language voice observations."""
        observations = []

        energy = prosody_data.get("energy", 0.5)
        pitch = prosody_data.get("pitch_mean", 150)
        rate = prosody_data.get("rate", 4.0)
        variability = prosody_data.get("pitch_std", 20)

        # Energy + Pitch combo
        if energy > 0.7 and pitch > 170:
            observations.append("Your voice has a lot of energy and tension")
        elif energy > 0.7 and pitch < 130:
            observations.append("There's power and intensity in your voice")
        elif energy < 0.3 and pitch > 170:
            observations.append("Your voice sounds soft, almost fragile")
        elif energy < 0.3:
            observations.append("There's a heaviness in your voice")

        # Speech rate
        if rate > 5.0:
            observations.append(
                "You're speaking quickly, which often happens when thoughts are racing"
            )
        elif rate < 3.0:
            observations.append(
                "You're speaking slowly and deliberately, taking your time with words"
            )

        # Variability
        if variability > 40:
            observations.append("Your voice is animated with lots of expression")
        elif variability < 15:
            observations.append(
                "Your voice sounds flat or monotone, which can happen when we're overwhelmed"
            )

        # Voice quality
        if prosody_data.get("jitter", 0) > 0.02:
            observations.append(
                "There's a tightness in your voice that suggests your body is on alert"
            )

        return observations[:4]  # Max 4

    def _get_emotion_understanding_warm(self, emotion_name: str) -> str:
        """Get accessible explanation of emotion."""
        EMOTION_UNDERSTANDING = {
            "Anxiety": "Anxiety is your mind's way of trying to protect you by preparing for potential challenges. It's exhausting, but it means you care deeply.",
            "Sadness": "Sadness is how your heart processes loss and honors what mattered. It's painful, but it's also how we integrate change.",
            "Joy": "Joy is your being's celebration of alignment - when what's happening matches what you value. It reminds you what's possible.",
            "Anger": "Anger is energy for change - it signals when boundaries are crossed or values are violated. It's trying to protect what matters to you.",
            "Fear": "Fear is your survival system activating to keep you safe. It's uncomfortable, but it shows how much you value your wellbeing.",
            "Contentment": "Contentment is your being's way of saying 'this is enough.' It's peace without needing anything to be different.",
            "Excitement": "Excitement is your body preparing for something you value - it's anticipation mixed with energy and hope.",
            "Overwhelm": "Overwhelm is your system saying 'this is too much right now.' It's a signal to slow down and simplify.",
            "Confusion": "Confusion is your mind saying 'I need more information to make sense of this.' It's uncomfortable but it's the beginning of clarity.",
        }

        return EMOTION_UNDERSTANDING.get(
            emotion_name,
            f"{emotion_name} is your emotional system responding to what's happening. It's giving you important information about your needs and values.",
        )

    def _interpret_arousal_warm(self, arousal: float) -> str:
        """Interpret arousal in relatable terms."""
        if arousal > 0.7:
            return "You're in a high-activation state - your system is revved up"
        elif arousal > 0.3:
            return "There's moderate energy moving through you - you're engaged and alert"
        elif arousal > -0.3:
            return "You're in a balanced energy state - not too activated, not too flat"
        elif arousal > -0.7:
            return "Your energy is quite low right now - you might feel tired or depleted"
        else:
            return "You're in a very low-energy state - your system might be shutting down to protect you"

    def _interpret_valence_warm(self, valence: float) -> str:
        """Interpret valence in relatable terms."""
        if valence > 0.7:
            return "This energy feels really good - there's pleasure and positivity here"
        elif valence > 0.3:
            return "This has a somewhat positive quality - things feel okay"
        elif valence > -0.3:
            return "This feels neutral or mixed - neither clearly good nor bad"
        elif valence > -0.7:
            return "This energy doesn't feel good - there's some distress or discomfort"
        else:
            return "This feels quite painful or difficult - the distress is significant"

    def _interpret_connection_warm(self, connection: float) -> str:
        """Interpret connection in relatable terms."""
        if connection > 0.7:
            return "You feel deeply connected - to yourself, others, or your values"
        elif connection > 0.3:
            return "There's a sense of connection present - you're not entirely alone in this"
        elif connection > -0.3:
            return "Connection feels neutral right now"
        elif connection > -0.7:
            return "You might feel somewhat alone or disconnected in this experience"
        else:
            return "There's significant disconnection - you might feel very alone or cut of"

    def _generate_reflection_question(self, emotion_name: str, vac_data: Dict[str, float]) -> str:
        """Generate a reflective question based on VAC state."""
        import random

        arousal = vac_data.get("arousal", 0)
        valence = vac_data.get("valence", 0)
        connection = vac_data.get("connection", 0)

        # Pick based on most salient dimension
        if abs(arousal) > max(abs(valence), abs(connection)):
            # Arousal-focused
            if arousal > 0.5:
                questions = [
                    "What would it feel like to slow down, even just for one breath?",
                    "Where in your body are you feeling this intensity?",
                    "What is this energy trying to tell you?",
                ]
            else:
                questions = [
                    "What would it take to have just a little more energy right now?",
                    "Is this low energy asking you to rest, or is it numbness protecting you?",
                    "What does this tiredness feel like in your body?",
                ]
        elif abs(connection) > abs(valence):
            # Connection-focused
            if connection < 0:
                questions = [
                    "What would connection feel like right now?",
                    "Is there someone you'd feel safe reaching out to?",
                    "What helps you feel less alone?",
                ]
            else:
                questions = [
                    "What's creating this sense of connection?",
                    "Who or what helps you feel this way?",
                    "How can you nurture this connection?",
                ]
        else:
            # Valence-focused
            if valence < 0:
                questions = [
                    "What would it be like to be gentle with yourself about feeling this way?",
                    "What do you need most in this moment?",
                    "Who or what helps when you feel like this?",
                ]
            else:
                questions = [
                    "What's contributing to this positive feeling?",
                    "How can you savor this moment?",
                    "What does this tell you about what matters to you?",
                ]

        return random.choice(questions)

    def _generate_gentle_suggestion(self, emotion_name: str, vac_data: Dict[str, float]) -> str:
        """Generate a gentle suggestion based on VAC state."""
        import random

        arousal = vac_data.get("arousal", 0)
        valence = vac_data.get("valence", 0)
        connection = vac_data.get("connection", 0)

        if abs(arousal) > max(abs(valence), abs(connection)):
            # Arousal-focused
            if arousal > 0.5:
                suggestions = [
                    "You might try placing a hand on your heart and noticing the physical sensations",
                    "Consider taking three slow breaths, making the exhale longer than the inhale",
                    "It might help to gently move your body - even just stretching or walking",
                ]
            else:
                suggestions = [
                    "You might notice what small thing could bring even a tiny bit of energy",
                    "Consider stepping outside or opening a window to change your environment",
                    "Sometimes gentle movement can help when energy is low",
                ]
        elif abs(connection) > abs(valence):
            # Connection-focused
            if connection < 0:
                suggestions = [
                    "You might reach out to someone, even just to say hello",
                    "Consider doing something that usually makes you feel connected to yourself",
                    "It might help to remember times when you did feel connected",
                ]
            else:
                suggestions = [
                    "You might share this feeling with someone who cares about you",
                    "Consider savoring this sense of connection",
                    "Notice what's contributing to feeling connected",
                ]
        else:
            # Valence-focused
            if valence < 0:
                suggestions = [
                    f"You might name this feeling out loud: 'I'm feeling {emotion_name.lower()}'",
                    "Consider writing down what you're experiencing, without judgment",
                    "It might help to remember this is temporary, even if it doesn't feel that way",
                ]
            else:
                suggestions = [
                    "You might take a moment to really notice and savor this feeling",
                    "Consider what you could do to extend or deepen this positive state",
                    "Try to notice what specifically is creating this",
                ]

        return random.choice(suggestions)

    # ============================================================================
    # CLINICAL MODE - Structured Insight Generation Helpers
    # ============================================================================

    def _generate_clinical_opening(
        self, emotion_name: str, confidence: float, category: str
    ) -> str:
        """Generate professional opening statement."""
        confidence_pct = int(confidence * 100)

        if confidence >= 0.8:
            certainty = "High confidence"
        elif confidence >= 0.6:
            certainty = "Moderate confidence"
        else:
            certainty = "Low confidence"

        return f"{certainty} detection of {emotion_name} ({confidence_pct}%) within the {category} category. Analysis indicates emotional state requires clinical assessment."

    def _generate_voice_metrics_clinical(
        self, prosody_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate structured voice metrics for clinical display."""
        metrics = []

        # Pitch metrics
        if "pitch_mean" in prosody_data:
            pitch_mean = prosody_data["pitch_mean"]
            pitch_std = prosody_data.get("pitch_std", 0)

            # Classify pitch
            if pitch_mean > 180:
                interpretation = "Elevated (potential stress indicator)"
                status = "attention"
            elif pitch_mean < 100:
                interpretation = "Depressed (potential low affect indicator)"
                status = "attention"
            else:
                interpretation = "Within normal range"
                status = "stable"

            metrics.append(
                {
                    "label": "Pitch (F0)",
                    "value": f"{pitch_mean:.1f} Hz (±{pitch_std:.1f})",
                    "interpretation": interpretation,
                    "status": status,
                }
            )

        # Energy metrics
        if "energy" in prosody_data:
            energy = prosody_data["energy"]

            if energy > 0.75:
                interpretation = "High vocal intensity"
                status = "attention"
            elif energy < 0.25:
                interpretation = "Low vocal intensity (potential flattened affect)"
                status = "warning"
            else:
                interpretation = "Appropriate vocal energy"
                status = "stable"

            metrics.append(
                {
                    "label": "Energy Level",
                    "value": f"{energy:.3f}",
                    "interpretation": interpretation,
                    "status": status,
                }
            )

        # Speech rate
        if "rate" in prosody_data:
            rate = prosody_data["rate"]

            if rate > 5.5:
                interpretation = "Accelerated speech (potential agitation)"
                status = "attention"
            elif rate < 2.5:
                interpretation = "Slowed speech (potential psychomotor retardation)"
                status = "warning"
            else:
                interpretation = "Normal speech rate"
                status = "stable"

            metrics.append(
                {
                    "label": "Speech Rate",
                    "value": f"{rate:.1f} syll/sec",
                    "interpretation": interpretation,
                    "status": status,
                }
            )

        # Voice quality metrics
        if "jitter" in prosody_data:
            jitter = prosody_data["jitter"]

            if jitter > 0.025:
                interpretation = "Elevated (potential vocal tension)"
                status = "attention"
            else:
                interpretation = "Within normal limits"
                status = "stable"

            metrics.append(
                {
                    "label": "Jitter",
                    "value": f"{jitter:.4f}",
                    "interpretation": interpretation,
                    "status": status,
                }
            )

        if "shimmer" in prosody_data:
            shimmer = prosody_data["shimmer"]

            if shimmer > 0.06:
                interpretation = "Elevated (potential voice quality concern)"
                status = "attention"
            else:
                interpretation = "Within normal limits"
                status = "stable"

            metrics.append(
                {
                    "label": "Shimmer",
                    "value": f"{shimmer:.4f}",
                    "interpretation": interpretation,
                    "status": status,
                }
            )

        return metrics

    def _generate_vac_assessment_clinical(self, vac_data: Dict[str, float]) -> Dict[str, Any]:
        """Generate clinical VAC assessment."""
        valence = vac_data["valence"]
        arousal = vac_data["arousal"]
        connection = vac_data["connection"]

        # Determine quadrant and clinical significance
        if valence > 0 and arousal > 0:
            quadrant = "Quadrant I: High Arousal, Positive Valence"
            clinical_note = "Activated positive affect - generally adaptive"
        elif valence < 0 and arousal > 0:
            quadrant = "Quadrant II: High Arousal, Negative Valence"
            clinical_note = "Activated negative affect - monitor for anxiety/agitation"
        elif valence < 0 and arousal < 0:
            quadrant = "Quadrant III: Low Arousal, Negative Valence"
            clinical_note = "Deactivated negative affect - assess for depression risk"
        else:
            quadrant = "Quadrant IV: Low Arousal, Positive Valence"
            clinical_note = "Deactivated positive affect - calm/contentment state"

        return {
            "coordinates": {
                "valence": {"value": valence, "label": self._interpret_valence(valence)},
                "arousal": {"value": arousal, "label": self._interpret_arousal(arousal)},
                "connection": {
                    "value": connection,
                    "label": self._interpret_connection(connection),
                },
            },
            "quadrant": quadrant,
            "clinical_note": clinical_note,
            "risk_indicators": self._assess_risk_indicators(vac_data),
        }

    def _assess_risk_indicators(self, vac_data: Dict[str, float]) -> List[str]:
        """Assess risk indicators from VAC data."""
        indicators = []

        arousal = vac_data["arousal"]
        valence = vac_data["valence"]
        connection = vac_data["connection"]

        if arousal > 0.75 and valence < -0.5:
            indicators.append("High arousal + negative valence (potential crisis state)")

        if arousal < -0.7 and valence < -0.5:
            indicators.append("Low energy + negative mood (depression indicators)")

        if connection < -0.6:
            indicators.append("Significant disconnection (isolation risk)")

        if abs(arousal) > 0.8:
            indicators.append("Extreme activation/deactivation detected")

        return indicators

    def _generate_clinical_recommendations(
        self, emotion_name: str, vac_data: Dict[str, float], category: str
    ) -> List[Dict[str, str]]:
        """Generate evidence-based clinical recommendations."""
        recommendations = []

        arousal = vac_data["arousal"]
        valence = vac_data["valence"]
        connection = vac_data["connection"]

        # Arousal-based interventions
        if arousal > 0.6:
            recommendations.append(
                {
                    "type": "intervention",
                    "title": "Arousal Reduction",
                    "description": "Consider grounding techniques, deep breathing exercises, or progressive muscle relaxation",
                }
            )
        elif arousal < -0.6:
            recommendations.append(
                {
                    "type": "intervention",
                    "title": "Activation Strategy",
                    "description": "Behavioral activation recommended: gentle physical activity, environmental change, or social engagement",
                }
            )

        # Valence-based interventions
        if valence < -0.5:
            recommendations.append(
                {
                    "type": "assessment",
                    "title": "Mood Assessment",
                    "description": "Consider administering PHQ-9 or similar depression screening",
                }
            )

        # Connection-based interventions
        if connection < -0.4:
            recommendations.append(
                {
                    "type": "intervention",
                    "title": "Social Connection",
                    "description": "Explore barriers to connection; consider referral to group therapy or support groups",
                }
            )

        # Emotion-specific recommendations
        if emotion_name.lower() in ["anxiety", "fear", "panic"]:
            recommendations.append(
                {
                    "type": "intervention",
                    "title": "Anxiety Management",
                    "description": "CBT techniques for anxiety; assess for panic disorder if acute symptoms present",
                }
            )
        elif emotion_name.lower() in ["sadness", "grie", "depression"]:
            recommendations.append(
                {
                    "type": "assessment",
                    "title": "Depression Screening",
                    "description": "Monitor duration and severity; assess for major depressive episode criteria",
                }
            )

        return recommendations[:3]  # Max 3

    def _generate_clinical_summary_structured(
        self,
        emotion: Dict[str, Any],
        vac_data: Dict[str, float],
        confidence: float,
        prosody_data: Optional[Dict[str, Any]],
        reasoning: Optional[str],
        message_count: int = 1,
    ) -> Dict[str, Any]:
        """Generate structured clinical mode insights."""
        # Build structured clinical insights
        structured = {
            "opening": self._generate_clinical_opening(
                emotion["name"], confidence, emotion["category"]
            ),
            "emotion_definition": emotion["definition"],
            "vac_assessment": self._generate_vac_assessment_clinical(vac_data),
            "clinical_recommendations": self._generate_clinical_recommendations(
                emotion["name"], vac_data, emotion["category"]
            ),
        }

        # Add voice metrics if available
        if prosody_data:
            structured["voice_metrics"] = self._generate_voice_metrics_clinical(prosody_data)

        # Add reasoning if available
        if reasoning:
            structured["analysis_reasoning"] = reasoning

        return structured

    def _generate_gentle_invitations(
        self, emotion_name: str, vac_data: Dict[str, float], message_count: int
    ) -> List[Dict[str, str]]:
        """Generate 2-3 gentle invitations, alternating reflections and suggestions."""
        invitations = []

        # Odd messages = start with reflection
        # Even messages = start with suggestion
        start_with_reflection = message_count % 2 == 1

        if start_with_reflection:
            invitations.append(
                {
                    "type": "reflection",
                    "text": self._generate_reflection_question(emotion_name, vac_data),
                }
            )
            invitations.append(
                {
                    "type": "suggestion",
                    "text": self._generate_gentle_suggestion(emotion_name, vac_data),
                }
            )
        else:
            invitations.append(
                {
                    "type": "suggestion",
                    "text": self._generate_gentle_suggestion(emotion_name, vac_data),
                }
            )
            invitations.append(
                {
                    "type": "reflection",
                    "text": self._generate_reflection_question(emotion_name, vac_data),
                }
            )

        # Optional third: Add grounding for high arousal
        if vac_data.get("arousal", 0) > 0.7:
            invitations.append(
                {
                    "type": "suggestion",
                    "text": "You might try placing a hand on your heart and taking three slow breaths",
                }
            )

        return invitations

    async def generate_insights(
        self,
        emotion_name: str,
        vac_data: Dict[str, float],
        confidence: float,
        tone_mode: str = "warm",
        prosody_data: Optional[Dict[str, Any]] = None,
        reasoning: Optional[str] = None,
        use_atlas_mapping: bool = True,
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
            use_atlas_mapping: If True, use VAC-based fallback for unmapped emotions
            session_id: Optional chat session ID for clinical alert tracking

        Returns:
            Dictionary containing structured insights
        """
        # ═══════════════════════════════════════════════════════════════════════
        # STEP 1: Resolve emotion name to full atlas definition
        # ═══════════════════════════════════════════════════════════════════════
        # AtlasMapper handles:
        #   - Exact matches ("Anxiety" → Anxiety)
        #   - Fuzzy matches ("anxious" → Anxiety, "joyful" → Joy)
        #   - VAC-based fallback (if emotion name not found, find nearest by VAC)
        #
        # This is critical because AI models may use variations:
        #   Listener says "anxious" but atlas has "Anxiety"
        #   Mapper resolves the variation automatically
        emotion = await self._get_emotion_details(
            emotion_name, vac_coords=vac_data, use_atlas_mapping=use_atlas_mapping
        )

        # Fallback if emotion can't be resolved
        if not emotion:
            return self._generate_fallback_insights(emotion_name, vac_data, tone_mode)

        # ═══════════════════════════════════════════════════════════════════════
        # STEP 2: Get message count for alternating invitation patterns
        # ═══════════════════════════════════════════════════════════════════════
        # Smart alternation prevents repetitive patterns:
        #   Message 1: Reflection question
        #   Message 2: Suggestion
        #   Message 3: Reflection question
        #   Message 4: Suggestion
        # Keeps conversation dynamic and engaging
        message_count = 1
        if session_id:
            try:
                analytics_service = SessionAnalyticsService(self.db)
                session_analytics = await analytics_service.get_or_create(session_id)
                message_count = session_analytics.emotion_count or 1
            except Exception as e:
                logger.warning(f"Could not get message count: {e}")
                message_count = 1

        # ═══════════════════════════════════════════════════════════════════════
        # STEP 3: Build base insights structure
        # ═══════════════════════════════════════════════════════════════════════
        # "structured": True flag tells frontend to use new component-based rendering
        # Legacy summary field maintained for backward compatibility
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
        # WARM MODE:
        #   - Empathetic, validating language
        #   - "I sense you're..." vs "Analysis indicates..."
        #   - Gentle invitations (questions + suggestions)
        #   - Accessible explanations
        #   - Used for: Consumer app, self-exploration
        #
        # CLINICAL MODE:
        #   - Professional, objective language
        #   - Structured metrics and assessments
        #   - Evidence-based recommendations
        #   - Risk indicators highlighted
        #   - Used for: Therapist dashboards, clinical oversight
        if tone_mode == "warm":
            # Generate structured warm insights
            warm_structured = self._generate_warm_summary_structured(
                emotion, vac_data, confidence, prosody_data, reasoning, message_count
            )
            insights.update(warm_structured)

            # Legacy format (backwards compatibility with old frontend)
            insights["summary"] = self._generate_warm_summary(
                emotion, vac_data, confidence, prosody_data, reasoning
            )
        else:
            # Clinical mode - structured format
            clinical_structured = self._generate_clinical_summary_structured(
                emotion, vac_data, confidence, prosody_data, reasoning, message_count
            )
            insights.update(clinical_structured)

            # Legacy format (backwards compatibility)
            insights["summary"] = self._generate_clinical_summary(
                emotion, vac_data, confidence, prosody_data, reasoning
            )

        # ═══════════════════════════════════════════════════════════════════════
        # STEP 5: Add detailed VAC coordinate analysis
        # ═══════════════════════════════════════════════════════════════════════
        # Breaks down each dimension with interpretations and percentiles
        # Example: Valence -0.6 = "Somewhat negative" (20th percentile)
        insights["vac_analysis"] = self._analyze_vac_coordinates(vac_data, tone_mode)

        # ═══════════════════════════════════════════════════════════════════════
        # STEP 6: Add prosody analysis if voice input available
        # ═══════════════════════════════════════════════════════════════════════
        # Voice features provide additional clinical data:
        #   - Pitch mean/variability (emotional activation)
        #   - Energy level (vocal intensity)
        #   - Speech rate (thought speed, agitation)
        #   - Jitter/shimmer (voice quality, tension)
        #
        # Voice-content correlation detects incongruence:
        #   "I'm fine" (words) + flat/quiet voice = possible suppression
        if prosody_data:
            insights["prosody_analysis"] = self._analyze_prosody(prosody_data, vac_data, tone_mode)
            insights["voice_content_correlation"] = self._analyze_voice_content_correlation(
                prosody_data, vac_data, tone_mode
            )

        # ═══════════════════════════════════════════════════════════════════════
        # STEP 7: Get personalized recommendations
        # ═══════════════════════════════════════════════════════════════════════
        # Recommendation engine provides:
        #   - Similar emotions (emotional granularity)
        #   - Curated therapeutic journeys (transition paths)
        # Graceful degradation if engine unavailable
        try:
            emotion_id = emotion.get("id")
            if emotion_id:
                recommendations = await self.recommendation_engine.get_recommendations(
                    context="healing", current_emotion_id=emotion_id, limit=3
                )
                insights["recommendations"] = self._format_recommendations(
                    recommendations, tone_mode
                )
        except Exception as e:
            logger.warning(f"Failed to get recommendations: {e}")
            insights["recommendations"] = []

        # ═══════════════════════════════════════════════════════════════════════
        # STEP 8: Add contextual guidance
        # ═══════════════════════════════════════════════════════════════════════
        # Context-aware closing guidance based on VAC state:
        #   High arousal → Grounding suggestions
        #   Low energy → Activation or rest validation
        #   Disconnection → Connection encouragement
        #   Positive state → Savoring invitation
        insights["guidance"] = self._generate_guidance(emotion, vac_data, tone_mode)

        # ═══════════════════════════════════════════════════════════════════════
        # STEP 9: Evaluate clinical alerts (if session_id provided)
        # ═══════════════════════════════════════════════════════════════════════
        # Clinical alert system monitors for:
        #   - High distress (negative valence + high arousal)
        #   - Low confidence (ambiguous emotional state)
        #   - Voice quality concerns (prosodic markers)
        #   - Voice-content discrepancy (incongruence)
        #
        # Alerts stored in database for:
        #   - Therapist review
        #   - Clinical oversight
        #   - Risk management
        #   - Longitudinal pattern tracking
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
                logger.info(f"Generated {len(alerts)} clinical alerts for session {session_id}")
            except Exception as e:
                # Graceful degradation: Log error but don't crash insight generation
                # Clinical alerts are supplementary - core insights still valuable
                logger.error(f"Failed to generate clinical alerts: {e}", exc_info=True)
                insights["clinical_alerts"] = []
                insights["overall_status"] = "stable"

            # ═══════════════════════════════════════════════════════════════════
            # STEP 10: Update session analytics (real-time metrics)
            # ═══════════════════════════════════════════════════════════════════
            # SessionAnalyticsService tracks:
            #   - Emotion distribution over session
            #   - Average VAC coordinates
            #   - Dominant emotions
            #   - Alert frequency
            #
            # Used for:
            #   - Session summaries
            #   - Therapist dashboards
            #   - Progress tracking
            #   - Pattern identification
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
                logger.info(f"Updated session analytics for {session_id}")
            except Exception as e:
                # Graceful degradation: Log error but continue
                # Analytics are valuable but not critical for immediate user experience
                logger.error(f"Failed to update session analytics: {e}", exc_info=True)
                # Don't add analytics to insights if update failed

        return insights

    async def _get_emotion_details(
        self,
        emotion_name: str,
        vac_coords: Optional[Dict[str, float]] = None,
        use_atlas_mapping: bool = True,
    ) -> Optional[Dict[str, Any]]:
        """Get emotion details from atlas using AtlasMapper.

        Args:
            emotion_name: Name of the emotion to find
            vac_coords: VAC coordinates for fallback matching
            use_atlas_mapping: If True, use fuzzy + VAC-based matching

        Returns:
            Emotion details dict or None
        """
        if not use_atlas_mapping:
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
                        import json

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
            from uuid import UUID

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
            except Exception as e:
                logger.error(f"Error fetching emotion details: {e}")

        return None

    def _generate_clinical_summary(
        self,
        emotion: Dict[str, Any],
        vac_data: Dict[str, float],
        confidence: float,
        prosody_data: Optional[Dict[str, Any]],
        reasoning: Optional[str],
    ) -> str:
        """Generate clinical/technical summary."""
        valence = vac_data.get("valence", 0.0)
        arousal = vac_data.get("arousal", 0.0)
        connection = vac_data.get("connection", 0.0)

        summary = f"**Analysis: {emotion['name']}** (confidence: {confidence:.1%})\n\n"
        summary += f"**Category:** {emotion['category']}\n\n"
        summary += "**VAC Coordinates:**\n"
        summary += f"- Valence: {valence:+.3f} ({self._interpret_valence(valence)})\n"
        summary += f"- Arousal: {arousal:+.3f} ({self._interpret_arousal(arousal)})\n"
        summary += f"- Connection: {connection:+.3f} ({self._interpret_connection(connection)})\n\n"

        if prosody_data:
            summary += "**Voice Characteristics:**\n"
            if "pitch_mean" in prosody_data:
                summary += f"- Pitch: {prosody_data['pitch_mean']:.1f} Hz (±{prosody_data.get('pitch_std', 0):.1f})\n"
            if "energy" in prosody_data:
                summary += f"- Energy: {prosody_data['energy']:.3f}\n"
            if "rate" in prosody_data:
                summary += f"- Speech rate: {prosody_data['rate']:.1f} syll/sec\n"
            summary += "\n"

        if reasoning:
            summary += f"**Reasoning:** {reasoning}\n\n"

        summary += f"**Definition:** {emotion['definition']}"

        return summary

    def _generate_warm_summary_structured(
        self,
        emotion: Dict[str, Any],
        vac_data: Dict[str, float],
        confidence: float,
        prosody_data: Optional[Dict[str, Any]],
        reasoning: Optional[str],
        message_count: int = 1,
    ) -> Dict[str, Any]:
        """Generate structured warm mode insights."""
        valence = vac_data.get("valence", 0.0)

        # Build structured insights
        structured = {
            "opening": self._generate_warm_opening(emotion["name"], valence),
            "emotion_understanding": self._get_emotion_understanding_warm(emotion["name"]),
            "vac_interpretation": {
                "energy_state": self._interpret_arousal_warm(vac_data["arousal"]),
                "emotional_tone": self._interpret_valence_warm(vac_data["valence"]),
                "connection_quality": self._interpret_connection_warm(vac_data["connection"]),
            },
            "gentle_invitations": self._generate_gentle_invitations(
                emotion["name"], vac_data, message_count
            ),
        }

        # Add voice observations if available
        if prosody_data:
            structured["voice_observations"] = self._generate_voice_observations_warm(
                prosody_data, vac_data
            )

        return structured

    def _generate_warm_summary(
        self,
        emotion: Dict[str, Any],
        vac_data: Dict[str, float],
        confidence: float,
        prosody_data: Optional[Dict[str, Any]],
        reasoning: Optional[str],
    ) -> str:
        """Generate warm/conversational summary (legacy format for backwards compatibility)."""
        valence = vac_data.get("valence", 0.0)
        arousal = vac_data.get("arousal", 0.0)
        connection = vac_data.get("connection", 0.0)

        # Opening based on emotion valence
        if valence < -0.3:
            opening = f"I hear that you're experiencing {emotion['name'].lower()}. "
        elif valence > 0.3:
            opening = f"It sounds like you're feeling {emotion['name'].lower()}. "
        else:
            opening = f"You seem to be in a state of {emotion['name'].lower()}. "

        # Add context based on arousal
        if arousal > 0.5:
            opening += "There's a lot of energy in what you're expressing. "
        elif arousal < -0.3:
            opening += "You sound quite low-energy or tired. "

        # Add connection insight
        if connection > 0.5:
            opening += "This emotion connects you with others and your values. "
        elif connection < -0.3:
            opening += "This might be making you feel disconnected or alone. "

        summary = opening + "\n\n"

        # Add voice observations if available
        if prosody_data:
            voice_obs = self._generate_voice_observations(prosody_data, vac_data)
            if voice_obs:
                summary += voice_obs + "\n\n"

        # Add what this emotion means
        summary += f"**What this means:** {emotion['definition']}\n\n"

        # Add category context
        summary += f"This emotion belongs to: *{emotion['category']}*"

        return summary

    def _generate_voice_observations(
        self, prosody_data: Dict[str, Any], vac_data: Dict[str, float]
    ) -> str:
        """Generate warm observations about voice characteristics."""
        observations = []

        energy = prosody_data.get("energy", 0.5)
        arousal = vac_data.get("arousal", 0.0)

        if energy > 0.7 and arousal > 0.5:
            observations.append("Your voice has a lot of intensity right now")
        elif energy < 0.3 and arousal < 0:
            observations.append("Your voice sounds quite quiet or subdued")

        rate = prosody_data.get("rate")
        if rate:
            if rate > 5.0:
                observations.append("you're speaking quickly")
            elif rate < 3.0:
                observations.append("you're speaking slowly and deliberately")

        if observations:
            return "**I notice:** " + ", and ".join(observations) + "."
        return ""

    def _analyze_vac_coordinates(
        self, vac_data: Dict[str, float], tone_mode: str
    ) -> Dict[str, Any]:
        """Analyze VAC coordinates in detail."""
        valence = vac_data.get("valence", 0.0)
        arousal = vac_data.get("arousal", 0.0)
        connection = vac_data.get("connection", 0.0)

        analysis: Dict[str, Any] = {
            "valence": {
                "value": valence,
                "interpretation": self._interpret_valence(valence),
                "percentile": self._value_to_percentile(valence),
            },
            "arousal": {
                "value": arousal,
                "interpretation": self._interpret_arousal(arousal),
                "percentile": self._value_to_percentile(arousal),
            },
            "connection": {
                "value": connection,
                "interpretation": self._interpret_connection(connection),
                "percentile": self._value_to_percentile(connection),
            },
        }

        # Add quadrant analysis
        if valence > 0 and arousal > 0:
            analysis["quadrant"] = "High positive energy (excited, joyful)"
        elif valence > 0 and arousal < 0:
            analysis["quadrant"] = "Low positive energy (calm, content)"
        elif valence < 0 and arousal > 0:
            analysis["quadrant"] = "High negative energy (anxious, angry)"
        else:
            analysis["quadrant"] = "Low negative energy (sad, depressed)"

        return analysis

    def _analyze_prosody(
        self, prosody_data: Dict[str, Any], vac_data: Dict[str, float], tone_mode: str
    ) -> Dict[str, Any]:
        """Analyze voice prosody features."""
        analysis = {
            "pitch": prosody_data.get("pitch_mean"),
            "pitch_variability": prosody_data.get("pitch_std"),
            "energy": prosody_data.get("energy"),
            "rate": prosody_data.get("rate"),
            "features": prosody_data.get("features", {}),
        }

        # Add interpretations
        energy = prosody_data.get("energy", 0.5)
        if energy > 0.7:
            analysis["energy_interpretation"] = "High vocal energy"
        elif energy < 0.3:
            analysis["energy_interpretation"] = "Low vocal energy"
        else:
            analysis["energy_interpretation"] = "Moderate vocal energy"

        return analysis

    def _analyze_voice_content_correlation(
        self, prosody_data: Dict[str, Any], vac_data: Dict[str, float], tone_mode: str
    ) -> Dict[str, Any]:
        """Analyze correlation between voice and content."""
        voice_energy = prosody_data.get("energy", 0.5)
        content_arousal = vac_data.get("arousal", 0.0)
        # _content_valence = vac_data.get("valence", 0.0)

        # Normalize arousal to 0-1 scale
        normalized_arousal = (content_arousal + 1) / 2

        # Calculate discrepancy
        energy_discrepancy = abs(voice_energy - normalized_arousal)

        correlation = {
            "voice_energy": voice_energy,
            "content_arousal": content_arousal,
            "discrepancy": energy_discrepancy,
            "aligned": energy_discrepancy < 0.3,
        }

        # Add interpretation
        if energy_discrepancy > 0.5:
            if tone_mode == "clinical":
                correlation["interpretation"] = (
                    f"Significant discrepancy detected: voice energy ({voice_energy:.2f}) vs content arousal ({content_arousal:+.2f})"
                )
            else:
                if voice_energy > normalized_arousal:
                    correlation["interpretation"] = (
                        "Your voice shows more intensity than your words suggest - there might be stronger feelings beneath the surface."
                    )
                else:
                    correlation["interpretation"] = (
                        "Your words suggest high emotion, but your voice is calmer - you might be managing intense feelings."
                    )
        else:
            correlation["interpretation"] = "Voice and content are well aligned."

        return correlation

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
                guidance = "When emotions feel this intense, it can help to take a few deep breaths and ground yourself in the present moment."
            elif arousal < -0.5:
                guidance = "Low energy can be a signal to rest, or sometimes it means we need gentle movement or connection with others."
            elif connection < -0.3:
                guidance = "Feeling disconnected is really hard. You don't have to face this alone - consider reaching out to someone you trust."
            elif valence > 0.5:
                guidance = "This is a positive state - take a moment to notice and appreciate what's contributing to these feelings."
            else:
                guidance = "Whatever you're feeling right now is valid. Take your time exploring what this emotion is telling you."

        return guidance

    def _interpret_valence(self, value: float) -> str:
        """Interpret valence value."""
        if value > 0.5:
            return "Very positive"
        elif value > 0.1:
            return "Somewhat positive"
        elif value > -0.1:
            return "Neutral"
        elif value > -0.5:
            return "Somewhat negative"
        else:
            return "Very negative"

    def _interpret_arousal(self, value: float) -> str:
        """Interpret arousal value."""
        if value > 0.5:
            return "Very high energy"
        elif value > 0.1:
            return "Somewhat high energy"
        elif value > -0.1:
            return "Moderate energy"
        elif value > -0.5:
            return "Somewhat low energy"
        else:
            return "Very low energy"

    def _interpret_connection(self, value: float) -> str:
        """Interpret connection value."""
        if value > 0.5:
            return "Strong connection/alignment"
        elif value > 0.1:
            return "Somewhat connected"
        elif value > -0.1:
            return "Neutral connection"
        elif value > -0.5:
            return "Somewhat disconnected"
        else:
            return "Strongly disconnected/separated"

    def _value_to_percentile(self, value: float) -> int:
        """Convert -1 to +1 value to percentile (0-100)."""
        return int(((value + 1) / 2) * 100)

    def _generate_fallback_insights(
        self, emotion_name: str, vac_data: Dict[str, float], tone_mode: str
    ) -> Dict[str, Any]:
        """Generate fallback insights when emotion not found in atlas."""
        return {
            "emotion": emotion_name,
            "category": "Unknown",
            "vac": vac_data,
            "confidence": 0.0,
            "summary": f"Detected emotion '{emotion_name}' but unable to find detailed information in atlas.",
            "vac_analysis": self._analyze_vac_coordinates(vac_data, tone_mode),
            "recommendations": [],
            "guidance": "Consider exploring the emotional atlas to find related emotions.",
        }
