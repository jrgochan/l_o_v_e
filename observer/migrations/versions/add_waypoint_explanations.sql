-- Migration: Add Waypoint Explanation Templates
-- Purpose: Store research-backed explanations for emotional transition waypoints
-- Date: 2025-12-05

-- Create waypoint explanation templates table
CREATE TABLE IF NOT EXISTS waypoint_explanation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Pattern matching (emotion-specific)
    from_emotion_id UUID REFERENCES atlas_definitions(id) ON DELETE CASCADE,
    to_emotion_id UUID REFERENCES atlas_definitions(id) ON DELETE CASCADE,
    waypoint_emotion_id UUID REFERENCES atlas_definitions(id) ON DELETE CASCADE,

    -- OR category-level patterns (for broader matching)
    from_category VARCHAR(100),
    to_category VARCHAR(100),

    -- Core explanations
    psychological_purpose TEXT NOT NULL,
    why_this_order TEXT NOT NULL,
    what_it_enables TEXT NOT NULL,

    -- Previous emotion context
    previous_what_changed TEXT[],
    previous_why_necessary TEXT,

    -- Next emotion context
    next_what_enabled TEXT[],
    next_how_prepares TEXT,

    -- User guidance
    readiness_signs TEXT[] NOT NULL,
    warning_signs TEXT[],

    -- Research backing (stored as JSONB for flexibility)
    research_citations JSONB,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(100) DEFAULT 'system',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    priority INTEGER DEFAULT 100,

    -- Ensure uniqueness
    UNIQUE (from_emotion_id, to_emotion_id, waypoint_emotion_id)
);

-- Create indexes for performance
CREATE INDEX idx_waypoint_templates_from ON waypoint_explanation_templates(from_emotion_id);
CREATE INDEX idx_waypoint_templates_to ON waypoint_explanation_templates(to_emotion_id);
CREATE INDEX idx_waypoint_templates_waypoint ON waypoint_explanation_templates(waypoint_emotion_id);
CREATE INDEX idx_waypoint_templates_priority ON waypoint_explanation_templates(priority DESC);
CREATE INDEX idx_waypoint_templates_categories ON waypoint_explanation_templates(from_category, to_category);

-- Add comment
COMMENT ON TABLE waypoint_explanation_templates IS
'Stores curated, research-backed explanations for common emotional transition waypoints. Used by WaypointExplainer service to provide rich psychological context.';

COMMENT ON COLUMN waypoint_explanation_templates.psychological_purpose IS
'Why this waypoint is psychologically necessary (core purpose)';

COMMENT ON COLUMN waypoint_explanation_templates.research_citations IS
'Array of research citations in JSON format with author, year, work, key_finding';

COMMENT ON COLUMN waypoint_explanation_templates.priority IS
'Higher priority templates are used first when multiple matches exist (100 = default)';
