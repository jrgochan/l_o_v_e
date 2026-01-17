
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from fastapi import HTTPException
from app.api.routes.transitions import (
    generate_transition_path,
    _estimate_waypoint_time,
    _estimate_difficulty,
    _generate_waypoint_reasoning,
    mark_waypoint_reached
)
from app.api.schemas.transition import TransitionPathRequest, WaypointReachedRequest
from app.models.transition_strategy import UserJourney, JourneyWaypoint

@pytest.fixture
def mock_db():
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.delete = MagicMock()
    mock_db.commit = AsyncMock()
    return mock_db

@pytest.fixture
def mock_path_planner():
    with patch("app.api.routes.transitions.PathPlanner") as MockPlanner:
        planner = AsyncMock()
        MockPlanner.return_value = planner
        yield planner

@pytest.fixture
def mock_waypoint_explainer():
    with patch("app.api.routes.transitions.WaypointExplainer") as MockExplainer:
        explainer = AsyncMock()
        MockExplainer.return_value = explainer
        yield explainer

@pytest.fixture
def mock_quaternion_builder():
    with patch("app.api.routes.transitions.QuaternionBuilder") as MockBuilder:
        builder = AsyncMock()
        MockBuilder.return_value = builder
        builder.from_vac.return_value = [1.0, 0.0, 0.0, 0.0]
        yield builder

@pytest.fixture
def mock_strategy_recommender():
    with patch("app.api.routes.transitions.StrategyRecommender") as MockRec:
        rec = AsyncMock()
        MockRec.return_value = rec
        rec.get_strategies_for_transition.return_value = []
        yield rec

# Bridge Detection
@pytest.mark.asyncio
async def test_generate_transition_path_with_bridge(
    mock_db, mock_path_planner, mock_waypoint_explainer, mock_quaternion_builder, mock_strategy_recommender
):
    request = TransitionPathRequest(
        user_id=uuid4(),
        current_vac=[-0.5, 0.5, -0.2],
        goal_vac=[0.5, -0.2, 0.4]
    )
    
    # Mock Path with "Curiosity" which is a bridge emotion
    mock_path = MagicMock()
    mock_path.current_emotion = MagicMock(
        vac_vector=[-0.5, 0.5, -0.2], 
        emotion_name="Anxiety", 
        id=uuid4(),
        category="Fear"  # Added category
    )
    mock_path.goal_emotion = MagicMock(
        vac_vector=[0.5, -0.2, 0.4], 
        emotion_name="Calm", 
        id=uuid4(),
        category="Peace" # Added category
    )
    
    wp_curiosity = MagicMock()
    wp_curiosity.emotion_name = "Curiosity" # Bridge!
    wp_curiosity.vac_vector = [0.1, 0.1, 0.1]
    wp_curiosity.category = "Interest" # Added category
    
    mock_path.waypoints = [wp_curiosity]
    mock_path.total_distance = 1.0
    mock_path.estimated_time = "30m"
    mock_path.difficulty = "moderate"
    
    mock_path_planner.find_transition_path.return_value = mock_path
    mock_path_planner._vac_distance = MagicMock(return_value=0.5)
    
    mock_waypoint_explainer.explain_waypoint.return_value = {
        "psychological_purpose": "Bridge the gap"
    } # Ensure dict returned
    
    response = await generate_transition_path(request, mock_db)
    
    assert response.path_metrics.requires_bridge is True
    assert "Curiosity" in response.path_metrics.bridge_emotions

# Mark Waypoint Reached - Journey Not Found
@pytest.mark.asyncio
async def test_mark_waypoint_reached_journey_not_found(mock_db):
    journey_id = uuid4()
    request = WaypointReachedRequest(
        waypoint_index=0,
        self_assessment={"confidence": 5, "emotion_match": 4}, # Added required fields
        strategies_tried=[]
    )
    
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result
    
    with pytest.raises(HTTPException) as exc:
        await mark_waypoint_reached(journey_id, request, mock_db)
    assert exc.value.status_code == 404
    assert "Journey not found" in exc.value.detail

# Mark Waypoint Reached - Waypoint Not Found
@pytest.mark.asyncio
async def test_mark_waypoint_reached_waypoint_not_found(mock_db):
    journey_id = uuid4()
    request = WaypointReachedRequest(
        waypoint_index=99,
        self_assessment={"confidence": 5, "emotion_match": 4}, # Added required fields
        strategies_tried=[]
    )
    
    mock_journey = UserJourney(id=journey_id, status="in_progress")
    
    # First query finds journey, second (waypoint) finds None
    result1 = MagicMock()
    result1.scalar_one_or_none.return_value = mock_journey
    
    result2 = MagicMock()
    result2.scalar_one_or_none.return_value = None
    
    mock_db.execute.side_effect = [result1, result2]
    
    with pytest.raises(HTTPException) as exc:
        await mark_waypoint_reached(journey_id, request, mock_db)
    assert exc.value.status_code == 404
    assert "Waypoint not found" in exc.value.detail

# Helpers
def test_estimate_waypoint_time():
    assert _estimate_waypoint_time(0.4) == "15-30 minutes"
    assert _estimate_waypoint_time(0.9) == "30-60 minutes"
    assert _estimate_waypoint_time(1.5) == "60-90 minutes"

def test_estimate_difficulty():
    assert _estimate_difficulty(0.4) == "easy"
    assert _estimate_difficulty(0.9) == "moderate"
    assert _estimate_difficulty(1.5) == "difficult"

def test_generate_waypoint_reasoning_logic():
    # Mock emotion objects
    wp = MagicMock()
    wp.emotion_name = "Test"
    path = MagicMock()
    path.goal_emotion.emotion_name = "Goal"
    
    # 1. Arousal regulation
    wp.vac_vector = [0, 0.2, 0] # Low arousal abs(<0.3)
    reason = _generate_waypoint_reasoning(wp, path)
    assert "regulating arousal" in reason
    
    # 2. Connection building
    wp.vac_vector = [0, 0.4, 0.6] # High connection >0.5
    reason = _generate_waypoint_reasoning(wp, path)
    assert "building positive connection" in reason
    
    # 3. Default
    wp.vac_vector = [0, 0.4, 0.4] # Neither
    reason = _generate_waypoint_reasoning(wp, path)
    assert "natural intermediate step" in reason

@pytest.mark.asyncio
async def test_mark_waypoint_reached_db_error(mock_db):
    """Test error handling in mark_waypoint_reached."""
    mock_db.execute.side_effect = Exception("DB Fail")
    with pytest.raises(HTTPException) as exc:
        await mark_waypoint_reached(
            uuid4(), 
            WaypointReachedRequest(
                waypoint_index=0,
                self_assessment={"confidence": 5, "emotion_match": 4},
                strategies_tried=[]
            ), 
            mock_db
        )
    assert exc.value.status_code == 500
