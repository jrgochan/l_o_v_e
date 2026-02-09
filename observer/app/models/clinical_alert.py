"""ClinicalAlert Model - Multi-Modal Risk Detection Audit Trail.

Persistent storage for clinical alerts generated from multimodal emotional analysis, enabling
audit trails, pattern analysis, threshold validation, and therapist notification workflows.
Combines alert metadata with versioned thresholds for clinical accountability and research.

Alert System Architecture:

    Comprehensive risk detection and response::

        Detection → Storage → Notification → Resolution
        ────────────────────────────────────────────────

        1. Detection (ClinicalAlertService)
           - Evaluate VAC coordinates
           - Check prosody thresholds
           - Measure voice-content correlation
           - Assess AI confidence

        2. Storage (ClinicalAlert model)
           - Persist alert with full context
           - Record triggering values
           - Store thresholds used
           - Version for audit trail

        3. Notification (Future)
           - Dashboard real-time updates
           - Email/SMS for critical alerts
           - Mobile push notifications
           - Escalation workflows

        4. Resolution (Acknowledgment)
           - Therapist reviews alert
           - Marks as acknowledged
           - Documents response action
           - Completes audit loop

Three Severity Levels (AlertLevel Enum):

    Graduated response based on clinical urgency::

        CRITICAL
        ────────
        Immediate therapist attention required
        Examples:
        - High distress (panic zone VAC)
        - Suicidal ideation detected
        - Severe vocal distress

        Triggers:
        - Arousal > 0.7 AND Valence < -0.5
        - Confidence < 0.4 (very low)
        - HNR < 5 dB (severe voice quality)

        Response:
        - Real-time notification
        - Session flag for review
        - May trigger crisis protocol

        WARN ING
        ───────
        Clinical concern needing attention
        Examples:
        - Significant voice-content mismatch
        - High vocal instability
        - Moderate confidence issues

        Triggers:
        - Discrepancy > 0.5
        - Jitter > 5% or Shimmer > 10%
        - Pitch range < 30 Hz (flat affect)

        Response:
        - Dashboard notification
        - Session note flagged
        - Follow-up recommended

        ATTENTION
        ────────
        Clinical awareness, not urgent
        Examples:
        - Elevated prosody markers
        - Moderate discrepancies
        - Low confidence (borderline)

        Triggers:
        - Discrepancy 0.3-0.5
        - Jitter 3-5% or Shimmer 6-10%
        - Confidence 0.4-0.6

        Response:
        - Note in session summary
        - Cumulative tracking
        - Pattern analysis

Five Alert Types (AlertType Enum):

    Categories of clinical concerns::

        HIGH_AROUSAL
        ───────────
        Acute emotional distress
        Detection: Arousal > 0.7 AND Valence < -0.5
        Emotions: Panic, Rage, Terror, Fury
        Clinical: Crisis assessment may be needed

        VOICE_MISMATCH
        ─────────────
        Voice-content incongruence
        Detection: Euclidean distance > threshold
        Example: "I'm fine" with trembling voice
        Clinical: Emotional suppression, masking

        LOW_CONFIDENCE
        ─────────────
        AI analysis uncertainty
        Detection: Confidence < threshold
        Example: Confidence = 0.35
        Clinical: Manual review required

        PATTERN_CONCERN
        ──────────────
        Concerning vocal/emotional patterns
        Detection: Jitter, shimmer, pitch range thresholds
        Examples: Vocal instability, flat affect
        Clinical: May indicate underlying condition

        VOICE_QUALITY
        ────────────
        Poor voice acoustic quality
        Detection: HNR < threshold
        Example: HNR = 4.2 dB
        Clinical: Crying, strain, distress

Audit Trail Structure:

    Complete alert context preserved::

        Core identification:
        ───────────────────
        id: UUID unique identifier
        session_id: FK to chat_sessions
        timestamp: When alert generated
        level: Severity (CRITICAL/WARNING/ATTENTION)
        type: Category of concern

        Human-readable:
        ──────────────
        message: "High distress detected"
        suggestion: "Consider crisis assessment protocols"

        Evidence (JSONB):
        ────────────────
        triggered_by: Actual values that caused alert
        {
            "arousal": 0.85,
            "valence": -0.7,
            "connection": -0.4
        }

        threshold_used: Thresholds at time of detection
        {
            "arousal": 0.7,
            "valence": -0.5
        }

        version: "1.0" (alert rule version)

        Why preserve context?
        - Clinical accountability
        - Threshold validation studies
        - False positive analysis
        - Regulatory compliance

Version-Controlled Thresholds:

    Tracking alert rule evolution::

        version: "1.0"
        ─────────────
        Initial research-based thresholds
        Source: Literature + expert consultation
        Deployed: January 2026

        version: "1.1" (future)
        ──────────────────────
        Refined after validation study
        Changes: Adjusted arousal threshold 0.7 → 0.75
        Reason: Reduce false positives

        version: "2.0" (future)
        ──────────────────────
        ML-optimized thresholds
        Source: Training on 10K+ sessions
        Changes: Per-population customization

        Benefits of versioning:
        ──────────────────────
        - Track which rules generated which alerts
        - Compare alert rates across versions
        - Validate threshold changes
        - Rollback if needed
        - Research analysis enabled

Query Patterns:

    Common alert access scenarios::

        Session alerts (therapist view):
        ───────────────────────────────
        SELECT * FROM clinical_alerts
        WHERE session_id = ?
        ORDER BY timestamp DESC

        Returns all alerts for session review

        Unacknowledged critical (monitoring):
        ────────────────────────────────────
        SELECT * FROM clinical_alerts
        WHERE level = 'critical'
          AND acknowledged IS FALSE
        ORDER BY timestamp DESC

        Alerts needing immediate response

        Pattern analysis (research):
        ───────────────────────────
        SELECT type, COUNT(*), AVG(threshold_used->>'arousal')
        FROM clinical_alerts
        WHERE version = '1.0'
        GROUP BY type

        Validate threshold effectiveness

        Temporal trends:
        ───────────────
        SELECT DATE(timestamp), level, COUNT(*)
        FROM clinical_alerts
        WHERE timestamp > NOW() - INTERVAL '30 days'
        GROUP BY DATE(timestamp), level
        ORDER BY DATE(timestamp)

        Alert frequency over time

Example Usage:

    Create alert::

        from app.models.clinical_alert import (
            ClinicalAlert, AlertLevel, AlertType
        )

        alert = ClinicalAlert(
            session_id=session.id,
            level=AlertLevel.CRITICAL.value,
            type=AlertType.HIGH_AROUSAL.value,
            message="High distress detected",
            suggestion="Consider crisis assessment protocols",
            triggered_by={
                "arousal": 0.85,
                "valence": -0.7
            },
            threshold_used={
                "arousal": 0.7,
                "valence": -0.5
            },
            version="1.0"
        )

        db.add(alert)
        await db.commit()

    Query session alerts::

        stmt = select(ClinicalAlert).where(
            ClinicalAlert.session_id == session_id
        ).order_by(ClinicalAlert.timestamp.desc())

        alerts = await db.execute(stmt)
        session_alerts = alerts.scalars().all()

        # Group by severity
        critical = [a for a in session_alerts if a.level == AlertLevel.CRITICAL.value]
        warnings = [a for a in session_alerts if a.level == AlertLevel.WARNING.value]

Integration Points:

    Alert lifecycle flow::

        Generated by:
        ────────────
        - ClinicalAlertService.evaluate_alerts()
        - Called after each emotion analysis
        - Batch creates multiple alert types

        Accessed by:
        ───────────
        - Dashboard UI (real-time display)
        - Session analytics (alert counts)
        - Clinical reports (session summary)
        - Research queries (pattern analysis)

Design Decisions:

    Why store both values and thresholds?::

        Audit trail completeness:
        + Can reconstruct why alert fired
        + Validate threshold appropriateness
        + Study false positive rates
        + Regulatory compliance

        Research enablement:
        + "Did 0.7 arousal threshold work?"
        + "How many alerts from version 1.0?"
        + "What values typically trigger?"

        Alternative (values only):
        - Can't validate thresholds
        - Can't compare versions
        - Limited research value

        Decision: Store complete context

    Why version field?::

        Clinical validation is iterative:
        + Thresholds evolve with evidence
        + Need to track rule changes
        + Compare effectiveness
        + Enable controlled experiments

        Example use:
        "Version 1.0 had 15% false positive rate
         Version 1.1 reduced to 8%
         Version 1.1 validated and deployed"

    Why String for level/type vs direct Enum?::

        PostgreSQL compatibility:
        + Works with or without native ENUM
        + Simpler migrations
        + String values readable in raw SQL

        Python Enum still used:
        + Type safety in application code
        + IDE autocomplete
        + Validation at ORM layer

        Best of both worlds

References:
    - Alert service logic: observer/app/services/clinical_alert_service.py
    - Threshold research: docs/modules/observer/senior-developers/06-performance-optimization.md
    - Clinical workflows: docs/modules/observer/managers/05-incident-response.md
    - Dashboard display: docs/features/clinical-tools/README.md
    - SQLAlchemy enums: https://docs.sqlalchemy.org/en/14/core/type_basics.html#
      sqlalchemy.types.Enum
"""

