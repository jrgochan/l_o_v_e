"""WebSocket Router.

Defines the endpoints for real-time communication.
"""

import logging
from typing import Annotated, List
from uuid import UUID

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_current_user_ws, get_db
from app.api.schemas.chat import DisplayMessage
from app.api.sockets.handlers import (
    handle_deep_feeling_update,
    handle_tone_update,
    handle_user_message,
)
from app.api.sockets.manager import manager
from app.models.user import User
from app.services.chat.service import ChatService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/ws/chat/{session_id}")
async def chat_websocket(
    websocket: WebSocket,
    session_id: str,
    current_user: Annotated[User, Depends(get_current_user_ws)],
) -> None:
    """Establish a real-time WebSocket connection for emotional analysis.

    Handles the main event loop for the chat session, dispatching incoming
    messages to appropriate handlers based on `message_type`. Manage connection
    lifecycle, authentication, and error handling.

    Args:
        websocket: The WebSocket connection instance.
        session_id: Client-generated unique session identifier.
        current_user: Authenticated user (from query param token).

    Protocol:
        Expects JSON messages with a "type" field:
        - "user_message": Text or audio content.
        - "update_tone": Change response tone (warm/clinical).
        - "update_deep_feeling": Toggle multi-emotion analysis.
        - "ping": Heartbeat.

    Raises:
        WebSocketDisconnect: Client closed connection.
    """
    await manager.connect(session_id, websocket, user_id=current_user.id)

    auth_user_id = current_user.id
    user_identifier = str(current_user.id)
    logger.info("Authenticated session %s for user %s", session_id, current_user.email)

    try:
        while True:
            data = await websocket.receive_json()
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
                    {
                        "type": "error",
                        "message": f"Unknown message type: {message_type}",
                    },
                )

    except WebSocketDisconnect:
        manager.disconnect(session_id)
        logger.info("Client disconnected from session %s", session_id)

    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.error("WebSocket error for session %s: %s", session_id, e, exc_info=True)
        await manager.send_message(session_id, {"type": "error", "message": str(e)})
        manager.disconnect(session_id)


@router.get(
    "/chat/messages/{message_id}/thread",
    response_model=List[DisplayMessage],
    tags=["Chat"],
)
async def get_message_thread(
    message_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[User, Depends(get_current_user)],
    limit: int = 10,
) -> List[DisplayMessage]:
    """Retrieve the conversation thread ending at a specific message."""
    service = ChatService(db)
    messages = await service.get_message_thread(message_id, max_depth=limit)
    return [DisplayMessage.model_validate(msg) for msg in messages]
