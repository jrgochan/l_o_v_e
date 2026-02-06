import json
import logging
import os
import tempfile
import time
from typing import Any, Dict, Optional
from uuid import UUID

import httpx
from fastapi import WebSocket

from app.api.sockets.connection import manager
from app.api.sockets.protocol import send_progress
from app.config import settings
from app.core.security import create_access_token
from app.database import AsyncSessionLocal
from app.services.chat_service import ChatService
from app.services.insight_generator import InsightGenerator

logger = logging.getLogger(__name__)


async def handle_user_message(
    session_id: str,
    data: Dict[str, Any],
    websocket: WebSocket,
    user_identifier: str = "guest",
    auth_user_id: Optional[UUID] = None,
) -> None:
    """Handle incoming user message (text or audio)."""
    content = data.get("content")
    audio_data = data.get("audio_data")  # Base64 encoded
    tone_preference = data.get("tone_preference", "warm")
    deep_feeling_enabled = data.get("deep_feeling_enabled", False)

    # Relationship linking
    related_message_id = data.get("related_message_id")
    relationship_type = data.get("relationship_type")
    relationship_metadata = data.get("relationship_metadata")
    if related_message_id:
        try:
            related_message_id = UUID(related_message_id)
        except (ValueError, TypeError):
            logger.warning("Invalid related_message_id format: %s", related_message_id)
            related_message_id = None

    # Send acknowledgment
    await manager.send_message(session_id, {"type": "message_received", "timestamp": "now"})

    # Determine if text or audio
    is_audio = audio_data is not None

    try:
        if is_audio:
            await process_audio_message(
                session_id,
                str(audio_data) if audio_data else "",
                content,
                tone_preference,
                deep_feeling_enabled,
                websocket,
                user_identifier,
                auth_user_id,
                related_message_id=related_message_id,
                relationship_type=relationship_type,
                relationship_metadata=relationship_metadata,
            )
        else:
            await process_text_message(
                session_id,
                str(content) if content else "",
                tone_preference,
                deep_feeling_enabled,
                websocket,
                user_identifier,
                auth_user_id,
                related_message_id=related_message_id,
                relationship_type=relationship_type,
                relationship_metadata=relationship_metadata,
            )

    except Exception as e:
        logger.error("Error processing message: %s", e, exc_info=True)
        await manager.send_message(
            session_id, {"type": "error", "message": f"Processing failed: {str(e)}"}
        )


