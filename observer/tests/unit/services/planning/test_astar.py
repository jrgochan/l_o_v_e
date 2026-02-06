from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.models.emotion_definition import EmotionDefinition
from app.services.planning.astar import AStarSearcher
from app.services.planning.graph import TransitionGraph


@pytest.fixture
def mock_graph():
    g = MagicMock(spec=TransitionGraph)
    g.vac_distance = MagicMock(return_value=0.5)
    g.get_category_difficulty = MagicMock(return_value=0.1)
    g.get_valid_neighbors = AsyncMock(return_value=[])
    return g


@pytest.fixture
def searcher(mock_graph):
    return AStarSearcher(mock_graph)


def make_emotion(name, vac, category="Cat"):
    e = MagicMock(spec=EmotionDefinition)
    e.id = uuid4()
    e.emotion_name = name
    e.vac_vector = vac
    e.category = category
    return e


@pytest.mark.asyncio
async def test_find_path_basic(searcher):
    start = make_emotion("S", [0, 0, 0], category="StartCat")
    goal = make_emotion("G", [1, 1, 1], category="GoalCat")

    # Simple direct neighbor
    searcher.graph.get_valid_neighbors.side_effect = [[goal]]

    paths, metrics = await searcher.find_path(start, goal, 3, None)

    assert len(paths) >= 1
    # Path should include start -> goal
    assert paths[0][0] == start
    assert paths[0][-1] == goal
    assert metrics["nodes_explored"] > 0


@pytest.mark.asyncio
async def test_pruning_visited(searcher):
    """Test cycle detection/visited set pruning (lines 56-58)."""
    # Robust test: S connected to A twice.
    # guarantees A is added to queue twice.
    # 1. Pop S. Q: [A, A]
    # 2. Pop A1. Visited wins. Q: [A]
    # 3. Pop A2. Visited check triggers pruning.

    start = make_emotion("S", [0, 0, 0], category="StartCat")
    goal = make_emotion("G", [10, 10, 10], category="GoalCat")
    node_a = make_emotion("A", [1, 1, 1], category="ACat")

    searcher.graph.get_valid_neighbors.side_effect = [
        [node_a, node_a],  # S neighbors (duplicate path to A)
        [],  # A1 neighbors
        [],  # A2 neighbors (shouldn't be reached if pruned)
        [],
    ]

    searcher.graph.get_category_difficulty.return_value = 0.0

    paths, metrics = await searcher.find_path(start, goal, 5, None)

    # Expected: S(1) + A1(1) + A2(1-pruned) = 3 nodes explored
    assert metrics["pruned_paths"] >= 1, f"Metrics: {metrics}"


@pytest.mark.asyncio
async def test_user_history_bonus(searcher):
    """Test G-cost bonus from user history (lines 119-123)."""
    start = make_emotion("S", [0, 0, 0])
    # goal = make_emotion("G", [1, 1, 1])

    # We want to inspect the cost calculation.
    # Hard to mock internal _calculate_g_cost directly since it's used inside the loop.
    # Instead, we set up two neighbors, one with history bonus, one without.
    # A* should expand the one with lower cost first.

    # N1: No history (cost = 0.5 dist + 0.1 cat = 0.6)
    n1 = make_emotion("N1", [0.5, 0.5, 0.5])
    # N2: History bonus (cost = 0.5 dist + 0.1 cat - 0.3 bonus = 0.3)
    n2 = make_emotion("N2", [0.5, 0.5, 0.5])

    searcher.graph.get_valid_neighbors.return_value = [n1, n2]

    history = {"successful_transitions": {("S", "N2"): 1.0}}  # Max bonus

    # We spy on open_set.put by wrapping it or checking order indirectly.
    # Actually, we can check the path order in result if both lead to goal?
    # Or just check calculate_g_cost return value directly via unit test of private method.

    # Test private method directly for precise coverage
    path = [start]

    cost_n1 = searcher._calculate_g_cost(path, n1, history)
    cost_n2 = searcher._calculate_g_cost(path, n2, history)

    assert cost_n2 < cost_n1
    assert cost_n2 == pytest.approx(cost_n1 - 0.3)


@pytest.mark.asyncio
async def test_arousal_penalty(searcher):
    """Test arousal penalty logic (lines 129-130)."""
    start = make_emotion("S", [0, 0.2, 0])

    # N1: High arousal surge
    n1 = make_emotion("N1", [0, 0.8, 0])

    path = [start]
    cost = searcher._calculate_g_cost(path, n1, None)

    # Base cost (mocked vac 0.5 + cat 0.1 + len 1*0.1 = 0.7)
    # Penalty +0.5 -> 1.2
    assert cost >= 1.2
