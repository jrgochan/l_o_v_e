"""Transition Strategy Models - Evidence-Based Therapeutic Journey System.

Comprehensive model suite for Observer's 107-strategy recommendation system, pattern
matching, and user journey tracking. Combines clinical psychology research (ACT, DBT, CBT)
with data-driven pattern recognition to guide therapeutic emotional transitions.

The Transition System Architecture:

    Seven interconnected models working together::

        1. TransitionStrategy
           ─────────────────
           107 evidence-based emotion regulation techniques
           Source: ACT, DBT, CBT, mindfulness research
           Typical instances: "Deep Breathing", "Cognitive Reappraisal"

        2. TransitionPattern
           ─────────────────
           Common emotional transition patterns
           Typical pattern: "anxiety_regulation" (Anxiety → Calm)
           Links emotions to appropriate strategies

        3. PatternStrategy (Junction)
           ──────────────────────────
           Maps strategies to patterns with ordering
           Mapping: Pattern "anxiety_regulation" → Strategy "Deep Breathing" (order 1)
           Includes effectiveness ratings

        4. UserJourney
           ───────────
           Individual user's current emotional journey
           Tracks progress from start emotion to goal
           Status: in_progress, completed, abandoned, paused

        5. JourneyWaypoint
           ───────────────
           Intermediate steps in a journey
           Usage path: Anxiety → Curiosity → Acceptance → Calm
           Tracks which waypoints user has reached

        6. StrategyAttempt
           ────────────────
           User feedback on strategy effectiveness
           Ratings: 1-5 stars, helpful/not helpful
           Enables personalization learning

        7. CategoryTransition
           ──────────────────
           Category-to-category difficulty scoring
           Typical transition: "When Things Are Uncertain" → "When Life Is Good"
           Identifies transitions requiring bridge emotions

Strategy Taxonomy (Gross 1998 Process Model):

    Five types of emotion regulation strategies::

        1. Situation Selection
           ───────────────────
           Choosing environments that promote target emotion

           Instances:
           - "Seek Supportive Company" (for Loneliness → Belonging)
           - "Avoid Triggers" (for Anxiety management)
           - "Choose Calm Environments"

           When effective: Proactive regulation
           Difficulty: 2-3/5
           Evidence: Strong (ACT, behavioral activation)

        2. Situation Modification
           ──────────────────────
           Changing the environment to alter emotions

           Instances:
           - "Improve Lighting" (for mood elevation)
           - "Organize Space" (for reducing overwhelm)
           - "Add Music" (for mood regulation)

           When effective: Environmental control available
           Difficulty: 1-2/5
           Evidence: Moderate (environmental psychology)

        3. Attentional Deployment
           ──────────────────────
           Redirecting attention to regulate emotion

           Instances:
           - "Mindful Breathing" (focus on breath)
           - "Grounding 5-4-3-2-1" (sensory awareness)
           - "Body Scan" (internal attention)
           - "Distraction Techniques"

           When effective: Immediate regulation needed
           Difficulty: 2-3/5
           Evidence: Very strong (mindfulness research)

        4. Cognitive Reappraisal
           ────────────────────
           Reinterpreting emotional meaning

           Instances:
           - "Challenge Catastrophic Thoughts" (CBT)
           - "Find Silver Lining" (positive reframing)
           - "Perspective Taking" (empathy building)
           - "Defusion" (ACT technique)

           When effective: Cognitive flexibility present
           Difficulty: 3-4/5
           Evidence: Very strong (CBT, decades of research)

        5. Response Modulation
           ──────────────────
           Modifying physiological/behavioral response

           Instances:
           - "Progressive Muscle Relaxation"
           - "Deep Breathing"
           - "Exercise" (mood elevation)
           - "Expressive Writing"

           When effective: Physical symptoms prominent
           Difficulty: 1-3/5
           Evidence: Strong (biobehavioral research)

Evidence Hierarchy:

    Research quality levels for strategies::

        meta_analysis (Highest)
        ──────────────────────
        Multiple RCTs synthesized
        Example: "Mindfulness-Based Stress Reduction"
        Confidence: Very high
        Publications: 10+ meta-analyses

        rct (High)
        ─────────
        Randomized controlled trial evidence
        Example: "Cognitive Reappraisal"
        Confidence: High
        Publications: Multiple RCTs

        clinical (Moderate)
        ─────────────────
        Clinical consensus, case studies
        Example: "Grounding Techniques"
        Confidence: Moderate
        Publications: Clinical guidelines

        theoretical (Lower)
        ─────────────────
        Expert opinion, theoretical basis
        Example: Emerging techniques
        Confidence: Lower
        Use: With appropriate caveats

Pattern Matching System:

    Linking emotions to appropriate strategies::

        Pattern structure:
        ─────────────────
        {
            "pattern_name": "anxiety_regulation",
            "from_category": "When Things Are Uncertain",
            "to_category": "When Life Is Good",
            "vac_change_characteristics": {
                "valence_change": "increase",
                "arousal_change": "major_decrease",
                "connection_change": "increase"
            },
            "difficulty_score": 0.65,
            "psychological_reasoning": "Anxiety → Calm requires arousal regulation..."
        }

        Matching algorithm:
        ──────────────────
        1. Check category pair (from/to)
        2. Validate VAC change characteristics
        3. Score compatibility
        4. Return matched pattern

        Strategy recommendation:
        ───────────────────────
        1. Pattern matched (e.g., "anxiety_regulation")
        2. Query PatternStrategy junction
        3. Order by recommendation_order
        4. Filter by applicability_conditions
        5. Return top N strategies

        Example:
        Pattern: "anxiety_regulation"
        → Strategy 1: "Deep Breathing" (order 1, rating 4.5)
        → Strategy 2: "Grounding 5-4-3-2-1" (order 2, rating 4.3)
        → Strategy 3: "Progressive Relaxation" (order 3, rating 4.0)

User Journey Lifecycle:

    Tracking progress through emotional transitions::

        Status: 'in_progress'
        ────────────────────
        User actively working on journey

        Fields tracked:
        - current_waypoint: Index of current step
        - started_at: Journey initiation time
        - waypoints: List[Any] of intermediate emotions

        Example:
        Journey: Anxiety → Calm
        Waypoints: [Curiosity, Acceptance]
        Current: 0 (working on Curiosity)

        Status: 'paused'
        ───────────────
        User temporarily stopped

        Reasons:
        - Taking a break
        - Need more practice at current waypoint
        - External circumstances

        Can resume later

        Status: 'completed'
        ──────────────────
        User reached goal emotion

        Data captured:
        - completed_at: Timestamp
        - total_time: Duration of journey
        - waypoints_reached: All checkpoints

        Triggers:
        - Celebration message
        - Progress badge
        - Journey summary

        Status: 'abandoned'
        ──────────────────
        User stopped without completing

        Reasons:
        - Too difficult
        - Lost motivation
        - Changed goals

        Data for analysis:
        - abandonment_at: When stopped
        - current_waypoint: How far they got
        - Can inform difficulty adjustments

Waypoint Validation:

    Verifying user reached intermediate emotions::

        Validation criteria:
        ───────────────────
        1. VAC proximity check
           Current VAC vs Target VAC
           Distance threshold: < 0.3

        2. User self-assessment
           "Do you feel [emotion]?" (Yes/No)
           Likert scale: 1-5

        3. Time spent at waypoint
           Minimum: 2 minutes
           Typical: 5-15 minutes

        4. Strategy attempts
           At least one strategy tried
           Helpful rating provided

        Auto-validation:
        ───────────────
        If VAC distance < 0.2:
        → Automatically mark reached
        → Congratulate user
        → Move to next waypoint

        Manual validation:
        ─────────────────
        If 0.2 < distance < 0.5:
        → Ask "Do you feel closer to [emotion]?"
        → User confirms/denies
        → Progress based on feedback

        Stuck detection:
        ───────────────
        If time_at_waypoint > 30 minutes:
        → Offer alternative strategies
        → Suggest different waypoint
        → Option to pause journey

Strategy Personalization:

    Learning what works for each user::

        Tracking mechanism:
        ──────────────────
        StrategyAttempt records:
        - strategy_id: Which strategy
        - tried: Boolean (did they try it?)
        - helpful_rating: 1-5 stars
        - time_spent: Duration
        - user_notes: Free text feedback
        - completed: Did they finish it?

        Personalization algorithm:
        ────────────────────────
        For user U and strategy S:

        attempts = StrategyAttempts.filter(user=U, strategy=S)

        if attempts.count() >= 3:
            avg_rating = mean(attempts.helpful_rating)

            if avg_rating >= 4.0:
                boost_priority(S) # Works well for this user
            elif avg_rating <= 2.0:
                lower_priority(S) # Doesn't work for them

        Benefits:
        - Recommendations improve over time
        - User sees strategies that work for them
        - Reduces trial-and-error frustration

Bridge Emotion System:

    Identifying transitions requiring intermediates::

        Bridge emotions (6 total):
        ─────────────────────────
        1. Vulnerability - Opens to connection
        2. Awe - Shifts perspective
        3. Compassion - Cultivates kindness
        4. Curiosity - Explores new states
        5. Acceptance - Releases resistance
        6. Gratitude - Finds appreciation

        CategoryTransition tracking:
        ──────────────────────────
        {
            "from_category": "When We Feel Wronged",
            "to_category": "When Life Is Good",
            "requires_bridge": true,
            "recommended_bridge_categories": [
                "When We're in Our Own Way",  # Acceptance
                "When We Feel Gratitude"      # Gratitude
            ],
            "difficulty_score": 0.85,
            "psychological_rationale": "Direct transition from anger to joy..."
        }

        Why bridges matter:
        ──────────────────
        Some transitions are psychologically difficult:
        - Anger → Joy: Too big a leap
        - Shame → Pride: Requires self-work first
        - Grief → Happiness: Can feel like betrayal

        Bridges enable:
        - Gradual emotional shifts
        - Psychological processing
        - Sustainable changes
        - Reduced resistance

Database Schema Highlights:

    Key fields and constraints::

        TransitionStrategy:
        ──────────────────
        - difficulty_level: 1-5 (CHECK constraint)
        - strategy_type: ENUM (5 Gross categories)
        - evidence_level: ENUM (4 research levels)
        - detailed_steps: JSONB (flexible step format)

        UserJourney:
        ───────────
        - status: ENUM (4 states with CHECK)
        - waypoints: JSONB (array of emotion objects)
        - One journey per user (typically)

        JourneyWaypoint:
        ───────────────
        - reached: INTEGER (0/1 for SQLite compatibility)
        - waypoint_index: Ordered position
        - FK to journey_id

        StrategyAttempt:
        ───────────────
        - helpful_rating: 1-5 (CHECK constraint)
        - tried: INTEGER (boolean for SQLite)
        - Links journey + waypoint + strategy

Performance Considerations:

    Optimizations for production scale::

        Strategy lookup:
        ───────────────
        - 107 strategies (small table)
        - Index on strategy_type
        - Index on evidence_level
        - Cached in application memory

        Pattern matching:
        ────────────────
        - ~20-30 patterns (small table)
        - Indexed by from/to categories
        - Fast hash lookup

        User journeys:
        ─────────────
        - One active journey per user typically
        - Index on user_id + status
        - Archived completed journeys

        Strategy attempts:
        ─────────────────
        - Grows with usage
        - Index on (user_id, strategy_id)
        - Partition by date if volume high

References:
    - Gross (1998). The emerging field of emotion regulation
    - Hayes et al. (1999). Acceptance and Commitment Therapy
    - Linehan (1993). Dialectical Behavior Therapy
    - Beck (1979). Cognitive Therapy of Depression
    - Kabat-Zinn (1990). Full Catastrophe Living (Mindfulness)
    - Brown (2012). Daring Greatly (Vulnerability research)
    - Strategy database: docs/modules/observer/senior-developers/04-transition-system.md
"""

