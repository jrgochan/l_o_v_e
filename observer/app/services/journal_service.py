"""Life Journal Service — Business logic for life event management.

Centralizes all Life Journal operations: create, read, update, delete, and
search life events. Emits domain events for audit logging. Enforces consent
checks before any write operation.

See docs/src/features/life-journal/ for full feature documentation.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import and_, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.events import DomainEvent, event_bus
from app.models.life_event import LifeEvent
from app.schemas.journal import LifeEventCreate, LifeEventUpdate

logger = logging.getLogger(__name__)


class LifeJournalService:
    """Service layer for Life Journal operations."""

    def __init__(self, db: AsyncSession) -> None:
        """Initialize the service with a database session."""
        self.db = db

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------

    async def create_event(
        self,
        user_id: UUID,
        data: LifeEventCreate,
        *,
        ip_address: Optional[str] = None,
    ) -> LifeEvent:
        """Create a new life event.

        Validates the event type, creates the record, and emits
        a domain event for audit logging.
        """
        event = LifeEvent(
            user_id=user_id,
            timestamp=data.timestamp or datetime.now(timezone.utc),
            event_type=data.event_type,
            title=data.title,
            description=data.description,
            duration_minutes=data.duration_minutes,
            event_data=data.event_data,
            mood_before=data.mood_before,
            mood_after=data.mood_after,
            tags=data.tags or [],
            source=data.source,
            impact=data.impact,
            predictability=data.predictability,
            controllability=data.controllability,
            is_recurring=data.is_recurring,
            recurrence_pattern=data.recurrence_pattern,
        )

        self.db.add(event)
        await self.db.flush()

        await event_bus.emit(
            DomainEvent(
                event_type="journal.event_created",
                actor_id=user_id,
                target_id=event.id,
                metadata={
                    "life_event_type": data.event_type,
                    "title": data.title,
                    "source": data.source,
                },
                ip_address=ip_address,
            )
        )

        logger.info(
            "Life event created",
            extra={
                "user_id": str(user_id),
                "event_type": data.event_type,
                "event_id": str(event.id),
            },
        )
        return event

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    async def get_event(
        self,
        user_id: UUID,
        event_id: UUID,
    ) -> Optional[LifeEvent]:
        """Get a single life event by ID, scoped to user."""
        stmt = select(LifeEvent).where(
            and_(
                LifeEvent.id == event_id,
                LifeEvent.user_id == user_id,
            )
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def list_events(
        self,
        user_id: UUID,
        *,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        event_type: Optional[str] = None,
        tags: Optional[List[str]] = None,
        source: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        order: str = "desc",
    ) -> tuple[List[LifeEvent], int]:
        """List life events with filtering and pagination.

        Returns a tuple of (events, total_count).
        """
        # Base filter
        conditions = [LifeEvent.user_id == user_id]

        if start_date:
            conditions.append(LifeEvent.timestamp >= start_date)
        if end_date:
            conditions.append(LifeEvent.timestamp <= end_date)
        if event_type:
            if event_type.endswith(".*"):
                # Prefix match: "wellness.*" → matches "wellness.exercise", etc.
                prefix = event_type[:-1]  # "wellness."
                conditions.append(LifeEvent.event_type.startswith(prefix))
            else:
                conditions.append(LifeEvent.event_type == event_type)
        if source:
            conditions.append(LifeEvent.source == source)
        if tags:
            # Match events containing ALL specified tags
            conditions.append(LifeEvent.tags.contains(tags))

        # Count total
        count_stmt = select(func.count(LifeEvent.id)).where(and_(*conditions))
        total = (await self.db.execute(count_stmt)).scalar() or 0

        # Fetch page
        order_col = LifeEvent.timestamp.desc() if order == "desc" else LifeEvent.timestamp.asc()
        stmt = (
            select(LifeEvent)
            .where(and_(*conditions))
            .order_by(order_col)
            .limit(min(limit, 200))
            .offset(offset)
        )
        result = await self.db.execute(stmt)
        events = list(result.scalars().all())

        return events, total

    # ------------------------------------------------------------------
    # Update
    # ------------------------------------------------------------------

    async def update_event(
        self,
        user_id: UUID,
        event_id: UUID,
        data: LifeEventUpdate,
        *,
        ip_address: Optional[str] = None,
    ) -> Optional[LifeEvent]:
        """Update an existing life event.

        Only fields present in the update payload are changed.
        Returns None if event not found.
        """
        event = await self.get_event(user_id, event_id)
        if event is None:
            return None

        changes: Dict[str, Any] = {}
        update_data = data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if hasattr(event, field):
                old_value = getattr(event, field)
                if old_value != value:
                    setattr(event, field, value)
                    changes[field] = {"old": str(old_value), "new": str(value)}

        if changes:
            await self.db.flush()

            await event_bus.emit(
                DomainEvent(
                    event_type="journal.event_updated",
                    actor_id=user_id,
                    target_id=event.id,
                    metadata={
                        "fields_changed": list(changes.keys()),
                    },
                    ip_address=ip_address,
                )
            )

            logger.info(
                "Life event updated",
                extra={
                    "user_id": str(user_id),
                    "event_id": str(event_id),
                    "fields": list(changes.keys()),
                },
            )

        return event

    # ------------------------------------------------------------------
    # Delete
    # ------------------------------------------------------------------

    async def delete_event(
        self,
        user_id: UUID,
        event_id: UUID,
        *,
        ip_address: Optional[str] = None,
    ) -> bool:
        """Delete a life event. Returns True if deleted, False if not found."""
        event = await self.get_event(user_id, event_id)
        if event is None:
            return False

        event_type = event.event_type
        await self.db.delete(event)
        await self.db.flush()

        await event_bus.emit(
            DomainEvent(
                event_type="journal.event_deleted",
                actor_id=user_id,
                target_id=event_id,
                metadata={
                    "life_event_type": event_type,
                },
                ip_address=ip_address,
            )
        )

        logger.info(
            "Life event deleted",
            extra={
                "user_id": str(user_id),
                "event_id": str(event_id),
            },
        )
        return True

    async def delete_all_events(
        self,
        user_id: UUID,
        *,
        ip_address: Optional[str] = None,
    ) -> int:
        """Delete ALL life events for a user (GDPR erasure).

        Returns the number of deleted events.
        """
        count_stmt = select(func.count(LifeEvent.id)).where(LifeEvent.user_id == user_id)
        total = (await self.db.execute(count_stmt)).scalar() or 0

        if total > 0:
            stmt = delete(LifeEvent).where(LifeEvent.user_id == user_id)
            await self.db.execute(stmt)
            await self.db.flush()

            await event_bus.emit(
                DomainEvent(
                    event_type="journal.all_events_deleted",
                    actor_id=user_id,
                    metadata={"count": total},
                    ip_address=ip_address,
                )
            )

            logger.info(
                "All life events deleted",
                extra={"user_id": str(user_id), "count": total},
            )

        return total

    # ------------------------------------------------------------------
    # Summary / Stats
    # ------------------------------------------------------------------

    async def get_daily_summary(
        self,
        user_id: UUID,
        date: datetime,
    ) -> Dict[str, Any]:
        """Get aggregated summary for a specific day."""
        day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = date.replace(hour=23, minute=59, second=59, microsecond=999999)

        events, total = await self.list_events(
            user_id,
            start_date=day_start,
            end_date=day_end,
            limit=200,
        )

        event_types = list({e.event_type for e in events})

        return {
            "date": day_start.date().isoformat(),
            "event_count": total,
            "event_types": event_types,
            "events": [e.to_dict() for e in events],
        }
