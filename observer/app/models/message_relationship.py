"""MessageRelationship Model - Directed Links Between Messages.

Supports creating an emotional timeline by linking messages (child) to past messages (parent),
enabling non-linear navigation and future multi-user interactions.
"""

# pylint: disable=not-callable

from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, Optional
from uuid import UUID, uuid4

from sqlalchemy import ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import RelationshipType

if TYPE_CHECKING:
    from app.models.chat_message import ChatMessage


class MessageRelationship(Base):
    """Directed relationship between two messages.

    This model creates a directed graph of messages, allowing for:
    - Threading (reply-to)
    - Emotional timeline navigation (linking back to past moments)
    - Future multi-user references
    """

    __tablename__ = "message_relationships"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)

    # Source: The message that "initiates" the link (e.g., the current reply)
    # This is the "child" or "later" message in a timeline context
    source_message_id: Mapped[UUID] = mapped_column(
        ForeignKey("chat_messages.id", ondelete="CASCADE"), index=True
    )

    # Target: The message being linked to (e.g., the past message)
    # This is the "parent" or "earlier" message
    target_message_id: Mapped[UUID] = mapped_column(
        ForeignKey("chat_messages.id", ondelete="CASCADE"), index=True
    )

    # Relationship Type
    # e.g., 'reference', 'continuation', 'reply', 'contradiction', 'resolution'
    # 'self_reference' for personal timeline linking
    relationship_type: Mapped[RelationshipType] = mapped_column(String(50), index=True)

    # Metadata for context (why they are linked, user notes, etc.)
    # renamed from 'metadata' to avoid conflict with SQLAlchemy Base.metadata
    relationship_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    # Relationships
    source_message: Mapped["ChatMessage"] = relationship(
        foreign_keys=[source_message_id], back_populates="outgoing_relationships"
    )
    target_message: Mapped["ChatMessage"] = relationship(
        foreign_keys=[target_message_id], back_populates="incoming_relationships"
    )

    def __repr__(self) -> str:
        """Represent the object as a string."""
        return (
            f"<MessageRelationship {self.source_message_id} -> "
            f"{self.target_message_id} ({self.relationship_type})>"
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": str(self.id),
            "source_message_id": str(self.source_message_id),
            "target_message_id": str(self.target_message_id),
            "relationship_type": self.relationship_type,
            "relationship_metadata": self.relationship_metadata,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
