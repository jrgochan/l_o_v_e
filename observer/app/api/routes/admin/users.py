"""Admin Routes — Users and Sessions management."""

import logging
from typing import Annotated, Any, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.database import get_db
from app.models.chat_session import ChatSession
from app.models.user import User
from app.models.user_trajectory import UserTrajectory
from app.schemas.user import UserResponse, UserUpdate

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """List all registered users with pagination."""
    stmt = select(User).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """Retrieve a specific user profile by ID."""
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    user_in: UserUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """Update user account details (role, status, etc.)."""
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_in.model_dump(exclude_unset=True)

    if "password" in update_data:
        from app.core.security import get_password_hash  # pylint: disable=import-outside-toplevel

        update_data["password_hash"] = get_password_hash(update_data.pop("password"))

    for field, value in update_data.items():
        setattr(user, field, value)

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/users/{user_id}/sessions")
async def get_user_sessions(
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
    limit: int = 20,
) -> Any:
    """Retrieve recent chat sessions for a specific user."""
    stmt = (
        select(ChatSession)
        .where(ChatSession.auth_user_id == user_id)
        .order_by(ChatSession.started_at.desc())
        .limit(limit)
    )

    result = await db.execute(stmt)
    sessions = result.scalars().all()

    return [s.to_dict() for s in sessions]


@router.get("/users/{user_id}/trajectory")
async def get_user_trajectory(
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
    limit: int = 100,
) -> Any:
    """Retrieve emotional trajectory data points for a user."""
    stmt = (
        select(UserTrajectory)
        .where(UserTrajectory.user_id == user_id)
        .order_by(UserTrajectory.timestamp.desc())
        .limit(limit)
    )

    result = await db.execute(stmt)
    points = result.scalars().all()

    return [p.to_dict() for p in points]


@router.get("/sessions")
async def list_sessions(
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
    skip: int = 0,
    limit: int = 50,
) -> Any:
    """List all chat sessions system-wide (paginated)."""
    from sqlalchemy import func  # pylint: disable=import-outside-toplevel
    from sqlalchemy.orm import selectinload  # pylint: disable=import-outside-toplevel

    count_stmt = select(func.count(ChatSession.id))  # pylint: disable=not-callable
    count_res = await db.execute(count_stmt)
    total = count_res.scalar()

    stmt = (
        select(ChatSession)
        .options(selectinload(ChatSession.user))
        .order_by(ChatSession.started_at.desc())
        .offset(skip)
        .limit(limit)
    )

    result = await db.execute(stmt)
    sessions = result.scalars().all()

    return {
        "total": total,
        "items": [s.to_dict() for s in sessions],
        "skip": skip,
        "limit": limit,
    }


@router.get("/sessions/{session_id}")
async def get_session_details(
    session_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """Get full details of a specific chat session, including messages."""
    from sqlalchemy.orm import selectinload  # pylint: disable=import-outside-toplevel

    stmt = (
        select(ChatSession)
        .options(selectinload(ChatSession.messages), selectinload(ChatSession.user))
        .where(ChatSession.id == session_id)
    )

    result = await db.execute(stmt)
    session = result.scalars().first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    data = session.to_dict()

    messages = session.messages
    messages.sort(key=lambda m: m.created_at)

    data["messages"] = [m.to_dict() for m in messages]

    return data


# ---------------------------------------------------------------------------
# Audit log viewer
# ---------------------------------------------------------------------------


@router.get("/audit-log")
async def list_audit_log(
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
    skip: int = 0,
    limit: int = 50,
    event_type: str | None = None,
    actor_id: UUID | None = None,
) -> Any:
    """Paginated view of the system audit log.

    Supports filtering by event_type and/or actor_id.
    """
    from sqlalchemy import func as sa_func  # pylint: disable=import-outside-toplevel

    from app.models.audit_log import AuditLog  # pylint: disable=import-outside-toplevel

    # Count
    count_stmt = select(sa_func.count(AuditLog.id))  # pylint: disable=not-callable
    if event_type:
        count_stmt = count_stmt.where(AuditLog.event_type == event_type)
    if actor_id:
        count_stmt = count_stmt.where(AuditLog.actor_id == actor_id)

    total = (await db.execute(count_stmt)).scalar() or 0

    # Data
    stmt = select(AuditLog).order_by(AuditLog.timestamp.desc())
    if event_type:
        stmt = stmt.where(AuditLog.event_type == event_type)
    if actor_id:
        stmt = stmt.where(AuditLog.actor_id == actor_id)
    stmt = stmt.offset(skip).limit(limit)

    result = await db.execute(stmt)
    entries = result.scalars().all()

    return {
        "total": total,
        "items": [
            {
                "id": str(e.id),
                "event_type": e.event_type,
                "actor_id": str(e.actor_id) if e.actor_id else None,
                "target_id": str(e.target_id) if e.target_id else None,
                "metadata": e.metadata_,
                "ip_address": e.ip_address,
                "timestamp": e.timestamp.isoformat() if e.timestamp else None,
            }
            for e in entries
        ],
        "skip": skip,
        "limit": limit,
    }
