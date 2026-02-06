from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.api.routes.transitions import (
    explain_transition_path,
    find_alternative_paths,
    get_step_alternatives,
    get_strategy_details,
    search_strategies,
)
from app.api.schemas.transition import TransitionPathRequest
from app.models.emotion_definition import EmotionDefinition


@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.mark.asyncio
async def test_explain_transition_path_coverage(mock_db):
    """Test explain_transition_path success and logic."""
    # Setup happy path
    user_id = uuid4()
    e1_id = uuid4()
    e2_id = uuid4()

    e1 = EmotionDefinition(id=e1_id, emotion_name="E1", vac_vector=[0, 0, 0])
    e2 = EmotionDefinition(id=e2_id, emotion_name="E2", vac_vector=[1, 1, 1])

    # Mock emotion lookup
    res_emotions = MagicMock()
    # scalars().all() is synchronous on the Result object returned by await execute
    res_emotions.scalars.return_value.all.return_value = [e1, e2]
    mock_db.execute.return_value = res_emotions

    # Mock PathPlanner
    # We mock the CLASS, so the return value is the instance
    import app.api.routes.transitions.planning as planning_module

    with patch.object(planning_module, "PathPlanner") as MockPlanner:
        mock_planner = MockPlanner.return_value

        path = MagicMock()
        path.estimated_time = "10m"
        path.difficulty = "easy"
        path.total_distance = 1.0
        path.waypoints = []  # Needed for metric logic if accessed

        # Async methods need to return coroutines or be AsyncMocks
        mock_planner.find_transition_path = AsyncMock(return_value=path)

        # Mock explanation return
        mock_planner.explain_path = AsyncMock(
            return_value=[
                {"to_emotion": "Bridge", "is_bridge": True},
                {"to_emotion": "E2", "is_bridge": False},
            ]
        )

        result = await explain_transition_path(e1_id, e2_id, user_id, 3, mock_db)

        assert result["path_summary"] == "Path from E1 to E2"
        assert result["path_metrics"]["requires_bridge"] is True
        assert result["path_metrics"]["bridge_emotions"] == ["Bridge"]


@pytest.mark.asyncio
async def test_explain_transition_path_not_found(mock_db):
    """Test 404 when emotions missing."""
    # Setup explicit result mock like in the happy path test
    res_emotions = MagicMock()
    res_emotions.scalars.return_value.all.return_value = []
    mock_db.execute.return_value = res_emotions

    with pytest.raises(HTTPException) as exc:
        await explain_transition_path(uuid4(), uuid4(), uuid4(), 3, mock_db)

    # If it fails with 500, we want to know why
    if exc.value.status_code == 500:
        pytest.fail(f"Caught 500 instead of 404. Detail: {exc.value.detail}")

    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_explain_transition_path_error(mock_db):
    """Test 500 error handler."""
    mock_db.execute.side_effect = Exception("Boom")

    with pytest.raises(HTTPException) as exc:
        await explain_transition_path(uuid4(), uuid4(), uuid4(), 3, mock_db)
    assert exc.value.status_code == 500


@pytest.mark.asyncio
async def test_find_alternative_paths_error(mock_db):
    """Test exception handling in find_alternative_paths (lines 565-567)."""
    import app.api.routes.transitions.planning as planning_module

    with patch.object(planning_module, "PathPlanner") as MockPlanner:
        mock_planner = MockPlanner.return_value
        # Async method raising exception
        mock_planner.find_alternative_paths = AsyncMock(side_effect=Exception("Search failed"))

        req = TransitionPathRequest(current_vac=[0, 0, 0], goal_vac=[1, 1, 1], user_id=uuid4())

        with pytest.raises(HTTPException) as exc:
            await find_alternative_paths(req, mock_db)
        assert exc.value.status_code == 500
        assert "Search failed" in exc.value.detail


@pytest.mark.asyncio
async def test_get_step_alternatives_error(mock_db):
    """Test exception handling in get_step_alternatives (lines 605-607)."""
    import app.api.routes.transitions.planning as planning_module

    with patch.object(planning_module, "PathPlanner") as MockPlanner:
        mock_planner = MockPlanner.return_value
        mock_planner.get_valid_next_steps = AsyncMock(side_effect=Exception("Steps failed"))

        with pytest.raises(HTTPException) as exc:
            await get_step_alternatives("uid1", "uid2", 5, mock_db)
        assert exc.value.status_code == 500


@pytest.mark.asyncio
async def test_search_strategies_route(mock_db):
    """Test search_strategies route (lines 896-897)."""
    import app.api.routes.transitions.library as library_module

    with patch.object(library_module, "StrategyRecommender") as MockRec:
        mock_rec = MockRec.return_value
        # Async return
        mock_rec.search_strategies = AsyncMock(return_value={"strategies": []})

        res = await search_strategies(strategy_type="cognitive", db=mock_db)
        assert res == {"strategies": []}
        mock_rec.search_strategies.assert_called_with(
            strategy_type="cognitive",
            evidence_level=None,
            difficulty_min=None,
            difficulty_max=None,
            search_query=None,
            limit=20,
            offset=0,
        )


@pytest.mark.asyncio
async def test_get_strategy_details_route(mock_db):
    """Test get_strategy_details route (lines 913-917)."""
    import app.api.routes.transitions.library as library_module

    with patch.object(library_module, "StrategyRecommender") as MockRec:
        mock_rec = MockRec.return_value

        # Case 1: Found
        mock_rec.get_strategy_by_id = AsyncMock(return_value={"name": "S1"})
        res = await get_strategy_details(str(uuid4()), mock_db)
        assert res["name"] == "S1"

        # Case 2: Not found
        mock_rec.get_strategy_by_id = AsyncMock(return_value=None)
        with pytest.raises(HTTPException) as exc:
            await get_strategy_details(str(uuid4()), mock_db)
        assert exc.value.status_code == 404


def test_generate_waypoint_reasoning_coverage():
    """Test helper _generate_waypoint_reasoning for edge cases."""
    from app.api.routes.transitions.planning import _generate_waypoint_reasoning

    waypoint = MagicMock()
    path = MagicMock()

    # Case 1: vac_vector is not a list and cannot be converted (e.g. integer)
    # list(1) raises TypeError
    waypoint.vac_vector = 1
    assert _generate_waypoint_reasoning(waypoint, path) == "natural intermediate step"

    # Case 2: vac_vector length < 3
    waypoint.vac_vector = [0.5, 0.5]
    assert _generate_waypoint_reasoning(waypoint, path) == "natural intermediate step"

    # Case 3: Arousal regulation (abs(vac[1]) < 0.3)
    waypoint.vac_vector = [0.5, 0.1, 0.4]  # vac[1] = 0.1 < 0.3
    path.goal_emotion.emotion_name = "Goal"
    assert "regulating arousal for Goal" in _generate_waypoint_reasoning(waypoint, path)

    # Case 4: Connection building (vac[2] > 0.5)
    waypoint.vac_vector = [0.5, 0.5, 0.8]  # vac[1]=0.5 >= 0.3, vac[2]=0.8 > 0.5
    assert _generate_waypoint_reasoning(waypoint, path) == "building positive connection"

    # Case 5: Default
    waypoint.vac_vector = [0.5, 0.5, 0.4]  # vac[1]>=0.3, vac[2]<=0.5
    assert _generate_waypoint_reasoning(waypoint, path) == "natural intermediate step"
