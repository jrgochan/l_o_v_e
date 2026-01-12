-- Add 3-Way Analysis Support to Multi-Emotion Analyses
-- Migration: add_three_way_analysis
-- Created: 2025-12-06
-- Description: Extends multi_emotion_analyses table to store content-only, voice-only, and discrepancy data

-- Add JSONB columns for storing 3-way analysis data
ALTER TABLE multi_emotion_analyses
ADD COLUMN IF NOT EXISTS three_way_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS content_only_data JSONB,
ADD COLUMN IF NOT EXISTS voice_only_data JSONB,
ADD COLUMN IF NOT EXISTS discrepancy_metrics JSONB;

-- Create index for querying by 3-way enabled status
CREATE INDEX IF NOT EXISTS idx_multi_emotion_three_way_enabled 
ON multi_emotion_analyses(three_way_enabled) WHERE three_way_enabled = TRUE;

-- Create GIN index for searching within JSONB columns
CREATE INDEX IF NOT EXISTS idx_multi_emotion_content_only_data 
ON multi_emotion_analyses USING GIN(content_only_data);

CREATE INDEX IF NOT EXISTS idx_multi_emotion_voice_only_data 
ON multi_emotion_analyses USING GIN(voice_only_data);

CREATE INDEX IF NOT EXISTS idx_multi_emotion_discrepancy_metrics 
ON multi_emotion_analyses USING GIN(discrepancy_metrics);

-- Add comments explaining the new columns
COMMENT ON COLUMN multi_emotion_analyses.three_way_enabled IS 
'Whether 3-way analysis (content/voice/blended) was performed for this message';

COMMENT ON COLUMN multi_emotion_analyses.content_only_data IS 
'JSONB storing content-only emotion analysis (from text semantic analysis alone)';

COMMENT ON COLUMN multi_emotion_analyses.voice_only_data IS 
'JSONB storing voice-only emotion analysis (from prosody features alone)';

COMMENT ON COLUMN multi_emotion_analyses.discrepancy_metrics IS 
'JSONB storing discrepancy calculations, clinical flags, and interpretations';

-- Example JSONB structure for content_only_data and voice_only_data:
-- {
--   "emotions": [
--     {
--       "emotion_name": "Anxiety",
--       "category": "Places We Go When Things Are Uncertain or Too Much",
--       "vac": {"valence": -0.4, "arousal": 0.7, "connection": 0.2},
--       "confidence": 0.75,
--       "prominence": "primary"
--     }
--   ],
--   "aggregate_vac": {"valence": -0.4, "arousal": 0.7, "connection": 0.2},
--   "complexity_score": 0.3,
--   "emotional_clarity": 0.8,
--   "temporal_pattern": "concurrent",
--   "reasoning": "Content suggests nervousness and uncertainty"
-- }

-- Example JSONB structure for discrepancy_metrics:
-- {
--   "content_voice_distance": 0.847,
--   "content_blended_distance": 0.234,
--   "voice_blended_distance": 0.612,
--   "flags": ["significant_incongruence", "emotional_suppression"],
--   "interpretation": "Content suggests positive emotions, but voice reveals underlying distress...",
--   "content_primary": "Contentment",
--   "voice_primary": "Anxiety",
--   "blended_primary": "Ambivalence"
-- }
