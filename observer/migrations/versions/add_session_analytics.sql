-- Add session_analytics table for tracking session metrics
-- Created: 2025-12-06

-- Create session_analytics table
CREATE TABLE session_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL UNIQUE REFERENCES chat_sessions(id) ON DELETE CASCADE,

    -- Emotion metrics
    emotion_count INTEGER NOT NULL DEFAULT 0,
    average_confidence FLOAT NOT NULL DEFAULT 0.0,
    dominant_category VARCHAR(100),

    -- Session timing
    start_time TIMESTAMP NOT NULL DEFAULT NOW(),
    last_emotion_time TIMESTAMP,
    total_duration_seconds INTEGER NOT NULL DEFAULT 0,

    -- Alert counts
    critical_alert_count INTEGER NOT NULL DEFAULT 0,
    warning_alert_count INTEGER NOT NULL DEFAULT 0,
    attention_alert_count INTEGER NOT NULL DEFAULT 0,

    -- Category breakdown (flexible JSON structure)
    category_counts JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- VAC statistics (flexible JSON structure)
    vac_stats JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE UNIQUE INDEX idx_session_analytics_session ON session_analytics(session_id);
CREATE INDEX idx_session_analytics_start_time ON session_analytics(start_time);
CREATE INDEX idx_session_analytics_emotion_count ON session_analytics(emotion_count);
CREATE INDEX idx_session_analytics_dominant_category ON session_analytics(dominant_category);

-- Add comments for documentation
COMMENT ON TABLE session_analytics IS 'Real-time aggregated metrics for emotional analysis sessions';
COMMENT ON COLUMN session_analytics.category_counts IS 'Breakdown of emotions by category: {"anxiety": 3, "joy": 2, ...}';
COMMENT ON COLUMN session_analytics.vac_stats IS 'Aggregated VAC statistics: {valence_avg, arousal_avg, connection_avg, ...}';
