"""AlertAcknowledgment Model — Clinician review records for clinical alerts.

A join table that records when a clinician acknowledges (reviews) a
clinical alert.  This preserves the original alert record untouched
while tracking the review workflow separately:

  ClinicalAlert  1 ←──→ 0..1  AlertAcknowledgment

Design notes:
- One acknowledgment per alert (unique constraint on alert_id)
- Captures who reviewed, when, and any action taken
- Clinician can add a brief response note
- Supports audit trail for clinical compliance
"""

from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID, uuid4

from sqlalchemy import ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AlertAcknowledgment(Base):
    """Record of a clinician acknowledging a clinical alert."""

    __tablename__ = "alert_acknowledgments"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)

    alert_id: Mapped[UUID] = mapped_column(
        ForeignKey("clinical_alerts.id", ondelete="CASCADE"),
        unique=True,
        index=True,
    )

    clinician_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    # What was the clinician's response?
    action_taken: Mapped[str] = mapped_column(
        String(50), default="reviewed"
    )  # reviewed, escalated, dismissed, contacted_client

    response_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    acknowledged_at: Mapped[datetime] = mapped_column(
        server_default=func.now()  # pylint: disable=not-callable
    )

    def to_dict(self) -> Dict[str, Any]:
        """Serialize for API responses."""
        return {
            "id": str(self.id),
            "alert_id": str(self.alert_id),
            "clinician_id": str(self.clinician_id),
            "action_taken": self.action_taken,
            "response_note": self.response_note,
            "acknowledged_at": self.acknowledged_at.isoformat(),
        }
