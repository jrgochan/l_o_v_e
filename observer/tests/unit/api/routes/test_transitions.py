from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.api.routes.transitions import (
    generate_transition_path,
    get_all_cached_paths,
    get_journey_status,
    get_user_effective_strategies,
    get_user_journey_history,
    mark_waypoint_reached,
    start_journey,
)
from app.api.schemas.transition import (
    JourneyStartRequest,
    TransitionPathRequest,
    WaypointReachedRequest,
)
from app.models.transition_strategy import JourneyWaypoint, StrategyAttempt, UserJourney


@pytest.fixture
def mock_db():
    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.delete = MagicMock()
    mock_db.execute = AsyncMock()
    mock_db.commit = AsyncMock()
    return mock_db


@pytest.fixture
def mock_path_planner():
    with patch("app.api.routes.transitions.planning.PathPlanner") as MockPlanner:
        planner = AsyncMock()
        MockPlanner.return_value = planner
        yield planner


@pytest.fixture
def mock_waypoint_explainer():
    with patch("app.api.routes.transitions.planning.WaypointExplainer") as MockExplainer:
        explainer = AsyncMock()
        MockExplainer.return_value = explainer
        yield explainer


@pytest.fixture
def mock_quaternion_builder():
    with patch("app.api.routes.transitions.planning.QuaternionBuilder") as MockBuilder:
        builder = AsyncMock()
        MockBuilder.return_value = builder
        # Setup from_vac to return a list [w, x, y, z]
        # FIX: from_vac is asynchronous and returns a coroutine
        builder.from_vac = AsyncMock(return_value=[1.0, 0.0, 0.0, 0.0])
        yield builder


@pytest.fixture
def mock_strategy_recommender():
    with patch("app.api.routes.transitions.planning.StrategyRecommender") as MockRec:
        rec = AsyncMock()
        MockRec.return_value = rec
        yield rec


# -----------------------------------------------------------------------------
# POST /transition-path
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_generate_transition_path_success(
    mock_db,
    mock_path_planner,
    mock_waypoint_explainer,
    mock_quaternion_builder,
    mock_strategy_recommender,
):
    # Setup Request
    request = TransitionPathRequest(
        user_id=uuid4(),
        current_vac=[-0.5, 0.5, -0.2],
        goal_vac=[0.5, -0.2, 0.4],
        max_waypoints=3,
    )

    # Setup PathPlanner result
    mock_path = MagicMock()
    mock_path.current_emotion.vac_vector = [-0.5, 0.5, -0.2]
    mock_path.current_emotion.emotion_name = "Anxiety"
    mock_path.current_emotion.category = "Fear"
    mock_path.current_emotion.id = uuid4()

    mock_path.goal_emotion.vac_vector = [0.5, -0.2, 0.4]
    mock_path.goal_emotion.emotion_name = "Calm"
    mock_path.goal_emotion.category = "Peace"
    mock_path.goal_emotion.id = uuid4()

    wp1 = MagicMock()
    wp1.vac_vector = [0.0, 0.0, 0.0]
    wp1.emotion_name = "Neutral"
    wp1.category = "Neutral"

    mock_path.waypoints = [wp1]
    mock_path.total_distance = 1.5
    mock_path.estimated_time = "30 min"
    mock_path.difficulty = "moderate"
    mock_path.search_metadata = None  # Ensure Pydantic doesn't see a MagicMock

    mock_path_planner.find_transition_path.return_value = mock_path

    # Mock graph explicitly as MagicMock
    mock_path_planner.graph = MagicMock()
    mock_path_planner.graph.vac_distance.return_value = 0.5

    # Setup Strategy Recommender
    mock_strategy_recommender.get_strategies_for_transition.return_value = [
        {
            "strategy_id": str(uuid4()),
            "name": "Breathe",
            "type": "Coping",
            "description": "Just breathe",
            "steps": ["Inhale", "Exhale"],
            "time_required": "5m",
            "difficulty_level": 1,
            "evidence_level": "High",
        }
    ]

    # Setup Explainer
    mock_waypoint_explainer.explain_waypoint.return_value = {
        "psychological_purpose": "To ground you."
    }

    # Execute
    response = await generate_transition_path(request, mock_db)

    # Assertions
    assert response.current_state.emotion == "Anxiety"
    assert response.goal_state.emotion == "Calm"
    assert len(response.waypoints) == 1
    assert response.waypoints[0].emotion == "Neutral"
    assert response.waypoints[0].reasoning == "To ground you."
    assert len(response.waypoints[0].strategies) == 1

    # Check dependencies called
    mock_path_planner.find_transition_path.assert_awaited_once()
    mock_quaternion_builder.from_vac.assert_called()
    mock_waypoint_explainer.explain_waypoint.assert_awaited()