# pylint: disable=not-callable

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from sqlalchemy import Boolean, CheckConstraint, Float, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TransitionStrategy(Base):
    """Evidence-based emotion regulation strategy."""

    __tablename__ = "transition_strategies"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    strategy_name: Mapped[str] = mapped_column(String(200))
    strategy_type: Mapped[str] = mapped_column(
        String(50),
        # Based on Gross (1998) Process Model
    )
    description: Mapped[str] = mapped_column(Text)
    detailed_steps: Mapped[Dict[str, Any]] = mapped_column(JSONB)  # List[str]
    time_required: Mapped[Optional[str]] = mapped_column(String(50))
    difficulty_level: Mapped[Optional[int]] = mapped_column(
        Integer, CheckConstraint("difficulty_level BETWEEN 1 AND 5")
    )
    evidence_level: Mapped[str] = mapped_column(String(50))
    research_citations: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)  # List[dict]
    contraindications: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint(
            strategy_type.in_(
                [
                    "situation_selection",
                    "situation_modification",
                    "attentional_deployment",
                    "cognitive_reappraisal",
                    "response_modulation",
                ]
            ),
            name="valid_strategy_type",
        ),
        CheckConstraint(
            evidence_level.in_(["meta_analysis", "rct", "clinical", "theoretical"]),
            name="valid_evidence_level",
        ),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "strategy_id": str(self.id),
            "name": self.strategy_name,
            "type": self.strategy_type,
            "description": self.description,
            "steps": self.detailed_steps,
            "time_required": self.time_required,
            "difficulty_level": self.difficulty_level,
            "evidence_level": self.evidence_level,
            "research_citations": self.research_citations,
            "contraindications": self.contraindications,
        }


