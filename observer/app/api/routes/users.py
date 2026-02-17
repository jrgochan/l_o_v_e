"""User Routes.

Endpoints for user profile management and self-service account operations.
"""

import logging
from typing import Annotated, Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.database import get_db
from app.models.user import User
from app.schemas.user import PasswordChange, UserProfileUpdate, UserResponse
from app.services.chat.service import ChatService
from app.services.user_service import UserService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def read_users_me(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> Any:
    """Retrieve the profile of the currently authenticated user."""
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_my_profile(
    profile_data: UserProfileUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
) -> Any:
    """Update the current user's profile (name and/or email).

    Users cannot change their own role, status, or password through this
    endpoint. Use PUT /users/me/password for password changes.
    """
    service = UserService(db)
    try:
        user = await service.update_profile(
            current_user,
            full_name=profile_data.full_name,
            email=profile_data.email,
            ip_address=request.client.host if request.client else None,
        )
        return user
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e)) from e


@router.put("/me/password")
async def change_my_password(
    password_data: PasswordChange,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
) -> Dict[str, str]:
    """Change the current user's password.

    Requires the current password for verification.
    The new password must meet complexity requirements
    (8+ chars, uppercase, lowercase, digit, special character).
    """
    service = UserService(db)
    try:
        await service.change_password(
            current_user,
            current_password=password_data.current_password,
            new_password=password_data.new_password,
            ip_address=request.client.host if request.client else None,
        )
        return {"message": "Password changed successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.delete("/me")
async def delete_my_account(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
) -> Dict[str, str]:
    """Soft-delete the current user's account.

    The account is deactivated immediately. Data is retained for
    the configured retention period before permanent purge.
    This action can be reversed by an admin within the retention window.
    """
    service = UserService(db)
    await service.soft_delete_account(
        current_user,
        ip_address=request.client.host if request.client else None,
    )
    return {
        "message": "Account has been deleted. Your data will be purged after the retention period."
    }


@router.get("/me/export")
async def export_my_data(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Dict[str, Any]:
    """Export all personal data as JSON.

    Includes: profile, sessions, messages, emotional trajectory,
    and clinical alerts. Supports GDPR Article 20 (data portability).
    """
    service = UserService(db)
    return await service.export_data(current_user)


@router.get("/me/sessions")
async def read_own_sessions(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 20,
    offset: int = 0,
) -> Any:
    """Retrieve the chat session history for the current user."""
    chat_service = ChatService(db)
    sessions = await chat_service.get_user_sessions(
        user_id=str(current_user.id), limit=limit, offset=offset
    )
    return [session.to_dict() for session in sessions]
