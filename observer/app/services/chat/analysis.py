import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat_message import ChatMessage
from app.models.multi_emotion_analysis import (
    DetectedEmotion,
    EmotionRelationship,
    MultiEmotionAnalysis,
)
from app.services.chat.session import SessionManager
from app.services.emotion_resolver import EmotionResolver

logger = logging.getLogger(__name__)


class AnalysisManager:
    """Manages emotional analysis storage and relationships."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.session_manager = SessionManager(db)

    async def save_analysis_message(
        self,
        session_id: UUID,
        emotion_name: str,
        vac_coordinates: List[float],
        confidence: float,
        content: str,
        tone_mode: str,
        prosody_data: Optional[Dict[str, Any]] = None,
    ) -> ChatMessage:
        """Save an analysis message with emotion detection results."""
        # Find emotion ID from emotion name
        mapping = await self._resolve_emotion(emotion_name)

        emotion_id = None
        if mapping.emotion_id:
            emotion_id = UUID(mapping.emotion_id)
        else:
            logger.warning("Emotion not found: %s", emotion_name)

        message = ChatMessage(
            session_id=session_id,
            message_type="system_analysis",
            content=content,
            emotion_id=emotion_id,
            original_emotion_name=mapping.original_name,
            match_method=mapping.match_method,
            match_confidence=mapping.match_confidence,
            vac_coordinates=vac_coordinates,
            confidence=confidence,
            tone_mode=tone_mode,
            timestamp=datetime.utcnow(),
        )

        # Add prosody data if provided
        if prosody_data:
            message.prosody_pitch_mean = prosody_data.get("pitch_mean")
            message.prosody_pitch_std = prosody_data.get("pitch_std")
            message.prosody_energy = prosody_data.get("energy")
            message.prosody_rate = prosody_data.get("rate")
            message.prosody_features = prosody_data.get("features", {})

        self.db.add(message)

        # Update session message count
        session = await self.session_manager.get_session(session_id)
        if session:
            session.message_count += 1

        await self.db.commit()
        await self.db.refresh(message)

        logger.info("Saved analysis message %s to session %s", message.id, session_id)
        return message

    async def save_insight_message(
        self, session_id: UUID, content: str, insights: Dict[str, Any], tone_mode: str
    ) -> ChatMessage:
        """Save an insight message with AI-generated insights."""
        message = ChatMessage(
            session_id=session_id,
            message_type="system_insight",
            content=content,
            insights=insights,
            tone_mode=tone_mode,
            timestamp=datetime.utcnow(),
        )

        self.db.add(message)

        # Update session message count
        session = await self.session_manager.get_session(session_id)
        if session:
            session.message_count += 1

        await self.db.commit()
        await self.db.refresh(message)

        logger.info("Saved insight message %s to session %s", message.id, session_id)
        return message

    async def save_multi_emotion_analysis(
        self,
        message_id: UUID,
        session_id: UUID,
        emotions: List[Dict[str, Any]],
        relationships: List[Dict[str, Any]],
        aggregate_vac: List[float],
        complexity_score: float,
        emotional_clarity: float,
        temporal_pattern: str,
        three_way_data: Optional[Dict[str, Any]] = None,
    ) -> MultiEmotionAnalysis:
        """Save a multi-emotion analysis (Deep Feeling Mode)."""
        # STEP 1: Create parent analysis record
        analysis = MultiEmotionAnalysis(
            message_id=message_id,
            session_id=session_id,
            deep_feeling_enabled=True,
            aggregate_vac=aggregate_vac,
            complexity_score=complexity_score,
            emotional_clarity=emotional_clarity,
            temporal_pattern=temporal_pattern,
            created_at=datetime.utcnow(),
        )

        # STEP 2: Add 3-way analysis data
        if three_way_data:
            analysis.three_way_enabled = True
            analysis.content_only_data = three_way_data.get("content_only")
            analysis.voice_only_data = three_way_data.get("voice_only")
            analysis.discrepancy_metrics = three_way_data.get("discrepancy")
            logger.info(
                "Saving 3-way analysis data discrepancy=%.3f",
                three_way_data.get("discrepancy", {}).get("content_voice_distance", 0.0),
            )

        self.db.add(analysis)
        await self.db.flush()

        # STEP 3: Save detected emotions
        detected_emotions_map = {}

        for emotion_data in emotions:
            mapping = await self._resolve_emotion(emotion_data["emotion_name"])
            emotion_id = None
            if mapping.emotion_id:
                emotion_id = UUID(mapping.emotion_id)

            detected_emotion = DetectedEmotion(
                analysis_id=analysis.id,
                emotion_id=emotion_id,
                original_name=mapping.original_name,
                match_method=mapping.match_method,
                match_confidence=mapping.match_confidence,
                confidence=emotion_data["confidence"],
                prominence=emotion_data["prominence"],
                vac=[
                    emotion_data["vac"]["valence"],
                    emotion_data["vac"]["arousal"],
                    emotion_data["vac"]["connection"],
                ],
                voice_alignment=emotion_data.get("voice_alignment"),
                created_at=datetime.utcnow(),
            )

            self.db.add(detected_emotion)
            detected_emotions_map[emotion_data["emotion_name"]] = detected_emotion

        await self.db.flush()

        # STEP 4: Save emotion relationships
        for rel_data in relationships:
            detected_a = detected_emotions_map.get(rel_data["emotion_a"])
            detected_b = detected_emotions_map.get(rel_data["emotion_b"])

            if detected_a and detected_b:
                relationship = EmotionRelationship(
                    analysis_id=analysis.id,
                    emotion_a_id=detected_a.id,
                    emotion_b_id=detected_b.id,
                    relationship_type=rel_data.get("type"),
                    strength=rel_data.get("strength", 0.5),
                    description=rel_data.get("description", ""),
                    created_at=datetime.utcnow(),
                )

                self.db.add(relationship)

        await self.db.commit()
        await self.db.refresh(analysis)
        logger.info("Saved multi-emotion analysis %s", analysis.id)
        return analysis

    async def get_multi_emotion_analysis(self, message_id: UUID) -> Optional[Dict[str, Any]]:
        """Get multi-emotion analysis for a message."""
        stmt = select(MultiEmotionAnalysis).where(MultiEmotionAnalysis.message_id == message_id)
        result = await self.db.execute(stmt)
        analysis = result.scalar_one_or_none()

        if analysis:
            return analysis.to_dict(include_emotions=True, include_relationships=True)
        return None

    async def get_session_multi_emotion_history(
        self, session_id: UUID, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get multi-emotion analysis history for a session."""
        stmt = (
            select(MultiEmotionAnalysis)
            .where(MultiEmotionAnalysis.session_id == session_id)
            .order_by(desc(MultiEmotionAnalysis.created_at))
            .limit(limit)
        )

        result = await self.db.execute(stmt)
        analyses = result.scalars().all()

        return [
            analysis.to_dict(include_emotions=True, include_relationships=True)
            for analysis in analyses
        ]

    async def _resolve_emotion(self, emotion_name: str):
        """Resolve emotion name to EmotionResolver."""
        resolver = EmotionResolver(self.db)
        return await resolver.resolve_emotion(emotion_name)