@pytest.mark.asyncio
async def test_mark_waypoint_reached_incomplete():
    """Test mark_waypoint_reached when journey not completed."""
    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.delete = MagicMock()
    journey_id = uuid4()
    mock_journey = MagicMock()
    mock_journey.id = journey_id
    mock_journey.status = "in_progress"
    mock_waypoint = MagicMock()
    mock_waypoint.journey_id = journey_id
    mock_waypoint.reached = False
    mock_wp1 = MagicMock()
    mock_wp1.reached = True
    mock_wp2 = MagicMock()
    mock_wp2.reached = False
    call_tracker = {"count": 0}

    async def execute_side_effect(stmt, *args, **kwargs):
        call_tracker["count"] += 1
        count = call_tracker["count"]
        if count == 1:
            m = MagicMock()
            m.scalar_one_or_none.return_value = mock_journey
            return m
        if count == 2:
            m = MagicMock()
            m.scalar_one_or_none.return_value = mock_waypoint
            return m
        if count == 3:
            m = MagicMock()
            mock_scalars = MagicMock()
            mock_scalars.all.return_value = [mock_wp1, mock_wp2]
            m.scalars.return_value = mock_scalars
            return m
        return MagicMock()

    mock_db.execute.side_effect = execute_side_effect
    request = MagicMock()
    request.waypoint_index = 0
    response = await mark_waypoint_reached(journey_id, request, db=mock_db)
    assert response.journey_completed is False


@pytest.mark.asyncio
async def test_start_journey_exception():
    """Test start_journey exception handling."""
    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.delete = MagicMock()
    mock_db.add = MagicMock(side_effect=Exception("DB Insert Fail"))

    with pytest.raises(Exception) as exc:
        await start_journey(
            MagicMock(), db=mock_db
        )  # Changed transitions.start_journey to start_journey
    assert "Journey start failed" in str(exc.value)


@pytest.mark.asyncio
async def test_mark_waypoint_journey_completion():
    """Test mark_waypoint_reached auto-completion."""
    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.delete = MagicMock()

    mock_journey = MagicMock(spec=UserJourney)
    mock_journey.id = uuid4()
    mock_journey.status = "in_progress"

    mock_wp = MagicMock()
    mock_wp.reached = True

    mock_result_journey = MagicMock()
    mock_result_journey.scalar_one_or_none.return_value = mock_journey

    mock_result_wp = MagicMock()
    mock_result_wp.scalar_one_or_none.return_value = mock_wp

    mock_result_all = MagicMock()
    mock_result_all.scalars().all.return_value = [mock_wp]

    mock_db.execute.side_effect = [mock_result_journey, mock_result_wp, mock_result_all]

    request = MagicMock(waypoint_index=0, self_assessment={}, strategies_tried=[])

    resp = await mark_waypoint_reached(
        mock_journey.id, request, db=mock_db
    )  # Changed transitions.mark_waypoint_reached to mark_waypoint_reached

    assert resp.journey_completed is True
    assert mock_journey.status == "completed"


