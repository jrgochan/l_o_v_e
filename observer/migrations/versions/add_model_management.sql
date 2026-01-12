-- AI Model Management Migration
-- Creates tables for storing model assignments and tracking performance

-- Create model_assignments table
CREATE TABLE IF NOT EXISTS model_assignments (
    function VARCHAR(50) PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    assigned_by VARCHAR(100),
    avg_latency_ms FLOAT,
    total_invocations INTEGER DEFAULT 0 NOT NULL,
    last_used_at TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_model_assignments_model_name ON model_assignments(model_name);

-- Seed default assignments (all functions use llama3.1:8b initially)
INSERT INTO model_assignments (function, model_name, assigned_at, total_invocations) VALUES
    ('semantic_vac', 'llama3.1:8b-instruct-q4_0', CURRENT_TIMESTAMP, 0),
    ('multi_emotion', 'llama3.1:8b-instruct-q4_0', CURRENT_TIMESTAMP, 0),
    ('insight_generation', 'llama3.1:8b-instruct-q4_0', CURRENT_TIMESTAMP, 0),
    ('atlas_mapping', 'llama3.1:8b-instruct-q4_0', CURRENT_TIMESTAMP, 0)
ON CONFLICT (function) DO NOTHING;  -- Don't overwrite existing assignments

-- Create model_performance_metrics table for detailed tracking
CREATE TABLE IF NOT EXISTS model_performance_metrics (
    id SERIAL PRIMARY KEY,
    function VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    latency_ms FLOAT NOT NULL,
    success BOOLEAN NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    error_message TEXT,
    
    -- Indexes for querying
    CONSTRAINT fk_function FOREIGN KEY (function) REFERENCES model_assignments(function) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_model_performance_function_model ON model_performance_metrics(function, model_name);
CREATE INDEX IF NOT EXISTS idx_model_performance_timestamp ON model_performance_metrics(timestamp DESC);

-- Add helpful comments
COMMENT ON TABLE model_assignments IS 'Stores which Ollama model is assigned to each AI function';
COMMENT ON TABLE model_performance_metrics IS 'Tracks performance metrics for model usage over time';

COMMENT ON COLUMN model_assignments.function IS 'AI function name (semantic_vac, multi_emotion, insight_generation, atlas_mapping)';
COMMENT ON COLUMN model_assignments.model_name IS 'Ollama model name (e.g., llama3.1:8b-instruct-q4_0)';
COMMENT ON COLUMN model_assignments.avg_latency_ms IS 'Exponential moving average of latency in milliseconds';
COMMENT ON COLUMN model_assignments.total_invocations IS 'Total number of times this model has been used for this function';
