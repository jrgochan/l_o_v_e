"""User Routes.

Endpoints for user profile management.
"""

from typing import Annotated, Any

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse
from app.services.chat.service import ChatService

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def read_users_me(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> Any:
    """Retrieve the profile of the currently authenticated user.

    Args:
        current_user: The active user dependency.

    Returns:
        UserResponse: The user's profile data.
    """
    return current_user


@router.get("/me/sessions")
async def read_own_sessions(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 20,
    offset: int = 0,
) -> Any:
    """Retrieve the chat session history for the current user.

    Args:
        current_user: The active user dependency.
        db: Database session.
        limit: Max sessions to return.
        offset: Pagination offset.

    Returns:
        Any: List of chat sessions.
    """
    chat_service = ChatService(db)
    # Note: ChatService.get_user_sessions expects a string ID.
    # Since we are using auth_user_id (UUID) in the model but user_id (String)
    # in the service signature, we need to ensure we query by the correct field.
    # The current ChatService.get_user_sessions queries by `ChatSession.user_id`.
    # However, for authenticated users, we might want to query by `auth_user_id`
    # OR `user_id` if we synced them.
    # But in chat_websocket.py/chat_service.py we set `user_id = str(user.id)`
    # for authenticated users.
    # So querying by `user_id = str(current_user.id)` should work.

    sessions = await chat_service.get_user_sessions(
        user_id=str(current_user.id), limit=limit, offset=offset
    )
    return sessions
