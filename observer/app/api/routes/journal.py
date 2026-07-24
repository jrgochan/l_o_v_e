"""Life Journal Routes — REST API for life event management.

Provides CRUD endpoints for life events, correlation queries, and
daily summaries. All endpoints are authenticated and scoped to the
current user — no cross-user access is possible.

Requires the user to have granted ``life_journal`` consent.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Annotated, Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, get_db
from app.models.user import User
from app.schemas.journal import (
    CorrelationFeedbackRequest,
    LifeEventCreate,
    LifeEventUpdate,
)
from app.services.journal_service import LifeJournalService

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Life Events — CRUD
# ---------------------------------------------------------------------------


@router.post("/events", status_code=201)
async def create_event(
    body: LifeEventCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
) -> Any:
    """Create a new life event.

    Requires ``life_journal`` consent.
    """
    service = LifeJournalService(db)
    ip = request.client.host if request.client else None

    event = await service.create_event(
        current_user.id,
        body,
        ip_address=ip,
    )
    await db.commit()
    return event.to_dict()


@router.get("/events")
async def list_events(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    event_type: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    order: str = Query("desc", pattern="^(asc|desc)$"),
) -> Any:
    """List life events with filtering and pagination.

    Supports filtering by date range, event type (prefix with ``*`` for
    domain match: ``wellness.*``), and source.
    """
    service = LifeJournalService(db)

    events, total = await service.list_events(
        current_user.id,
        start_date=start_date,
        end_date=end_date,
        event_type=event_type,
        source=source,
        limit=limit,
        offset=offset,
        order=order,
    )

    return {
        "events": [e.to_dict() for e in events],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/events/{event_id}")
async def get_event(
    event_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    """Get a single life event by ID."""
    service = LifeJournalService(db)
    event = await service.get_event(current_user.id, event_id)

    if event is None:
        raise HTTPException(status_code=404, detail="Life event not found")

    return event.to_dict()


@router.put("/events/{event_id}")
async def update_event(
    event_id: UUID,
    body: LifeEventUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
) -> Any:
    """Update an existing life event.

    Partial update — only fields present in the request body are changed.
    """
    service = LifeJournalService(db)
    ip = request.client.host if request.client else None

    event = await service.update_event(
        current_user.id,
        event_id,
        body,
        ip_address=ip,
    )
    await db.commit()

    if event is None:
        raise HTTPException(status_code=404, detail="Life event not found")

    return event.to_dict()


@router.delete("/events/{event_id}")
async def delete_event(
    event_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
) -> Any:
    """Delete a life event."""
    service = LifeJournalService(db)
    ip = request.client.host if request.client else None

    deleted = await service.delete_event(
        current_user.id,
        event_id,
        ip_address=ip,
    )
    await db.commit()

    if not deleted:
        raise HTTPException(status_code=404, detail="Life event not found")

    return {"message": "Life event deleted", "id": str(event_id)}


@router.delete("/events")
async def delete_all_events(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
) -> Any:
    """Delete ALL life events for the current user (GDPR erasure).

    This is irreversible. Emits an audit event.
    """
    service = LifeJournalService(db)
    ip = request.client.host if request.client else None

    count = await service.delete_all_events(
        current_user.id,
        ip_address=ip,
    )
    await db.commit()

    return {
        "message": f"Deleted {count} life event(s)",
        "count": count,
    }


# ---------------------------------------------------------------------------
# Daily Summary
# ---------------------------------------------------------------------------


@router.get("/summary/daily")
async def daily_summary(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    date: Optional[datetime] = Query(None, description="Date (defaults to today)"),
) -> Any:
    """Get an aggregated daily summary of life events."""
    service = LifeJournalService(db)
    target_date = date or datetime.utcnow()
    return await service.get_daily_summary(current_user.id, target_date)


# ---------------------------------------------------------------------------
# Correlation Feedback (stub for Phase 2)
# ---------------------------------------------------------------------------


@router.post("/correlations/{correlation_id}/feedback")
async def correlation_feedback(
    correlation_id: UUID,
    body: CorrelationFeedbackRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    """Confirm or dismiss a discovered correlation.

    Confirmed correlations get boosted weight in insight generation.
    Dismissed correlations are suppressed from future insights.
    """
    from sqlalchemy import and_, select

    from app.models.emotion_event_correlation import EmotionEventCorrelation

    stmt = select(EmotionEventCorrelation).where(
        and_(
            EmotionEventCorrelation.id == correlation_id,
            EmotionEventCorrelation.user_id == current_user.id,
        )
    )
    result = await db.execute(stmt)
    correlation = result.scalars().first()

    if correlation is None:
        raise HTTPException(status_code=404, detail="Correlation not found")

    correlation.user_feedback = body.feedback
    correlation.user_feedback_at = datetime.utcnow()
    correlation.status = "user_confirmed" if body.feedback == "confirmed" else "user_dismissed"

    await db.commit()

    return {
        "message": f"Correlation {body.feedback}",
        "correlation": correlation.to_dict(),
    }


@router.get("/correlations")
async def list_correlations(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    status: Optional[str] = Query("active"),
    min_strength: float = Query(0.3, ge=0.0, le=1.0),
    event_type: Optional[str] = Query(None),
    emotion_name: Optional[str] = Query(None),
) -> Any:
    """List active correlations for the current user."""
    from sqlalchemy import and_, select

    from app.models.emotion_event_correlation import EmotionEventCorrelation

    conditions = [EmotionEventCorrelation.user_id == current_user.id]

    if status:
        conditions.append(EmotionEventCorrelation.status == status)
    conditions.append(EmotionEventCorrelation.strength >= min_strength)

    if event_type:
        conditions.append(EmotionEventCorrelation.event_type == event_type)
    if emotion_name:
        conditions.append(EmotionEventCorrelation.emotion_name == emotion_name)

    stmt = (
        select(EmotionEventCorrelation)
        .where(and_(*conditions))
        .order_by(EmotionEventCorrelation.strength.desc())
    )
    result = await db.execute(stmt)
    correlations = list(result.scalars().all())

    return {
        "correlations": [c.to_dict() for c in correlations],
        "total": len(correlations),
    }