class TransitionPattern(Base):
    """Common emotional transition pattern."""

    __tablename__ = "transition_patterns"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    pattern_name: Mapped[str] = mapped_column(String(100), unique=True)
    from_category: Mapped[str] = mapped_column(String(200))
    to_category: Mapped[str] = mapped_column(String(200))
    vac_change_characteristics: Mapped[Dict[str, Any]] = mapped_column(JSONB)
    difficulty_score: Mapped[float] = mapped_column(
        Float, CheckConstraint("difficulty_score BETWEEN 0 AND 1")
    )
    psychological_reasoning: Mapped[str] = mapped_column(Text)
    example_transitions: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)  # List[str]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class PatternStrategy(Base):
    """Junction table mapping strategies to patterns."""

    __tablename__ = "pattern_strategies"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    pattern_id: Mapped[UUID] = mapped_column()
    strategy_id: Mapped[UUID] = mapped_column()
    recommendation_order: Mapped[int] = mapped_column(Integer)
    applicability_conditions: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)
    effectiveness_rating: Mapped[Optional[float]] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class UserJourney(Base):
    """User's emotional transition journey."""

    __tablename__ = "user_journeys"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column()
    start_emotion_id: Mapped[Optional[UUID]] = mapped_column()
    goal_emotion_id: Mapped[Optional[UUID]] = mapped_column()
    start_vac: Mapped[List[float]] = mapped_column(ARRAY(Float))  # [v, a, c]
    goal_vac: Mapped[List[float]] = mapped_column(ARRAY(Float))
    waypoints: Mapped[Dict[str, Any]] = mapped_column(JSONB)
    path_id: Mapped[Optional[str]] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20), default="in_progress")
    current_waypoint: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime] = mapped_column(server_default=func.now())
    completed_at: Mapped[Optional[datetime]] = mapped_column()
    abandoned_at: Mapped[Optional[datetime]] = mapped_column()
    paused_at: Mapped[Optional[datetime]] = mapped_column()
    context_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)
    total_distance: Mapped[Optional[float]] = mapped_column(Float)
    estimated_time: Mapped[Optional[str]] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint(
            status.in_(["in_progress", "completed", "abandoned", "paused"]),
            name="valid_status",
        ),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "journey_id": str(self.id),
            "user_id": str(self.user_id),
            "status": self.status,
            "current_waypoint": self.current_waypoint,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": (self.completed_at.isoformat() if self.completed_at else None),
            "total_distance": self.total_distance,
            "estimated_time": self.estimated_time,
            "context": self.context_metadata,
        }


