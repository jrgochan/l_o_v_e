"""Add path matrix cache

Revision ID: 6b2c3d4e5f6g
Revises: 5a1b2c3d4e5f
Create Date: 2026-01-03 20:29:00

This migration adds path caching infrastructure to dramatically improve performance
of the transition path computation system. Pre-computed paths are cached in the
database, reducing API response times from seconds to milliseconds for common
emotional transitions.

Tables:
- path_matrix_cache: Stores computed paths with metrics (87×87 matrix = ~7,500 paths)
- path_computation_jobs: Tracks batch computation jobs for the full matrix

The system uses VAC coordinate hashing to automatically invalidate cache when
emotion coordinates are updated, ensuring cache accuracy.
"""

from alembic import op

# Revision identifiers, used by Alembic
revision = "6b2c3d4e5f6g"
down_revision = "5a1b2c3d4e5f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create path matrix cache tables and functions."""

    # Create path_matrix_cache table
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS path_matrix_cache (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            from_emotion_id UUID NOT NULL REFERENCES atlas_definitions(id),
            to_emotion_id UUID NOT NULL REFERENCES atlas_definitions(id),
            path_data JSONB NOT NULL,
            distance FLOAT NOT NULL,
            difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'moderate', 'difficult')),
            waypoint_count INTEGER NOT NULL DEFAULT 0,
            requires_bridge BOOLEAN NOT NULL DEFAULT FALSE,
            estimated_time VARCHAR(50),
            computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            vac_hash VARCHAR(64) NOT NULL,
            UNIQUE (from_emotion_id, to_emotion_id),
            CHECK (from_emotion_id != to_emotion_id)
        )
    """
    )

    # Create indexes for common queries
    op.execute("CREATE INDEX idx_path_matrix_from " "ON path_matrix_cache(from_emotion_id)")

    op.execute("CREATE INDEX idx_path_matrix_to " "ON path_matrix_cache(to_emotion_id)")

    op.execute("CREATE INDEX idx_path_matrix_difficulty " "ON path_matrix_cache(difficulty)")

    op.execute("CREATE INDEX idx_path_matrix_distance " "ON path_matrix_cache(distance)")

    op.execute("CREATE INDEX idx_path_matrix_bridge " "ON path_matrix_cache(requires_bridge)")

    op.execute("CREATE INDEX idx_path_matrix_computed_at " "ON path_matrix_cache(computed_at)")

    op.execute("CREATE INDEX idx_path_matrix_vac_hash " "ON path_matrix_cache(vac_hash)")

    # Composite index for common filter combinations
    op.execute(
        "CREATE INDEX idx_path_matrix_metrics "
        "ON path_matrix_cache(difficulty, distance, requires_bridge)"
    )

    # Add table comments
    op.execute(
        "COMMENT ON TABLE path_matrix_cache IS "
        "'Caches computed emotional transition paths for the 87×87 matrix'"
    )

    op.execute(
        "COMMENT ON COLUMN path_matrix_cache.path_data IS "
        "'Full TransitionPathResponse JSON for this path'"
    )

    op.execute(
        "COMMENT ON COLUMN path_matrix_cache.vac_hash IS "
        "'SHA-256 hash of concatenated VAC coordinates; invalidates cache if emotions are remapped'"
    )

    op.execute(
        "COMMENT ON COLUMN path_matrix_cache.distance IS "
        "'Total VAC distance for quick sorting/filtering'"
    )

    op.execute(
        "COMMENT ON COLUMN path_matrix_cache.difficulty IS "
        "'easy/moderate/difficult classification'"
    )

    # Create path_computation_jobs table
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS path_computation_jobs (
            job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
            total_paths INTEGER NOT NULL,
            completed_paths INTEGER NOT NULL DEFAULT 0,
            failed_paths INTEGER NOT NULL DEFAULT 0,
            started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            completed_at TIMESTAMP WITH TIME ZONE,
            error_message TEXT,
            created_by VARCHAR(100) DEFAULT 'admin'
        )
    """
    )

    op.execute("CREATE INDEX idx_computation_jobs_status " "ON path_computation_jobs(status)")

    op.execute(
        "CREATE INDEX idx_computation_jobs_started_at " "ON path_computation_jobs(started_at)"
    )

    op.execute(
        "COMMENT ON TABLE path_computation_jobs IS "
        "'Tracks background jobs for computing all matrix paths'"
    )

    # Create VAC hash calculation function
    op.execute(
        """
        CREATE OR REPLACE FUNCTION calculate_vac_hash(
            from_vac FLOAT[],
            to_vac FLOAT[]
        ) RETURNS VARCHAR(64) AS $$
        BEGIN
            RETURN encode(
                digest(
                    array_to_string(from_vac, ',') || '|' || array_to_string(to_vac, ','),
                    'sha256'
                ),
                'hex'
            );
        END;
        $$ LANGUAGE plpgsql IMMUTABLE
    """
    )

    op.execute(
        "COMMENT ON FUNCTION calculate_vac_hash IS "
        "'Generates hash for cache invalidation if VAC coordinates change'"
    )


def downgrade() -> None:
    """Drop path matrix cache tables and functions."""
    op.execute("DROP FUNCTION IF EXISTS calculate_vac_hash(FLOAT[], FLOAT[])")
    op.execute("DROP TABLE IF EXISTS path_computation_jobs CASCADE")
    op.execute("DROP TABLE IF EXISTS path_matrix_cache CASCADE")
