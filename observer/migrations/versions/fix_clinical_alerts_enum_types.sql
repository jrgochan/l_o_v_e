-- Fix enum type mismatch in clinical_alerts table
-- Change from PostgreSQL ENUMs to VARCHAR for SQLAlchemy compatibility
-- Created: 2025-12-06

-- Alter columns to VARCHAR
ALTER TABLE clinical_alerts 
  ALTER COLUMN level TYPE VARCHAR(20),
  ALTER COLUMN type TYPE VARCHAR(50);

-- Drop the enum types (they're no longer needed)
DROP TYPE IF EXISTS alert_level CASCADE;
DROP TYPE IF EXISTS alert_type CASCADE;

-- Add check constraints for data integrity (optional but recommended)
ALTER TABLE clinical_alerts
  ADD CONSTRAINT check_alert_level CHECK (level IN ('critical', 'warning', 'attention', 'stable'));

ALTER TABLE clinical_alerts
  ADD CONSTRAINT check_alert_type CHECK (type IN ('high_arousal', 'voice_mismatch', 'low_confidence', 'pattern_concern', 'voice_quality'));
