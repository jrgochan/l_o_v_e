-- Rename model_name to ai_model_name Migration
-- Fixes Pydantic v2 warning about protected namespace "model_"
-- Date: December 7, 2025

-- Step 1: Rename column in model_assignments table
ALTER TABLE model_assignments RENAME COLUMN model_name TO ai_model_name;

-- Step 2: Rename the index
ALTER INDEX idx_model_assignments_model_name RENAME TO idx_model_assignments_ai_model_name;

-- Step 3: Update model_performance_metrics table if it references the column
-- (The FK is on the function column, so no FK updates needed)
-- But we should rename the column there too for consistency
ALTER TABLE model_performance_metrics RENAME COLUMN model_name TO ai_model_name;

-- Update index on model_performance_metrics
DROP INDEX IF EXISTS idx_model_performance_function_model;
CREATE INDEX idx_model_performance_function_ai_model ON model_performance_metrics(function, ai_model_name);

-- Update comments to reflect new column name
COMMENT ON COLUMN model_assignments.ai_model_name IS 'Ollama model name (e.g., llama3.1:8b-instruct-q4_0) - renamed from model_name to avoid Pydantic namespace conflict';
COMMENT ON COLUMN model_performance_metrics.ai_model_name IS 'Ollama model name for this performance metric';

-- Migration complete
-- No data loss - just column renaming
