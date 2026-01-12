"""Add session analytics

Revision ID: 8d4e5f6g7h8i
Revises: 7c3d4e5f6g7h
Create Date: 2026-01-03 20:31:00

This migration adds the session_analytics table for real-time aggregated metrics
of emotional analysis sessions. Provides quick access to session statistics
without having to scan through all messages.

Tracks:
- Emotion counts and confidence
- Category distributions
- VAC statistics
- Alert counts
- Session timing
"""

from alembic import op

# Revision identifiers, used by Alembic
revision = "8d4e5f6g7h8i"
down_revision = "7c3d4e5f6g7h"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create session_analytics table."""
    
    # Create session_analytics table
    op.execute("""
        CREATE TABLE IF NOT EXISTS session_analytics (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id UUID NOT NULL UNIQUE REFERENCES chat_sessions(id) ON DELETE CASCADE,
            emotion_count INTEGER NOT NULL DEFAULT 0,
            average_confidence FLOAT NOT NULL DEFAULT 0.0,
            dominant_category VARCHAR(100),
            start_time TIMESTAMP NOT NULL DEFAULT NOW(),
            last_emotion_time TIMESTAMP,
            total_duration_seconds INTEGER NOT NULL DEFAULT 0,
            critical_alert_count INTEGER NOT NULL DEFAULT 0,
            warning_alert_count INTEGER NOT NULL DEFAULT 0,
            attention_alert_count INTEGER NOT NULL DEFAULT 0,
            category_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
            vac_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    """)
    
    # Create indexes
    op.execute(
        "CREATE UNIQUE INDEX idx_session_analytics_session "
        "ON session_analytics(session_id)"
    )
    
    op.execute(
        "CREATE INDEX idx_session_analytics_start_time "
        "ON session_analytics(start_time)"
    )
    
    op.execute(
        "CREATE INDEX idx_session_analytics_emotion_count "
        "ON session_analytics(emotion_count)"
    )
    
    op.execute(
        "CREATE INDEX idx_session_analytics_dominant_category "
        "ON session_analytics(dominant_category)"
    )
    
    # Add comments
    op.execute(
        "COMMENT ON TABLE session_analytics IS "
        "'Real-time aggregated metrics for emotional analysis sessions'"
    )
    
    op.execute(
        "COMMENT ON COLUMN session_analytics.category_counts IS "
        "'Breakdown of emotions by category: {\"anxiety\": 3, \"joy\": 2, ...}'"
    )
    
    op.execute(
        "COMMENT ON COLUMN session_analytics.vac_stats IS "
        "'Aggregated VAC statistics: {valence_avg, arousal_avg, connection_avg, ...}'"
    )


def downgrade() -> None:
    """Drop session_analytics table."""
    op.execute("DROP TABLE IF EXISTS session_analytics CASCADE")