@pytest.mark.asyncio
async def test_journey_status_no_started_at():
    """Test get_journey_status with no started_at."""
    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.delete = MagicMock()

    mock_journey = MagicMock()
    mock_journey.id = uuid4()
    mock_journey.user_id = uuid4()
    mock_journey.status = "in_progress"
    mock_journey.current_waypoint = 0
    mock_journey.context_metadata = {}
    mock_journey.started_at = None
    mock_journey.estimated_time = None

    mock_result_journey = MagicMock()
    mock_result_journey.scalar_one_or_none.return_value = mock_journey

    mock_wp = MagicMock()
    mock_wp.reached = False
    mock_result_wps = MagicMock()
    mock_result_wps.scalars().all.return_value = [mock_wp]

    mock_db.execute.side_effect = [mock_result_journey, mock_result_wps]

    resp = await get_journey_status(
        uuid4(), db=mock_db
    )  # Changed transitions.get_journey_status to get_journey_status
    assert resp.time_elapsed == "0 minutes"


@pytest.mark.asyncio
async def test_journey_status_exception():
    """Test get_journey_status exception handling."""
    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.delete = MagicMock()
    mock_db.execute.side_effect = Exception("DB Fail")

    with pytest.raises(Exception, match="DB Fail"):
        await get_journey_status(
            uuid4(), db=mock_db
        )  # Changed transitions.get_journey_status to get_journey_status


@pytest.mark.asyncio
async def test_journey_history_exception():
    """Test get_user_journey_history exception handling."""
    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.delete = MagicMock()
    mock_db.execute.side_effect = Exception("DB Fail")

    with pytest.raises(Exception, match="DB Fail"):
        await get_user_journey_history(
            uuid4(), db=mock_db
        )  # Changed transitions.get_user_journey_history to get_user_journey_history


@pytest.mark.asyncio
async def test_effective_strategies_exception():
    """Test get_user_effective_strategies exception handling."""
    from app.api.routes.transitions.analysis import get_user_effective_strategies as real_func

    local_mock_db = AsyncMock()
    local_mock_db.add = MagicMock()
    local_mock_db.delete = MagicMock()
    local_mock_db.execute.side_effect = Exception("DB Fail")

    with pytest.raises(Exception, match="DB Fail"):
        await real_func(user_id=uuid4(), db=local_mock_db)


@pytest.mark.asyncio
async def test_generate_transition_path_failure(mock_db, mock_path_planner):
    request = TransitionPathRequest(user_id=uuid4(), current_vac=[0, 0, 0], goal_vac=[0, 0, 0])
    mock_path_planner.find_transition_path.side_effect = Exception("Algo failed")

    with pytest.raises(HTTPException) as exc:
        await generate_transition_path(request, mock_db)

    assert exc.value.status_code == 500
    assert "Algo failed" in exc.value.detail


# -----------------------------------------------------------------------------
# POST /journey/start
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_start_journey(mock_db):
    request = JourneyStartRequest(user_id=uuid4(), path_id=str(uuid4()), context={"note": "Test"})

    # Mock UserJourney class to ensure instantiated object has id
    with patch("app.api.routes.transitions.execution.UserJourney") as MockUserJourney:
        mock_journey_instance = MagicMock()
        mock_journey_instance.id = uuid4()  # Fixed: UUID object
        mock_journey_instance.status = "in_progress"
        mock_journey_instance.current_waypoint = 0
        mock_journey_instance.started_at = datetime.now(timezone.utc)
        MockUserJourney.return_value = mock_journey_instance

        response = await start_journey(request, mock_db)

        assert response.status == "in_progress"

        # Verify DB add
        assert mock_db.add.called
        assert mock_db.commit.called
        assert mock_db.refresh.called

        # Verify UserJourney created propertly
        args, _ = mock_db.add.call_args
        journey = args[0]
        assert journey == mock_journey_instance