# pylint: disable=not-callable

import enum
from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, Optional
from uuid import UUID, uuid4

from sqlalchemy import ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.chat_session import ChatSession


class AlertLevel(str, enum.Enum):
    """Clinical alert severity levels."""

    CRITICAL = "critical"  # Immediate attention needed
    WARNING = "warning"  # Clinical concern
    ATTENTION = "attention"  # Monitor closely
    STABLE = "stable"  # No concerns


class AlertType(str, enum.Enum):
    """Types of clinical alerts."""

    HIGH_AROUSAL = "high_arousal"  # High negative arousal
    VOICE_MISMATCH = "voice_mismatch"  # Voice-content discrepancy
    LOW_CONFIDENCE = "low_confidence"  # Analysis uncertainty
    PATTERN_CONCERN = "pattern_concern"  # Concerning patterns
    VOICE_QUALITY = "voice_quality"  # Poor voice quality


class ClinicalAlert(Base):
    """Clinical alert record.

    Stores alerts generated during emotional analysis sessions
    for audit trail, analysis, and clinical review.
    """

    __tablename__ = "clinical_alerts"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    session_id: Mapped[UUID] = mapped_column(ForeignKey("chat_sessions.id"), index=True)
    timestamp: Mapped[datetime] = mapped_column(server_default=func.now(), index=True)

    # Alert details - using String for PostgreSQL enum compatibility
    level: Mapped[str] = mapped_column(String(20), index=True)
    type: Mapped[str] = mapped_column(String(50), index=True)
    message: Mapped[str] = mapped_column(String)
    suggestion: Mapped[Optional[str]] = mapped_column(String)

    # Audit information
    triggered_by: Mapped[Dict[str, Any]] = mapped_column(JSONB)  # VAC/prosody values
    threshold_used: Mapped[Dict[str, Any]] = mapped_column(JSONB)  # Thresholds applied
    version: Mapped[str] = mapped_column(String, default="1.0")  # Alert rule version

    # Relationships
    session: Mapped["ChatSession"] = relationship(back_populates="alerts")

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "id": str(self.id),
            "session_id": str(self.session_id),
            "timestamp": self.timestamp.isoformat(),
            "level": self.level,  # Already a string value
            "type": self.type,  # Already a string value
            "message": self.message,
            "suggestion": self.suggestion,
            "triggered_by": self.triggered_by,
            "threshold_used": self.threshold_used,
            "version": self.version,
        }
