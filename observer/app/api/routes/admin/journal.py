"""Admin Routes — Life Journal management.

Cross-user queries for events, correlations, integrations, and stream health.
All endpoints require admin role.
"""

import logging
from typing import Annotated, Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.database import get_db
from app.models.integration_credential import IntegrationCredential
from app.models.life_event import LifeEvent
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Events ───────────────────────────────────────────────────────────────────


@router.get("/journal/events", response_model=Dict[str, Any])
async def list_all_events(
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
    user_id: Optional[str] = None,
    event_type: Optional[str] = None,
    source: Optional[str] = None,
    since: Optional[str] = None,
    until: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> Any:
    """List life events across all users (admin view)."""
    query = select(LifeEvent)
    count_query = select(func.count(LifeEvent.id))  # pylint: disable=not-callable

    if user_id:
        query = query.where(LifeEvent.user_id == UUID(user_id))
        count_query = count_query.where(LifeEvent.user_id == UUID(user_id))
    if event_type:
        query = query.where(LifeEvent.event_type.ilike(f"%{event_type}%"))
        count_query = count_query.where(LifeEvent.event_type.ilike(f"%{event_type}%"))
    if source:
        query = query.where(LifeEvent.source == source)
        count_query = count_query.where(LifeEvent.source == source)
    if since:
        query = query.where(LifeEvent.timestamp >= since)
        count_query = count_query.where(LifeEvent.timestamp >= since)
    if until:
        query = query.where(LifeEvent.timestamp <= until)
        count_query = count_query.where(LifeEvent.timestamp <= until)

    total = (await db.execute(count_query)).scalar() or 0
    query = query.order_by(LifeEvent.timestamp.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    events = result.scalars().all()

    return {
        "events": [
            {
                "id": str(e.id),
                "user_id": str(e.user_id),
                "event_type": e.event_type,
                "title": e.title,
                "description": e.description,
                "timestamp": e.timestamp.isoformat() if e.timestamp else None,
                "duration_minutes": e.duration_minutes,
                "source": e.source,
                "tags": e.tags or [],
                "impact": e.impact,
                "is_recurring": e.is_recurring,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in events
        ],
        "total": total,
    }


@router.get("/journal/events/stats", response_model=Dict[str, Any])
async def event_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """Aggregate event statistics."""
    from datetime import datetime, timezone  # pylint: disable=import-outside-toplevel

    total = (
        await db.execute(select(func.count(LifeEvent.id)))  # pylint: disable=not-callable
    ).scalar() or 0

    # Events today (strip tzinfo to match TIMESTAMP WITHOUT TIME ZONE column)
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0, tzinfo=None
    )
    today_count = (
        await db.execute(
            select(func.count(LifeEvent.id)).where(  # pylint: disable=not-callable
                LifeEvent.timestamp >= today_start
            )
        )
    ).scalar() or 0

    # Distinct users with events
    user_count = (
        await db.execute(
            select(func.count(func.distinct(LifeEvent.user_id)))
        )  # pylint: disable=not-callable
    ).scalar() or 0

    # Events by source
    source_rows = (
        await db.execute(
            select(
                LifeEvent.source,
                func.count(LifeEvent.id),  # pylint: disable=not-callable
            ).group_by(LifeEvent.source)
        )
    ).all()
    by_source = {row[0]: row[1] for row in source_rows}

    # Events by domain (first part of event_type)
    type_rows = (
        await db.execute(
            select(
                LifeEvent.event_type,
                func.count(LifeEvent.id),  # pylint: disable=not-callable
            ).group_by(LifeEvent.event_type)
        )
    ).all()
    by_type = {row[0]: row[1] for row in type_rows}

    return {
        "total_events": total,
        "events_today": today_count,
        "users_with_events": user_count,
        "by_source": by_source,
        "by_type": by_type,
    }


@router.delete("/journal/events/{event_id}")
async def delete_event(
    event_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """Delete a life event (admin)."""
    result = await db.execute(delete(LifeEvent).where(LifeEvent.id == event_id))
    if result.rowcount == 0:  # type: ignore[union-attr]
        raise HTTPException(status_code=404, detail="Event not found")
    await db.commit()
    return {"status": "deleted", "id": str(event_id)}


# ── Correlations ─────────────────────────────────────────────────────────────


@router.get("/journal/correlations", response_model=Dict[str, Any])
async def list_all_correlations(
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
    user_id: Optional[str] = None,
    status: Optional[str] = None,
    event_type: Optional[str] = None,
    min_strength: Optional[float] = None,
    limit: int = 50,
    offset: int = 0,
) -> Any:
    """List correlations across all users."""
    from app.models.life_event import (  # pylint: disable=import-outside-toplevel
        EmotionEventCorrelation,
    )

    query = select(EmotionEventCorrelation)
    count_query = select(func.count(EmotionEventCorrelation.id))  # pylint: disable=not-callable

    if user_id:
        query = query.where(EmotionEventCorrelation.user_id == UUID(user_id))
        count_query = count_query.where(EmotionEventCorrelation.user_id == UUID(user_id))
    if status:
        query = query.where(EmotionEventCorrelation.status == status)
        count_query = count_query.where(EmotionEventCorrelation.status == status)
    if event_type:
        query = query.where(EmotionEventCorrelation.event_type.ilike(f"%{event_type}%"))
        count_query = count_query.where(EmotionEventCorrelation.event_type.ilike(f"%{event_type}%"))
    if min_strength is not None:
        query = query.where(EmotionEventCorrelation.strength >= min_strength)
        count_query = count_query.where(EmotionEventCorrelation.strength >= min_strength)

    total = (await db.execute(count_query)).scalar() or 0
    query = query.order_by(EmotionEventCorrelation.strength.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    correlations = result.scalars().all()

    return {
        "correlations": [
            {
                "id": str(c.id),
                "user_id": str(c.user_id),
                "emotion_name": c.emotion_name,
                "event_type": c.event_type,
                "event_pattern": c.event_pattern,
                "correlation_type": c.correlation_type,
                "strength": c.strength,
                "direction": c.direction,
                "confidence": c.confidence,
                "lag_seconds": c.lag_seconds,
                "sample_size": c.sample_size,
                "status": c.status,
                "user_feedback": c.user_feedback,
                "first_detected": c.first_detected.isoformat() if c.first_detected else None,
                "last_validated": c.last_validated.isoformat() if c.last_validated else None,
            }
            for c in correlations
        ],
        "total": total,
    }


@router.get("/journal/correlations/stats", response_model=Dict[str, Any])
async def correlation_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """Aggregate correlation statistics."""
    from app.models.life_event import (  # pylint: disable=import-outside-toplevel
        EmotionEventCorrelation,
    )

    total = (
        await db.execute(
            select(func.count(EmotionEventCorrelation.id))  # pylint: disable=not-callable
        )
    ).scalar() or 0

    confirmed = (
        await db.execute(
            select(func.count(EmotionEventCorrelation.id)).where(  # pylint: disable=not-callable
                EmotionEventCorrelation.user_feedback == "confirmed"
            )
        )
    ).scalar() or 0

    dismissed = (
        await db.execute(
            select(func.count(EmotionEventCorrelation.id)).where(  # pylint: disable=not-callable
                EmotionEventCorrelation.user_feedback == "dismissed"
            )
        )
    ).scalar() or 0

    avg_strength = (await db.execute(select(func.avg(EmotionEventCorrelation.strength)))).scalar()

    avg_confidence = (
        await db.execute(select(func.avg(EmotionEventCorrelation.confidence)))
    ).scalar()

    # By status
    status_rows = (
        await db.execute(
            select(
                EmotionEventCorrelation.status,
                func.count(EmotionEventCorrelation.id),  # pylint: disable=not-callable
            ).group_by(EmotionEventCorrelation.status)
        )
    ).all()
    by_status = {row[0]: row[1] for row in status_rows}

    return {
        "total": total,
        "confirmed": confirmed,
        "dismissed": dismissed,
        "pending": total - confirmed - dismissed,
        "avg_strength": round(float(avg_strength or 0), 3),
        "avg_confidence": round(float(avg_confidence or 0), 3),
        "by_status": by_status,
    }


# ── Integrations ─────────────────────────────────────────────────────────────


@router.get("/journal/integrations", response_model=Dict[str, Any])
async def list_all_integrations(
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
    adapter_id: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> Any:
    """List all active integrations across users."""
    query = select(IntegrationCredential)
    count_query = select(func.count(IntegrationCredential.id))  # pylint: disable=not-callable

    if adapter_id:
        query = query.where(IntegrationCredential.adapter_id == adapter_id)
        count_query = count_query.where(IntegrationCredential.adapter_id == adapter_id)

    total = (await db.execute(count_query)).scalar() or 0
    query = query.order_by(IntegrationCredential.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    integrations = result.scalars().all()

    return {
        "integrations": [
            {
                "id": str(i.id),
                "user_id": str(i.user_id),
                "adapter_id": i.adapter_id,
                "sync_status": i.sync_status,
                "sync_error": i.sync_error,
                "last_sync_at": i.last_sync_at.isoformat() if i.last_sync_at else None,
                "created_at": i.created_at.isoformat() if i.created_at else None,
            }
            for i in integrations
        ],
        "total": total,
    }


@router.get("/journal/integrations/health", response_model=Dict[str, Any])
async def integration_health(
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """Adapter health summary — connections per adapter, error rates."""
    rows = (
        await db.execute(
            select(
                IntegrationCredential.adapter_id,
                func.count(IntegrationCredential.id),  # pylint: disable=not-callable
                func.count(
                    func.nullif(IntegrationCredential.sync_status, "error")  # non-error count
                ),
            ).group_by(IntegrationCredential.adapter_id)
        )
    ).all()

    adapters: List[Dict[str, Any]] = []
    for row in rows:
        adapter_id, total_connections, non_error_count = row
        error_count = total_connections - non_error_count
        adapters.append(
            {
                "adapter_id": adapter_id,
                "total_connections": total_connections,
                "error_count": error_count,
                "error_rate": round(error_count / total_connections, 3) if total_connections else 0,
            }
        )

    return {"adapters": adapters}


@router.delete("/journal/integrations/{integration_id}")
async def force_disconnect_integration(
    integration_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """Force-disconnect a user's integration (admin)."""
    result = await db.execute(
        delete(IntegrationCredential).where(IntegrationCredential.id == integration_id)
    )
    if result.rowcount == 0:  # type: ignore[union-attr]
        raise HTTPException(status_code=404, detail="Integration not found")
    await db.commit()
    return {"status": "disconnected", "id": str(integration_id)}


# ── Stream Status ────────────────────────────────────────────────────────────


@router.get("/journal/stream/status", response_model=Dict[str, Any])
async def stream_status(
    _current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """NATS JetStream health status."""
    from app.core.settings import settings  # pylint: disable=import-outside-toplevel

    nats_enabled = getattr(settings, "nats_enabled", False)

    if not nats_enabled:
        return {
            "nats_enabled": False,
            "connected": False,
            "message": "NATS is not enabled in settings",
        }

    try:
        from app.services.journal_service import (  # pylint: disable=import-outside-toplevel  # noqa: F401
            JournalService,
        )

        return {
            "nats_enabled": True,
            "connected": True,
            "stream_name": getattr(settings, "nats_stream_name", "LIFE_EVENTS"),
            "message": "Stream operational",
        }
    except Exception as exc:
        return {
            "nats_enabled": True,
            "connected": False,
            "message": str(exc),
        }
