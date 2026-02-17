"""Clinician Routes — Client management and clinical oversight.

Provides clinicians with scoped access to their assigned clients'
sessions, emotional trajectories, and clinical alerts.
"""

import logging
from typing import Annotated, Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_clinician
from app.database import get_db
from app.models.chat_session import ChatSession
from app.models.clinical_alert import ClinicalAlert
from app.models.user import User
from app.models.user_trajectory import UserTrajectory
from app.schemas.user import UserResponse

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _verify_client_assignment(db: AsyncSession, clinician: User, client_id: UUID) -> User:
    """Ensure the client is assigned to this clinician (or clinician is admin)."""
    from app.models.user import UserRole  # noqa: E501 # pylint: disable=import-outside-toplevel

    stmt = select(User).where(User.id == client_id, User.deleted_at.is_(None))
    result = await db.execute(stmt)
    client = result.scalars().first()

    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Admins bypass assignment check
    if clinician.role == UserRole.ADMIN:
        return client

    if client.assigned_clinician_id != clinician.id:
        raise HTTPException(
            status_code=403,
            detail="This client is not assigned to you",
        )
    return client


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/clients", response_model=List[UserResponse])
async def list_clients(
    db: Annotated[AsyncSession, Depends(get_db)],
    clinician: Annotated[User, Depends(get_current_clinician)],
) -> Any:
    """List all clients assigned to the current clinician.

    Admins see all non-deleted users with an assigned clinician.
    """
    from app.models.user import UserRole  # pylint: disable=import-outside-toplevel

    if clinician.role == UserRole.ADMIN:
        # Admins see all users who have any clinician assigned
        stmt = select(User).where(
            User.assigned_clinician_id.isnot(None),
            User.deleted_at.is_(None),
        )
    else:
        stmt = select(User).where(
            User.assigned_clinician_id == clinician.id,
            User.deleted_at.is_(None),
        )

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/clients/{client_id}/sessions")
async def get_client_sessions(
    client_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    clinician: Annotated[User, Depends(get_current_clinician)],
    limit: int = Query(20, le=100),
) -> Any:
    """Retrieve recent chat sessions for an assigned client."""
    await _verify_client_assignment(db, clinician, client_id)

    stmt = (
        select(ChatSession)
        .where(ChatSession.auth_user_id == client_id)
        .order_by(ChatSession.started_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    sessions = result.scalars().all()
    return [s.to_dict() for s in sessions]


@router.get("/clients/{client_id}/trajectory")
async def get_client_trajectory(
    client_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    clinician: Annotated[User, Depends(get_current_clinician)],
    limit: int = Query(100, le=500),
) -> Any:
    """Retrieve emotional trajectory for an assigned client."""
    await _verify_client_assignment(db, clinician, client_id)

    stmt = (
        select(UserTrajectory)
        .where(UserTrajectory.user_id == client_id)
        .order_by(UserTrajectory.timestamp.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    points = result.scalars().all()
    return [p.to_dict() for p in points]


@router.get("/alerts")
async def list_clinician_alerts(
    db: Annotated[AsyncSession, Depends(get_db)],
    clinician: Annotated[User, Depends(get_current_clinician)],
    limit: int = Query(50, le=200),
) -> Any:
    """List clinical alerts for the clinician's assigned clients.

    Joins through ChatSession → User to scope alerts to assigned clients.
    """
    from app.models.user import UserRole  # pylint: disable=import-outside-toplevel

    stmt = (
        select(ClinicalAlert)
        .join(ChatSession, ClinicalAlert.session_id == ChatSession.id)
        .join(User, ChatSession.auth_user_id == User.id)
        .where(User.deleted_at.is_(None))
    )

    if clinician.role != UserRole.ADMIN:
        stmt = stmt.where(User.assigned_clinician_id == clinician.id)

    stmt = stmt.order_by(ClinicalAlert.timestamp.desc()).limit(limit)

    result = await db.execute(stmt)
    alerts = result.scalars().all()
    return [a.to_dict() for a in alerts]


@router.get("/alerts/summary")
async def get_alert_summary(
    db: Annotated[AsyncSession, Depends(get_db)],
    clinician: Annotated[User, Depends(get_current_clinician)],
) -> Dict[str, Any]:
    """Aggregate alert counts by severity for the clinician's clients."""
    from app.models.user import UserRole  # pylint: disable=import-outside-toplevel

    base = (
        select(
            ClinicalAlert.level,
            func.count().label("count"),  # pylint: disable=not-callable
        )
        .join(ChatSession, ClinicalAlert.session_id == ChatSession.id)
        .join(User, ChatSession.auth_user_id == User.id)
        .where(User.deleted_at.is_(None))
    )

    if clinician.role != UserRole.ADMIN:
        base = base.where(User.assigned_clinician_id == clinician.id)

    base = base.group_by(ClinicalAlert.level)

    result = await db.execute(base)
    rows = result.all()

    summary: Dict[str, int] = {}
    for level, count in rows:
        summary[level] = count

    total_clients_stmt = select(func.count(User.id)).where(  # pylint: disable=not-callable
        User.deleted_at.is_(None),
    )
    if clinician.role != UserRole.ADMIN:
        total_clients_stmt = total_clients_stmt.where(
            User.assigned_clinician_id == clinician.id,
        )

    total_clients = (await db.execute(total_clients_stmt)).scalar() or 0

    return {
        "total_clients": total_clients,
        "alerts_by_severity": summary,
        "total_alerts": sum(summary.values()),
    }


# ---------------------------------------------------------------------------
# Clinical Notes CRUD
# ---------------------------------------------------------------------------


@router.get("/clients/{client_id}/notes")
async def list_client_notes(
    client_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    clinician: Annotated[User, Depends(get_current_clinician)],
) -> Any:
    """List all clinical notes for a client written by this clinician."""
    await _verify_client_assignment(db, clinician, client_id)

    from app.models.clinical_note import ClinicalNote  # pylint: disable=import-outside-toplevel

    stmt = (
        select(ClinicalNote)
        .where(
            ClinicalNote.client_id == client_id,
            ClinicalNote.clinician_id == clinician.id,
        )
        .order_by(ClinicalNote.updated_at.desc())
    )
    result = await db.execute(stmt)
    notes = result.scalars().all()
    return [n.to_dict() for n in notes]


@router.post("/clients/{client_id}/notes", status_code=201)
async def create_client_note(  # pylint: disable=too-many-positional-arguments, too-many-arguments
    client_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    clinician: Annotated[User, Depends(get_current_clinician)],
    content: str = "",
    category: str = "general",
    session_id: Optional[UUID] = None,
) -> Any:
    """Create a clinical note for a client."""
    await _verify_client_assignment(db, clinician, client_id)

    from app.models.clinical_note import ClinicalNote  # pylint: disable=import-outside-toplevel

    note = ClinicalNote(
        clinician_id=clinician.id,
        client_id=client_id,
        session_id=session_id,
        content=content,
        category=category,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note.to_dict()


@router.put("/notes/{note_id}")
async def update_note(
    note_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    clinician: Annotated[User, Depends(get_current_clinician)],
    content: Optional[str] = None,
    category: Optional[str] = None,
) -> Any:
    """Update a clinical note (only the owning clinician)."""
    from app.models.clinical_note import ClinicalNote  # pylint: disable=import-outside-toplevel

    stmt = select(ClinicalNote).where(
        ClinicalNote.id == note_id,
        ClinicalNote.clinician_id == clinician.id,
    )
    result = await db.execute(stmt)
    note = result.scalars().first()

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    if content is not None:
        note.content = content
    if category is not None:
        note.category = category

    await db.commit()
    await db.refresh(note)
    return note.to_dict()


@router.delete("/notes/{note_id}", status_code=204)
async def delete_note(
    note_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    clinician: Annotated[User, Depends(get_current_clinician)],
) -> None:
    """Delete a clinical note (only the owning clinician)."""
    from app.models.clinical_note import ClinicalNote  # pylint: disable=import-outside-toplevel

    stmt = select(ClinicalNote).where(
        ClinicalNote.id == note_id,
        ClinicalNote.clinician_id == clinician.id,
    )
    result = await db.execute(stmt)
    note = result.scalars().first()

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    await db.delete(note)
    await db.commit()


# ---------------------------------------------------------------------------
# Alert Acknowledgment
# ---------------------------------------------------------------------------


@router.post("/alerts/{alert_id}/acknowledge", status_code=201)
async def acknowledge_alert(
    alert_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    clinician: Annotated[User, Depends(get_current_clinician)],
    action_taken: str = "reviewed",
    response_note: Optional[str] = None,
) -> Any:
    """Acknowledge (review) a clinical alert."""
    from app.models.alert_acknowledgment import (  # pylint: disable=import-outside-toplevel
        AlertAcknowledgment,
    )

    # Verify alert exists
    alert_stmt = select(ClinicalAlert).where(ClinicalAlert.id == alert_id)
    alert_result = await db.execute(alert_stmt)
    alert = alert_result.scalars().first()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    # Check if already acknowledged
    existing_stmt = select(AlertAcknowledgment).where(AlertAcknowledgment.alert_id == alert_id)
    existing = (await db.execute(existing_stmt)).scalars().first()
    if existing:
        raise HTTPException(status_code=409, detail="Alert already acknowledged")

    ack = AlertAcknowledgment(
        alert_id=alert_id,
        clinician_id=clinician.id,
        action_taken=action_taken,
        response_note=response_note,
    )
    db.add(ack)
    await db.commit()
    await db.refresh(ack)
    return ack.to_dict()