async def process_text_message(
    session_id: str,
    content: str,
    tone_preference: str,
    deep_feeling_enabled: bool,
    websocket: WebSocket,
    user_identifier: str = "guest",
    auth_user_id: Optional[UUID] = None,
    related_message_id: Optional[UUID] = None,
    relationship_type: Optional[str] = None,
    relationship_metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """Process a text-only message."""
    logger.info(
        "Processing text message for session %s (deep_feeling=%s)",
        session_id,
        deep_feeling_enabled,
    )

    start_time = time.time()
    await send_progress(session_id, "started", "started", 0)

    async with AsyncSessionLocal() as db:
        chat_service = ChatService(db)
        db_session_id = manager.get_db_session(session_id)

        if not db_session_id:
            session = await chat_service.create_session(
                user_id=user_identifier,
                tone_preference=tone_preference,
                auth_user_id=auth_user_id,
            )
            db_session_id = session.id
            manager.set_db_session(session_id, db_session_id)

        user_msg = await chat_service.save_user_message(
            session_id=db_session_id,
            content=content,
            message_type="user_text",
            related_message_id=related_message_id,
            relationship_type=relationship_type,
            relationship_metadata=relationship_metadata,
        )

        await manager.send_message(
            session_id,
            {
                "type": "user_message_saved",
                "message_id": str(user_msg.id),
                "content": content,
            },
        )

    await send_progress(
        session_id,
        "transcription",
        "complete",
        10,
        int((time.time() - start_time) * 1000),
    )

    if deep_feeling_enabled:
        listener_url = f"{settings.LISTENER_API_URL}/listener/analyze-multi-emotion"
        timeout = 60.0
    else:
        listener_url = f"{settings.LISTENER_API_URL}/listener/analyze"
        timeout = 30.0

    await send_progress(session_id, "emotions", "in_progress", 20)

    try:
        token = create_access_token(data={"sub": user_identifier})
        headers = {"Authorization": f"Bearer {token}"}

        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                listener_url,
                data={
                    "text": content,
                    "user_id": user_identifier,
                    "session_id": session_id,
                },
                headers=headers,
            )

            if response.status_code == 200:
                analysis_result = response.json()
                await send_progress(session_id, "emotions", "in_progress", 60)

                if deep_feeling_enabled:
                    await handle_multi_emotion_result(
                        session_id=session_id,
                        db_session_id=db_session_id,
                        user_msg_id=user_msg.id,
                        analysis_result=analysis_result,
                        tone_preference=tone_preference,
                        websocket=websocket,
                    )
                else:
                    await handle_single_emotion_result(
                        session_id=session_id,
                        db_session_id=db_session_id,
                        analysis_result=analysis_result,
                        tone_preference=tone_preference,
                        websocket=websocket,
                    )

                await manager.send_message(
                    session_id,
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

                        await chat_service.save_analysis_message(
                            session_id=db_session_id,
                            emotion_name=analysis_result.get("emotion", "Unknown"),
                            vac_coordinates=vac_coords,
                            confidence=analysis_result.get("confidence", 0.0),
                            content=f"Detected: {analysis_result.get('emotion')}",
                            tone_mode=tone_preference,
                        )
                except Exception as db_error:
                    logger.error("Failed to save analysis message: %s", db_error)

                await generate_insights(
                    db_session_id,
                    session_id,
                    analysis_result,
                    tone_preference,
                    None,
                    websocket,
                )

            else:
                raise RuntimeError(f"Listener API error: {response.status_code}")

    except Exception as e:
        logger.error("Error calling Listener API: %s", e, exc_info=True)
        await manager.send_message(
            session_id, {"type": "error", "message": f"Analysis failed: {str(e)}"}
        )


async def process_audio_message(
    session_id: str,
    audio_data: str,
    original_text: Optional[str],
    tone_preference: str,
    deep_feeling_enabled: bool,
    websocket: WebSocket,
    user_identifier: str = "guest",
    auth_user_id: Optional[UUID] = None,
    related_message_id: Optional[UUID] = None,
    relationship_type: Optional[str] = None,
    relationship_metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """Process an audio message with transcription and prosody analysis."""
    logger.info(
        "Processing audio message for session %s (deep_feeling=%s)",
        session_id,
        deep_feeling_enabled,
    )

    overall_start = time.time()
    await send_progress(session_id, "started", "started", 0)

    import base64

    audio_path = None

    try:
        audio_bytes = base64.b64decode(audio_data)

        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
            temp_audio.write(audio_bytes)
            audio_path = temp_audio.name

        db_session_id, user_msg = await _save_audio_message_transaction(
            session_id,
            user_identifier,
            tone_preference,
            auth_user_id,
            related_message_id=related_message_id,
            relationship_type=relationship_type,
            relationship_metadata=relationship_metadata,
        )

        token = create_access_token(data={"sub": user_identifier})
        headers = {"Authorization": f"Bearer {token}"}

        await send_progress(session_id, "uploading", "uploading_audio", 10)

        timeout = 120.0

        async with httpx.AsyncClient(timeout=timeout) as client:
            result = await _extract_audio_features(
                client, audio_path, user_identifier, session_id, headers
            )

            transcription = result.get("transcription")
            prosody_data = result.get("prosody")

            if transcription:
                await manager.send_message(
                    session_id, {"type": "transcription", "text": transcription}
                )
                transcription_time = int((time.time() - overall_start) * 1000)
                await send_progress(session_id, "transcription", "complete", 70, transcription_time)

            if prosody_data:
                await manager.send_message(session_id, {"type": "prosody", "data": prosody_data})
                prosody_time = int((time.time() - overall_start) * 1000)
                await send_progress(session_id, "prosody", "complete", 80, prosody_time)

            await send_progress(session_id, "emotions", "in_progress", 90)

            final_result = await _analyze_audio_content(
                client,
                transcription or "",
                prosody_data,
                user_identifier,
                session_id,
                deep_feeling_enabled,
                headers,
            )

            if deep_feeling_enabled:
                await handle_multi_emotion_result(
                    session_id=session_id,
                    db_session_id=db_session_id,
                    user_msg_id=user_msg.id,
                    analysis_result=final_result,
                    tone_preference=tone_preference,
                    websocket=websocket,
                    prosody_data=prosody_data,
                )
            else:
                await handle_single_emotion_result(
                    session_id=session_id,
                    db_session_id=db_session_id,
                    analysis_result=final_result,
                    tone_preference=tone_preference,
                    websocket=websocket,
                    prosody_data=prosody_data,
                )

    except Exception as e:
        import traceback

        trace_path = os.path.join(tempfile.gettempdir(), "traceback.txt")
        with open(trace_path, "w", encoding="utf-8") as f:
            f.write(traceback.format_exc())
        logger.error(f"Audio processing failed: {e}", exc_info=True)
        await manager.send_message(
            session_id,
            {"type": "error", "message": f"Audio processing failed: {str(e)}"},
        )

    finally:
        if audio_path and os.path.exists(audio_path):
            os.remove(audio_path)


async def _save_audio_message_transaction(
    session_id: str,
    user_identifier: str,
    tone_preference: str,
    auth_user_id: Optional[UUID],
    related_message_id: Optional[UUID] = None,
    relationship_type: Optional[str] = None,
    relationship_metadata: Optional[Dict[str, Any]] = None,
) -> "tuple[UUID, Any]":
    """Helper to save audio message and ensure session exists."""
    async with AsyncSessionLocal() as db:
        chat_service = ChatService(db)
        db_session_id = manager.get_db_session(session_id)
        if not db_session_id:
            session = await chat_service.create_session(
                user_id=user_identifier,
                tone_preference=tone_preference,
                auth_user_id=auth_user_id,
            )
            db_session_id = session.id
            manager.set_db_session(session_id, db_session_id)

        user_msg = await chat_service.save_user_message(
            session_id=db_session_id,
            content="🎤 Voice message",
            message_type="user_audio",
            related_message_id=related_message_id,
            relationship_type=relationship_type,
            relationship_metadata=relationship_metadata,
        )
        return db_session_id, user_msg


async def _extract_audio_features(
    client: httpx.AsyncClient,
    audio_path: str,
    user_identifier: str,
    session_id: str,
    headers: Dict[str, str],
) -> Dict[str, Any]:
    """Call Listener API to extract features."""
    extract_url = f"{settings.LISTENER_API_URL}/listener/extract-audio-features"
    with open(audio_path, "rb") as audio_file:
        files = {"audio": ("recording.webm", audio_file, "audio/webm")}
        data = {"user_id": user_identifier, "session_id": session_id}

        # First call sometimes fails in dev? (from original code comments/structure)
        # Mirroring original retry logic safely or just single call?
        # Original code had a double call pattern which looked like a potential bug or retry
        # hack.
        # I'll stick to single call but robust error handling unless specifically asked to
        # replicate hacks.
        # Wait, reading original code:
        # response = await client.post(...)
        # response = await client.post(...)
        # It duplicated the call. Likely a copy-paste error in original or a weird hack.
        # I will implement cleanly with one call.

        logger.info("Calling extract-audio-features")
        response = await client.post(extract_url, files=files, data=data, headers=headers)

        if response.status_code != 200:
            logger.error("Feature extraction failed: %s", response.text)
            raise RuntimeError(f"Feature extraction failed: {response.status_code}")

        return dict(response.json())


async def _analyze_audio_content(
    client: httpx.AsyncClient,
    transcription: str,
    prosody_data: Optional[Dict[str, Any]],
    user_identifier: str,
    session_id: str,
    deep_feeling_enabled: bool,
    headers: Dict[str, str],
) -> Dict[str, Any]:
    """Call Listener API to analyze content."""
    if deep_feeling_enabled:
        analyze_data = {
            "text": transcription,
            "user_id": user_identifier,
            "session_id": session_id,
            "prosody_data_json": json.dumps(prosody_data) if prosody_data else None,
        }
        url = f"{settings.LISTENER_API_URL}/listener/analyze-multi-emotion"
        response = await client.post(url, data=analyze_data, headers=headers)
    else:
        data = {
            "text": transcription,
            "user_id": user_identifier,
            "session_id": session_id,
        }
        url = f"{settings.LISTENER_API_URL}/listener/analyze"
        response = await client.post(url, data=data, headers=headers)

    if response.status_code != 200:
        raise RuntimeError(f"Analysis failed: {response.status_code}")

    return dict(response.json())


async def handle_tone_update(session_id: str, data: Dict[str, Any], websocket: WebSocket) -> None:
    """Handle tone preference update."""
    tone_preference = data.get("tone_preference", "warm")

    async with AsyncSessionLocal() as db:
        chat_service = ChatService(db)
        db_session_id = manager.get_db_session(session_id)
        if db_session_id:
            await chat_service.update_tone_preference(db_session_id, tone_preference)

    await manager.send_message(
        session_id, {"type": "tone_updated", "tone_preference": tone_preference}
    )


async def handle_deep_feeling_update(
    session_id: str, data: Dict[str, Any], websocket: WebSocket
) -> None:
    """Handle Deep Feeling mode toggle."""
    deep_feeling_enabled = data.get("deep_feeling_enabled", False)

    async with AsyncSessionLocal() as db:
        chat_service = ChatService(db)
        db_session_id = manager.get_db_session(session_id)
        if db_session_id:
            await chat_service.update_deep_feeling_mode(db_session_id, deep_feeling_enabled)

    await manager.send_message(
        session_id,
        {"type": "deep_feeling_updated", "deep_feeling_enabled": deep_feeling_enabled},
    )


async def generate_insights(
    db_session_id: UUID,
    ws_session_id: str,
    analysis_result: Dict[str, Any],
    tone_preference: str,
    prosody_data: Optional[Dict[str, Any]],
    websocket: WebSocket,
) -> None:
    """Generate AI insights from analysis results."""
    logger.info(f"Generating insights for DB session {db_session_id}, WS session {ws_session_id}")

    await send_progress(ws_session_id, "insights", "in_progress", 95)

    try:
        async with AsyncSessionLocal() as db:
            generator = InsightGenerator(db)

            insights = await generator.generate_insights(
                emotion_name=analysis_result.get("emotion", "Unknown"),
                vac_data=analysis_result.get("vac", {}),
                confidence=analysis_result.get("confidence", 0.0),
                tone_mode=tone_preference,
                prosody_data=prosody_data,
                reasoning=analysis_result.get("reasoning"),
                use_emotion_mapping=True,
                session_id=str(db_session_id),
            )

            await manager.send_message(ws_session_id, {"type": "insight", "insights": insights})

            await send_progress(ws_session_id, "insights", "complete", 100)

            try:
                chat_service = ChatService(db)
                await chat_service.save_insight_message(
                    session_id=db_session_id,
                    content=insights.get("summary", ""),
                    insights=insights,
                    tone_mode=tone_preference,
                )
            except Exception as save_error:
                logger.error(f"Failed to save insight message: {save_error}")

    except Exception as e:
        logger.error(f"Failed to generate insights: {e}", exc_info=True)
        await manager.send_message(
            ws_session_id,
            {
                "type": "insight",
                "insights": {
                    "summary": f"Emotion detected: {analysis_result.get('emotion', 'Unknown')}",
                    "guidance": "Analysis complete.",
                },
            },
        )


async def handle_single_emotion_result(
    session_id: str,
    db_session_id: UUID,
    analysis_result: Dict[str, Any],
    tone_preference: str,
    websocket: WebSocket,
    prosody_data: Optional[Dict[str, Any]] = None,
) -> None:
    """Handle single emotion analysis result."""
    await manager.send_message(
        session_id,
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

            await chat_service.save_analysis_message(
                session_id=db_session_id,
                emotion_name=analysis_result.get("emotion", "Unknown"),
                vac_coordinates=vac_coords,
                confidence=analysis_result.get("confidence", 0.0),
                content=f"Detected: {analysis_result.get('emotion')}",
                tone_mode=tone_preference,
                prosody_data=prosody_data,
            )
    except Exception as db_error:
        logger.error(f"Failed to save analysis message: {db_error}")

    await generate_insights(
        db_session_id,
        session_id,
        analysis_result,
        tone_preference,
        prosody_data,
        websocket,
    )


async def handle_multi_emotion_result(
    session_id: str,
    db_session_id: UUID,
    user_msg_id: UUID,
    analysis_result: Dict[str, Any],
    tone_preference: str,
    websocket: WebSocket,
    prosody_data: Optional[Dict[str, Any]] = None,
) -> None:
    """Handle multi-emotion analysis result."""
    emotions = analysis_result.get("emotions", [])
    relationships = analysis_result.get("relationships", [])
    aggregate_vac = analysis_result.get("aggregate_vac", {})

    primary = next(
        (e for e in emotions if e.get("prominence") == "primary"),
        emotions[0] if emotions else None,
    )
    if primary:
        await manager.send_message(
            session_id,
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
                session_id,
                {
                    "type": "multi_emotion",
                    "emotion": emotion.get("emotion_name"),
                    "category": emotion.get("category"),
                    "vac": emotion.get("vac"),
                    "confidence": emotion.get("confidence"),
                    "prominence": emotion.get("prominence"),
                },
            )

    await send_progress(session_id, "emotions", "complete", 70)

    if relationships:
        await send_progress(session_id, "relationships", "in_progress", 75)

        for rel in relationships:
            await manager.send_message(
                session_id,
                {
                    "type": "emotion_relationship",
                    "emotion_a": rel.get("emotion_a"),
                    "emotion_b": rel.get("emotion_b"),
                    "relationship_type": rel.get("type"),
                    "strength": rel.get("strength"),
                    "description": rel.get("description"),
                },
            )

        await send_progress(session_id, "relationships", "complete", 80)

    await manager.send_message(
        session_id,
        {
            "type": "aggregate_state",
            "aggregate_vac": aggregate_vac,
            "complexity_score": analysis_result.get("complexity_score"),
            "emotional_clarity": analysis_result.get("emotional_clarity"),
            "temporal_pattern": analysis_result.get("temporal_pattern"),
        },
    )

    await send_progress(session_id, "aggregate", "complete", 85)

    three_way_data = analysis_result.get("three_way_analysis")

    if three_way_data:
        await manager.send_message(
            session_id, {"type": "three_way_analysis", "data": three_way_data}
        )
        await send_progress(session_id, "three_way", "complete", 90)

    try:
        async with AsyncSessionLocal() as db:
            chat_service = ChatService(db)

            await chat_service.save_multi_emotion_analysis(
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
                emotional_clarity=analysis_result.get("emotional_clarity", 1.0),
                temporal_pattern=analysis_result.get("temporal_pattern", "concurrent"),
                three_way_data=three_way_data,
            )
    except Exception as db_error:
        logger.error("Failed to save multi-emotion analysis: %s", db_error, exc_info=True)

    if primary:
        await generate_insights(
            db_session_id,
            session_id,
            {
                "emotion": primary.get("emotion_name"),
                "vac": primary.get("vac"),
                "confidence": primary.get("confidence"),
                "reasoning": analysis_result.get("reasoning", ""),
            },
            tone_preference,
            prosody_data=prosody_data,
            websocket=websocket,
        )
