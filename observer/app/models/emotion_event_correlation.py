"""EmotionEventCorrelation Model — Discovered Emotion-Event Patterns.

Represents a computed or user-confirmed statistical relationship between
life events and emotional state changes. Created by the Correlation Engine
and refined over time as more data accumulates.

See ``docs/src/features/life-journal/05-correlation-engine.md`` for the
four correlation algorithms: temporal proximity, pattern recurrence,
trajectory shift, and semantic clustering.

Lifecycle:
    1. Discovered — Correlation Engine finds pattern (strength > threshold)
    2. Active     — Pattern continues to hold with new data
    3. Weakening  — Strength declining (data contradicting)
    4. Expired    — No longer statistically significant
    5. User-confirmed — User validated (boosted in insights)
    6. User-dismissed — User rejected (suppressed from insights)
"""

# pylint: disable=not-callable

from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID, uuid4

from sqlalchemy import DateTime, Float, Index, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class EmotionEventCorrelation(Base):
    """A computed correlation between emotional states and life events.

    Stores the statistical evidence, lifecycle status, and user feedback
    for each discovered pattern. Evidence is stored as JSONB to accommodate
    different statistical methods per correlation type.
    """

    __tablename__ = "emotion_event_correlations"

    # ═══════════════════════════════════════════════════════════════════════
    # Identity
    # ═══════════════════════════════════════════════════════════════════════
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)

    user_id: Mapped[UUID] = mapped_column(index=True)

    # ═══════════════════════════════════════════════════════════════════════
    # The Emotional Side
    # ═══════════════════════════════════════════════════════════════════════
    emotion_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    """E.g., 'Anxiety', 'Joy', 'Dread'."""

    emotion_category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    """E.g., 'When Things Are Uncertain'."""

    # ═══════════════════════════════════════════════════════════════════════
    # The Event Side
    # ═══════════════════════════════════════════════════════════════════════
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    """Dot-notation event type: 'wellness.substance', 'work.deadline'."""

    event_pattern: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    """Human-readable description: 'Caffeine consumption before noon'."""

    # ═══════════════════════════════════════════════════════════════════════
    # Correlation Metrics
    # ═══════════════════════════════════════════════════════════════════════
    correlation_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    """'temporal_proximity', 'pattern_recurrence', 'trajectory_shift',
    'semantic_cluster', or 'user_tagged'."""

    strength: Mapped[float] = mapped_column(Float, nullable=False)
    """[0.0, 1.0] — Correlation strength."""

    direction: Mapped[str] = mapped_column(String(20), nullable=False, default="neutral")
    """'positive' (event improves mood), 'negative' (worsens), or 'neutral'."""

    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    """[0.0, 1.0] — Statistical confidence in the correlation."""

    lag_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    """Time between event and emotional shift.
    Positive = emotion follows event. Negative = emotion precedes event."""

    sample_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    """Number of observations supporting this correlation."""

    # ═══════════════════════════════════════════════════════════════════════
    # Evidence & Detail
    # ═══════════════════════════════════════════════════════════════════════
    evidence: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, server_default="{}")
    """Statistical details — varies by correlation_type.

    Example for temporal_proximity:
    {
        "p_value": 0.003,
        "effect_size": 0.45,
        "ci_lower": 0.32,
        "ci_upper": 0.58,
        "baseline_rate": 0.15,
        "observed_rate": 0.67,
        "window_hours": 2,
        "method": "chi_squared"
    }
    """

    # ═══════════════════════════════════════════════════════════════════════
    # Lifecycle
    # ═══════════════════════════════════════════════════════════════════════
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="discovered", server_default="discovered"
    )
    """'discovered', 'active', 'weakening', 'expired',
    'user_confirmed', 'user_dismissed'."""

    first_detected: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    last_validated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    """Last time the pattern was re-checked against recent data."""

    # ═══════════════════════════════════════════════════════════════════════
    # User Interaction
    # ═══════════════════════════════════════════════════════════════════════
    user_feedback: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    """'confirmed' or 'dismissed', set by user."""

    user_feedback_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ═══════════════════════════════════════════════════════════════════════
    # Timestamps
    # ═══════════════════════════════════════════════════════════════════════
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    # ═══════════════════════════════════════════════════════════════════════
    # Indexes
    # ═══════════════════════════════════════════════════════════════════════
    __table_args__ = (
        Index(
            "idx_correlations_user_status",
            "user_id",
            "status",
        ),
        Index(
            "idx_correlations_user_event",
            "user_id",
            "event_type",
        ),
        Index(
            "idx_correlations_user_emotion",
            "user_id",
            "emotion_name",
        ),
    )

    def __repr__(self) -> str:
        """Represent the object as a string."""
        return (
            f"<EmotionEventCorrelation {self.event_type} → {self.emotion_name} "
            f"strength={self.strength:.2f} status={self.status}>"
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "emotion_name": self.emotion_name,
            "emotion_category": self.emotion_category,
            "event_type": self.event_type,
            "event_pattern": self.event_pattern,
            "correlation_type": self.correlation_type,
            "strength": self.strength,
            "direction": self.direction,
            "confidence": self.confidence,
            "lag_seconds": self.lag_seconds,
            "sample_size": self.sample_size,
            "evidence": self.evidence,
            "status": self.status,
            "first_detected": (self.first_detected.isoformat() if self.first_detected else None),
            "last_validated": (self.last_validated.isoformat() if self.last_validated else None),
            "user_feedback": self.user_feedback,
            "user_feedback_at": (
                self.user_feedback_at.isoformat() if self.user_feedback_at else None
            ),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
