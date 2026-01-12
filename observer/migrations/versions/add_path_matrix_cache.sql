-- Migration: Add Path Matrix Cache Table
-- Description: Caches computed emotion-to-emotion transition paths for performance
-- Created: 2025-12-05

-- Create path_matrix_cache table
CREATE TABLE IF NOT EXISTS path_matrix_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_emotion_id UUID NOT NULL REFERENCES atlas_definitions(id),
    to_emotion_id UUID NOT NULL REFERENCES atlas_definitions(id),
    
    -- Path data (full JSON response)
    path_data JSONB NOT NULL,
    
    -- Quick-access metrics for querying
    distance FLOAT NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'moderate', 'difficult')),
    waypoint_count INTEGER NOT NULL DEFAULT 0,
    requires_bridge BOOLEAN NOT NULL DEFAULT FALSE,
    estimated_time VARCHAR(50),
    
    -- Cache management
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    vac_hash VARCHAR(64) NOT NULL, -- Hash of VAC coordinates to detect changes
    
    -- Ensure unique paths (each direction stored separately for flexibility)
    UNIQUE (from_emotion_id, to_emotion_id),
    
    -- Prevent self-transitions
    CHECK (from_emotion_id != to_emotion_id)
);

-- Indexes for common queries
CREATE INDEX idx_path_matrix_from ON path_matrix_cache(from_emotion_id);
CREATE INDEX idx_path_matrix_to ON path_matrix_cache(to_emotion_id);
CREATE INDEX idx_path_matrix_difficulty ON path_matrix_cache(difficulty);
CREATE INDEX idx_path_matrix_distance ON path_matrix_cache(distance);
CREATE INDEX idx_path_matrix_bridge ON path_matrix_cache(requires_bridge);
CREATE INDEX idx_path_matrix_computed_at ON path_matrix_cache(computed_at);
CREATE INDEX idx_path_matrix_vac_hash ON path_matrix_cache(vac_hash);

-- Composite index for common filter combinations
CREATE INDEX idx_path_matrix_metrics ON path_matrix_cache(difficulty, distance, requires_bridge);

-- Comments for documentation
COMMENT ON TABLE path_matrix_cache IS 'Caches computed emotional transition paths for the 87×87 matrix';
COMMENT ON COLUMN path_matrix_cache.path_data IS 'Full TransitionPathResponse JSON for this path';
COMMENT ON COLUMN path_matrix_cache.vac_hash IS 'SHA-256 hash of concatenated VAC coordinates; invalidates cache if emotions are remapped';
COMMENT ON COLUMN path_matrix_cache.distance IS 'Total VAC distance for quick sorting/filtering';
COMMENT ON COLUMN path_matrix_cache.difficulty IS 'easy/moderate/difficult classification';

-- Create computation jobs table for tracking batch operations
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
);

CREATE INDEX idx_computation_jobs_status ON path_computation_jobs(status);
CREATE INDEX idx_computation_jobs_started_at ON path_computation_jobs(started_at);

COMMENT ON TABLE path_computation_jobs IS 'Tracks background jobs for computing all matrix paths';

-- Helper function to calculate VAC hash
CREATE OR REPLACE FUNCTION calculate_vac_hash(
    from_vac FLOAT[],
    to_vac FLOAT[]
) RETURNS VARCHAR(64) AS $$
BEGIN
    -- Concatenate and hash VAC coordinates
    RETURN encode(
        digest(
            array_to_string(from_vac, ',') || '|' || array_to_string(to_vac, ','),
            'sha256'
        ),
        'hex'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_vac_hash IS 'Generates hash for cache invalidation if VAC coordinates change';
