"""Add model management

Revision ID: af6g7h8i9j0k
Revises: 9e5f6g7h8i9j
Create Date: 2026-01-03 20:33:00

This migration adds AI model management infrastructure for tracking which
Ollama models are assigned to different AI functions and monitoring their
performance over time.

Tables:
- model_assignments: Maps AI functions to Ollama models
- model_performance_metrics: Detailed performance tracking

Includes seed data for default model assignments (llama3.1:8b-instruct-q4_0).
"""

from alembic import op

# Revision identifiers, used by Alembic
revision = "af6g7h8i9j0k"
down_revision = "9e5f6g7h8i9j"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create model management tables with seed data."""
    
    # Create model_assignments table
    op.execute("""
        CREATE TABLE IF NOT EXISTS model_assignments (
            function VARCHAR(50) PRIMARY KEY,
            ai_model_name VARCHAR(100) NOT NULL,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            assigned_by VARCHAR(100),
            avg_latency_ms FLOAT,
            total_invocations INTEGER DEFAULT 0 NOT NULL,
            last_used_at TIMESTAMP
        )
    """)
    
    # Create index
    op.execute(
        "CREATE INDEX idx_model_assignments_model_name "
        "ON model_assignments(ai_model_name)"
    )
    
    # Add comments
    op.execute(
        "COMMENT ON TABLE model_assignments IS "
        "'Stores which Ollama model is assigned to each AI function'"
    )
    
    op.execute(
        "COMMENT ON COLUMN model_assignments.function IS "
        "'AI function name (semantic_vac, multi_emotion, insight_generation, atlas_mapping)'"
    )
    
    op.execute(
        "COMMENT ON COLUMN model_assignments.ai_model_name IS "
        "'Ollama model name (e.g., llama3.1:8b-instruct-q4_0)'"
    )
    
    op.execute(
        "COMMENT ON COLUMN model_assignments.avg_latency_ms IS "
        "'Exponential moving average of latency in milliseconds'"
    )
    
    op.execute(
        "COMMENT ON COLUMN model_assignments.total_invocations IS "
        "'Total number of times this model has been used for this function'"
    )
    
    # Seed default assignments
    op.execute("""
        INSERT INTO model_assignments (function, ai_model_name, assigned_at, total_invocations) VALUES
            ('semantic_vac', 'llama3.1:8b-instruct-q4_0', CURRENT_TIMESTAMP, 0),
            ('multi_emotion', 'llama3.1:8b-instruct-q4_0', CURRENT_TIMESTAMP, 0),
            ('insight_generation', 'llama3.1:8b-instruct-q4_0', CURRENT_TIMESTAMP, 0),
            ('atlas_mapping', 'llama3.1:8b-instruct-q4_0', CURRENT_TIMESTAMP, 0)
        ON CONFLICT (function) DO NOTHING
    """)
    
    # Create model_performance_metrics table
    op.execute("""
        CREATE TABLE IF NOT EXISTS model_performance_metrics (
            id SERIAL PRIMARY KEY,
            function VARCHAR(50) NOT NULL,
            ai_model_name VARCHAR(100) NOT NULL,
            latency_ms FLOAT NOT NULL,
            success BOOLEAN NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            error_message TEXT,
            CONSTRAINT fk_function FOREIGN KEY (function) 
                REFERENCES model_assignments(function) ON DELETE CASCADE
        )
    """)
    
    # Create indexes for performance metrics
    op.execute(
        "CREATE INDEX idx_model_performance_function_model "
        "ON model_performance_metrics(function, ai_model_name)"
    )
    
    op.execute(
        "CREATE INDEX idx_model_performance_timestamp "
        "ON model_performance_metrics(timestamp DESC)"
    )
    
    # Add comment
    op.execute(
        "COMMENT ON TABLE model_performance_metrics IS "
        "'Tracks performance metrics for model usage over time'"
    )


def downgrade() -> None:
    """Drop model management tables."""
    op.execute("DROP TABLE IF EXISTS model_performance_metrics CASCADE")
    op.execute("DROP TABLE IF EXISTS model_assignments CASCADE")
