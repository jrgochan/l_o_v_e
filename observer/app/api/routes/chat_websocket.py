"""Chat WebSocket API - Real-Time Therapeutic Conversation.

Bidirectional WebSocket protocol for real-time emotional analysis chat sessions. Orchestrates
Listener integration, progress streaming, multi-emotion analysis, relationship detection,
clinical alerts, and tone-personalized insights. Core of Observer's conversational intelligence.

WebSocket Protocol:

    Connection lifecycle::

        1. Client Connect
           /ws/chat/{session_id}

        2. Server Accept
           Connection stored in manager
           Session initialized

        3. Bidirectional Messaging
           Client → Server: user messages
           Server → Client: analysis + insights

        4. Client Disconnect
           Cleanup connection
           End session (optional)

Client Message Types:

    Four message types from client::

        1. user_message (Text/Audio)
           {
               "type": "user_message",
               "content": "I'm feeling anxious",
               "audio_data": "base64...",  # Optional
               "tone_preference": "warm",
               "deep_feeling_enabled": false
           }

        2. ping (Keepalive)
           {
               "type": "ping"
           }

        3. update_tone
           {
               "type": "update_tone",
               "tone_preference": "clinical"
           }

        4. update_deep_feeling
           {
               "type": "update_deep_feeling",
               "deep_feeling_enabled": true
           }

Server Message Types:

    Nine message types to client::

        1. connected
           {"type": "connected", "session_id": "..."}

        2. transcription (audio only)
           {"type": "transcription", "text": "..."}

        3. prosody (audio only)
           {"type": "prosody", "data": {...}}

        4. analysis (emotion detection)
           {"type": "analysis", "emotion": "Anxiety", "vac": [...]}

        5. multi_emotion (Deep Feeling)
           {"type": "multi_emotion", "emotion": "...", "prominence": "secondary"}

        6. emotion_relationship (Deep Feeling)
           {"type": "emotion_relationship", "emotion_a": "...", "type": "masking"}

        7. aggregate_state (Deep Feeling)
           {"type": "aggregate_state", "aggregate_vac": {...}, "complexity": 0.62}

        8. insight (AI guidance)
           {"type": "insight", "insights": {...}}

        9. progress_update
           {"type": "progress_update", "stage": "emotions", "percentage": 60}

Processing Pipeline:

    Text message flow::

        1. Receive user message
        2. Save to chat_messages
        3. Call Listener API
        4. Stream analysis results
        5. Generate insights
        6. Stream insights
        7. Save insights

        Total time: 3-8 seconds

    Audio message flow::

        1. Receive audio (base64)
        2. Decode and save temp file
        3. Upload to Listener
        4. Stream transcription
        5. Stream prosody analysis
        6. Stream emotion analysis
        7. Generate insights
        8. Cleanup temp file

        Total time: 5-15 seconds

Deep Feeling Mode:

    Multi-emotion analysis enhancement::

        When deep_feeling_enabled=true:

        1. Route to multi-emotion endpoint
        2. Receive 1-3 emotions with prominence
        3. Receive emotion relationships
        4. Receive aggregate state
        5. Stream all to client progressively
        6. Generate relationship-aware insights

        Benefits:
        - Reveals emotional complexity
        - Identifies ambivalence
        - Detects masking patterns
        - Provides nuanced insights

Progress Streaming:

    Real-time UX feedback::

        Stages:
        1. started (0%)
        2. transcription (10-20%)
        3. prosody (35%)
        4. emotions (40-70%)
        5. relationships (75-80%, Deep Feeling only)
        6. aggregate (85%, Deep Feeling only)
        7. insights (95%)
        8. complete (100%)

        Message format:
        {
            "type": "progress_update",
            "stage": "emotions",
            "status": "in_progress",
            "percentage": 60,
            "elapsed_ms": 2340
        }

Performance Characteristics:
    - Text processing: 3-8 seconds
    - Audio processing: 5-15 seconds
    - Progress updates: <5ms each
    - WebSocket overhead: <10ms
    - Concurrent sessions: 100+ supported

Error Handling:

    Graceful failure management::

        WebSocket disconnect:
        - Client closes connection
        - Clean up manager state
        - Log disconnect event
        - No error thrown

        Processing errors:
        - Send error message to client
        - Log full exception
        - Keep connection open
        - Allow retry

        Database errors:
        - Log warning
        - Continue processing
        - Don't block insights
        - Best-effort persistence

Connection Management:

    Active connection tracking::

        ConnectionManager maintains:
        - active_connections: {session_id → WebSocket}
        - session_mapping: {ws_session → db_session UUID}

        Key methods:
        - connect(): Accept and store
        - disconnect(): Remove and cleanup
        - send_message(): Route to specific session
        - send_text(): Send plain text

Integration Points:

    Multi-service orchestration::

        Calls:
        - Listener API: Emotion analysis
        - ChatService: Message persistence
        - InsightGenerator: AI guidance
        - ClinicalAlertService: Risk detection

        Streams to:
        - Connected WebSocket clients
        - Real-time dashboard updates
        - Mobile app connections

References:
    - WebSocket design: docs/modules/observer/senior-developers/05-websocket-realtime.md
    - Chat service: observer/app/services/chat_service.py
    - Deep Feeling Mode: docs/features/deep-feeling/README.md
    - FastAPI WebSocket: https://fastapi.tiangolo.com/advanced/websockets/
    - Listener integration: listener/app/api/routes/ingest.py
"""

