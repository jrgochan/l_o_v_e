"""Transition Schemas - Therapeutic Journey Data Contracts.

Comprehensive schema suite for emotional transition pathfinding and journey tracking APIs.
Defines request/response models for path generation, waypoint validation, strategy tracking,
and progress monitoring. Enables type-safe therapeutic journey management with rich metadata.

Schema Architecture:

    Three schema categories::

        Request Schemas (3):
        - TransitionPathRequest: Generate journey path
        - JourneyStartRequest: Begin tracking
        - WaypointReachedRequest: Validate progress

        Response Schemas (6):
        - TransitionPathResponse: Complete path with strategies
        - JourneyStartResponse: Journey initialization
        - WaypointReachedResponse: Progress validation
        - JourneyStatusResponse: Current status
        - JourneyHistoryResponse: Past journeys
        - EffectiveStrategiesResponse: Personalized recommendations

        Supporting Schemas (5):
        - EmotionState: Emotion + VAC + quaternion
        - StrategyInfo: Evidence-based technique
        - WaypointInfo: Intermediate step + strategies
        - PathMetrics: Difficulty + time estimates
        - AlternativePath: Other route options

Journey Lifecycle Schemas:

    API contract for therapeutic transitions::

        1. Path Generation
           POST /transition-path
           Request: TransitionPathRequest
           Response: TransitionPathResponse

        2. Journey Start
           POST /journey/start
           Request: JourneyStartRequest
           Response: JourneyStartResponse

        3. Progress Tracking
           POST /journey/{id}/waypoint-reached
           Request: WaypointReachedRequest
           Response: WaypointReachedResponse

        4. Status Monitoring
           GET /journey/{id}
           Response: JourneyStatusResponse

        5. Historical Analysis
           GET /user/{id}/journey-history
           Response: JourneyHistoryResponse

Complex Schema Validation:

    Rich therapeutic journey metadata::

        WaypointInfo includes:
        - Emotion classification
        - VAC + quaternion
        - Distance calculations
        - Time estimates
        - Difficulty ratings
        - Psychological reasoning
        - Evidence-based strategies (list)

        Ensures complete waypoint guidance

        PathMetrics includes:
        - Total distance (VAC space)
        - Time estimate (minutes)
        - Overall difficulty (easy/moderate/difficult)
        - Success probability (0-1)
        - External support needs (boolean)
        - Bridge emotion requirements

        Enables informed journey decisions

References:
    - Transition API: observer/app/api/routes/transitions.py
    - Path planner: observer/app/services/path_planner.py
    - Journey models: observer/app/models/transition_strategy.py
    - Strategy recommender: observer/app/services/strategy_recommender.py
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

# ============================================================================
# REQUEST SCHEMAS
# ============================================================================


class TransitionPathRequest(BaseModel):
    """Request to generate an emotional transition path."""

    user_id: UUID
    current_emotion: Optional[str] = None
    current_vac: List[float] = Field(..., min_length=3, max_length=3)
    goal_emotion: Optional[str] = None
    goal_vac: List[float] = Field(..., min_length=3, max_length=3)
    max_waypoints: int = Field(default=3, ge=1, le=5)
    include_alternatives: bool = False

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "current_emotion": "Anxiety",
                "current_vac": [-0.5, 0.7, -0.4],
                "goal_emotion": "Calm",
                "goal_vac": [0.5, -0.7, 0.4],
                "max_waypoints": 3,
                "include_alternatives": True,
            }
        }
    )


class JourneyStartRequest(BaseModel):
    """Request to start tracking a journey."""

    user_id: UUID
    path_id: str
    start_time: Optional[datetime] = None
    context: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Context: location, time_of_day, has_support, energy_level",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "path_id": "anxiety-to-calm-001",
                "context": {
                    "location": "home",
                    "time_of_day": "evening",
                    "has_support": False,
                    "energy_level": 3,
                },
            }
        }
    )


class WaypointReachedRequest(BaseModel):
    """Request to mark a waypoint as reached."""

    waypoint_index: int = Field(..., ge=0)
    reached_at: Optional[datetime] = None
    self_assessment: Dict[str, Any] = Field(
        ...,
        description="User self-assessment: emotion_match (1-5), confidence (1-5), notes",
    )
    strategies_tried: List[Dict[str, Any]]
    current_state_description: Optional[str] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "waypoint_index": 1,
                "self_assessment": {
                    "emotion_match": 4,
                    "confidence": 5,
                    "notes": "Feeling much calmer",
                },
                "strategies_tried": [
                    {
                        "strategy_id": "123e4567-e89b-12d3-a456-426614174000",
                        "tried": True,
                        "helpful_rating": 5,
                        "time_spent": "10 minutes",
                        "notes": "This really worked!",
                    }
                ],
                "current_state_description": "I feel much calmer now, less racing thoughts",
            }
        }
    )


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================


class EmotionState(BaseModel):
    """Emotional state information."""

    emotion: str
    category: str
    vac: List[float]
    quaternion: List[float]

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "emotion": "Anxiety",
                "category": "Places We Go When Things Are Uncertain or Too Much",
                "vac": [-0.5, 0.7, -0.4],
                "quaternion": [0.707, -0.353, 0.494, -0.283],
            }
        }
    )


class StrategyInfo(BaseModel):
    """Strategy information in response."""

    strategy_id: str
    name: str
    type: str
    description: str
    steps: List[str]
    time_required: str
    difficulty_level: int
    evidence_level: str
    effectiveness_rating: Optional[float] = None
    times_successful_for_user: int = 0
    user_notes: List[str] = []
    match_reason: str = "universal"  # pattern | vac_profile | universal


class WaypointInfo(BaseModel):
    """Waypoint information in path response."""

    order: int
    emotion: str
    category: str
    vac: List[float]
    quaternion: List[float]
    distance_from_previous: float
    estimated_time: str
    difficulty: str
    reasoning: str
    strategies: List[StrategyInfo]


class PathMetrics(BaseModel):
    """Path difficulty and time metrics."""

    total_distance: float
    total_estimated_time: str
    overall_difficulty: str
    success_probability: float = Field(..., ge=0.0, le=1.0)
    requires_external_support: bool
    requires_bridge: bool = Field(
        default=False, description="Whether path includes bridge emotions"
    )
    bridge_emotions: List[str] = Field(
        default_factory=list, description="List of bridge emotions in path"
    )


class AlternativePath(BaseModel):
    """Alternative path preview."""

    path_id: str
    reasoning: str
    waypoints_preview: List[str]
    difficulty: str
    estimated_time: str


class TransitionPathResponse(BaseModel):
    """Response containing complete transition path."""

    path_id: str
    created_at: datetime
    current_state: EmotionState
    goal_state: EmotionState
    waypoints: List[WaypointInfo]
    visualization_data: Dict[str, Any]
    path_metrics: PathMetrics
    alternatives: List[AlternativePath] = []
    personalization_notes: List[str] = []
    search_metadata: Optional[Dict[str, Any]] = None


class JourneyStartResponse(BaseModel):
    """Response when journey is started."""

    journey_id: str
    status: str
    current_waypoint: int
    started_at: datetime


class WaypointReachedResponse(BaseModel):
    """Response when waypoint is marked as reached."""

    validated: bool
    current_vac: List[float]
    distance_to_waypoint: float
    next_waypoint: Optional[WaypointInfo] = None
    journey_completed: bool = False
    message: str


class JourneyStatusResponse(BaseModel):
    """Current journey status."""

    journey_id: str
    user_id: str
    status: str
    current_waypoint: int
    total_waypoints: int
    waypoints_reached: int
    started_at: Optional[datetime] = None
    time_elapsed: str
    estimated_time_remaining: str
    current_waypoint_info: Optional[WaypointInfo] = None


class JourneyHistoryResponse(BaseModel):
    """User's past journeys."""

    total_journeys: int
    completed: int
    abandoned: int
    in_progress: int
    success_rate: float
    journeys: List[Dict[str, Any]]


class EffectiveStrategiesResponse(BaseModel):
    """User's most effective strategies."""

    user_id: str
    total_strategies_tried: int
    top_strategies: List[Dict[str, Any]]
