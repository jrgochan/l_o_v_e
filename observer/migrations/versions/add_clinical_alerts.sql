-- Add clinical_alerts table for tracking clinical alert evaluations
-- Created: 2025-12-06

-- Create ENUM types for alert levels and types
CREATE TYPE alert_level AS ENUM ('critical', 'warning', 'attention', 'stable');
CREATE TYPE alert_type AS ENUM ('high_arousal', 'voice_mismatch', 'low_confidence', 'pattern_concern', 'voice_quality');

-- Create clinical_alerts table
CREATE TABLE clinical_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Alert details
    level alert_level NOT NULL,
    type alert_type NOT NULL,
    message TEXT NOT NULL,
    suggestion TEXT,
    
    -- Audit information
    triggered_by JSONB NOT NULL,
    threshold_used JSONB NOT NULL,
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_clinical_alerts_session ON clinical_alerts(session_id);
CREATE INDEX idx_clinical_alerts_timestamp ON clinical_alerts(timestamp);
CREATE INDEX idx_clinical_alerts_level ON clinical_alerts(level);
CREATE INDEX idx_clinical_alerts_type ON clinical_alerts(type);

-- Add comment to table
COMMENT ON TABLE clinical_alerts IS 'Stores clinical alert evaluations for emotional analysis sessions with audit trail';
COMMENT ON COLUMN clinical_alerts.triggered_by IS 'VAC and prosody values that triggered the alert';
COMMENT ON COLUMN clinical_alerts.threshold_used IS 'Clinical thresholds applied for this alert evaluation';
COMMENT ON COLUMN clinical_alerts.version IS 'Alert rule version for tracking threshold changes over time';