# -----------------------------------------------------------------------------
# POST /journey/{id}/waypoint-reached
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_mark_waypoint_reached_success(mock_db):
    journey_id = uuid4()
    request = WaypointReachedRequest(
        waypoint_index=0,
        self_assessment={"confidence": 5},
        strategies_tried=[{"strategy_id": str(uuid4()), "helpful_rating": 4}],
    )

    # Mock DB Queries
    mock_journey = UserJourney(id=journey_id, status="in_progress")
    mock_wp = JourneyWaypoint(journey_id=journey_id, waypoint_index=0, reached=False)

    # Need to handle execute calls for journey, waypoint, and completion check
    mock_result1 = MagicMock()
    mock_result1.scalar_one_or_none.return_value = mock_journey

    mock_result2 = MagicMock()
    mock_result2.scalar_one_or_none.return_value = mock_wp

    mock_result3 = MagicMock()
    # Return list of all waypoints (just one for this test)
    mock_result3.scalars.return_value.all.return_value = [mock_wp]

    mock_db.execute.side_effect = [mock_result1, mock_result2, mock_result3]

    # We need to ensure db.add doesn't fail if strategy attempts are created

    response = await mark_waypoint_reached(journey_id, request, mock_db)

    assert response.validated is True
    assert response.journey_completed is True
    assert mock_wp.reached is True

    # Verify strategy attempts added
    assert mock_db.add.called


@pytest.mark.asyncio
async def test_mark_waypoint_reached_not_found(mock_db):
    journey_id = uuid4()
    request = WaypointReachedRequest(
        waypoint_index=0, self_assessment={"confidence": 1}, strategies_tried=[]
    )

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    with pytest.raises(HTTPException) as exc:
        await mark_waypoint_reached(journey_id, request, mock_db)
    assert exc.value.status_code == 404


# -----------------------------------------------------------------------------
# GET /journey/{id}
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_journey_status(mock_db):
    journey_id = uuid4()
    user_id = uuid4()

    mock_journey = UserJourney(
        id=journey_id,
        user_id=user_id,
        status="in_progress",
        started_at=datetime.now(timezone.utc),
        current_waypoint=1,
        estimated_time="45 min",
    )

    mock_wps = [JourneyWaypoint(reached=True), JourneyWaypoint(reached=False)]

    result1 = MagicMock()
    result1.scalar_one_or_none.return_value = mock_journey

    result2 = MagicMock()
    result2.scalars.return_value.all.return_value = mock_wps

    mock_db.execute.side_effect = [result1, result2]

    response = await get_journey_status(journey_id, mock_db)

    assert response.journey_id == str(journey_id)
    assert response.status == "in_progress"
    assert response.total_waypoints == 2
    assert response.waypoints_reached == 1


# -----------------------------------------------------------------------------
# GET /user/{id}/journey-history
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_user_journey_history(mock_db):
    user_id = uuid4()

    # Mock journeys with to_dict method
    def make_journey(status):
        j = MagicMock(spec=UserJourney)
        j.status = status
        # Simulate to_dict by creating a dict manually if needed, or mocking the method
        # The service calls .to_dict() on the object.
        j.to_dict.return_value = {"id": str(uuid4()), "status": status}
        return j

    journeys = [
        make_journey("completed"),
        make_journey("abandoned"),
        make_journey("in_progress"),
    ]

    result = MagicMock()
    result.scalars.return_value.all.return_value = journeys
    mock_db.execute.return_value = result

    response = await get_user_journey_history(user_id, mock_db)

    assert response.total_journeys == 3
    assert response.completed == 1


# -----------------------------------------------------------------------------
# GET /user/{id}/effective-strategies
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_user_effective_strategies(mock_db):
    user_id = uuid4()
    strat_id = uuid4()

    attempts = [
        StrategyAttempt(strategy_id=strat_id, strategy_name="Deep Breath", helpful_rating=5),
        StrategyAttempt(strategy_id=strat_id, strategy_name="Deep Breath", helpful_rating=4),
        StrategyAttempt(strategy_id=uuid4(), strategy_name="Other", helpful_rating=1),
    ]

    result = MagicMock()
    result.scalars.return_value.all.return_value = attempts
    mock_db.execute.return_value = result

    response = await get_user_effective_strategies(user_id, mock_db, limit=5)

    assert response.total_strategies_tried == 2
    assert len(response.top_strategies) == 1
    assert response.top_strategies[0]["avg_rating"] == 4.5