import json
import logging
import time
from typing import Any, Dict, List, Optional
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_current_user_ws
from app.api.schemas.chat import DisplayMessage
from app.config import settings
from app.core.security import create_access_token
from app.database import AsyncSessionLocal, get_db
from app.models.user import User
from app.services.chat_service import ChatService

logger = logging.getLogger(__name__)
router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections for chat sessions."""

    def __init__(self) -> None:
        """Initialize connection manager."""
        self.active_connections: Dict[str, WebSocket] = {}
        self.session_mapping: Dict[str, UUID] = {}  # Maps string session_id to UUID

    async def connect(self, session_id: str, websocket: WebSocket) -> None:
        """Accept and store a WebSocket connection."""
        await websocket.accept()
        self.active_connections[session_id] = websocket
        logger.info(f"WebSocket connected for session {session_id}")

    def set_db_session(self, session_id: str, db_session_id: UUID) -> None:
        """Map string session_id to database UUID."""
        self.session_mapping[session_id] = db_session_id

    def get_db_session(self, session_id: str) -> Optional[UUID]:
        """Get database UUID for session."""
        return self.session_mapping.get(session_id)

    def disconnect(self, session_id: str) -> None:
        """Remove a WebSocket connection."""
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        if session_id in self.session_mapping:
            del self.session_mapping[session_id]
        logger.info(f"WebSocket disconnected for session {session_id}")

    async def send_message(self, session_id: str, message: Dict[str, Any]) -> None:
        """Send a message to a specific session."""
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_json(message)

    async def send_text(self, session_id: str, text: str) -> None:
        """Send plain text to a specific session."""
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_text(text)


manager = ConnectionManager()


async def send_progress(
    session_id: str, stage: str, status: str, percentage: int, elapsed_ms: Optional[int] = None
) -> None:
    """Helper to send progress updates to the client."""
    message = {
        "type": "progress_update",
        "stage": stage,
        "status": status,
        "message": f"{stage} {status}",
        "percentage": percentage,
    }
    if elapsed_ms is not None:
        message["elapsed_ms"] = elapsed_ms
    await manager.send_message(session_id, message)


@router.websocket("/ws/chat/{session_id}")
async def chat_websocket(
    websocket: WebSocket,
    session_id: str,
    current_user: User = Depends(get_current_user_ws),
) -> None:
    """Websocket endpoint for real-time emotional analysis chat.

    Requires authentication via 'token' query parameter.
    """
    await manager.connect(session_id, websocket)

    # Authenticated user from dependency
    auth_user_id = current_user.id
    user_identifier = str(current_user.id)
    logger.info(f"Authenticated session {session_id} for user {current_user.email}")

    try:
        # Get database session (we'll create one per message for simplicity)
        while True:
            # Receive message from client
            data = await websocket.receive_json()

            # Process based on message type
            message_type = data.get("type")

            if message_type == "user_message":
                await handle_user_message(
                    session_id, data, websocket, user_identifier, auth_user_id
                )

            elif message_type == "ping":
                await manager.send_message(session_id, {"type": "pong"})

            elif message_type == "update_tone":
                await handle_tone_update(session_id, data, websocket)

            elif message_type == "update_deep_feeling":
                await handle_deep_feeling_update(session_id, data, websocket)

            else:
                await manager.send_message(
                    session_id,
                    {"type": "error", "message": f"Unknown message type: {message_type}"},
                )

    except WebSocketDisconnect:
        manager.disconnect(session_id)
        logger.info(f"Client disconnected from session {session_id}")

    except Exception as e:
        logger.error(f"WebSocket error for session {session_id}: {e}", exc_info=True)
        await manager.send_message(session_id, {"type": "error", "message": str(e)})
        manager.disconnect(session_id)


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
    deep_feeling_enabled = data.get(
        "deep_feeling_enabled", False
    )  # NEW: Check for deep feeling mode

    # Relationship linking
    related_message_id = data.get("related_message_id")
    relationship_type = data.get("relationship_type")
    relationship_metadata = data.get("relationship_metadata")
    if related_message_id:
        try:
            related_message_id = UUID(related_message_id)
        except (ValueError, TypeError):
            logger.warning(f"Invalid related_message_id format: {related_message_id}")
            related_message_id = None

    # Send acknowledgment
    await manager.send_message(session_id, {"type": "message_received", "timestamp": "now"})

    # Determine if text or audio
    is_audio = audio_data is not None

    try:
        if is_audio:
            # Process audio message
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
            # Process text message
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
        logger.error(f"Error processing message: {e}", exc_info=True)
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
        f"Processing text message for session {session_id} (deep_feeling={deep_feeling_enabled})"
    )

    # Track start time
    start_time = time.time()

    # Send initial progress
    await send_progress(session_id, "started", "started", 0)

    # Get database session
    # imported at top level now: from app.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        chat_service = ChatService(db)

        # Get or create database session
        db_session_id = manager.get_db_session(session_id)

        if not db_session_id:
            # Create new session on first message
            session = await chat_service.create_session(
                user_id=user_identifier, tone_preference=tone_preference, auth_user_id=auth_user_id
            )
            db_session_id = session.id
            manager.set_db_session(session_id, db_session_id)

        # Save user message
        user_msg = await chat_service.save_user_message(
            session_id=db_session_id,
            content=content,
            message_type="user_text",
            related_message_id=related_message_id,
            relationship_type=relationship_type,
            relationship_metadata=relationship_metadata,
        )

        # Send confirmation
        await manager.send_message(
            session_id,
            {"type": "user_message_saved", "message_id": str(user_msg.id), "content": content},
        )

    # Progress: Message saved
    await send_progress(
        session_id, "transcription", "complete", 10, int((time.time() - start_time) * 1000)
    )

    # Call Listener API for semantic analysis - route based on deep_feeling mode
    if deep_feeling_enabled:
        listener_url = f"{settings.LISTENER_API_URL}/listener/analyze-multi-emotion"
        timeout = 60.0  # Longer timeout for multi-emotion analysis
    else:
        listener_url = f"{settings.LISTENER_API_URL}/listener/analyze"
        timeout = 30.0

    # Progress: Starting semantic analysis
    await send_progress(session_id, "emotions", "in_progress", 20)

    try:
        # Generate internal service token (propagating user identity)
        token = create_access_token(data={"sub": user_identifier})
        headers = {"Authorization": f"Bearer {token}"}

        async with httpx.AsyncClient(timeout=timeout) as client:
            # Send to Listener
            response = await client.post(
                listener_url,
                data={"text": content, "user_id": user_identifier, "session_id": session_id},
                headers=headers,
            )

            if response.status_code == 200:
                analysis_result = response.json()

                # Progress: Listener responded
                await send_progress(session_id, "emotions", "in_progress", 60)

                # Handle multi-emotion response differently
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
                    # Original single-emotion handling
                    await handle_single_emotion_result(
                        session_id=session_id,
                        db_session_id=db_session_id,
                        analysis_result=analysis_result,
                        tone_preference=tone_preference,
                        websocket=websocket,
                    )

                # Stream analysis result
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

                # Save analysis to database (use db_session_id) - with proper error handling
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
                    logger.error(f"Failed to save analysis message: {db_error}")
                    # Continue anyway - don't block insights

                # Generate and stream insights (separate transaction)
                await generate_insights(
                    db_session_id, session_id, analysis_result, tone_preference, None, websocket
                )

            else:
                raise RuntimeError(f"Listener API error: {response.status_code}")

    except Exception as e:
        logger.error(f"Error calling Listener API: {e}", exc_info=True)
        await manager.send_message(
            session_id, {"type": "error", "message": f"Analysis failed: {str(e)}"}
        )


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
    from app.database import AsyncSessionLocal

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

        logger.info("Calling extract-audio-features for immediate feedback")
        response = await client.post(extract_url, files=files, data=data, headers=headers)

        if response.status_code != 200:
            logger.error(f"Feature extraction failed: {response.text}")
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
    """Call Listener API to analyze content (Deep Feeling or Standard)."""
    if deep_feeling_enabled:
        # Multi-emotion (2-step completed)
        analyze_data = {
            "text": transcription,
            "user_id": user_identifier,
            "session_id": session_id,
            "prosody_data_json": json.dumps(prosody_data) if prosody_data else None,
        }
        url = f"{settings.LISTENER_API_URL}/listener/analyze-multi-emotion"
        response = await client.post(url, data=analyze_data, headers=headers)
    else:
        # Standard analysis
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
        f"Processing audio message for session {session_id} (deep_feeling={deep_feeling_enabled})"
    )

    # Track overall start time
    overall_start = time.time()

    # Send initial progress
    await send_progress(session_id, "started", "started", 0)

    # Decode audio first (to fail fast on invalid data)
    import base64
    import os
    import tempfile

    audio_path = None

    try:
        audio_bytes = base64.b64decode(audio_data)

        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
            temp_audio.write(audio_bytes)
            audio_path = temp_audio.name

        # Create or get DB session and save user message
        db_session_id, user_msg = await _save_audio_message_transaction(
            session_id,
            user_identifier,
            tone_preference,
            auth_user_id,
            related_message_id=related_message_id,
            relationship_type=relationship_type,
            relationship_metadata=relationship_metadata,
        )

        # Generate internal service token (propagating user identity)
        token = create_access_token(data={"sub": user_identifier})
        headers = {"Authorization": f"Bearer {token}"}

        # Progress: Uploading audio
        await send_progress(session_id, "uploading", "uploading_audio", 10)

        # Unified timeout for audio pipeline
        timeout = 120.0

        async with httpx.AsyncClient(timeout=timeout) as client:
            # Step 1: Extract features
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

            # Step 2: Semantic Analysis
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
            session_id, {"type": "error", "message": f"Audio processing failed: {str(e)}"}
        )

    finally:
        # Cleanup temp file
        if audio_path and os.path.exists(audio_path):
            os.remove(audio_path)


async def generate_insights(
    db_session_id: UUID,  # Database session UUID
    ws_session_id: str,  # WebSocket session ID (string)
    analysis_result: Dict[str, Any],
    tone_preference: str,
    prosody_data: Optional[Dict[str, Any]],
    websocket: WebSocket,
) -> None:
    """Generate AI insights from analysis results."""
    from app.database import AsyncSessionLocal
    from app.services.insight_generator import InsightGenerator

    logger.info(f"Generating insights for DB session {db_session_id}, WS session {ws_session_id}")

    # Progress: Insights started
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
                use_atlas_mapping=True,  # Enable VAC-based fallback matching
                session_id=str(db_session_id),  # NEW: Pass session ID for clinical alerts
            )

            # Stream insights to client using WebSocket session_id (NOT database UUID)
            await manager.send_message(ws_session_id, {"type": "insight", "insights": insights})

            # Progress: Complete!
            await send_progress(ws_session_id, "insights", "complete", 100)

            # Try to save insights to database
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
                # Don't fail the whole operation if save fails

    except Exception as e:
        logger.error(f"Failed to generate insights: {e}", exc_info=True)
        # Send a simple fallback insight
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


async def handle_tone_update(session_id: str, data: Dict[str, Any], websocket: WebSocket) -> None:
    """Handle tone preference update."""
    tone_preference = data.get("tone_preference", "warm")

    from app.database import AsyncSessionLocal

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

    from app.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        chat_service = ChatService(db)
        db_session_id = manager.get_db_session(session_id)
        if db_session_id:
            await chat_service.update_deep_feeling_mode(db_session_id, deep_feeling_enabled)

    await manager.send_message(
        session_id, {"type": "deep_feeling_updated", "deep_feeling_enabled": deep_feeling_enabled}
    )


async def handle_single_emotion_result(
    session_id: str,
    db_session_id: UUID,
    analysis_result: Dict[str, Any],
    tone_preference: str,
    websocket: WebSocket,
    prosody_data: Optional[Dict[str, Any]] = None,
) -> None:
    """Handle single emotion analysis result (original behavior)."""
    from app.database import AsyncSessionLocal

    # Stream analysis
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

    # Save to database
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

    # Generate insights
    await generate_insights(
        db_session_id, session_id, analysis_result, tone_preference, prosody_data, websocket
    )


async def handle_multi_emotion_result(
    session_id: str,
    db_session_id: UUID,
    user_msg_id: UUID,
    analysis_result: Dict[str, Any],
    tone_preference: str,
    websocket: WebSocket,
) -> None:
    """Handle multi-emotion analysis result (Deep Feeling mode)."""
    from app.database import AsyncSessionLocal

    emotions = analysis_result.get("emotions", [])
    relationships = analysis_result.get("relationships", [])
    aggregate_vac = analysis_result.get("aggregate_vac", {})

    # Stream primary emotion first
    primary = next(
        (e for e in emotions if e.get("prominence") == "primary"), emotions[0] if emotions else None
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

    # Stream secondary emotions
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

    # Progress: Emotions complete
    await send_progress(session_id, "emotions", "complete", 70)

    # Stream relationships
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

    # Stream aggregate state
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

    # Progress: Aggregate complete
    await send_progress(session_id, "aggregate", "complete", 85)

    # Extract 3-way analysis data (if present)
    three_way_data = analysis_result.get("three_way_analysis")

    # Stream 3-way analysis data to frontend (if present)
    if three_way_data:
        await manager.send_message(
            session_id, {"type": "three_way_analysis", "data": three_way_data}
        )
        logger.info(
            f"Streamed 3-way analysis: discrepancy={three_way_data.get('discrepancy', {}).get('content_voice_distance', 0):.3f}"
        )

        # Progress: 3-way complete
        await send_progress(session_id, "three_way", "complete", 90)

    # Save to database
    try:
        async with AsyncSessionLocal() as db:
            chat_service = ChatService(db)

            # Save multi-emotion analysis (with 3-way data if present)
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
                three_way_data=three_way_data,  # NEW: Pass 3-way data
            )

            logger.info(
                f"Saved multi-emotion analysis for message {user_msg_id} (3-way: {three_way_data is not None})"
            )
    except Exception as db_error:
        logger.error(f"Failed to save multi-emotion analysis: {db_error}", exc_info=True)

    # Generate enhanced insights using primary emotion
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
        )


@router.get("/chat/messages/{message_id}/thread", response_model=List[DisplayMessage], tags=["Chat"])
async def get_message_thread(
    message_id: UUID,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[DisplayMessage]:
    """Retrieve the conversation thread ending at a specific message.

    Uses recursive CTEs to efficiently fetch the chain of 'reply' or 'precipitated_by'
    relationships leading up to the target message.

    Args:
        message_id: The target message UUID (leaf or mid-thread)
        limit: Max depth/messages to retrieve
        db: Database session
        current_user: Authenticated user

    Returns:
        List[DisplayMessage]: Chronological thread of messages
    """
    service = ChatService(db)
    messages = await service.get_message_thread(message_id, limit=limit)
    
    # Convert to Pydantic models
    # We use model_validate to handle the SQLAlchemy -> Pydantic conversion
    return [DisplayMessage.model_validate(msg) for msg in messages]
