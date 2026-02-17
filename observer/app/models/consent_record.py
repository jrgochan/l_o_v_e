"""ConsentRecord Model — Tracks user consent for data processing.

Stores explicit consent records for GDPR/HIPAA compliance, enabling
version-tracked consent management, revocation, and audit trails.
"""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ConsentRecord(Base):
    """User consent record for data processing and sharing.

    Tracks what each user agreed to, when, and whether they revoked consent.
    """

    __tablename__ = "consent_records"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    consent_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    """Type of consent: 'terms_of_service', 'data_processing',
    'clinical_sharing', 'research_opt_in', etc."""

    version: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="1.0",
    )
    """Version of the consent document agreed to."""

    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),  # pylint: disable=not-callable
        nullable=False,
    )

    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )

    ip_address: Mapped[Optional[str]] = mapped_column(
        String(45),
        nullable=True,
    )

    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    """Admin-visible notes about the consent (e.g., 'revoked per user request')."""

    def __repr__(self) -> str:
        """Represent the object as a string."""
        status = "revoked" if self.revoked_at else "active"
        return (
            f"<ConsentRecord {self.consent_type} v{self.version} " f"user={self.user_id} {status}>"
        )

    def to_dict(self) -> dict[str, Any]:
        """Serialize for API responses."""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "consent_type": self.consent_type,
            "version": self.version,
            "granted_at": self.granted_at.isoformat() if self.granted_at else None,
            "revoked_at": self.revoked_at.isoformat() if self.revoked_at else None,
            "ip_address": self.ip_address,
        }
