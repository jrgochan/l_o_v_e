
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.path_planner import PathPlanner
from app.models.emotion_definition import EmotionDefinition

@pytest.fixture
def mock_session():
    return AsyncMock(spec=AsyncSession)

@pytest.fixture
def planner(mock_session):
    return PathPlanner(mock_session)

@pytest.fixture
def mock_emotions():
    def create(name, category, vac):
        return EmotionDefinition(
            id=uuid4(),
            emotion_name=name,
            category=category,
            vac_vector=vac,
            definition="Def"
        )
    return create

@pytest.mark.asyncio
async def test_astar_loop_prevention(planner, mock_emotions):
    """Test that A* does not get stuck in loops."""
    # Use distinct categories to force graph traversal (prevent immediate category match)
    start = mock_emotions("Start", "CatA", [0,0,0])
    loop_node = mock_emotions("Loop", "CatB", [0.1,0,0])
    goal = mock_emotions("Goal", "CatC", [1,0,0])
    
    # Graph: Start <-> Loop (Cycle), Loop -> Goal
    async def get_neighbors(curr, g, collection_id=None):
        if curr.id == start.id: return [loop_node]
        if curr.id == loop_node.id: return [start, goal] # Cycle back to start
        return []

    with patch.object(planner, '_get_valid_neighbors', side_effect=get_neighbors):
        # Should finish and find path despite cycle
        path = await planner._astar_search(start, goal, 5, None)
        
        # Path: Start -> Loop -> Goal
        assert len(path) == 3
        # Ensure visited set prevented infinite loop
        assert path[-1].id == goal.id

@pytest.mark.asyncio
async def test_astar_pruning_limit(planner, mock_emotions):
    """Test that paths exceeding max_waypoints are pruned."""
    start = mock_emotions("Start", "Cat", [0,0,0])
    n1 = mock_emotions("N1", "Cat", [0.1,0,0])
    n2 = mock_emotions("N2", "Cat", [0.2,0,0])
    n3 = mock_emotions("N3", "Cat", [0.3,0,0])
    goal = mock_emotions("Goal", "OtherCat", [1,0,0]) # Diff cat to force search
    
    # Path: Start -> N1 -> N2 -> N3 -> Goal (Length 5 nodes, 4 steps)
    async def get_neighbors(curr, g, collection_id=None):
        if curr.id == start.id: return [n1]
        if curr.id == n1.id: return [n2]
        if curr.id == n2.id: return [n3]
        if curr.id == n3.id: return [goal]
        return []

    with patch.object(planner, '_get_valid_neighbors', side_effect=get_neighbors):
        # Set max_waypoints = 1.
        # Path len allowed = max_waypoints + 1 (start) + 1 (goal)? 
        # Logic: if len(path) > max_waypoints + 1: continue
        # Path grows: [Start] (1) -> [Start, N1] (2) -> [Start, N1, N2] (3) -> [Start, N1, N2, N3] (4)
        # If max_waypoints = 1, limit is 2.
        # So [Start, N1, N2] (len 3) should be pruned.
        
        # We need mock to return fallback because A* won't find it
        with patch.object(planner, '_fallback_path', return_value=[start, goal]):
             path = await planner._astar_search(start, goal, 1, None)
             # Should trigger fallback/return simple path because actual path was pruned
             assert len(path) == 2 
             assert path[0] == start
             assert path[1] == goal

@pytest.mark.asyncio
async def test_valid_neighbors_bridge_exception(planner, mock_session, mock_emotions):
    """Test that bridge categories are accepted even if farther from goal."""
    start = mock_emotions("Start", "CatA", [0,0,0])
    goal = mock_emotions("Goal", "CatB", [1,0,0])
    
    # Normal neighbor closer to goal
    closer = mock_emotions("Closer", "CatA", [0.5,0,0]) # Dist 0.5
    # Bridge neighbor farther from goal
    bridge = mock_emotions("Bridge", "Places We Go When It's Beyond Us", [-0.5,0,0]) # Dist 1.5
    
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [start, closer, bridge]
    mock_session.execute.return_value = mock_res
    
    # Assume transitions valid
    planner._is_category_transition_valid = MagicMock(return_value=True)
    
    neighbors = await planner._get_valid_neighbors(start, goal)
    
    # Should include bridge even though it's farther (1.5 vs start->goal 1.0)
    # Wait: start->goal dist is 1.0
    # bridge->goal dist is 1.5. current_to_goal is 1.0.
    # 1.5 < 1.0 is False.
    # But _is_bridge_category is True. Therefore Valid.
    
    names = [n.emotion_name for n in neighbors]
    assert "Closer" in names
    assert "Bridge" in names

@pytest.mark.asyncio
async def test_g_cost_history_bonus(planner, mock_emotions):
    """Test that user history bonus reduces cost."""
    start = mock_emotions("Start", "Cat", [0,0,0])
    next_node = mock_emotions("Next", "Cat", [1,0,0])
    
    path = [start]
    
    # Case 1: No history
    base_cost = planner._calculate_g_cost(path, next_node, None)
    
    # Case 2: History with success
    history = {
        "successful_transitions": {
            ("Start", "Next"): 1.0 # 100% success
        }
    }
    # Bonus should be -0.3 * 1.0 = -0.3
    bonus_cost = planner._calculate_g_cost(path, next_node, history)
    
    assert bonus_cost == pytest.approx(base_cost - 0.3)

@pytest.mark.asyncio
async def test_validate_path_no_vulnerability_needed(planner, mock_emotions):
    """Test path with no vulnerability needed (happy path logic)."""
    start = mock_emotions("Start", "Cat", [0,0,0])
    goal = mock_emotions("Goal", "Cat", [0.2,0,0])
    path = [start, goal]
    
    # Ensure bridge check returns False
    planner._needs_vulnerability_bridge = MagicMock(return_value=False)
    planner._ensure_arousal_regulation = AsyncMock(return_value=path)
    
    res = await planner._validate_and_enhance_path(path, start, goal)
    
    assert res == path
    planner._needs_vulnerability_bridge.assert_called_once()

@pytest.mark.asyncio
async def test_astar_queue_duplicates(planner, mock_emotions):
    """Test that A* handles duplicate entries in queue gracefully."""
    start = mock_emotions("Start", "Cat", [0,0,0])
    n1 = mock_emotions("N1", "Cat", [0.1,0,0])
    goal = mock_emotions("Goal", "OtherCat", [1,0,0])
    
    # Return N1 twice to cause duplicates in queue
    async def get_neighbors(curr, g, collection_id=None):
        if curr.id == start.id: return [n1, n1]
        if curr.id == n1.id: return [goal]
        return []

    with patch.object(planner, '_get_valid_neighbors', side_effect=get_neighbors):
        path = await planner._astar_search(start, goal, 3, None)
        assert len(path) == 3
        # Logic ensures N1 processed once

@pytest.mark.asyncio
async def test_g_cost_history_miss(planner, mock_emotions):
    """Test history bonus when transition not in history."""
    start = mock_emotions("Start", "Cat", [0,0,0])
    next_node = mock_emotions("Next", "Cat", [1,0,0])
    
    path = [start]
    history = {
        "successful_transitions": {
            ("Other", "Transition"): 1.0 
        }
    }
    
    # Should calculate base cost with 0 bonus
    cost = planner._calculate_g_cost(path, next_node, history)
    base_cost = planner._vac_distance([0,0,0], [1,0,0]) + 0.5 + 0.1 # VAC + Cat(0.5) + Len(0.1)
    
    # 1*1 + 0 + 0 = 1.0 VAC. Total 1.6
    assert cost == pytest.approx(1.6)
