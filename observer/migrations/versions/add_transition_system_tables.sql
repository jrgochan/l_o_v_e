-- Transition System Database Migration
-- Creates tables for emotional state transition guidance system

-- ============================================================================
-- TRANSITION STRATEGIES TABLE
-- Stores evidence-based emotion regulation strategies
-- ============================================================================
CREATE TABLE IF NOT EXISTS transition_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_name VARCHAR(200) NOT NULL,
    strategy_type VARCHAR(50) NOT NULL CHECK (strategy_type IN (
        'situation_selection',
        'situation_modification',
        'attentional_deployment',
        'cognitive_reappraisal',
        'response_modulation'
    )),
    description TEXT NOT NULL,
    detailed_steps JSONB NOT NULL,  -- Array of step strings
    time_required VARCHAR(50),
    difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
    evidence_level VARCHAR(50) NOT NULL CHECK (evidence_level IN (
        'meta_analysis',
        'rct',
        'clinical',
        'theoretical'
    )),
    research_citations JSONB,  -- Array of citation objects
    contraindications TEXT,  -- When NOT to use this strategy
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_strategy_type ON transition_strategies(strategy_type);
CREATE INDEX idx_strategy_difficulty ON transition_strategies(difficulty_level);
CREATE INDEX idx_strategy_evidence ON transition_strategies(evidence_level);

-- ============================================================================
-- TRANSITION PATTERNS TABLE
-- Defines common emotional transition patterns (e.g., High Arousal → Low Arousal)
-- ============================================================================
CREATE TABLE IF NOT EXISTS transition_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_name VARCHAR(100) NOT NULL UNIQUE,
    from_category VARCHAR(200) NOT NULL,
    to_category VARCHAR(200) NOT NULL,
    vac_change_characteristics JSONB NOT NULL,  -- {valence_change: float, arousal_change: float, connection_change: float}
    difficulty_score FLOAT NOT NULL CHECK (difficulty_score BETWEEN 0 AND 1),
    psychological_reasoning TEXT NOT NULL,
    example_transitions TEXT[],  -- Array of example emotion pairs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pattern_categories ON transition_patterns(from_category, to_category);

-- ============================================================================
-- PATTERN-STRATEGIES JUNCTION TABLE
-- Maps which strategies work for which patterns
-- ============================================================================
CREATE TABLE IF NOT EXISTS pattern_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_id UUID NOT NULL REFERENCES transition_patterns(id) ON DELETE CASCADE,
    strategy_id UUID NOT NULL REFERENCES transition_strategies(id) ON DELETE CASCADE,
    recommendation_order INTEGER NOT NULL,  -- 1 = most recommended
    applicability_conditions JSONB,  -- When to prefer this strategy
    effectiveness_rating FLOAT,  -- 0-5 based on research/clinical data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pattern_id, strategy_id)
);

CREATE INDEX idx_pattern_strategies_pattern ON pattern_strategies(pattern_id);
CREATE INDEX idx_pattern_strategies_order ON pattern_strategies(pattern_id, recommendation_order);

-- ============================================================================
-- USER JOURNEYS TABLE
-- Tracks users' emotional transition attempts
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_journeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    start_emotion_id UUID REFERENCES atlas_definitions(id),
    goal_emotion_id UUID REFERENCES atlas_definitions(id),
    start_vac FLOAT[3] NOT NULL,  -- [valence, arousal, connection]
    goal_vac FLOAT[3] NOT NULL,
    waypoints JSONB NOT NULL,  -- Full path structure for reference
    path_id VARCHAR(100),  -- For tracking specific generated paths
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN (
        'in_progress',
        'completed',
        'abandoned',
        'paused'
    )),
    current_waypoint INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    abandoned_at TIMESTAMP WITH TIME ZONE,
    paused_at TIMESTAMP WITH TIME ZONE,
    context_metadata JSONB,  -- {location, time_of_day, has_support, energy_level, etc.}
    total_distance FLOAT,  -- VAC distance from start to goal
    estimated_time VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_journeys_user_id ON user_journeys(user_id);
CREATE INDEX idx_user_journeys_status ON user_journeys(status);
CREATE INDEX idx_user_journeys_started ON user_journeys(started_at);
CREATE INDEX idx_user_journeys_user_status ON user_journeys(user_id, status);

-- ============================================================================
-- JOURNEY WAYPOINTS TABLE
-- Tracks progress through each waypoint in a journey
-- ============================================================================
CREATE TABLE IF NOT EXISTS journey_waypoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID NOT NULL REFERENCES user_journeys(id) ON DELETE CASCADE,
    waypoint_index INTEGER NOT NULL,
    emotion_id UUID NOT NULL REFERENCES atlas_definitions(id),
    emotion_name VARCHAR(100) NOT NULL,
    category VARCHAR(200) NOT NULL,
    vac_target FLOAT[3] NOT NULL,
    quaternion_target FLOAT[4],  -- [w, x, y, z]
    distance_from_previous FLOAT,
    estimated_time VARCHAR(50),
    difficulty VARCHAR(20),  -- 'easy', 'moderate', 'difficult'
    reasoning TEXT,  -- Why this waypoint
    reached BOOLEAN DEFAULT FALSE,
    reached_at TIMESTAMP WITH TIME ZONE,
    time_to_reach INTERVAL,
    validated_vac FLOAT[3],  -- User's actual VAC when they reported reaching
    distance_from_target FLOAT,  -- How close they got
    self_assessment JSONB,  -- {emotion_match: 1-5, confidence: 1-5, notes: string}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(journey_id, waypoint_index)
);

