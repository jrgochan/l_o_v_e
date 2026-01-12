"""Add transition system tables

Revision ID: 4a8b9c2d3e4f
Revises: 3d24332d682d
Create Date: 2026-01-03 04:17:00

This migration adds the core transition system tables for emotional state
transition guidance. The transition system enables users to navigate from
their current emotional state to a desired state using evidence-based
emotion regulation strategies.

Tables created:
- transition_strategies: Evidence-based emotion regulation strategies
- transition_patterns: Common emotional transition patterns  
- pattern_strategies: Junction table mapping strategies to patterns
- user_journeys: Tracks users' emotional transition attempts
- journey_waypoints: Individual waypoints within journeys
- strategy_attempts: Records of strategy usage and effectiveness
- category_transitions: Difficulty matrix for transitions

Also creates views, functions, and triggers for analytics and automation.
"""

from alembic import op

# Revision identifiers, used by Alembic
revision = "4a8b9c2d3e4f"
down_revision = "3d24332d682d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create transition system tables, views, functions, and triggers."""
    
    # transition_strategies table
    op.execute("""
        CREATE TABLE IF NOT EXISTS transition_strategies (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            strategy_name VARCHAR(200) NOT NULL,
            strategy_type VARCHAR(50) NOT NULL CHECK (strategy_type IN (
                'situation_selection', 'situation_modification',
                'attentional_deployment', 'cognitive_reappraisal', 'response_modulation'
            )),
            description TEXT NOT NULL,
            detailed_steps JSONB NOT NULL,
            time_required VARCHAR(50),
            difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
            evidence_level VARCHAR(50) NOT NULL CHECK (evidence_level IN (
                'meta_analysis', 'rct', 'clinical', 'theoretical'
            )),
            research_citations JSONB,
            contraindications TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)
    
    op.execute("CREATE INDEX idx_strategy_type ON transition_strategies(strategy_type)")
    op.execute("CREATE INDEX idx_strategy_difficulty ON transition_strategies(difficulty_level)")
    op.execute("CREATE INDEX idx_strategy_evidence ON transition_strategies(evidence_level)")
    
    op.execute(
        "COMMENT ON TABLE transition_strategies IS "
        "'Evidence-based emotion regulation strategies from research literature'"
    )
    op.execute(
        "COMMENT ON COLUMN transition_strategies.strategy_type IS "
        "'Based on Gross (1998) Process Model of Emotion Regulation'"
    )
    op.execute(
        "COMMENT ON COLUMN transition_strategies.evidence_level IS "
        "'Hierarchy: meta_analysis > rct > clinical > theoretical'"
    )
    
    # transition_patterns table
    op.execute("""
        CREATE TABLE IF NOT EXISTS transition_patterns (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            pattern_name VARCHAR(100) NOT NULL UNIQUE,
            from_category VARCHAR(200) NOT NULL,
            to_category VARCHAR(200) NOT NULL,
            vac_change_characteristics JSONB NOT NULL,
            difficulty_score FLOAT NOT NULL CHECK (difficulty_score BETWEEN 0 AND 1),
            psychological_reasoning TEXT NOT NULL,
            example_transitions JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)
    
    op.execute("CREATE INDEX idx_pattern_categories ON transition_patterns(from_category, to_category)")
    op.execute(
        "COMMENT ON TABLE transition_patterns IS "
        "'Common emotional transition patterns (e.g., high arousal to low arousal)'"
    )
    
    # pattern_strategies junction table
    op.execute("""
        CREATE TABLE IF NOT EXISTS pattern_strategies (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            pattern_id UUID NOT NULL REFERENCES transition_patterns(id) ON DELETE CASCADE,
            strategy_id UUID NOT NULL REFERENCES transition_strategies(id) ON DELETE CASCADE,
            recommendation_order INTEGER NOT NULL,
            applicability_conditions JSONB,
            effectiveness_rating FLOAT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(pattern_id, strategy_id)
        )
    """)
    
    op.execute("CREATE INDEX idx_pattern_strategies_pattern ON pattern_strategies(pattern_id)")
    op.execute(
        "CREATE INDEX idx_pattern_strategies_order ON pattern_strategies(pattern_id, recommendation_order)"
    )
    op.execute("COMMENT ON TABLE pattern_strategies IS 'Junction table mapping strategies to patterns'")
    
    # user_journeys table
    op.execute("""
        CREATE TABLE IF NOT EXISTS user_journeys (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            start_emotion_id UUID REFERENCES atlas_definitions(id),
            goal_emotion_id UUID REFERENCES atlas_definitions(id),
            start_vac FLOAT[3] NOT NULL,
            goal_vac FLOAT[3] NOT NULL,
            waypoints JSONB NOT NULL,
            path_id VARCHAR(100),
            status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN (
                'in_progress', 'completed', 'abandoned', 'paused'
            )),
            current_waypoint INTEGER DEFAULT 0,
            started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            completed_at TIMESTAMP WITH TIME ZONE,
            abandoned_at TIMESTAMP WITH TIME ZONE,
            paused_at TIMESTAMP WITH TIME ZONE,
            context_metadata JSONB,
            total_distance FLOAT,
            estimated_time VARCHAR(50),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)
    
    op.execute("CREATE INDEX idx_user_journeys_user_id ON user_journeys(user_id)")
    op.execute("CREATE INDEX idx_user_journeys_status ON user_journeys(status)")
    op.execute("CREATE INDEX idx_user_journeys_started ON user_journeys(started_at)")
    op.execute("CREATE INDEX idx_user_journeys_user_status ON user_journeys(user_id, status)")
    
    op.execute(
        "COMMENT ON TABLE user_journeys IS 'User emotional transition attempts and progress tracking'"
    )
    op.execute(
        "COMMENT ON COLUMN user_journeys.context_metadata IS "
        "'Contextual factors: location, time, support, energy level'"
    )
    
    # journey_waypoints table
    op.execute("""
        CREATE TABLE IF NOT EXISTS journey_waypoints (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            journey_id UUID NOT NULL REFERENCES user_journeys(id) ON DELETE CASCADE,
            waypoint_index INTEGER NOT NULL,
            emotion_id UUID NOT NULL REFERENCES atlas_definitions(id),
            emotion_name VARCHAR(100) NOT NULL,
            category VARCHAR(200) NOT NULL,
            vac_target FLOAT[3] NOT NULL,
            quaternion_target FLOAT[4],
            distance_from_previous FLOAT,
            estimated_time VARCHAR(50),
            difficulty VARCHAR(20),
            reasoning TEXT,
            reached BOOLEAN DEFAULT FALSE,
            reached_at TIMESTAMP WITH TIME ZONE,
            time_to_reach INTERVAL,
            validated_vac FLOAT[3],
            distance_from_target FLOAT,
            self_assessment JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(journey_id, waypoint_index)
        )
    """)
    
    op.execute("CREATE INDEX idx_waypoints_journey ON journey_waypoints(journey_id)")
    op.execute("CREATE INDEX idx_waypoints_journey_order ON journey_waypoints(journey_id, waypoint_index)")
    op.execute("CREATE INDEX idx_waypoints_reached ON journey_waypoints(reached)")
    
    op.execute(
        "COMMENT ON TABLE journey_waypoints IS "
        "'Individual waypoints within a journey with progress tracking'"
    )
    op.execute(
        "COMMENT ON COLUMN journey_waypoints.reasoning IS "
        "'Psychological explanation for why this waypoint is chosen'"
    )
    
    # strategy_attempts table
    op.execute("""
        CREATE TABLE IF NOT EXISTS strategy_attempts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            journey_id UUID NOT NULL REFERENCES user_journeys(id) ON DELETE CASCADE,
            waypoint_index INTEGER NOT NULL,
            strategy_id UUID NOT NULL REFERENCES transition_strategies(id),
            strategy_name VARCHAR(200) NOT NULL,
            tried BOOLEAN NOT NULL DEFAULT TRUE,
            tried_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            helpful_rating INTEGER CHECK (helpful_rating BETWEEN 1 AND 5),
            time_spent INTERVAL,
            user_notes TEXT,
            completed BOOLEAN DEFAULT FALSE,
            abandoned BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)
    
    op.execute("CREATE INDEX idx_attempts_journey ON strategy_attempts(journey_id)")
    op.execute("CREATE INDEX idx_attempts_strategy ON strategy_attempts(strategy_id)")
    op.execute("CREATE INDEX idx_attempts_helpful ON strategy_attempts(helpful_rating)")
    op.execute("CREATE INDEX idx_attempts_strategy_rating ON strategy_attempts(strategy_id, helpful_rating)")
    
    op.execute(
        "COMMENT ON TABLE strategy_attempts IS 'Records of strategy usage and user-reported effectiveness'"
    )
    
    # category_transitions table
    op.execute("""
        CREATE TABLE IF NOT EXISTS category_transitions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            from_category VARCHAR(200) NOT NULL,
            to_category VARCHAR(200) NOT NULL,
            difficulty_score FLOAT NOT NULL CHECK (difficulty_score BETWEEN 0 AND 1),
            is_prohibited BOOLEAN DEFAULT FALSE,
            requires_bridge BOOLEAN DEFAULT FALSE,
            recommended_bridge_categories JSONB,
            psychological_rationale TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(from_category, to_category)
        )
    """)
    
    op.execute("CREATE INDEX idx_category_trans_from ON category_transitions(from_category)")
    op.execute("CREATE INDEX idx_category_trans_to ON category_transitions(to_category)")
    op.execute("CREATE INDEX idx_category_trans_difficulty ON category_transitions(difficulty_score)")
    
    op.execute(
        "COMMENT ON TABLE category_transitions IS "
        "'Difficulty matrix for category-to-category emotional transitions'"
    )
    op.execute(
        "COMMENT ON COLUMN category_transitions.difficulty_score IS "
        "'Scale 0-1 where 1.0 = impossible without bridge'"
    )
    
    # Create views
    op.execute("""
        CREATE OR REPLACE VIEW user_transition_success_rates AS
        SELECT 
            user_id, start_emotion_id, goal_emotion_id,
            COUNT(*) as attempts,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completions,
            CAST(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) as success_rate,
            AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_time_seconds
        FROM user_journeys
        WHERE status IN ('completed', 'abandoned')
        GROUP BY user_id, start_emotion_id, goal_emotion_id
    """)
    
    op.execute("""
        CREATE OR REPLACE VIEW user_strategy_effectiveness AS
        SELECT 
            sa.strategy_id, ts.strategy_name, uj.user_id,
            COUNT(*) as times_tried,
            AVG(sa.helpful_rating) as avg_rating,
            SUM(CASE WHEN sa.helpful_rating >= 4 THEN 1 ELSE 0 END) as helpful_count,
            SUM(CASE WHEN sa.completed THEN 1 ELSE 0 END) as completed_count
        FROM strategy_attempts sa
        JOIN user_journeys uj ON sa.journey_id = uj.id
        JOIN transition_strategies ts ON sa.strategy_id = ts.id
        WHERE sa.helpful_rating IS NOT NULL
        GROUP BY sa.strategy_id, ts.strategy_name, uj.user_id
    """)
    
    op.execute("""
        CREATE OR REPLACE VIEW global_strategy_effectiveness AS
        SELECT 
            sa.strategy_id, ts.strategy_name, ts.strategy_type,
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
        GROUP BY sa.strategy_id, ts.strategy_name, ts.strategy_type
    """)
    
    # Create functions
    op.execute("""
        CREATE OR REPLACE FUNCTION calculate_transition_success_probability(
            p_user_id UUID, p_start_emotion_id UUID, p_goal_emotion_id UUID
        ) RETURNS FLOAT AS $$
        DECLARE
            v_success_rate FLOAT;
        BEGIN
            SELECT success_rate INTO v_success_rate
            FROM user_transition_success_rates
            WHERE user_id = p_user_id
              AND start_emotion_id = p_start_emotion_id
              AND goal_emotion_id = p_goal_emotion_id;
            
            IF v_success_rate IS NULL THEN
                SELECT 
                    CAST(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS FLOAT) / NULLIF(COUNT(*), 0)
                INTO v_success_rate
                FROM user_journeys
                WHERE start_emotion_id = p_start_emotion_id
                  AND goal_emotion_id = p_goal_emotion_id
                  AND status IN ('completed', 'abandoned');
            END IF;
            
            RETURN COALESCE(v_success_rate, 0.5);
        END;
        $$ LANGUAGE plpgsql
    """)
    
    op.execute("""
        CREATE OR REPLACE FUNCTION get_user_top_strategies(p_user_id UUID, p_limit INT DEFAULT 5)
        RETURNS TABLE (strategy_id UUID, strategy_name VARCHAR(200), avg_rating FLOAT, times_tried BIGINT) AS $$
        BEGIN
            RETURN QUERY
            SELECT use.strategy_id, use.strategy_name, use.avg_rating, use.times_tried
            FROM user_strategy_effectiveness use
            WHERE use.user_id = p_user_id AND use.avg_rating >= 3.0 AND use.times_tried >= 2
            ORDER BY use.avg_rating DESC, use.times_tried DESC
            LIMIT p_limit;
        END;
        $$ LANGUAGE plpgsql
    """)
    
    op.execute("""
        CREATE OR REPLACE FUNCTION update_journey_timestamp() RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
    """)
    
    op.execute("""
        CREATE TRIGGER trigger_update_journey_timestamp
        BEFORE UPDATE ON user_journeys FOR EACH ROW
        EXECUTE FUNCTION update_journey_timestamp()
    """)
    
    op.execute("""
        CREATE OR REPLACE FUNCTION check_journey_completion() RETURNS TRIGGER AS $$
        DECLARE
            v_total_waypoints INT;
            v_reached_waypoints INT;
        BEGIN
            SELECT COUNT(*), SUM(CASE WHEN reached THEN 1 ELSE 0 END)
            INTO v_total_waypoints, v_reached_waypoints
            FROM journey_waypoints WHERE journey_id = NEW.journey_id;
            
            IF v_reached_waypoints = v_total_waypoints THEN
                UPDATE user_journeys
                SET status = 'completed', completed_at = NEW.reached_at, current_waypoint = v_total_waypoints
                WHERE id = NEW.journey_id AND status = 'in_progress';
            ELSE
                UPDATE user_journeys SET current_waypoint = NEW.waypoint_index WHERE id = NEW.journey_id;
            END IF;
            
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
    """)
    
    op.execute("""
        CREATE TRIGGER trigger_check_journey_completion
        AFTER UPDATE OF reached ON journey_waypoints FOR EACH ROW
        WHEN (NEW.reached = TRUE AND OLD.reached = FALSE)
        EXECUTE FUNCTION check_journey_completion()
    """)


def downgrade() -> None:
    """Drop transition system tables, views, functions, and triggers."""
    op.execute("DROP TRIGGER IF EXISTS trigger_check_journey_completion ON journey_waypoints")
    op.execute("DROP TRIGGER IF EXISTS trigger_update_journey_timestamp ON user_journeys")
    op.execute("DROP FUNCTION IF EXISTS check_journey_completion()")
    op.execute("DROP FUNCTION IF EXISTS update_journey_timestamp()")
    op.execute("DROP FUNCTION IF EXISTS get_user_top_strategies(UUID, INT)")
    op.execute("DROP FUNCTION IF EXISTS calculate_transition_success_probability(UUID, UUID, UUID)")
    op.execute("DROP VIEW IF EXISTS global_strategy_effectiveness")
    op.execute("DROP VIEW IF EXISTS user_strategy_effectiveness")
    op.execute("DROP VIEW IF EXISTS user_transition_success_rates")
    op.execute("DROP TABLE IF EXISTS strategy_attempts CASCADE")
    op.execute("DROP TABLE IF EXISTS journey_waypoints CASCADE")
    op.execute("DROP TABLE IF EXISTS user_journeys CASCADE")
    op.execute("DROP TABLE IF EXISTS pattern_strategies CASCADE")
    op.execute("DROP TABLE IF EXISTS category_transitions CASCADE")
    op.execute("DROP TABLE IF EXISTS transition_patterns CASCADE")
    op.execute("DROP TABLE IF EXISTS transition_strategies CASCADE")
