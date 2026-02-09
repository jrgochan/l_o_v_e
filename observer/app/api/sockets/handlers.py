"""WebSocket Logic Handlers.

Core business logic for processing WebSocket events.
Refactored to delegate complex processing to dedicated Processor classes.
"""

import logging
from typing import Any, Dict, Optional
from uuid import UUID

from fastapi import WebSocket, WebSocketDisconnect

from app.api.sockets.manager import manager
from app.api.sockets.processors import AudioProcessor, TextProcessor
from app.api.sockets.types import MessageContext, UserContext
from app.database import AsyncSessionLocal
from app.services.chat.service import ChatService

logger = logging.getLogger(__name__)

# Instantiate processors
text_processor = TextProcessor()
audio_processor = AudioProcessor()


async def handle_user_message(
    session_id: str,
    data: Dict[str, Any],
    websocket: WebSocket,
    user_identifier: str = "guest",
    auth_user_id: Optional[UUID] = None,
) -> None:
    """Orchestrate the processing of an incoming user message.

    Delegates to TextProcessor or AudioProcessor.
    """
    content = data.get("content")
    audio_data = data.get("audio_data")  # Base64 encoded

    # Build Context
    context = _build_message_context(session_id, websocket, user_identifier, auth_user_id, data)

    # Send acknowledgment
    await manager.send_message(session_id, {"type": "message_received", "timestamp": "now"})

    # Determine if text or audio
    is_audio = audio_data is not None

    try:
        if is_audio:
            await audio_processor.process(
                context,
                str(audio_data) if audio_data else "",
                content,
            )
        else:
            await text_processor.process(
                context,
                str(content) if content else "",
            )

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected for session %s", session_id)
    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.error("Error processing message: %s", e, exc_info=True)
        await manager.send_message(
            session_id, {"type": "error", "message": f"Processing failed: {str(e)}"}
        )


async def handle_tone_update(session_id: str, data: Dict[str, Any], _websocket: WebSocket) -> None:
    """Handle tone preference update from client."""
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
    session_id: str, data: Dict[str, Any], _websocket: WebSocket
) -> None:
    """Handle Deep Feeling mode toggle from client."""
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


def _build_message_context(
    session_id: str,
    websocket: WebSocket,
    user_identifier: str,
    auth_user_id: Optional[UUID],
    data: Dict[str, Any],
) -> MessageContext:
    """Construct MessageContext from raw data."""
    tone_preference = data.get("tone_preference", "warm")
    deep_feeling_enabled = data.get("deep_feeling_enabled", False)

    related_message_id_str = data.get("related_message_id")
    related_message_id: Optional[UUID] = None
    if related_message_id_str:
        try:
            related_message_id = UUID(related_message_id_str)
        except (ValueError, TypeError):
            logger.warning("Invalid related_message_id format: %s", related_message_id_str)

    return MessageContext(
        session_id=session_id,
        websocket=websocket,
        user=UserContext(
            identifier=user_identifier,
            auth_user_id=auth_user_id,
            tone_preference=tone_preference,
        ),
        deep_feeling_enabled=deep_feeling_enabled,
        related_message_id=related_message_id,
        relationship_type=data.get("relationship_type"),
        relationship_metadata=data.get("relationship_metadata"),
    )