@pytest.mark.asyncio
async def test_mark_waypoint_reached_incomplete_complex():
    """Test marking waypoint when waypoints remain."""
    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.delete = MagicMock()
    journey_id = uuid4()
    mock_journey = MagicMock()
    mock_journey.id = journey_id
    mock_journey.status = "in_progress"
    mock_waypoint = MagicMock()
    mock_waypoint.journey_id = journey_id
    mock_waypoint.reached = False
    mock_wp1 = MagicMock()
    mock_wp1.reached = True
    mock_wp2 = MagicMock()
    mock_wp2.reached = False
    call_tracker = {"count": 0}

    async def execute_side_effect(stmt, *args, **kwargs):
        call_tracker["count"] += 1
        count = call_tracker["count"]
        # Use lower() to match table names robustly
        # stmt_str = str(stmt).lower()

        if count == 1:
            # Journey lookup
            m = MagicMock()
            m.scalar_one_or_none.return_value = mock_journey
            return m
        if count == 2:
            # Waypoint lookup
            m = MagicMock()
            m.scalar_one_or_none.return_value = mock_waypoint
            return m
        if count == 3:
            # Check completion (all waypoints)
            m = MagicMock()
            mock_scalars = MagicMock()
            mock_scalars.all.return_value = [mock_wp1, mock_wp2]
            m.scalars.return_value = mock_scalars
            return m
        return MagicMock()

    # We need to set side_effect but the query order might differ from the simple
    # 1-2-3 logic in the original test
    # if the implementation changed. The original test used simple counts.
    # The implementation in `transitions.py` is:
    # 1. Get journey
    # 2. Get waypoint
    # 3. Validation logic
    # 4. Check completion (get all waypoints)
    # The side_effect above attempts to match that.

    mock_db.execute.side_effect = execute_side_effect
    request = MagicMock()
    request.waypoint_index = 0
    response = await mark_waypoint_reached(journey_id, request, db=mock_db)
    assert response.journey_completed is False


@pytest.mark.asyncio
async def test_get_journey_status_not_found(mock_db):
    """Test 404 when getting status of non-existent journey."""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    with pytest.raises(HTTPException) as exc:
        await get_journey_status(uuid4(), mock_db)
    assert exc.value.status_code == 404


def test_estimate_helpers():
    """Test helper functions for time/difficulty estimation."""
    from app.api.routes.transitions import _estimate_difficulty, _estimate_waypoint_time

    # Time
    assert _estimate_waypoint_time(0.4) == "15-30 minutes"
    assert _estimate_waypoint_time(0.8) == "30-60 minutes"
    assert _estimate_waypoint_time(1.5) == "60-90 minutes"

    # Difficulty
    assert _estimate_difficulty(0.4) == "easy"
    assert _estimate_difficulty(0.8) == "moderate"
    assert _estimate_difficulty(1.5) == "difficult"


@pytest.mark.asyncio
async def test_mark_waypoint_reached_waypoint_not_found(mock_db):
    """Test 404 when waypoint not found specifically."""
    journey_id = uuid4()
    mock_journey = MagicMock()
    mock_journey.id = journey_id

    mock_result1 = MagicMock()
    mock_result1.scalar_one_or_none.return_value = mock_journey

    mock_result2 = MagicMock()
    mock_result2.scalar_one_or_none.return_value = None  # Waypoint missing

    mock_db.execute.side_effect = [mock_result1, mock_result2]

    with pytest.raises(HTTPException) as exc:
        await mark_waypoint_reached(
            journey_id,
            WaypointReachedRequest(
                waypoint_index=99,
                strategies_tried=[],
                self_assessment={"confidence": 5},
            ),
            mock_db,
        )
    assert exc.value.status_code == 404
    assert "Waypoint not found" in exc.value.detail


@pytest.mark.asyncio
async def test_get_all_cached_paths(mock_db):
    """Test get_all_cached_paths stub."""
    response = await get_all_cached_paths(_db=mock_db)
    assert response == {"paths": []}
