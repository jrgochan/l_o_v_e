-- Add Chat System Tables
-- Migration: Chat sessions and messages for emotional analysis chat interface
-- Author: System
-- Date: 2025-12-05

-- Chat sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    message_count INTEGER DEFAULT 0,
    tone_preference VARCHAR(20) DEFAULT 'warm',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    message_type VARCHAR(50) NOT NULL,  -- 'user_text', 'user_audio', 'system_analysis', 'system_insight'
    content TEXT,
    audio_url TEXT,
    transcription TEXT,
    
    -- Analysis data
    emotion_id UUID REFERENCES atlas_definition(id),
    vac_coordinates FLOAT[3],
    confidence FLOAT,
    
    -- Prosody data (voice characteristics)
    prosody_pitch_mean FLOAT,
    prosody_pitch_std FLOAT,
    prosody_energy FLOAT,
    prosody_rate FLOAT,
    prosody_features JSONB,
    
    -- Insights and reasoning
    insights JSONB,
    tone_mode VARCHAR(20),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_started_at ON chat_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_emotion_id ON chat_messages(emotion_id);

-- Update function for updated_at
CREATE OR REPLACE FUNCTION update_chat_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_session_updated_at();

-- Comments
COMMENT ON TABLE chat_sessions IS 'Chat sessions for emotional analysis chat interface';
COMMENT ON TABLE chat_messages IS 'Individual messages within chat sessions with analysis data';
COMMENT ON COLUMN chat_messages.prosody_features IS 'JSONB storage for detailed voice features (jitter, shimmer, HNR, etc.)';
COMMENT ON COLUMN chat_messages.insights IS 'AI-generated insights combining voice and content analysis';
