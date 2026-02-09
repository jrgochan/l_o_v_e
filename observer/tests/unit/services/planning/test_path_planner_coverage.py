from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.services.planning.core import PathPlanner
from app.services.planning.types import PathFindingContext


@pytest.fixture
def mock_session():
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock())
    db.get = AsyncMock()
    return db


@pytest.fixture
def planner(mock_session):
    with patch("app.services.planning.core.logger", new_callable=MagicMock):
        p = PathPlanner(mock_session)
        p.graph = MagicMock()
        p.graph.load_category_transitions = AsyncMock()
        p.graph.create_direct_path = AsyncMock()
        p.graph.vac_distance = MagicMock(return_value=0.1)
        p.searcher = AsyncMock()
        p.harmonizer = AsyncMock()
        p.emotion_mapper = AsyncMock()
        p.journey_repo = AsyncMock()
        p.emotion_repo = AsyncMock()  # explicit mock
        yield p


@pytest.mark.asyncio
async def test_find_alternative_paths_loads_history(planner):
    """Cover line 117: context.user_id triggers history load."""
    user_id = str(uuid4())
    start = MagicMock()
    start.vac_vector = [0, 0, 0]
    goal = MagicMock()
    goal.vac_vector = [0.1, 0, 0]

    planner.emotion_mapper.find_nearest_by_vac_only.side_effect = [start, goal]
    planner.journey_repo.get_journey_history.return_value = []
    planner.graph.vac_distance.return_value = 0.1
    planner.graph.create_direct_path.return_value = MagicMock()

    context = PathFindingContext(current_vac=[0, 0, 0], goal_vac=[0.1, 0, 0], user_id=user_id)

    # Pre-condition: history is None
    assert context.user_history is None

    await planner.find_alternative_paths(context)

    # Post-condition: journey_repo called
    planner.journey_repo.get_journey_history.assert_called_once()
    # And context has history (empty dict because empty journeys)
    # _get_user_history returns {"successful_transitions": {}, "total_journeys": 0}
    # But context is modified in place?
    # The code does: context.user_history = await ...
    assert context.user_history is not None
    assert "total_journeys" in context.user_history


@pytest.mark.asyncio
async def test_get_valid_next_steps_early_return(planner, mock_session):
    """Cover line 151: return [] if entities not found."""
    # Mock lookup failing for one
    planner.emotion_repo.get.side_effect = [MagicMock(), None]

    steps = await planner.get_valid_next_steps(str(uuid4()), str(uuid4()))

    assert steps == []
    # Both called? Or stopped at first?
    # Logic: current = await...; goal = await...; if not current or not goal...
    # Depending on concurrency, both awaited.
    assert planner.emotion_repo.get.call_count == 2


@pytest.mark.asyncio
async def test_user_history_branches_coverage(planner):
    """Cover branches 237->231 and 242->239."""
    # 237->231: isinstance(waypoints, dict) is False OR "waypoints" key missing
    j1 = MagicMock()
    j1.status = "completed"
    j1.waypoints = []  # Not a dict (False branch)

    j2 = MagicMock()
    j2.status = "completed"
    j2.waypoints = {"foo": "bar"}  # Dict but missing "waypoints" key (False branch)

    # 242->239: from_e and to_e check
    j3 = MagicMock()
    j3.status = "completed"
    j3.waypoints = {
        "waypoints": [
            {"emotion": "A"},
            {"no_emotion": "B"},  # Missing "emotion" key -> to_e is None -> False branch
        ]
    }

    j4 = MagicMock()
    j4.status = "completed"
    j4.waypoints = {
        "waypoints": [
            {},  # Missing "emotion" -> from_e is None -> False branch
            {"emotion": "B"},
        ]
    }

    planner.journey_repo.get_journey_history.return_value = [j1, j2, j3, j4]

    hist = await planner._get_user_history(str(uuid4()))

    # Should run without error and have processed 4 journeys but 0 transitions
    assert hist["total_journeys"] == 4
    assert hist["successful_transitions"] == {}


@pytest.mark.asyncio
async def test_build_path_metrics_long(planner, mock_session):
    """Cover line 205: >2 waypoints estimated time."""
    # 3 waypoints = 5 emotions total
    e1 = MagicMock(vac_vector=[0, 0, 0])
    e2 = MagicMock(vac_vector=[0.1, 0, 0])
    e3 = MagicMock(vac_vector=[0.2, 0, 0])
    e4 = MagicMock(vac_vector=[0.3, 0, 0])
    e5 = MagicMock(vac_vector=[0.4, 0, 0])

    path_list = [e1, e2, e3, e4, e5]
    planner.searcher.find_path.return_value = ([path_list], {})
    planner.harmonizer.validate_and_enhance_path.return_value = path_list
    planner.graph.vac_distance.return_value = 0.1
    planner.graph.is_direct_transition_valid.return_value = False  # Fix 1
    planner.emotion_mapper.find_nearest_by_vac_only.side_effect = [e1, e5]

    context = PathFindingContext([0, 0, 0], [0.4, 0, 0])
    path = await planner.find_transition_path(context)

    assert path.estimated_time == "60-120 minutes"


@pytest.mark.asyncio
async def test_explain_path_direct(planner):
    """Cover line 262: explain path with no waypoints."""
    from app.services.planning.core import TransitionPath

    start = MagicMock()
    start.emotion_name = "S"
    start.category = "C"
    start.vac_vector = [0, 0, 0]

    goal = MagicMock()
    goal.emotion_name = "G"
    goal.category = "C"
    goal.vac_vector = [0, 0, 0]

    path = TransitionPath(start, goal, [], 0.0, "short", "easy")

    # Mock Explainer explicitly - Fix 2
    planner.explainer = MagicMock()
    planner.explainer.get_vac_distance.return_value = 0.0
    planner.explainer.explain_waypoint = AsyncMock(
        return_value={
            "vac_analysis": {
                "valence_shift": {"delta": 0},
                "arousal_shift": {"delta": 0},
                "connection_shift": {"delta": 0},
            },
            "psychological_purpose": "Direct",
            "previous_context": {},
        }
    )

    # Mock graph calls inside explain_path
    planner.graph.get_category_difficulty.return_value = 0.1
    planner.graph.is_bridge_category.return_value = False

    explanations = await planner.explain_path(path)

    assert len(explanations) == 1
    assert explanations[0]["to_emotion"] == "G"