CREATE INDEX idx_waypoints_journey ON journey_waypoints(journey_id);
CREATE INDEX idx_waypoints_journey_order ON journey_waypoints(journey_id, waypoint_index);
CREATE INDEX idx_waypoints_reached ON journey_waypoints(reached);

-- ============================================================================
-- STRATEGY ATTEMPTS TABLE
-- Records which strategies users try and their effectiveness
-- ============================================================================
CREATE TABLE IF NOT EXISTS strategy_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID NOT NULL REFERENCES user_journeys(id) ON DELETE CASCADE,
    waypoint_index INTEGER NOT NULL,
    strategy_id UUID NOT NULL REFERENCES transition_strategies(id),
    strategy_name VARCHAR(200) NOT NULL,  -- Denormalized for easy querying
    tried BOOLEAN NOT NULL DEFAULT TRUE,
    tried_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    helpful_rating INTEGER CHECK (helpful_rating BETWEEN 1 AND 5),
    time_spent INTERVAL,
    user_notes TEXT,
    completed BOOLEAN DEFAULT FALSE,
    abandoned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_attempts_journey ON strategy_attempts(journey_id);
CREATE INDEX idx_attempts_strategy ON strategy_attempts(strategy_id);
CREATE INDEX idx_attempts_helpful ON strategy_attempts(helpful_rating);
CREATE INDEX idx_attempts_strategy_rating ON strategy_attempts(strategy_id, helpful_rating);

-- ============================================================================
-- CATEGORY TRANSITIONS TABLE
-- Stores the difficulty matrix for category-to-category transitions
-- ============================================================================
CREATE TABLE IF NOT EXISTS category_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_category VARCHAR(200) NOT NULL,
    to_category VARCHAR(200) NOT NULL,
    difficulty_score FLOAT NOT NULL CHECK (difficulty_score BETWEEN 0 AND 1),
    is_prohibited BOOLEAN DEFAULT FALSE,  -- If difficulty >= 0.9
    requires_bridge BOOLEAN DEFAULT FALSE,  -- Needs intermediate category
    recommended_bridge_categories TEXT[],  -- Which categories to route through
    psychological_rationale TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(from_category, to_category)
);

CREATE INDEX idx_category_trans_from ON category_transitions(from_category);
CREATE INDEX idx_category_trans_to ON category_transitions(to_category);
CREATE INDEX idx_category_trans_difficulty ON category_transitions(difficulty_score);

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

-- User success rates by emotion pair
CREATE OR REPLACE VIEW user_transition_success_rates AS
SELECT 
    user_id,
    start_emotion_id,
    goal_emotion_id,
    COUNT(*) as attempts,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completions,
    CAST(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) as success_rate,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_time_seconds
FROM user_journeys
WHERE status IN ('completed', 'abandoned')
GROUP BY user_id, start_emotion_id, goal_emotion_id;

-- Strategy effectiveness by user
CREATE OR REPLACE VIEW user_strategy_effectiveness AS
SELECT 
    sa.strategy_id,
    ts.strategy_name,
    uj.user_id,
    COUNT(*) as times_tried,
    AVG(sa.helpful_rating) as avg_rating,
    SUM(CASE WHEN sa.helpful_rating >= 4 THEN 1 ELSE 0 END) as helpful_count,
    SUM(CASE WHEN sa.completed THEN 1 ELSE 0 END) as completed_count
FROM strategy_attempts sa
JOIN user_journeys uj ON sa.journey_id = uj.id
JOIN transition_strategies ts ON sa.strategy_id = ts.id
WHERE sa.helpful_rating IS NOT NULL
GROUP BY sa.strategy_id, ts.strategy_name, uj.user_id;

