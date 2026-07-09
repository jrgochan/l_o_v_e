"""Socket Message Processors.

Core processing logic extracted from handlers to maintain separation of concerns.
Handles text and audio message processing pipelines.
"""

import base64
import json
import logging
import os
import tempfile
import time
import traceback
from typing import Any, Dict, List, Optional, Tuple, cast
from uuid import UUID

import httpx
from sqlalchemy.exc import SQLAlchemyError

from app.api.sockets.manager import manager
from app.api.sockets.protocol import send_progress
from app.api.sockets.types import MessageContext
from app.core.security import create_access_token
from app.core.settings import settings
from app.database import AsyncSessionLocal
from app.services.chat.service import ChatService
from app.services.chat.types import (
    AnalysisMessageContext,
    MessageCreationContext,
    MultiEmotionAnalysisContext,
)
from app.services.insights import InsightGenerationRequest, InsightGenerator
from app.types.audio import AudioFeatures, AudioTransactionResult

logger = logging.getLogger(__name__)


class MessageProcessor:
    """Base processor with shared utilities."""

    async def generate_insights(
        self,
        db_session_id: UUID,
        context: MessageContext,
        analysis_result: Dict[str, Any],
        prosody_data: Optional[Dict[str, Any]],
    ) -> None:
        """Generate and send AI insights based on analysis results."""
        logger.info(
            "Generating insights for DB session %s, WS session %s",
            db_session_id,
            context.session_id,
        )

        await send_progress(context.session_id, "insights", "in_progress", 95)

        try:
            async with AsyncSessionLocal() as db:
                generator = InsightGenerator(db)

                request = InsightGenerationRequest(
                    emotion_name=analysis_result.get("emotion", "Unknown"),
                    vac_data=cast(Dict[str, float], analysis_result.get("vac", {})),
                    confidence=analysis_result.get("confidence", 0.0),
                    tone_mode=context.user.tone_preference,
                    prosody_data=prosody_data,
                    reasoning=analysis_result.get("reasoning"),
                    use_emotion_mapping=True,
                    session_id=str(db_session_id),
                )
                insights = await generator.generate_insights(request)

                await manager.send_message(
                    context.session_id, {"type": "insight", "insights": insights}
                )

                await send_progress(context.session_id, "insights", "complete", 100)

                try:
                    chat_service = ChatService(db)
                    await chat_service.save_insight_message(
                        session_id=db_session_id,
                        content=insights.get("summary", ""),
                        insights=insights,
                        tone_mode=context.user.tone_preference,
                    )
                except SQLAlchemyError as save_error:
                    logger.error("Failed to save insight message: %s", save_error)

        except SQLAlchemyError as e:
            logger.error("Database error generating insights: %s", e)
            await self._send_fallback_insight(context, analysis_result)
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.error("Failed to generate insights: %s", e, exc_info=True)
            await self._send_fallback_insight(context, analysis_result)

    async def _send_fallback_insight(
        self, context: MessageContext, analysis_result: Dict[str, Any]
    ) -> None:
        """Send a fallback insight message on error."""
        await manager.send_message(
            context.session_id,
            {
                "type": "insight",
                "insights": {
                    "summary": f"Emotion detected: {analysis_result.get('emotion', 'Unknown')}",
                    "guidance": "Analysis complete.",
                },
            },
        )

    async def handle_single_emotion_result(
        self,
        context: MessageContext,
        db_session_id: UUID,
        analysis_result: Dict[str, Any],
        prosody_data: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Handle legacy single-emotion analysis results."""
        await manager.send_message(
            context.session_id,
            {
                "type": "analysis",
                "emotion": analysis_result.get("emotion"),
                "category": analysis_result.get("category"),
                "vac": analysis_result.get("vac"),
                "confidence": analysis_result.get("confidence"),
                "reasoning": analysis_result.get("reasoning"),
            },
        )

        try:
            async with AsyncSessionLocal() as db:
                chat_service = ChatService(db)
                vac = analysis_result.get("vac", {})
                vac_coords = [
                    vac.get("valence", 0.0),
                    vac.get("arousal", 0.0),
                    vac.get("connection", 0.0),
                ]

                analysis_context = AnalysisMessageContext(
                    session_id=db_session_id,
                    emotion_name=analysis_result.get("emotion", "Unknown"),
                    vac_coordinates=vac_coords,
                    confidence=analysis_result.get("confidence", 0.0),
                    content=f"Detected: {analysis_result.get('emotion')}",
                    tone_mode=context.user.tone_preference,
                    prosody_data=prosody_data,
                )
                await chat_service.save_analysis_message(analysis_context)
        except SQLAlchemyError as db_error:
            logger.error("Failed to save analysis message: %s", db_error)

        await self.generate_insights(
            db_session_id,
            context,
            analysis_result,
            prosody_data,
        )

    async def handle_multi_emotion_result(
        self,
        context: MessageContext,
        db_session_id: UUID,
        user_msg_id: UUID,
        analysis_result: Dict[str, Any],
        prosody_data: Optional[Dict[str, Any]] = None,
    ) -> None:
        # pylint: disable=too-many-arguments, too-many-positional-arguments
        """Handle complex multi-emotion analysis results (Deep Feeling)."""
        emotions = analysis_result.get("emotions", [])
        relationships = analysis_result.get("relationships", [])
        aggregate_vac = analysis_result.get("aggregate_vac", {})

        primary = await self._send_emotion_updates(context, emotions)

        await self._process_relationships(context, relationships)

        await manager.send_message(
            context.session_id,
            {
                "type": "aggregate_state",
                "aggregate_vac": aggregate_vac,
                "complexity_score": analysis_result.get("complexity_score"),
                "emotional_clarity": analysis_result.get("emotional_clarity"),
                "temporal_pattern": analysis_result.get("temporal_pattern"),
            },
        )

        await send_progress(context.session_id, "aggregate", "complete", 85)

        three_way_data = analysis_result.get("three_way_analysis")
        if three_way_data:
            await manager.send_message(
                context.session_id,
                {"type": "three_way_analysis", "data": three_way_data},
            )
            await send_progress(context.session_id, "three_way", "complete", 90)

        await self._save_multi_emotion_analysis(db_session_id, user_msg_id, analysis_result)

        if primary:
            # Construct proxy analysis result for the primary emotion
            primary_analysis = {
                "emotion": primary.get("emotion_name"),
                "vac": primary.get("vac"),
                "confidence": primary.get("confidence"),
                "reasoning": analysis_result.get("reasoning", ""),
            }
            await self.generate_insights(
                db_session_id=db_session_id,
                context=context,
                analysis_result=primary_analysis,
                prosody_data=prosody_data,
            )

    async def _send_emotion_updates(
        self, context: MessageContext, emotions: List[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """Send updates for each emotion and return primary."""
        primary = next(
            (e for e in emotions if e.get("prominence") == "primary"),
            emotions[0] if emotions else None,
        )
        if primary:
            await manager.send_message(
                context.session_id,
                {
                    "type": "analysis",
                    "emotion": primary.get("emotion_name"),
                    "category": primary.get("category"),
                    "vac": primary.get("vac"),
                    "confidence": primary.get("confidence"),
                    "prominence": "primary",
                },
            )

        for emotion in emotions:
            if emotion.get("prominence") in ["secondary", "underlying"]:
                await manager.send_message(
                    context.session_id,
                    {
                        "type": "multi_emotion",
                        "emotion": emotion.get("emotion_name"),
                        "category": emotion.get("category"),
                        "vac": emotion.get("vac"),
                        "confidence": emotion.get("confidence"),
                        "prominence": emotion.get("prominence"),
                    },
                )

        await send_progress(context.session_id, "emotions", "complete", 70)
        return primary

    async def _process_relationships(
        self, context: MessageContext, relationships: List[Dict[str, Any]]
    ) -> None:
        """Process and send relationship data."""
        if not relationships:
            return

        await send_progress(context.session_id, "relationships", "in_progress", 75)

        for rel in relationships:
            await manager.send_message(
                context.session_id,
                {
                    "type": "emotion_relationship",
                    "emotion_a": rel.get("emotion_a"),
                    "emotion_b": rel.get("emotion_b"),
                    "relationship_type": rel.get("type"),
                    "strength": rel.get("strength"),
                    "description": rel.get("description"),
                },
            )

        await send_progress(context.session_id, "relationships", "complete", 80)

    async def _save_multi_emotion_analysis(
        self,
        db_session_id: UUID,
        user_msg_id: UUID,
        analysis_result: Dict[str, Any],
    ) -> None:
        """Save multi-emotion analysis to database."""
        emotions = analysis_result.get("emotions", [])
        relationships = analysis_result.get("relationships", [])
        aggregate_vac = analysis_result.get("aggregate_vac", {})

        try:
            async with AsyncSessionLocal() as db:
                chat_service = ChatService(db)

                multi_emotion_context = MultiEmotionAnalysisContext(
                    message_id=user_msg_id,
                    session_id=db_session_id,
                    emotions=emotions,
                    relationships=relationships,
                    aggregate_vac=[
                        aggregate_vac.get("valence", 0.0),
                        aggregate_vac.get("arousal", 0.0),
                        aggregate_vac.get("connection", 0.0),
                    ],
                    complexity_score=analysis_result.get("complexity_score", 0.0),
                    emotional_clarity=analysis_result.get("emotional_clarity", 0.0),
                    temporal_pattern=analysis_result.get("temporal_pattern", "stable"),
                    three_way_data=analysis_result.get("three_way_analysis"),
                )
                await chat_service.save_multi_emotion_analysis(multi_emotion_context)
        except SQLAlchemyError as db_error:
            logger.error("Failed to save multi-emotion analysis: %s", db_error, exc_info=True)


class TextProcessor(MessageProcessor):
    """Handles text message processing."""

    async def process(self, context: MessageContext, content: str) -> None:
        """Process a text-only message."""
        logger.info(
            "Processing text message for session %s (deep_feeling=%s)",
            context.session_id,
            context.deep_feeling_enabled,
        )

        start_time = time.time()
        await send_progress(context.session_id, "started", "started", 0)

        db_session_id, user_msg = await self._save_text_message_transaction(context, content)

        await manager.send_message(
            context.session_id,
            {
                "type": "user_message_saved",
                "message_id": str(user_msg.id),
                "content": content,
            },
        )

        await send_progress(
            context.session_id,
            "transcription",
            "complete",
            10,
            int((time.time() - start_time) * 1000),
        )

        await send_progress(context.session_id, "emotions", "in_progress", 20)

        try:
            analysis_result = await self._call_listener_analysis(context, content)
            await send_progress(context.session_id, "emotions", "in_progress", 60)

            if context.deep_feeling_enabled:
                await self.handle_multi_emotion_result(
                    context=context,
                    db_session_id=db_session_id,
                    user_msg_id=user_msg.id,
                    analysis_result=analysis_result,
                )
            else:
                await self.handle_single_emotion_result(
                    context=context,
                    db_session_id=db_session_id,
                    analysis_result=analysis_result,
                )

        except (httpx.HTTPError, ValueError) as e:
            logger.error("Error processing listener request: %s", e)
            await manager.send_message(
                context.session_id,
                {"type": "error", "message": f"Analysis failed: {str(e)}"},
            )
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.error("Unexpected error in text processing: %s", e, exc_info=True)
            await manager.send_message(
                context.session_id,
                {"type": "error", "message": "An unexpected error occurred."},
            )

    async def _save_text_message_transaction(
        self, context: MessageContext, content: str
    ) -> Tuple[UUID, Any]:
        """Save text message and ensure session exists."""
        async with AsyncSessionLocal() as db:
            chat_service = ChatService(db)
            db_session_id = manager.get_db_session(context.session_id)

            if not db_session_id:
                session = await chat_service.create_session(
                    user_id=context.user.identifier,
                    tone_preference=context.user.tone_preference,
                    auth_user_id=context.user.auth_user_id,
                )
                db_session_id = session.id
                manager.set_db_session(context.session_id, db_session_id)

            msg_context = MessageCreationContext(
                session_id=db_session_id,
                content=content,
                message_type="user_text",
                related_message_id=context.related_message_id,
                relationship_type=context.relationship_type,
                relationship_metadata=context.relationship_metadata,
            )

            user_msg = await chat_service.save_user_message(msg_context)
            return db_session_id, user_msg

    async def _call_listener_analysis(
        self, context: MessageContext, content: str
    ) -> Dict[str, Any]:
        """Call Listener API for text analysis."""
        timeout = 60.0 if context.deep_feeling_enabled else 30.0
        token = create_access_token(data={"sub": context.user.identifier})
        headers = {"Authorization": f"Bearer {token}"}

        if context.deep_feeling_enabled:
            url = f"{settings.LISTENER_API_URL}/listener/analyze-multi-emotion"
            data = {
                "text": content,
                "user_id": context.user.identifier,
                "session_id": context.session_id,
            }
        else:
            url = f"{settings.LISTENER_API_URL}/listener/analyze"
            data = {
                "text": content,
                "user_id": context.user.identifier,
                "session_id": context.session_id,
            }

        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, data=data, headers=headers)

            if response.status_code != 200:
                raise RuntimeError(f"Listener API error: {response.status_code}")

            return dict(response.json())


class AudioProcessor(MessageProcessor):
    """Handles audio message processing (transcription + analysis)."""

    async def process(
        self, context: MessageContext, audio_data: str, _original_text: Optional[str]
    ) -> None:
        """Process an audio message."""
        logger.info(
            "Processing audio message for session %s (deep_feeling=%s)",
            context.session_id,
            context.deep_feeling_enabled,
        )

        overall_start = time.time()
        await send_progress(context.session_id, "started", "started", 0)

        audio_path = None

        try:
            audio_path = self._prepare_audio_file(audio_data)

            tx_result = await self._save_audio_message_transaction(context)

            token = create_access_token(data={"sub": context.user.identifier})
            headers = {"Authorization": f"Bearer {token}"}

            await send_progress(context.session_id, "uploading", "uploading_audio", 10)

            async with httpx.AsyncClient(timeout=300.0) as client:
                features = await self._extract_audio_features(client, audio_path, context, headers)

                if features.transcription:
                    await manager.send_message(
                        context.session_id,
                        {"type": "transcription", "text": features.transcription},
                    )
                    await send_progress(
                        context.session_id,
                        "transcription",
                        "complete",
                        70,
                        int((time.time() - overall_start) * 1000),
                    )

                if features.prosody:
                    await manager.send_message(
                        context.session_id,
                        {"type": "prosody", "data": features.prosody},
                    )
                    await send_progress(
                        context.session_id,
                        "prosody",
                        "complete",
                        80,
                        int((time.time() - overall_start) * 1000),
                    )

                await send_progress(context.session_id, "emotions", "in_progress", 90)

                final_result = await self._analyze_audio_content(
                    client,
                    context,
                    features,
                    headers,
                )

                if context.deep_feeling_enabled:
                    await self.handle_multi_emotion_result(
                        context=context,
                        db_session_id=tx_result.session_id,
                        user_msg_id=tx_result.user_msg.id,
                        analysis_result=final_result,
                        prosody_data=features.prosody,
                    )
                else:
                    await self.handle_single_emotion_result(
                        context=context,
                        db_session_id=tx_result.session_id,
                        analysis_result=final_result,
                        prosody_data=features.prosody,
                    )

        except (httpx.HTTPError, OSError) as e:
            logger.error("Audio processing error: %s", e)
            await manager.send_message(
                context.session_id,
                {"type": "error", "message": f"Audio processing failed: {str(e)}"},
            )
        except Exception as e:  # pylint: disable=broad-exception-caught
            trace_path = os.path.join(tempfile.gettempdir(), "traceback.txt")
            with open(trace_path, "w", encoding="utf-8") as f:
                f.write(traceback.format_exc())
            logger.error("Unexpected audio processing failed: %s", e, exc_info=True)
            await manager.send_message(
                context.session_id,
                {
                    "type": "error",
                    "message": "An unexpected error occurred during audio processing.",
                },
            )

        finally:
            if audio_path and os.path.exists(audio_path):
                os.remove(audio_path)

    def _prepare_audio_file(self, audio_data: str) -> str:
        """Decode base64 audio and write to temporary file."""
        audio_bytes = base64.b64decode(audio_data)

        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
            temp_audio.write(audio_bytes)
            return temp_audio.name

    async def _save_audio_message_transaction(
        self, context: MessageContext
    ) -> AudioTransactionResult:
        """Save audio message and ensure session exists."""
        async with AsyncSessionLocal() as db:
            chat_service = ChatService(db)
            db_session_id = manager.get_db_session(context.session_id)
            if not db_session_id:
                session = await chat_service.create_session(
                    user_id=context.user.identifier,
                    tone_preference=context.user.tone_preference,
                    auth_user_id=context.user.auth_user_id,
                )
                db_session_id = session.id
                manager.set_db_session(context.session_id, db_session_id)

            msg_context = MessageCreationContext(
                session_id=db_session_id,
                content="🎤 Voice message",
                message_type="user_audio",
                related_message_id=context.related_message_id,
                relationship_type=context.relationship_type,
                relationship_metadata=context.relationship_metadata,
            )

            user_msg = await chat_service.save_user_message(msg_context)
            return AudioTransactionResult(session_id=db_session_id, user_msg=user_msg)

    async def _extract_audio_features(
        self,
        client: httpx.AsyncClient,
        audio_path: str,
        context: MessageContext,
        headers: Dict[str, str],
    ) -> AudioFeatures:
        """Call Listener API to extract features."""
        extract_url = f"{settings.LISTENER_API_URL}/listener/extract-audio-features"
        with open(audio_path, "rb") as audio_file:
            files = {"audio": ("recording.webm", audio_file, "audio/webm")}
            data = {
                "user_id": context.user.identifier,
                "session_id": context.session_id,
            }

            response = await client.post(extract_url, files=files, data=data, headers=headers)

            if response.status_code != 200:
                logger.error("Feature extraction failed: %s", response.text)
                raise RuntimeError(f"Feature extraction failed: {response.status_code}")

            data = response.json()
            return AudioFeatures(
                transcription=data.get("transcription"),
                prosody=cast(Optional[Dict[str, Any]], data.get("prosody")),
            )

    async def _analyze_audio_content(
        self,
        client: httpx.AsyncClient,
        context: MessageContext,
        features: AudioFeatures,
        headers: Dict[str, str],
    ) -> Dict[str, Any]:
        """Call Listener API to analyze content."""
        if context.deep_feeling_enabled:
            # Pylint suppression for clean dictionary construction
            analyze_data = {
                "text": features.transcription or "",
                "user_id": context.user.identifier,
                "session_id": context.session_id,
                "prosody_data_json": (json.dumps(features.prosody) if features.prosody else None),
            }
            url = f"{settings.LISTENER_API_URL}/listener/analyze-multi-emotion"
            response = await client.post(url, data=analyze_data, headers=headers)
        else:
            data = {
                "text": features.transcription or "",
                "user_id": context.user.identifier,
                "session_id": context.session_id,
            }
            url = f"{settings.LISTENER_API_URL}/listener/analyze"
            response = await client.post(url, data=data, headers=headers)

        if response.status_code != 200:
            raise RuntimeError(f"Analysis failed: {response.status_code}")

        return dict(response.json())
