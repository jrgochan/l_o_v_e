-- Add Deep Feeling Mode Schema
-- Migration: add_deep_feeling_mode
-- Description: Adds multi-emotion analysis tables and deep_feeling_mode column
-- Date: 2025-12-06

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add deep_feeling_mode to chat_sessions
ALTER TABLE chat_sessions 
ADD COLUMN IF NOT EXISTS deep_feeling_mode BOOLEAN DEFAULT FALSE;

-- Create multi_emotion_analyses table
CREATE TABLE IF NOT EXISTS multi_emotion_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    deep_feeling_enabled BOOLEAN DEFAULT TRUE,
    
    -- Aggregate state
    aggregate_vac FLOAT[3],  -- weighted VAC blend [valence, arousal, connection]
    complexity_score FLOAT CHECK (complexity_score >= 0 AND complexity_score <= 1),  -- 0-1
    emotional_clarity FLOAT CHECK (emotional_clarity >= 0 AND emotional_clarity <= 1),  -- 0-1
    
    -- Temporal pattern
    temporal_pattern VARCHAR(50),  -- 'concurrent', 'sequential', 'emerging'
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_message FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
    CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

-- Create indexes for multi_emotion_analyses
CREATE INDEX IF NOT EXISTS idx_multi_emotion_session ON multi_emotion_analyses(session_id);
CREATE INDEX IF NOT EXISTS idx_multi_emotion_message ON multi_emotion_analyses(message_id);
CREATE INDEX IF NOT EXISTS idx_multi_emotion_created ON multi_emotion_analyses(created_at DESC);

-- Create detected_emotions table
CREATE TABLE IF NOT EXISTS detected_emotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID NOT NULL REFERENCES multi_emotion_analyses(id) ON DELETE CASCADE,
    emotion_id UUID REFERENCES atlas_definitions(id),
    
    -- Detection data
    confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),  -- 0-1
    prominence VARCHAR(20) NOT NULL CHECK (prominence IN ('primary', 'secondary', 'underlying')),
    vac FLOAT[3] NOT NULL,  -- VAC coordinates for this emotion
    
    -- Voice-content alignment (from prosody)
    voice_alignment FLOAT CHECK (voice_alignment IS NULL OR (voice_alignment >= 0 AND voice_alignment <= 1)),  -- 0-1
    voice_interpretation_vac FLOAT[3],  -- VAC from voice-only analysis
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_analysis FOREIGN KEY (analysis_id) REFERENCES multi_emotion_analyses(id) ON DELETE CASCADE,
    CONSTRAINT fk_emotion FOREIGN KEY (emotion_id) REFERENCES atlas_definitions(id)
);

-- Create indexes for detected_emotions
CREATE INDEX IF NOT EXISTS idx_detected_emotion_analysis ON detected_emotions(analysis_id);
CREATE INDEX IF NOT EXISTS idx_detected_emotion_emotion ON detected_emotions(emotion_id);
CREATE INDEX IF NOT EXISTS idx_detected_emotion_prominence ON detected_emotions(prominence);

-- Create emotion_relationships table
CREATE TABLE IF NOT EXISTS emotion_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID NOT NULL REFERENCES multi_emotion_analyses(id) ON DELETE CASCADE,
    emotion_a_id UUID NOT NULL REFERENCES detected_emotions(id) ON DELETE CASCADE,
    emotion_b_id UUID NOT NULL REFERENCES detected_emotions(id) ON DELETE CASCADE,
    
    -- Relationship data
    relationship_type VARCHAR(50) NOT NULL CHECK (relationship_type IN ('complementary', 'contradictory', 'masking', 'amplifying', 'sequential')),
    strength FLOAT CHECK (strength >= 0 AND strength <= 1),  -- 0-1
    description TEXT,  -- Human-readable explanation
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_relationship_analysis FOREIGN KEY (analysis_id) REFERENCES multi_emotion_analyses(id) ON DELETE CASCADE,
    CONSTRAINT fk_emotion_a FOREIGN KEY (emotion_a_id) REFERENCES detected_emotions(id) ON DELETE CASCADE,
    CONSTRAINT fk_emotion_b FOREIGN KEY (emotion_b_id) REFERENCES detected_emotions(id) ON DELETE CASCADE,
    CONSTRAINT check_different_emotions CHECK (emotion_a_id != emotion_b_id)
);

-- Create indexes for emotion_relationships
CREATE INDEX IF NOT EXISTS idx_relationship_analysis ON emotion_relationships(analysis_id);
CREATE INDEX IF NOT EXISTS idx_relationship_type ON emotion_relationships(relationship_type);

-- Create emotion_goals table (for future use)
CREATE TABLE IF NOT EXISTS emotion_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    
    -- Goal definition
    goal_emotion_id UUID REFERENCES atlas_definitions(id),
    priority INTEGER DEFAULT 1 CHECK (priority > 0),  -- if multiple goals, which is most important
    target_date TIMESTAMP,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'abandoned')),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_goal_session FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_goal_emotion FOREIGN KEY (goal_emotion_id) REFERENCES atlas_definitions(id)
);

-- Create indexes for emotion_goals
CREATE INDEX IF NOT EXISTS idx_emotion_goal_session ON emotion_goals(session_id);
CREATE INDEX IF NOT EXISTS idx_emotion_goal_user ON emotion_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_emotion_goal_status ON emotion_goals(status);

-- Add comment documentation
COMMENT ON TABLE multi_emotion_analyses IS 'Stores multi-emotion analysis results with aggregate emotional state';
COMMENT ON TABLE detected_emotions IS 'Individual emotions detected in a multi-emotion analysis (up to 3 per analysis)';
COMMENT ON TABLE emotion_relationships IS 'Relationships between detected emotions (complementary, contradictory, etc.)';
COMMENT ON TABLE emotion_goals IS 'User-defined goal emotions for pathfinding (future feature)';

COMMENT ON COLUMN multi_emotion_analyses.aggregate_vac IS 'Weighted average VAC from all detected emotions';
COMMENT ON COLUMN multi_emotion_analyses.complexity_score IS 'Emotional complexity: 0=simple/clear, 1=complex/mixed';
COMMENT ON COLUMN multi_emotion_analyses.emotional_clarity IS 'How clear vs muddied the emotional state is';
COMMENT ON COLUMN multi_emotion_analyses.temporal_pattern IS 'concurrent=simultaneous, sequential=one-after-another, emerging=building';

COMMENT ON COLUMN detected_emotions.prominence IS 'primary=highest confidence, secondary=significant, underlying=hidden/suppressed';
COMMENT ON COLUMN detected_emotions.voice_alignment IS 'How well voice prosody matches this emotion (0-1)';
COMMENT ON COLUMN detected_emotions.voice_interpretation_vac IS 'VAC coordinates based on voice analysis only';

COMMENT ON COLUMN emotion_relationships.relationship_type IS 'complementary=naturally co-occur, contradictory=in tension, masking=one hiding another, amplifying=one intensifying another, sequential=temporal order';
COMMENT ON COLUMN emotion_relationships.strength IS 'Strength of the relationship (0-1)';
