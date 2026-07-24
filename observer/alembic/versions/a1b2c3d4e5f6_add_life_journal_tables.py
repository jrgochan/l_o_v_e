"""Add Life Journal tables

Revision ID: a1b2c3d4e5f6
Revises: f5245a8af0cb
Create Date: 2026-07-23 23:50:00

This migration adds the core Life Journal tables for emotion-event
correlation tracking:
- life_events: User-reported or system-inferred life events
- emotion_event_correlations: Discovered emotion-event patterns
- field_visibility_policies: Per-user field-level RBAC
- Adds associated_event_ids column to user_trajectory

See docs/src/features/life-journal/ for full design documentation.
"""

from alembic import op

# Revision identifiers, used by Alembic
revision: str = "a1b2c3d4e5f6"
down_revision: str = "f5245a8af0cb"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create Life Journal tables and indexes."""

    # ── life_events ───────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS life_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            duration_minutes INTEGER,

            -- Classification
            event_type VARCHAR(100) NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            event_data JSONB NOT NULL DEFAULT '{}',

            -- Emotional context (optional VAC self-report)
            mood_before vector(3),
            mood_after vector(3),

            -- Searchability
            tags TEXT[],
            semantic_embedding vector(384),

            -- Provenance
            source VARCHAR(50) NOT NULL DEFAULT 'manual',

            -- Dimensional properties
            impact FLOAT,
            predictability FLOAT,
            controllability FLOAT,

            -- Recurrence
            is_recurring BOOLEAN NOT NULL DEFAULT false,
            recurrence_pattern VARCHAR(50),
            recurrence_id UUID,

            -- Timestamps
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)

    # life_events indexes
    op.execute("CREATE INDEX idx_life_events_user_id " "ON life_events(user_id)")
    op.execute("CREATE INDEX idx_life_events_timestamp " "ON life_events(timestamp)")
    op.execute("CREATE INDEX idx_life_events_event_type " "ON life_events(event_type)")
    op.execute("CREATE INDEX idx_life_events_user_time " "ON life_events(user_id, timestamp DESC)")
    op.execute("CREATE INDEX idx_life_events_tags " "ON life_events USING gin(tags)")
    op.execute("CREATE INDEX idx_life_events_data " "ON life_events USING gin(event_data)")

    # HNSW vector index for semantic similarity search
    op.execute(
        "CREATE INDEX idx_life_events_embedding_hnsw "
        "ON life_events "
        "USING hnsw (semantic_embedding vector_cosine_ops) "
        "WITH (m = 16, ef_construction = 64)"
    )

    # Table comment
    op.execute(
        "COMMENT ON TABLE life_events IS "
        "'User-reported or system-inferred life events for "
        "emotion-event correlation tracking'"
    )

    # ── emotion_event_correlations ────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS emotion_event_correlations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,

            -- Emotional side
            emotion_name VARCHAR(100) NOT NULL,
            emotion_category VARCHAR(100),

            -- Event side
            event_type VARCHAR(100) NOT NULL,
            event_pattern VARCHAR(255),

            -- Correlation metrics
            correlation_type VARCHAR(50) NOT NULL,
            strength FLOAT NOT NULL,
            direction VARCHAR(20) NOT NULL DEFAULT 'neutral',
            confidence FLOAT NOT NULL DEFAULT 0.0,
            lag_seconds INTEGER,
            sample_size INTEGER NOT NULL DEFAULT 0,

            -- Evidence (statistical details, varies by type)
            evidence JSONB NOT NULL DEFAULT '{}',

            -- Lifecycle
            status VARCHAR(30) NOT NULL DEFAULT 'discovered',
            first_detected TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            last_validated TIMESTAMPTZ NOT NULL DEFAULT NOW(),

            -- User interaction
            user_feedback VARCHAR(20),
            user_feedback_at TIMESTAMPTZ,

            -- Timestamps
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)

    # emotion_event_correlations indexes
    op.execute("CREATE INDEX idx_correlations_user_id " "ON emotion_event_correlations(user_id)")
    op.execute(
        "CREATE INDEX idx_correlations_emotion_name " "ON emotion_event_correlations(emotion_name)"
    )
    op.execute(
        "CREATE INDEX idx_correlations_event_type " "ON emotion_event_correlations(event_type)"
    )
    op.execute(
        "CREATE INDEX idx_correlations_type " "ON emotion_event_correlations(correlation_type)"
    )
    op.execute(
        "CREATE INDEX idx_correlations_user_status "
        "ON emotion_event_correlations(user_id, status)"
    )
    op.execute(
        "CREATE INDEX idx_correlations_user_event "
        "ON emotion_event_correlations(user_id, event_type)"
    )
    op.execute(
        "CREATE INDEX idx_correlations_user_emotion "
        "ON emotion_event_correlations(user_id, emotion_name)"
    )

    # Table comment
    op.execute(
        "COMMENT ON TABLE emotion_event_correlations IS "
        "'Discovered statistical correlations between life events "
        "and emotional states'"
    )

    # ── field_visibility_policies ─────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS field_visibility_policies (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL UNIQUE
                REFERENCES users(id) ON DELETE CASCADE,

            -- Domain-level defaults
            domain_policies JSONB NOT NULL DEFAULT '{
                "wellness": {"visible_to": ["self"]},
                "work": {"visible_to": ["self"]},
                "relationship": {"visible_to": ["self"]},
                "mental": {"visible_to": ["self"]},
                "environment": {"visible_to": ["self", "clinician"]},
                "growth": {"visible_to": ["self", "clinician"]},
                "financial": {"visible_to": ["self"]},
                "custom": {"visible_to": ["self"]}
            }',

            -- Field-level overrides
            field_overrides JSONB NOT NULL DEFAULT '{}',

            -- Timestamps
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)

    op.execute("CREATE INDEX idx_field_visibility_user " "ON field_visibility_policies(user_id)")

    op.execute(
        "COMMENT ON TABLE field_visibility_policies IS "
        "'Per-user field-level RBAC for life event data sharing'"
    )

    # ── user_trajectory enrichment ────────────────────────────────────────
    # Add column to link trajectory points to life events
    op.execute(
        "ALTER TABLE user_trajectory "
        "ADD COLUMN IF NOT EXISTS associated_event_ids UUID[] DEFAULT '{}'"
    )

    op.execute(
        "COMMENT ON COLUMN user_trajectory.associated_event_ids IS "
        "'Life event IDs associated with this emotional state point'"
    )


def downgrade() -> None:
    """Drop Life Journal tables and columns."""
    # Remove user_trajectory enrichment
    op.execute("ALTER TABLE user_trajectory " "DROP COLUMN IF EXISTS associated_event_ids")

    # Drop tables in reverse order
    op.execute("DROP TABLE IF EXISTS field_visibility_policies CASCADE")
    op.execute("DROP TABLE IF EXISTS emotion_event_correlations CASCADE")
    op.execute("DROP TABLE IF EXISTS life_events CASCADE")
