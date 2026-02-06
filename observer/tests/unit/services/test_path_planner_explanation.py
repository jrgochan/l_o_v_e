from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.services.path_planner import PathPlanner, TransitionPath


@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.fixture
def planner(mock_db):
    p = PathPlanner(mock_db)
    # Mock components created in __init__
    p.graph = MagicMock()
    p.graph.load_category_transitions = AsyncMock()
    return p


@pytest.fixture
def mock_emotions():
    def _create(name, category, vac):
        e = MagicMock()
        e.id = uuid4()
        e.emotion_name = name
        e.category = category
        e.vac_vector = vac
        return e

    return _create


@pytest.mark.asyncio
async def test_explain_path_direct(planner, mock_emotions):
    """Test explanation for a direct path (no waypoints)."""
    start = mock_emotions("Start", "CatA", [0, 0, 0])
    goal = mock_emotions("Goal", "CatB", [1, 1, 1])

    path = TransitionPath(
        current_emotion=start,
        goal_emotion=goal,
        waypoints=[],
        total_distance=1.0,
        estimated_time="30m",
        difficulty="easy",
    )

    # Mock dependencies on graph component
    planner.graph.get_category_difficulty.return_value = 0.5
    planner.graph.vac_distance.return_value = 1.5
    planner.graph.is_bridge_category.return_value = False

    explanations = await planner.explain_path(path)

    assert len(explanations) == 1
    step = explanations[0]
    assert step["from_emotion"] == "Start"
    assert step["to_emotion"] == "Goal"
    assert step["vac_change"]["distance"] == 1.5


@pytest.mark.asyncio
async def test_explain_path_with_waypoints(planner, mock_emotions):
    """Test explanation for path with waypoints."""
    start = mock_emotions("Start", "CatA", [0, 0, 0])
    mid = mock_emotions("Mid", "CatB", [0.5, 0.5, 0.5])
    goal = mock_emotions("Goal", "CatC", [1, 1, 1])

    path = TransitionPath(
        current_emotion=start,
        goal_emotion=goal,
        waypoints=[mid],
        total_distance=2.0,
        estimated_time="60m",
        difficulty="moderate",
    )

    planner.graph.vac_distance.side_effect = [0.8, 0.8]
    planner.graph.is_bridge_category.return_value = False
    planner.graph.get_category_difficulty.return_value = 0.2

    explanations = await planner.explain_path(path)

    assert len(explanations) == 2
    assert explanations[0]["to_emotion"] == "Mid"
    assert explanations[1]["from_emotion"] == "Mid"


@pytest.mark.asyncio
async def test_explain_path_bridge_logic(planner, mock_emotions):
    """Test explanation correctly identifies bridge emotions."""
    start = mock_emotions("Shame", "Category", [0, 0, -0.8])
    bridge = mock_emotions("Vulnerability", "BridgeCat", [0, 0, 0])
    goal = mock_emotions("Heal", "Category", [0, 0, 0.8])

    path = TransitionPath(
        current_emotion=start,
        goal_emotion=goal,
        waypoints=[bridge],
        total_distance=1.0,
        estimated_time="30m",
        difficulty="easy",
    )

    planner.graph.vac_distance.return_value = 0.5
    planner.graph.get_category_difficulty.return_value = 0.1

    # Mock is_bridge_category logic
    def is_bridge(cat):
        return cat == "BridgeCat"

    planner.graph.is_bridge_category.side_effect = is_bridge

    explanations = await planner.explain_path(path)

    # Step 1: Shame -> Vulnerability (Bridge)
    step1 = explanations[0]
    assert step1["is_bridge"] is True
    assert "bridge" in step1["summary"]
    assert "unlocks difficult transitions" in step1["clinical_rationale"]


@pytest.mark.asyncio
async def test_explain_path_arousal_regulation(planner, mock_emotions):
    """Test explanation logic for arousal regulation."""
    # High arousal start
    start = mock_emotions("Panic", "Cat", [0, 0.8, 0])
    # Lower arousal next
    next_em = mock_emotions("Calm", "Cat", [0, 0.2, 0])

    path = TransitionPath(
        current_emotion=start,
        goal_emotion=next_em,  # direct
        waypoints=[],
        total_distance=1.0,
        estimated_time="10m",
        difficulty="easy",
    )

    planner.graph.vac_distance.return_value = 0.6
    planner.graph.is_bridge_category.return_value = False

    explanations = await planner.explain_path(path)

    step = explanations[0]
    # Check clinical rationale for arousal
    assert "High arousal requires regulation" in step["clinical_rationale"]
    assert "lower your intensity" in step["summary"]


@pytest.mark.asyncio
async def test_generate_step_summary_branches(planner, mock_emotions):
    """Test all branches of _generate_step_summary."""

    # 1. Energy Boost (Arousal > 0.3)
    c = mock_emotions("A", "C", [0, 0, 0])
    n = mock_emotions("B", "C", [0, 0.4, 0])  # a_delta 0.4 > 0.3
    summary = planner._generate_step_summary(c, n, 0, 0.4, 0, False)
    assert "**energy**" in summary

    # 2. Connection Boost (Connection > 0.3)
    summary = planner._generate_step_summary(c, n, 0, 0, 0.4, False)
    assert "**more connected**" in summary

    # 3. Solitude (Connection < -0.3 and current > 0.5)
    c.vac_vector = [0, 0, 0.8]
    summary = planner._generate_step_summary(c, n, 0, 0, -0.4, False)  # c_dist = -0.4
    assert "**solitude**" in summary

    # 4. Mood Lift (Valence > 0.3)
    summary = planner._generate_step_summary(c, n, 0.4, 0, 0, False)
    assert "**lifts your mood**" in summary

    # 5. Fallback
    summary = planner._generate_step_summary(c, n, 0, 0, 0, False)
    assert "natural, steady step" in summary


@pytest.mark.asyncio
async def test_explain_path_high_difficulty(planner, mock_emotions):
    """Test explanation logic for high difficulty category transition."""
    start = mock_emotions("Start", "CatA", [0, 0, 0])
    goal = mock_emotions("Goal", "CatB", [1, 1, 1])

    path = TransitionPath(
        current_emotion=start,
        goal_emotion=goal,
        waypoints=[],
        total_distance=1.0,
        estimated_time="30m",
        difficulty="difficult",
    )

    planner.graph.get_category_difficulty.return_value = 0.8
    planner.graph.vac_distance.return_value = 1.5
    planner.graph.is_bridge_category.return_value = False

    explanations = await planner.explain_path(path)

    step = explanations[0]
    # Check clinical rationale for difficulty
    assert "Advanced category transition safely managed" in step["clinical_rationale"]
