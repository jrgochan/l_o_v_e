"""Add chat system

Revision ID: 7c3d4e5f6g7h
Revises: 6b2c3d4e5f6g
Create Date: 2026-01-03 20:30:00

This migration adds the chat system infrastructure for the emotional analysis
chat interface. The system tracks chat sessions and messages, storing emotional
analysis results, prosody data, and AI-generated insights.

Tables:
- chat_sessions: User chat session tracking with tone preferences
- chat_messages: Individual messages with emotion/prosody/analysis data

The chat system integrates with the Listener module for voice analysis and
provides the foundation for the conversational emotional tracking interface.
"""

from alembic import op

# Revision identifiers, used by Alembic
revision = "7c3d4e5f6g7h"
down_revision = "6b2c3d4e5f6g"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create chat system tables and triggers."""

    # Create chat_sessions table
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS chat_sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id VARCHAR(255) NOT NULL,
            started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            ended_at TIMESTAMP,
            message_count INTEGER DEFAULT 0,
            tone_preference VARCHAR(20) DEFAULT 'warm',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """
    )

    # Create indexes for chat_sessions
    op.execute("CREATE INDEX idx_chat_sessions_user_id " "ON chat_sessions(user_id)")

    op.execute("CREATE INDEX idx_chat_sessions_started_at " "ON chat_sessions(started_at DESC)")

    # Add comment
    op.execute(
        "COMMENT ON TABLE chat_sessions IS " "'Chat sessions for emotional analysis chat interface'"
    )

    # Create chat_messages table
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS chat_messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
            timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            message_type VARCHAR(50) NOT NULL,
            content TEXT,
            audio_url TEXT,
            transcription TEXT,
            emotion_id UUID REFERENCES atlas_definitions(id),
            vac_coordinates FLOAT[3],
            confidence FLOAT,
            prosody_pitch_mean FLOAT,
            prosody_pitch_std FLOAT,
            prosody_energy FLOAT,
            prosody_rate FLOAT,
            prosody_features JSONB,
            insights JSONB,
            tone_mode VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """
    )

    # Create indexes for chat_messages
    op.execute("CREATE INDEX idx_chat_messages_session_id " "ON chat_messages(session_id)")

    op.execute("CREATE INDEX idx_chat_messages_timestamp " "ON chat_messages(timestamp DESC)")

    op.execute("CREATE INDEX idx_chat_messages_emotion_id " "ON chat_messages(emotion_id)")

    # Add comments
    op.execute(
        "COMMENT ON TABLE chat_messages IS "
        "'Individual messages within chat sessions with analysis data'"
    )

    op.execute(
        "COMMENT ON COLUMN chat_messages.prosody_features IS "
        "'JSONB storage for detailed voice features (jitter, shimmer, HNR, etc.)'"
    )

    op.execute(
        "COMMENT ON COLUMN chat_messages.insights IS "
        "'AI-generated insights combining voice and content analysis'"
    )

    # Create update function for updated_at
    op.execute(
        """
        CREATE OR REPLACE FUNCTION update_chat_session_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
    """
    )

    # Create trigger
    op.execute(
        """
        CREATE TRIGGER chat_sessions_updated_at
            BEFORE UPDATE ON chat_sessions
            FOR EACH ROW
            EXECUTE FUNCTION update_chat_session_updated_at()
    """
    )


def downgrade() -> None:
    """Drop chat system tables, triggers, and functions."""
    op.execute("DROP TRIGGER IF EXISTS chat_sessions_updated_at ON chat_sessions")
    op.execute("DROP FUNCTION IF EXISTS update_chat_session_updated_at()")
    op.execute("DROP TABLE IF EXISTS chat_messages CASCADE")
    op.execute("DROP TABLE IF EXISTS chat_sessions CASCADE")
