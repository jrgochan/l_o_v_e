"""Audit Log Event Subscriber — Writes domain events to the audit_log table.

Registered as a global subscriber on the event bus at app startup.
Every domain event is automatically persisted to the database.
"""

import logging

from app.core.events import DomainEvent
from app.database import AsyncSessionLocal
from app.models.audit_log import AuditLog

logger = logging.getLogger(__name__)


async def audit_log_handler(event: DomainEvent) -> None:
    """Persist a domain event to the audit_log table.

    Uses its own database session to avoid coupling with the
    caller's transaction (audit should succeed even if the
    caller's session has issues).
    """
    async with AsyncSessionLocal() as session:
        try:
            entry = AuditLog(
                event_type=event.event_type,
                actor_id=event.actor_id,
                target_id=event.target_id,
                metadata_=event.metadata,
                ip_address=event.ip_address,
                timestamp=event.timestamp,
            )
            session.add(entry)
            await session.commit()
        except Exception:  # pylint: disable=broad-except
            logger.exception("Failed to write audit log for event '%s'", event.event_type)
            await session.rollback()
