"""LifeEvent Model — User-Reported or System-Inferred Life Events.

Represents any occurrence in a user's life that may correlate with emotional
states — from daily routines (meals, exercise, sleep) to major milestones
(career changes, relationship events, diagnoses).

Classification uses dot-notation ``domain.type`` (e.g., ``wellness.exercise``,
``work.deadline``) following the L.O.V.E. Life Event Ontology defined in
``docs/src/features/life-journal/02-ontology.md``.

Design Decisions:

    Two-Level Classification (domain.type):
        Queryable at both domain and type levels. New types can be added
        without a migration since the column is a free-form string validated
        at the service layer.

    JSONB for event_data:
        Type-specific structured data varies widely across event types
        (exercise: duration/intensity, sleep: hours/quality, meal: nutrition).
        JSONB allows each event type to carry its own schema without
        requiring a separate table per type.

    Optional mood_before / mood_after:
        Users can self-report VAC state around events, creating "ground
        truth" data for validating correlation engine discoveries.

    Semantic Embedding:
        Every event description is embedded for similarity search using the
        same 384D model as ChatMessage embeddings. Enables natural-language
        queries like "find events similar to 'stressful work meeting'".
"""

# pylint: disable=not-callable

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, Float, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.settings import settings
from app.database import Base


class LifeEvent(Base):
    """A user-reported or system-inferred life event.

    High-volume table design following the same patterns as UserTrajectory:
    - Monthly partitioning recommended for production (by timestamp)
    - HNSW index for fast semantic similarity search
    - GIN indexes on tags and event_data for flexible queries
    """

    __tablename__ = "life_events"

    # ═══════════════════════════════════════════════════════════════════════
    # Identity
    # ═══════════════════════════════════════════════════════════════════════
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)

    user_id: Mapped[UUID] = mapped_column(index=True)

    # ═══════════════════════════════════════════════════════════════════════
    # Temporal
    # ═══════════════════════════════════════════════════════════════════════
    timestamp: Mapped[datetime] = mapped_column(server_default=func.now(), index=True)

    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # ═══════════════════════════════════════════════════════════════════════
    # Classification (see docs/src/features/life-journal/02-ontology.md)
    # ═══════════════════════════════════════════════════════════════════════
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    """Dot-notation classification: ``domain.type`` (e.g., 'wellness.exercise')."""

    # ═══════════════════════════════════════════════════════════════════════
    # Content
    # ═══════════════════════════════════════════════════════════════════════
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    """Short label: 'Morning run', 'Team standup', 'Bad sleep'."""

    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    """Longer free-text description (PII considerations apply)."""

    # Type-specific structured data — varies by event_type
    # Exercise: {intensity, activity_type, distance_km, heart_rate_avg}
    # Sleep:    {hours, quality, disturbances, dream_recall}
    # Meal:     {meal_type, nutrition_quality, social_context}
    event_data: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, server_default="{}")

    # ═══════════════════════════════════════════════════════════════════════
    # Emotional Context (optional self-report)
    # ═══════════════════════════════════════════════════════════════════════
    # VAC self-report before/after the event [Valence, Arousal, Connection]
    mood_before: Mapped[Optional[Any]] = mapped_column(Vector(3), nullable=True)
    mood_after: Mapped[Optional[Any]] = mapped_column(Vector(3), nullable=True)

    # ═══════════════════════════════════════════════════════════════════════
    # Searchability
    # ═══════════════════════════════════════════════════════════════════════
    tags: Mapped[Optional[List[str]]] = mapped_column(ARRAY(Text), nullable=True, default=list)
    """User-defined tags: ['morning', 'routine', 'outdoor']."""

    # Semantic embedding for similarity search (same dim as ChatMessage)
    semantic_embedding: Mapped[Optional[Any]] = mapped_column(
        Vector(settings.EMBEDDING_DIMENSION), nullable=True
    )

    # ═══════════════════════════════════════════════════════════════════════
    # Provenance
    # ═══════════════════════════════════════════════════════════════════════
    source: Mapped[str] = mapped_column(
        String(50), nullable=False, default="manual", server_default="manual"
    )
    """Origin: 'manual', 'chat_inferred', 'calendar_import', 'wearable', 'pattern_engine'."""

    # ═══════════════════════════════════════════════════════════════════════
    # Dimensional Properties (see ontology doc)
    # ═══════════════════════════════════════════════════════════════════════
    impact: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    """[0.0, 1.0] — How significant the event was."""

    predictability: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    """[0.0, 1.0] — How expected vs. surprising."""

    controllability: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    """[0.0, 1.0] — How much agency the person felt."""

    # ═══════════════════════════════════════════════════════════════════════
    # Recurrence
    # ═══════════════════════════════════════════════════════════════════════
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)

    recurrence_pattern: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    """'daily', 'weekly', 'monthly', or 'custom'."""

    recurrence_id: Mapped[Optional[UUID]] = mapped_column(nullable=True)
    """Groups recurring event instances together."""

    # ═══════════════════════════════════════════════════════════════════════
    # Timestamps
    # ═══════════════════════════════════════════════════════════════════════
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    # ═══════════════════════════════════════════════════════════════════════
    # Indexes
    # ═══════════════════════════════════════════════════════════════════════
    __table_args__ = (
        Index("idx_life_events_user_time", "user_id", timestamp.desc()),
        Index("idx_life_events_tags", "tags", postgresql_using="gin"),
        Index("idx_life_events_data", "event_data", postgresql_using="gin"),
    )

    def __repr__(self) -> str:
        """Represent the object as a string."""
        return (
            f"<LifeEvent {self.event_type} '{self.title}' "
            f"user={self.user_id} @ {self.timestamp}>"
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "duration_minutes": self.duration_minutes,
            "event_type": self.event_type,
            "title": self.title,
            "description": self.description,
            "event_data": self.event_data,
            "mood_before": list(self.mood_before) if self.mood_before else None,
            "mood_after": list(self.mood_after) if self.mood_after else None,
            "tags": self.tags,
            "source": self.source,
            "impact": self.impact,
            "predictability": self.predictability,
            "controllability": self.controllability,
            "is_recurring": self.is_recurring,
            "recurrence_pattern": self.recurrence_pattern,
            "recurrence_id": str(self.recurrence_id) if self.recurrence_id else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# Note: HNSW vector index will be created via Alembic migration
# Example:
#   CREATE INDEX idx_life_events_embedding_hnsw
#   ON life_events
#   USING hnsw (semantic_embedding vector_cosine_ops)
#   WITH (m = 16, ef_construction = 64);
