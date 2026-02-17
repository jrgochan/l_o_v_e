"""Audit Log Model — Immutable record of system events.

Stores every significant action for compliance, debugging, and security review.
Populated automatically by the domain event bus subscriber.
"""

# pylint: disable=not-callable

from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID, uuid4

from sqlalchemy import DateTime, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AuditLog(Base):
    """Immutable audit trail entry.

    Each row represents a single domain event that occurred in the system.
    These records are append-only — they should never be updated or deleted.
    """

    __tablename__ = "audit_log"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)

    # What happened
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    # Who did it
    actor_id: Mapped[Optional[UUID]] = mapped_column(nullable=True)

    # What was affected
    target_id: Mapped[Optional[UUID]] = mapped_column(nullable=True)

    # Additional context (flexible schema)
    metadata_: Mapped[Dict[str, Any]] = mapped_column(
        "metadata", JSONB, default=dict, server_default="{}"
    )

    # Request context
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)

    # When it happened
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Composite indexes for common query patterns
    __table_args__ = (
        Index("idx_audit_log_actor_time", "actor_id", timestamp.desc()),
        Index("idx_audit_log_target_time", "target_id", timestamp.desc()),
    )

    def __repr__(self) -> str:
        """Represent the object as a string."""
        return f"<AuditLog {self.event_type} actor={self.actor_id} @ {self.timestamp}>"