-- Overall strategy effectiveness (all users)
CREATE OR REPLACE VIEW global_strategy_effectiveness AS
SELECT 
    sa.strategy_id,
    ts.strategy_name,
    ts.strategy_type,
    COUNT(DISTINCT uj.user_id) as users_tried,
    COUNT(*) as total_attempts,
    AVG(sa.helpful_rating) as avg_rating,
    STDDEV(sa.helpful_rating) as rating_stddev,
    SUM(CASE WHEN sa.helpful_rating >= 4 THEN 1 ELSE 0 END) as helpful_count,
    CAST(SUM(CASE WHEN sa.helpful_rating >= 4 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) as helpful_rate
FROM strategy_attempts sa
JOIN user_journeys uj ON sa.journey_id = uj.id
JOIN transition_strategies ts ON sa.strategy_id = ts.id
WHERE sa.helpful_rating IS NOT NULL
GROUP BY sa.strategy_id, ts.strategy_name, ts.strategy_type;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to calculate success probability based on history
CREATE OR REPLACE FUNCTION calculate_transition_success_probability(
    p_user_id UUID,
    p_start_emotion_id UUID,
    p_goal_emotion_id UUID
) RETURNS FLOAT AS $$
DECLARE
    v_success_rate FLOAT;
    v_attempts INT;
BEGIN
    SELECT success_rate, attempts INTO v_success_rate, v_attempts
    FROM user_transition_success_rates
    WHERE user_id = p_user_id
      AND start_emotion_id = p_start_emotion_id
      AND goal_emotion_id = p_goal_emotion_id;
    
    -- If user has no history, return global average for this transition
    IF v_success_rate IS NULL THEN
        SELECT 
            CAST(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS FLOAT) / NULLIF(COUNT(*), 0)
        INTO v_success_rate
        FROM user_journeys
        WHERE start_emotion_id = p_start_emotion_id
          AND goal_emotion_id = p_goal_emotion_id
          AND status IN ('completed', 'abandoned');
    END IF;
    
    -- If no one has tried this, return moderate probability
    RETURN COALESCE(v_success_rate, 0.5);
END;
$$ LANGUAGE plpgsql;

-- Function to get user's most effective strategies
CREATE OR REPLACE FUNCTION get_user_top_strategies(
    p_user_id UUID,
    p_limit INT DEFAULT 5
) RETURNS TABLE (
    strategy_id UUID,
    strategy_name VARCHAR(200),
    avg_rating FLOAT,
    times_tried BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        use.strategy_id,
        use.strategy_name,
        use.avg_rating,
        use.times_tried
    FROM user_strategy_effectiveness use
    WHERE use.user_id = p_user_id
      AND use.avg_rating >= 3.0
      AND use.times_tried >= 2
    ORDER BY use.avg_rating DESC, use.times_tried DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp on user_journeys
CREATE OR REPLACE FUNCTION update_journey_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_journey_timestamp
    BEFORE UPDATE ON user_journeys
    FOR EACH ROW
    EXECUTE FUNCTION update_journey_timestamp();

-- Auto-complete journey when last waypoint reached
CREATE OR REPLACE FUNCTION check_journey_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_total_waypoints INT;
    v_reached_waypoints INT;
BEGIN
    -- Count total and reached waypoints for this journey
    SELECT COUNT(*), SUM(CASE WHEN reached THEN 1 ELSE 0 END)
    INTO v_total_waypoints, v_reached_waypoints
    FROM journey_waypoints
    WHERE journey_id = NEW.journey_id;
    
    -- If all waypoints reached, mark journey as completed
    IF v_reached_waypoints = v_total_waypoints THEN
        UPDATE user_journeys
        SET status = 'completed',
            completed_at = NEW.reached_at,
            current_waypoint = v_total_waypoints
        WHERE id = NEW.journey_id
          AND status = 'in_progress';
    ELSE
        -- Update current waypoint
        UPDATE user_journeys
        SET current_waypoint = NEW.waypoint_index
        WHERE id = NEW.journey_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_journey_completion
    AFTER UPDATE OF reached ON journey_waypoints
    FOR EACH ROW
    WHEN (NEW.reached = TRUE AND OLD.reached = FALSE)
    EXECUTE FUNCTION check_journey_completion();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE transition_strategies IS 'Evidence-based emotion regulation strategies from research literature';
COMMENT ON TABLE transition_patterns IS 'Common emotional transition patterns (e.g., high arousal to low arousal)';
COMMENT ON TABLE pattern_strategies IS 'Junction table mapping strategies to patterns';
COMMENT ON TABLE user_journeys IS 'User emotional transition attempts and progress tracking';
COMMENT ON TABLE journey_waypoints IS 'Individual waypoints within a journey with progress tracking';
COMMENT ON TABLE strategy_attempts IS 'Records of strategy usage and user-reported effectiveness';
COMMENT ON TABLE category_transitions IS 'Difficulty matrix for category-to-category emotional transitions';

COMMENT ON COLUMN transition_strategies.strategy_type IS 'Based on Gross (1998) Process Model of Emotion Regulation';
COMMENT ON COLUMN transition_strategies.evidence_level IS 'Hierarchy: meta_analysis > rct > clinical > theoretical';
COMMENT ON COLUMN user_journeys.context_metadata IS 'Contextual factors: location, time, support, energy level';
COMMENT ON COLUMN journey_waypoints.reasoning IS 'Psychological explanation for why this waypoint is chosen';
COMMENT ON COLUMN category_transitions.difficulty_score IS 'Scale 0-1 where 1.0 = impossible without bridge';
