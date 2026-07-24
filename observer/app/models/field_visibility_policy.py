"""FieldVisibilityPolicy Model — Per-User Field-Level RBAC.

Provides granular control over who can see which fields of which life event
types. Every user gets one policy record with secure defaults — everything
``self``-only until the user explicitly opens access.

See ``docs/src/features/life-journal/07-privacy-ethics.md`` for the full
RBAC design, audience model, and clinician access flow.

Architecture:
    - domain_policies: Domain-level visibility defaults
      e.g., {"wellness": ["self", "clinician"], "mental": ["self"]}

    - field_overrides: Field-level overrides (more specific wins)
      e.g., {"wellness.medication.event_data.medication_name": ["self"]}

    Override resolution: field_override > domain_policy > global default (self-only)
"""

# pylint: disable=not-callable

import json
from datetime import datetime
from typing import Any, Dict
from uuid import UUID, uuid4

from sqlalchemy import ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

# ── Default Policies (Secure by Default) ──────────────────────────────────
# Every domain starts as self-only. Users explicitly open access.

DEFAULT_DOMAIN_POLICIES: Dict[str, Any] = {
    "wellness": {"visible_to": ["self"]},
    "work": {"visible_to": ["self"]},
    "relationship": {"visible_to": ["self"]},
    "mental": {"visible_to": ["self"]},
    "environment": {"visible_to": ["self", "clinician"]},
    "growth": {"visible_to": ["self", "clinician"]},
    "financial": {"visible_to": ["self"]},
    "custom": {"visible_to": ["self"]},
}


class FieldVisibilityPolicy(Base):
    """Per-user field-level visibility configuration for life event data.

    One record per user. Created with secure defaults when the user
    first enables the Life Journal feature.
    """

    __tablename__ = "field_visibility_policies"

    # ═══════════════════════════════════════════════════════════════════════
    # Identity
    # ═══════════════════════════════════════════════════════════════════════
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # ═══════════════════════════════════════════════════════════════════════
    # Domain-Level Policies
    # ═══════════════════════════════════════════════════════════════════════
    domain_policies: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        default=lambda: dict(DEFAULT_DOMAIN_POLICIES),
        server_default=json.dumps(DEFAULT_DOMAIN_POLICIES),
    )
    """Domain → audience list mapping.
    Example: {"wellness": {"visible_to": ["self", "clinician"]}}
    """

    # ═══════════════════════════════════════════════════════════════════════
    # Field-Level Overrides
    # ═══════════════════════════════════════════════════════════════════════
    field_overrides: Mapped[Dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default="{}"
    )
    """Fine-grained overrides for specific fields.
    Key format: 'domain.type.field_name' or 'domain.*.field_name'
    Example: {"wellness.medication.event_data.medication_name": {"visible_to": ["self"]}}
    """

    # ═══════════════════════════════════════════════════════════════════════
    # Timestamps
    # ═══════════════════════════════════════════════════════════════════════
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    def __repr__(self) -> str:
        """Represent the object as a string."""
        return f"<FieldVisibilityPolicy user={self.user_id}>"

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "domain_policies": self.domain_policies,
            "field_overrides": self.field_overrides,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
