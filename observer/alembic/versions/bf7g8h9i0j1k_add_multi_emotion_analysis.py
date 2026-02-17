"""Add multi-emotion analysis system

Revision ID: bf7g8h9i0j1k
Revises: af6g7h8i9j0k
Create Date: 2026-01-03 20:54:00

This migration adds the Deep Feeling Mode multi-emotion analysis system,
which enables detection of emotional complexity, ambivalence, and masking patterns.

Tables:
- multi_emotion_analyses: Container for multi-emotion states
- detected_emotions: Individual emotions (1-3) with prominence levels
- emotion_relationships: Pairwise emotion relationships
- emotion_goals: User goal-setting for emotional transitions

Key Feature: Proper CASCADE constraints on atlas_definitions foreign keys
to allow re-seeding of emotions without foreign key violations.
"""

from alembic import op

# Revision identifiers, used by Alembic
revision = "bf7g8h9i0j1k"
down_revision = "af6g7h8i9j0k"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create multi-emotion analysis tables with proper CASCADE constraints."""

    # Drop auto-created tables if they exist (from SQLAlchemy auto-creation)
    # Order matters: drop children before parents
    op.execute("DROP TABLE IF EXISTS emotion_goals CASCADE")
    op.execute("DROP TABLE IF EXISTS emotion_relationships CASCADE")
    op.execute("DROP TABLE IF EXISTS detected_emotions CASCADE")
    op.execute("DROP TABLE IF EXISTS multi_emotion_analyses CASCADE")

    # Create multi_emotion_analyses table
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS multi_emotion_analyses (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
            session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
            deep_feeling_enabled BOOLEAN DEFAULT TRUE,
            aggregate_vac FLOAT[],
            complexity_score FLOAT,
            emotional_clarity FLOAT,
            temporal_pattern VARCHAR(50),
            three_way_enabled BOOLEAN DEFAULT FALSE,
            content_only_data JSONB,
            voice_only_data JSONB,
            discrepancy_metrics JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """
    )

    # Indexes for multi_emotion_analyses
    op.execute("CREATE INDEX idx_multi_emotion_message " "ON multi_emotion_analyses(message_id)")

    op.execute("CREATE INDEX idx_multi_emotion_session " "ON multi_emotion_analyses(session_id)")

    op.execute(
        "CREATE INDEX idx_multi_emotion_three_way " "ON multi_emotion_analyses(three_way_enabled)"
    )

    op.execute("CREATE INDEX idx_multi_emotion_created " "ON multi_emotion_analyses(created_at)")

    # Create detected_emotions table WITH CASCADE on atlas_definitions
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS detected_emotions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            analysis_id UUID NOT NULL REFERENCES multi_emotion_analyses(id) ON DELETE CASCADE,
            emotion_id UUID REFERENCES atlas_definitions(id) ON DELETE CASCADE,
            confidence FLOAT NOT NULL,
            prominence VARCHAR(20) NOT NULL,
            vac FLOAT[] NOT NULL,
            voice_alignment FLOAT,
            voice_interpretation_vac FLOAT[],
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """
    )

    # Indexes for detected_emotions
    op.execute("CREATE INDEX idx_detected_emotions_analysis " "ON detected_emotions(analysis_id)")

    op.execute("CREATE INDEX idx_detected_emotions_emotion " "ON detected_emotions(emotion_id)")

    op.execute("CREATE INDEX idx_detected_emotions_prominence " "ON detected_emotions(prominence)")

    # Create emotion_relationships table
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS emotion_relationships (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            analysis_id UUID NOT NULL REFERENCES multi_emotion_analyses(id) ON DELETE CASCADE,
            emotion_a_id UUID NOT NULL REFERENCES detected_emotions(id) ON DELETE CASCADE,
            emotion_b_id UUID NOT NULL REFERENCES detected_emotions(id) ON DELETE CASCADE,
            relationship_type VARCHAR(50) NOT NULL,
            strength FLOAT,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """
    )

    # Indexes for emotion_relationships
    op.execute("CREATE INDEX idx_emotion_rel_analysis " "ON emotion_relationships(analysis_id)")

    op.execute("CREATE INDEX idx_emotion_rel_type " "ON emotion_relationships(relationship_type)")

    # Create emotion_goals table WITH CASCADE on atlas_definitions
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS emotion_goals (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
            user_id VARCHAR(255) NOT NULL,
            goal_emotion_id UUID REFERENCES atlas_definitions(id) ON DELETE CASCADE,
            priority INTEGER DEFAULT 1,
            target_date TIMESTAMP WITH TIME ZONE,
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """
    )

    # Indexes for emotion_goals
    op.execute("CREATE INDEX idx_emotion_goals_session " "ON emotion_goals(session_id)")

    op.execute("CREATE INDEX idx_emotion_goals_user " "ON emotion_goals(user_id)")

    op.execute("CREATE INDEX idx_emotion_goals_status " "ON emotion_goals(status)")

    # Add table comments
    op.execute(
        "COMMENT ON TABLE multi_emotion_analyses IS "
        "'Deep Feeling Mode: Multi-emotion analysis with complexity metrics'"
    )

    op.execute(
        "COMMENT ON TABLE detected_emotions IS "
        "'Individual emotions (1-3) detected in multi-emotion analysis'"
    )

    op.execute(
        "COMMENT ON COLUMN detected_emotions.emotion_id IS "
        "'Foreign key with CASCADE to allow atlas re-seeding'"
    )

    op.execute(
        "COMMENT ON TABLE emotion_relationships IS "
        "'Pairwise relationships: complementary, contradictory, masking, etc.'"
    )

    op.execute(
        "COMMENT ON TABLE emotion_goals IS "
        "'User-defined emotion goals for transition pathfinding'"
    )


def downgrade() -> None:
    """Drop multi-emotion analysis tables."""
    # Drop in reverse order (children before parents)
    op.execute("DROP TABLE IF EXISTS emotion_goals CASCADE")
    op.execute("DROP TABLE IF EXISTS emotion_relationships CASCADE")
    op.execute("DROP TABLE IF EXISTS detected_emotions CASCADE")
    op.execute("DROP TABLE IF EXISTS multi_emotion_analyses CASCADE")