class JourneyWaypoint(Base):
    """Waypoint in a user's journey."""

    __tablename__ = "journey_waypoints"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    journey_id: Mapped[UUID] = mapped_column()
    waypoint_index: Mapped[int] = mapped_column(Integer)
    emotion_id: Mapped[UUID] = mapped_column()
    emotion_name: Mapped[str] = mapped_column(String(100))
    category: Mapped[str] = mapped_column(String(200))
    vac_target: Mapped[Dict[str, Any]] = mapped_column(JSONB)
    quaternion_target: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)
    distance_from_previous: Mapped[Optional[float]] = mapped_column(Float)
    estimated_time: Mapped[Optional[str]] = mapped_column(String(50))
    difficulty: Mapped[Optional[str]] = mapped_column(String(20))
    reasoning: Mapped[Optional[str]] = mapped_column(Text)
    reached: Mapped[bool] = mapped_column(Boolean, default=False)
    reached_at: Mapped[Optional[datetime]] = mapped_column()
    time_to_reach: Mapped[Optional[str]] = mapped_column(
        String(50)
    )  # Store as string for simplicity
    validated_vac: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)
    distance_from_target: Mapped[Optional[float]] = mapped_column(Float)
    self_assessment: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class StrategyAttempt(Base):
    """Record of a strategy attempt by a user."""

    __tablename__ = "strategy_attempts"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    journey_id: Mapped[UUID] = mapped_column()
    waypoint_index: Mapped[int] = mapped_column(Integer)
    strategy_id: Mapped[UUID] = mapped_column()
    strategy_name: Mapped[str] = mapped_column(String(200))
    tried: Mapped[bool] = mapped_column(Boolean, default=True)
    tried_at: Mapped[datetime] = mapped_column(server_default=func.now())
    helpful_rating: Mapped[Optional[int]] = mapped_column(
        Integer, CheckConstraint("helpful_rating BETWEEN 1 AND 5")
    )
    time_spent: Mapped[Optional[str]] = mapped_column(String(50))  # Store as string
    user_notes: Mapped[Optional[str]] = mapped_column(Text)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    abandoned: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "attempt_id": str(self.id),
            "strategy_id": str(self.strategy_id),
            "strategy_name": self.strategy_name,
            "tried": bool(self.tried),
            "tried_at": self.tried_at.isoformat() if self.tried_at else None,
            "helpful_rating": self.helpful_rating,
            "time_spent": self.time_spent,
            "user_notes": self.user_notes,
            "completed": bool(self.completed),
        }


class CategoryTransition(Base):
    """Category-to-category transition difficulty."""

    __tablename__ = "category_transitions"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    from_category: Mapped[str] = mapped_column(String(200))
    to_category: Mapped[str] = mapped_column(String(200))
    difficulty_score: Mapped[float] = mapped_column(
        Float, CheckConstraint("difficulty_score BETWEEN 0 AND 1")
    )
    is_prohibited: Mapped[bool] = mapped_column(Boolean, default=False)
    requires_bridge: Mapped[bool] = mapped_column(Boolean, default=False)
    recommended_bridge_categories: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB
    )  # List[str]
    psychological_rationale: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
