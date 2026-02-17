"""Add clinical alerts

Revision ID: 9e5f6g7h8i9j
Revises: 8d4e5f6g7h8i
Create Date: 2026-01-03 20:32:00

This migration adds the clinical_alerts table for tracking clinical alert
evaluations during emotional analysis sessions. Provides safety monitoring
by detecting potentially concerning patterns in emotional states and voice
characteristics.

Creates PostgreSQL ENUM types for alert levels and types, then uses them
in the clinical_alerts table structure.
"""

from alembic import op

# Revision identifiers, used by Alembic
revision = "9e5f6g7h8i9j"
down_revision = "8d4e5f6g7h8i"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create clinical alerts table with ENUM types."""

    # Create ENUM types
    op.execute("CREATE TYPE alert_level AS ENUM ('critical', 'warning', 'attention', 'stable')")

    op.execute(
        "CREATE TYPE alert_type AS ENUM ("
        "'high_arousal', 'voice_mismatch', 'low_confidence', "
        "'pattern_concern', 'voice_quality'"
        ")"
    )

    # Create clinical_alerts table
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS clinical_alerts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
            timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
            level alert_level NOT NULL,
            type alert_type NOT NULL,
            message TEXT NOT NULL,
            suggestion TEXT,
            triggered_by JSONB NOT NULL,
            threshold_used JSONB NOT NULL,
            version VARCHAR(20) NOT NULL DEFAULT '1.0',
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    """
    )

    # Create indexes
    op.execute("CREATE INDEX idx_clinical_alerts_session " "ON clinical_alerts(session_id)")

    op.execute("CREATE INDEX idx_clinical_alerts_timestamp " "ON clinical_alerts(timestamp)")

    op.execute("CREATE INDEX idx_clinical_alerts_level " "ON clinical_alerts(level)")

    op.execute("CREATE INDEX idx_clinical_alerts_type " "ON clinical_alerts(type)")

    # Add comments
    op.execute(
        "COMMENT ON TABLE clinical_alerts IS "
        "'Stores clinical alert evaluations for emotional analysis sessions with audit trail'"
    )

    op.execute(
        "COMMENT ON COLUMN clinical_alerts.triggered_by IS "
        "'VAC and prosody values that triggered the alert'"
    )

    op.execute(
        "COMMENT ON COLUMN clinical_alerts.threshold_used IS "
        "'Clinical thresholds applied for this alert evaluation'"
    )

    op.execute(
        "COMMENT ON COLUMN clinical_alerts.version IS "
        "'Alert rule version for tracking threshold changes over time'"
    )


def downgrade() -> None:
    """Drop clinical alerts table and ENUM types."""
    op.execute("DROP TABLE IF EXISTS clinical_alerts CASCADE")
    op.execute("DROP TYPE IF EXISTS alert_type CASCADE")
    op.execute("DROP TYPE IF EXISTS alert_level CASCADE")
