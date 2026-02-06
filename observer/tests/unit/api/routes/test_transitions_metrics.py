from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.api.routes.transitions import (
    find_alternative_paths,
    generate_transition_path,
    get_step_alternatives,
)
from app.api.schemas.transition import TransitionPathRequest


@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.fixture
def mock_path_planner():
    with patch("app.api.routes.transitions.planning.PathPlanner") as MockPlanner:
        planner = AsyncMock()
        MockPlanner.return_value = planner
        yield planner


@pytest.fixture
def mock_quaternion_builder():
    with patch("app.api.routes.transitions.planning.QuaternionBuilder") as MockBuilder:
        builder = AsyncMock()
        MockBuilder.return_value = builder
        builder.from_vac = AsyncMock(return_value=[1.0, 0.0, 0.0, 0.0])
        yield builder


@pytest.mark.asyncio
async def test_generate_path_includes_search_metadata(
    mock_db, mock_path_planner, mock_quaternion_builder
):
    """Verify that search_metadata is correctly propagated to the response."""
    # Setup Request
    request = TransitionPathRequest(user_id=uuid4(), current_vac=[0, 0, 0], goal_vac=[1, 0, 0])

    # Mock Path Result
    mock_path = MagicMock()
    mock_path.waypoints = []

    # Current Emotion
    mock_path.current_emotion.vac_vector = [0, 0, 0]
    mock_path.current_emotion.emotion_name = "Start"
    mock_path.current_emotion.category = "CatA"

    # Goal Emotion
    mock_path.goal_emotion.vac_vector = [1, 0, 0]
    mock_path.goal_emotion.emotion_name = "Goal"
    mock_path.goal_emotion.category = "CatB"

    # Path Metrics
    mock_path.total_distance = 1.0  # Float
    mock_path.estimated_time = "10 min"
    mock_path.difficulty = "easy"

    # Crucial: Metadata
    mock_path.search_metadata = {
        "nodes_explored": 42,
        "max_queue_size": 10,
        "execution_time_ms": 15.5,
    }

    mock_path_planner.find_transition_path.return_value = mock_path
    mock_path_planner._vac_distance = MagicMock(
        return_value=0.1
    )  # For metric calc inside route if needed

    # We need to mock WaypointExplainer too
    with patch("app.api.routes.transitions.planning.WaypointExplainer") as MockExplainer:
        MockExplainer.return_value.explain_waypoint = AsyncMock(return_value={})

        response = await generate_transition_path(request, mock_db)

        assert response.search_metadata is not None
        assert response.search_metadata["nodes_explored"] == 42
        assert response.search_metadata["execution_time_ms"] == 15.5


@pytest.mark.asyncio
async def test_get_step_alternatives(mock_db, mock_path_planner):
    """Test retrieving valid alternative steps."""
    c_id = str(uuid4())
    g_id = str(uuid4())

    # Mock emotions returned
    e1 = MagicMock()
    e1.id = uuid4()
    e1.emotion_name = "Alt1"
    e1.vac_vector = [0, 0, 0]
    e2 = MagicMock()
    e2.id = uuid4()
    e2.emotion_name = "Alt2"
    e2.vac_vector = [1, 0, 0]

    mock_path_planner.get_valid_next_steps.return_value = [e1, e2]

    response = await get_step_alternatives(c_id, g_id, limit=5, db=mock_db)

    assert response["current_id"] == c_id
    assert len(response["alternatives"]) == 2
    assert response["alternatives"][0]["name"] == "Alt1"

    mock_path_planner.get_valid_next_steps.assert_awaited_with(c_id, g_id)


@pytest.mark.asyncio
async def test_find_alternative_paths_route(mock_db, mock_path_planner):
    """Test generating multiple path options."""
    request = TransitionPathRequest(user_id=uuid4(), current_vac=[0, 0, 0], goal_vac=[1, 0, 0])

    # Mock paths
    p1 = MagicMock()
    p1.path_id = "p1"
    p1.waypoints = []
    p1.current_emotion = MagicMock(emotion_name="Start", category="C1", vac_vector=[0, 0, 0])
    p1.goal_emotion = MagicMock(emotion_name="Goal", category="C2", vac_vector=[1, 0, 0])
    p1.search_metadata = {"nodes": 1}
    p1.total_distance = 1.0
    p1.estimated_time = "10m"
    p1.difficulty = "easy"

    p2 = MagicMock()
    p2.path_id = "p2"
    p2.waypoints = []
    p2.current_emotion = MagicMock(emotion_name="Start", category="C1", vac_vector=[0, 0, 0])
    p2.goal_emotion = MagicMock(emotion_name="Goal", category="C2", vac_vector=[1, 0, 0])
    p2.search_metadata = {"nodes": 2}
    p2.total_distance = 1.5
    p2.estimated_time = "15m"
    p2.difficulty = "moderate"

    mock_path_planner.find_alternative_paths.return_value = [p1, p2]
    mock_path_planner.explain_path.return_value = []  # Mock explanation

    with patch("app.api.routes.transitions.planning.QuaternionBuilder"):
        response = await find_alternative_paths(request, mock_db)

        assert response["count"] == 2
        assert len(response["paths"]) == 2
        assert response["paths"][0]["search_metadata"]["nodes"] == 1
