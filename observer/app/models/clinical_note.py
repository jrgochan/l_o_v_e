"""ClinicalNote Model — Clinician-authored private notes for clients.

Persists clinical observations, treatment notes, and follow-up actions
that clinicians write about their assigned clients.  Notes are private
to the authoring clinician and are NOT shared with the client.

Each note is associated with exactly one clinician (author) and one
client (subject).  An optional session reference allows linking a note
to a specific session for context.
"""

from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID, uuid4

from sqlalchemy import ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ClinicalNote(Base):
    """Clinician's private note about a client."""

    __tablename__ = "clinical_notes"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)

    # Who wrote the note
    clinician_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    # Who the note is about
    client_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    # Optional: link to a specific session
    session_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("chat_sessions.id", ondelete="SET NULL"), nullable=True
    )

    # Note content
    content: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(
        String(50), default="general", index=True
    )  # general, progress, concern, follow_up

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now()  # pylint: disable=not-callable
    )
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now()  # pylint: disable=not-callable
    )

    def to_dict(self) -> Dict[str, Any]:
        """Serialize for API responses."""
        return {
            "id": str(self.id),
            "clinician_id": str(self.clinician_id),
            "client_id": str(self.client_id),
            "session_id": str(self.session_id) if self.session_id else None,
            "content": self.content,
            "category": self.category,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
