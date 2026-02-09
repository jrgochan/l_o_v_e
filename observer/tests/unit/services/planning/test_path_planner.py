from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.models.emotion_definition import EmotionDefinition
from app.services.planning.core import PathPlanner
from app.services.planning.definitions import TransitionPath
from app.services.planning.types import PathFindingContext


@pytest.fixture
def mock_session():
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock())
    db.add = MagicMock()
    return db


@pytest.fixture
def planner(mock_session):
    with patch("app.services.planning.core.logger", new_callable=MagicMock):
        p = PathPlanner(mock_session)
        # Mock internal components to avoid actual DB calls or complex checking
        # Mock internal components
        # Graph has mixed sync/async methods
        p.graph = MagicMock()
        p.graph.load_category_transitions = AsyncMock()
        p.graph.get_valid_neighbors = AsyncMock()
        p.graph.is_direct_transition_valid = MagicMock(return_value=False)
        p.graph.create_direct_path = AsyncMock()
        p.graph.vac_distance = MagicMock(return_value=1.5)
        p.graph.get_category_difficulty = MagicMock(return_value=0.5)
        p.graph.is_bridge_category = MagicMock(return_value=False)

        p.searcher = AsyncMock()
        p.harmonizer = AsyncMock()
        p.emotion_mapper = AsyncMock()
        yield p


@pytest.fixture
def mock_emotions():
    def create(name, category, vac):
        return EmotionDefinition(
            id=uuid4(),
            emotion_name=name,
            category=category,
            vac_vector=vac,
            definition="Def",
        )

    return create


@pytest.mark.asyncio
async def test_find_transition_path_orchestration(planner, mock_emotions):
    """Test the main public method orchestrates components."""
    start_vac = [0.0, 0.0, 0.0]
    goal_vac = [1.0, 0.0, 0.0]

    start = mock_emotions("Start", "Cat", start_vac)
    goal = mock_emotions("Goal", "Cat", goal_vac)

    # Mock Mapper
    planner.emotion_mapper.find_nearest_by_vac_only.side_effect = [start, goal]

    # Mock Graph
    planner.graph.is_direct_transition_valid.return_value = False

    # Mock Searcher
    planner.searcher.find_path.return_value = ([[start, goal]], {})

    # Mock Harmonizer
    planner.harmonizer.validate_and_enhance_path.return_value = [start, goal]

    # Mock private build (it's still there?) or assume it uses graph.vac_distance?
    # _build_transition_path uses self.graph.vac_distance.
    planner.graph.vac_distance.return_value = 1.0

    # Execute
    from app.services.planning.types import PathFindingContext

    context = PathFindingContext(
        current_vac=start_vac,
        goal_vac=goal_vac,
    )
    # Execute
    path = await planner.find_transition_path(context)

    assert isinstance(path, TransitionPath)
    assert path.current_emotion == start
    assert path.goal_emotion == goal

    # Verify calls
    assert planner.graph.load_category_transitions.called
    assert planner.searcher.find_path.called
    assert planner.harmonizer.validate_and_enhance_path.called


@pytest.mark.asyncio
async def test_find_transition_path_direct(planner, mock_emotions):
    """Test direct transition shortcut."""
    start = mock_emotions("E1", "C1", [0, 0, 0])
    goal = mock_emotions("E2", "C1", [0.1, 0, 0])

    planner.emotion_mapper.find_nearest_by_vac_only.side_effect = [start, goal]
    planner.graph.is_direct_transition_valid.return_value = True
    planner.graph.create_direct_path.return_value = TransitionPath(
        current_emotion=start,
        goal_emotion=goal,
        waypoints=[],
        total_distance=0.1,
        estimated_time="short",
        difficulty="easy",
    )

    context = PathFindingContext(
        current_vac=[0, 0, 0],
        goal_vac=[0.1, 0, 0],
    )
    path = await planner.find_transition_path(context)

    assert path.current_emotion == start
    assert not planner.searcher.find_path.called


@pytest.mark.asyncio
async def test_find_alternative_paths(planner, mock_emotions):
    """Test finding alternative paths."""
    start = mock_emotions("S", "C", [0, 0, 0])
    goal = mock_emotions("G", "C", [1, 0, 0])

    planner.emotion_mapper.find_nearest_by_vac_only.side_effect = [start, goal]
    planner.graph.vac_distance.return_value = 1.0

    planner.searcher.find_path.return_value = ([[start, goal], [start, goal]], {})
    planner.harmonizer.validate_and_enhance_path.side_effect = lambda p, s, g: p

    context = PathFindingContext(
        current_vac=[0, 0, 0],
        goal_vac=[1, 0, 0],
    )
    paths = await planner.find_alternative_paths(context)

    assert len(paths) == 2


@pytest.mark.asyncio
async def test_get_valid_next_steps(planner, mock_session, mock_emotions):
    """Test delegation to graph.get_valid_neighbors."""
    start = mock_emotions("S", "C", [0, 0, 0])
    goal = mock_emotions("G", "C", [1, 0, 0])

    # Mock DB fetches
    mock_session.get.side_effect = [start, goal]

    planner.graph.get_valid_neighbors.return_value = [goal]

    result = await planner.get_valid_next_steps(str(start.id), str(goal.id))

    assert result == [goal]
    assert planner.graph.get_valid_neighbors.called


@pytest.mark.asyncio
async def test_fallback_path(planner, mock_emotions):
    """Test fallback greedy path when searcher returns empty."""
    start = mock_emotions("S", "Category1", [0, 0, 0])
    goal = mock_emotions("G", "Category2", [1, 1, 1])

    # Mock Mapper
    planner.emotion_mapper.find_nearest_by_vac_only.side_effect = [start, goal]
    # Mock Graph: Direct invalid
    planner.graph.is_direct_transition_valid.return_value = False

    # Mock Searcher: Returns empty path
    planner.searcher.find_path.return_value = ([], {})

    # Mock Graph Neighbors for fallback
    # Fallback loop tries to find neighbor closest to goal
    # Mock distance calculation in lambda
    def mock_distance(vac1, vac2):
        # simple check if it matches intermediate or goal
        if vac1 == [0.5, 0.5, 0.5]:
            return 0.5  # intermediate
        if vac1 == [1, 1, 1]:
            return 0.0  # goal
        return 10.0

    planner.graph.vac_distance.side_effect = mock_distance

    intermediate = mock_emotions("I", "Category1", [0.5, 0.5, 0.5])

    # 1st iteration: Current=Start. Neighbors=[Intermediate]
    # 2nd iteration: Current=Intermediate. Neighbors=[Goal] (since cat diff)
    # Actually logic:
    # 1. current=start. neighbors=[intermediate]. choose intermediate.
    # 2. current=intermediate. neighbors=[goal]. choose goal.

    # We need to set neighbors for sequential calls
    planner.graph.get_valid_neighbors.side_effect = [
        [intermediate],  # from start
        [goal],  # from intermediate
        [],  # safety
    ]

    planner.harmonizer.validate_and_enhance_path.side_effect = lambda p, s, g: p

    context = PathFindingContext(
        current_vac=[0, 0, 0],
        goal_vac=[1, 1, 1],
    )
    path = await planner.find_transition_path(context)

    # Check fallback was triggered
    # Logic: Start -> I -> G
    # line 164 sorts by distance
    assert len(path.current_emotion.vac_vector) == 3

    # The actual path object will have start as current ...
    # Wait, _build_transition_path takes the list of emotions.
    # verification:
    assert path.goal_emotion == goal
    # Should have intermediate waypoint
    assert len(path.waypoints) == 1
    assert path.waypoints[0] == intermediate


@pytest.mark.asyncio
async def test_find_alternative_paths_error(planner, mock_emotions):
    """Test error when VAC not found."""
    planner.emotion_mapper.find_nearest_by_vac_only.return_value = None
    context = PathFindingContext(
        current_vac=[0, 0, 0],
        goal_vac=[1, 1, 1],
    )
    with pytest.raises(ValueError, match="Invalid VAC"):
        await planner.find_alternative_paths(context)


@pytest.mark.asyncio
async def test_explain_path(planner, mock_emotions):
    """Test explain_path generation."""
    start = mock_emotions("S", "Cat1", [0, 0, 0])
    mid = mock_emotions("M", "Cat_Bridge", [0.5, 0.5, 0.5])
    goal = mock_emotions("G", "Cat2", [1, 1, 1])

    path = TransitionPath(
        current_emotion=start,
        goal_emotion=goal,
        waypoints=[mid],
        total_distance=1.0,
        estimated_time="30m",
        difficulty="mod",
    )

    # Mock Explainer
    planner.explainer = MagicMock()
    planner.explainer.explain_waypoint = AsyncMock(
        return_value={
            "vac_analysis": {
                "valence_shift": {"delta": 0.1},
                "arousal_shift": {"delta": 0.1},
                "connection_shift": {"delta": 0.1},
            },
            "psychological_purpose": "lifts your mood",
            "previous_context": {"why_necessary": "unlocks difficult transitions"},
            "readiness_signs": [],
            "warning_signs": [],
        }
    )
    planner.explainer.get_vac_distance.return_value = 0.5

    # Mock Bridge check
    planner.graph.is_bridge_category.side_effect = lambda c: c == "Cat_Bridge"
    planner.graph.get_category_difficulty.return_value = 0.2
    planner.graph.vac_distance.return_value = 0.5

    explanations = await planner.explain_path(path)

    assert len(explanations) == 2  # S->M, M->G

    # Check bridge rationale
    step1 = explanations[0]
    assert step1["to_emotion"] == "M"
    assert step1["is_bridge"] is True
    assert "unlocks difficult transitions" in step1["clinical_rationale"]

    # Check parts summary generation (mocking vac values indirectly via objects)
    # S(0,0,0) -> M(0.5,0.5,0.5)
    # v delta +0.5, a delta +0.5, c delta +0.5
    assert "lifts your mood" in step1["summary"]


@pytest.mark.asyncio
async def test_find_transition_path_with_collection(planner, mock_emotions):
    """Test line 39: Collection ID logging branch."""
    start = mock_emotions("S", "C", [0, 0, 0])
    goal = mock_emotions("G", "C", [1, 0, 0])
    planner.emotion_mapper.find_nearest_by_vac_only.side_effect = [start, goal]
    planner.graph.is_direct_transition_valid.return_value = False
    planner.searcher.find_path.return_value = ([[start, goal]], {})
    planner.harmonizer.validate_and_enhance_path.return_value = [start, goal]
    planner.graph.vac_distance.return_value = 1.0

    context = PathFindingContext(
        current_vac=[0, 0, 0],
        goal_vac=[1, 0, 0],
        collection_id="coll_123",
    )
    await planner.find_transition_path(context)
    # Verify logger usage or just that it runs without error covering the line
    # (Since we mocked logger in fixture, it consumes the call)


@pytest.mark.asyncio
async def test_find_alternative_paths_direct(planner, mock_emotions):
    """Test line 118: Direct transition valid in alternatives."""
    start = mock_emotions("S", "C", [0, 0, 0])
    goal = mock_emotions("G", "C", [0.1, 0, 0])  # close
    planner.emotion_mapper.find_nearest_by_vac_only.side_effect = [start, goal]

    # Mock graph.vac_distance to be small (< 0.3)
    planner.graph.vac_distance.return_value = 0.1
    # Mock create_direct_path
    direct_path = TransitionPath(start, goal, [], 0.1, "short", "easy")
    planner.graph.create_direct_path.return_value = direct_path

    context = PathFindingContext(
        current_vac=[0, 0, 0],
        goal_vac=[0.1, 0, 0],
    )
    paths = await planner.find_alternative_paths(context)
    assert len(paths) == 1
    assert paths[0] == direct_path


@pytest.mark.asyncio
async def test_get_valid_next_steps_missing(planner, mock_session):
    """Test line 147: Missing start or goal emotion."""
    mock_session.get.side_effect = [None, None]
    planner.graph.get_valid_neighbors.return_value = []

    result = await planner.get_valid_next_steps(str(uuid4()), str(uuid4()))
    assert result == []


@pytest.mark.asyncio
async def test_fallback_path_loop_break(planner, mock_emotions):
    """Test lines 159->179: Fallback loop break logic."""
    start = mock_emotions("S", "Cat1", [0, 0, 0])
    # Fix: use mock_emotions instead of undefined make_emotion
    goal = mock_emotions("G", "Cat2", [1, 1, 1])

    planner.emotion_mapper.find_nearest_by_vac_only.side_effect = [start, goal]
    planner.graph.is_direct_transition_valid.return_value = False

    # Empty search logic triggers fallback
    planner.searcher.find_path.return_value = ([], {})

    # Logic 1: Loop 1 finds neighbor. Loop 2 finds no neighbors (break).
    n1 = mock_emotions("N1", "Cat1", [0.5, 0.5, 0.5])

    planner.graph.get_valid_neighbors.side_effect = [
        [n1],
        [],
    ]  # 1st iter  # 2nd iter (break 162)
    planner.graph.vac_distance.return_value = 0.5
    planner.harmonizer.validate_and_enhance_path.side_effect = lambda p, s, g: p

    context = PathFindingContext(
        current_vac=[0, 0, 0],
        goal_vac=[1, 1, 1],
    )
    path = await planner.find_transition_path(context)

    # Path should satisfy N1 being last before break?
    # Fallback logic: path=[Start].
    # Iter 1: best=N1. path=[Start, N1]. curr=N1.
    # Iter 2: neighbors=[]. Break.
    # Resulting list is [Start, N1].
    # _build_transition_path transforms this to: Start=Start, Goal=N1, Waypoints=[]
    assert len(path.waypoints) == 0
    assert path.goal_emotion == n1


@pytest.mark.asyncio
async def test_fallback_path_goal_append(planner, mock_emotions):
    """Test line 176: Appending goal if checking equality logic."""
    start = mock_emotions("S", "Cat1", [0, 0, 0])
    goal = mock_emotions("G", "Cat2", [1, 1, 1])  # Goal is Cat2

    planner.emotion_mapper.find_nearest_by_vac_only.side_effect = [start, goal]
    planner.graph.is_direct_transition_valid.return_value = False
    planner.searcher.find_path.return_value = ([], {})
    planner.harmonizer.validate_and_enhance_path.side_effect = lambda p, s, g: p

    # Logic:
    # Current=Start(Cat1). Neighbor=FinalStep(Cat2).
    # current=FinalStep is Cat2 == Goal Cat2.
    # But FinalStep ID != Goal ID.
    # Append Goal. Break.

    final_step = mock_emotions("Final", "Cat2", [0.9, 0.9, 0.9])
    final_step.id = uuid4()
    # Goal id is random uuid4 from fixture

    planner.graph.get_valid_neighbors.side_effect = [[final_step], []]
    # Mock distance for best_neighbor selection
    planner.graph.vac_distance.return_value = 0.1

    context = PathFindingContext(
        current_vac=[0, 0, 0],
        goal_vac=[1, 1, 1],
    )
    path = await planner.find_transition_path(context)

    # Expected: [Start, Final, Goal]
    # Verify Goal is actually in path
    assert path.goal_emotion == goal
    # _build_transition_path uses last element as goal_emotion
    # But let's check internal path composition if we could?
    # Actually, if goal was appended, total_distance would include Final->Goal.
    # We can trust that if it returns checks out.


@pytest.mark.asyncio
async def test_build_path_metrics_easy_2wp(planner, mock_emotions):
    """Test lines 201, 206: 2 waypoints and easy difficulty."""
    # 2 waypoints = 4 emotions total: Start, W1, W2, Goal
    # Total distance < 1.0 (easy)

    e1 = mock_emotions("1", "C", [0, 0, 0])
    e2 = mock_emotions("2", "C", [0.1, 0, 0])
    e3 = mock_emotions("3", "C", [0.2, 0, 0])
    e4 = mock_emotions("4", "C", [0.3, 0, 0])

    planner.emotion_mapper.find_nearest_by_vac_only.side_effect = [e1, e4]
    planner.graph.is_direct_transition_valid.return_value = False

    path_list = [e1, e2, e3, e4]
    planner.searcher.find_path.return_value = ([path_list], {})
    planner.harmonizer.validate_and_enhance_path.return_value = path_list

    # Distance: 3 steps * 0.1 = 0.3 total (< 1.0)
    planner.graph.vac_distance.return_value = 0.1

    context = PathFindingContext(
        current_vac=[0, 0, 0],
        goal_vac=[0.3, 0, 0],
    )
    path = await planner.find_transition_path(context)

    assert path.difficulty == "easy"
    assert path.estimated_time == "45-90 minutes"  # 2 waypoints


@pytest.mark.asyncio
async def test_user_history_parsing(planner, mock_session, mock_emotions):
    """Test lines 232-254: _get_user_history parsing."""
    # We need to trigger this via find_transition_path with user_id
    user_id = str(uuid4())
    start = mock_emotions("S", "C", [0, 0, 0])
    goal = mock_emotions("G", "C", [1, 0, 0])

    planner.emotion_mapper.find_nearest_by_vac_only.side_effect = [start, goal]
    planner.graph.is_direct_transition_valid.return_value = False
    planner.searcher.find_path.return_value = ([[start, goal]], {})
    planner.harmonizer.validate_and_enhance_path.return_value = [start, goal]
    planner.graph.vac_distance.return_value = 1.0

    # Mock DB Result for history
    # Journey: waypoints = {"waypoints": [{"emotion": "A"}, {"emotion": "B"}]}
    # Transition: A->B count 1

    mock_journey = MagicMock()
    mock_journey.user_id = user_id
    mock_journey.status = "completed"
    mock_journey.waypoints = {"waypoints": [{"emotion": "A"}, {"emotion": "B"}]}

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_journey]
    mock_session.execute.return_value = mock_result

    # We can inspect the user_history passed to searcher.find_path(..., user_history)
    context = PathFindingContext(
        current_vac=[0, 0, 0],
        goal_vac=[1, 0, 0],
        user_id=user_id,
    )
    await planner.find_transition_path(context)

    args, _ = planner.searcher.find_path.call_args
    # Context is the 3rd argument (index 2)
    context_arg = args[2]
    user_hist_arg = context_arg.user_history

    assert user_hist_arg["total_journeys"] == 1
    # Normalized transitions: only one transition A->B, count 1 -> normalized 1/1 = 1.0
    assert user_hist_arg["successful_transitions"][("A", "B")] == 1.0


@pytest.mark.asyncio
async def test_fallback_path_exhaustion(planner, mock_emotions):
    """Test line 159->179: Fallback loop running to completion."""
    start = mock_emotions("S", "Cat1", [0, 0, 0])
    goal = mock_emotions("G", "Cat2", [1, 1, 1])

    planner.emotion_mapper.find_nearest_by_vac_only.side_effect = [start, goal]
    planner.graph.is_direct_transition_valid.return_value = False

    # Empty search to trigger fallback
    planner.searcher.find_path.return_value = ([], {})

    # Mock neighbors that are NEVER the goal category, so loop runs 3 times
    n1 = mock_emotions("N1", "Cat3", [0.1, 0.1, 0.1])
    n2 = mock_emotions("N2", "Cat3", [0.2, 0.2, 0.2])
    n3 = mock_emotions("N3", "Cat3", [0.3, 0.3, 0.3])

    planner.graph.get_valid_neighbors.side_effect = [[n1], [n2], [n3], []]
    planner.graph.vac_distance.return_value = 0.5
    planner.harmonizer.validate_and_enhance_path.side_effect = lambda p, s, g: p

    context = PathFindingContext(
        current_vac=[0, 0, 0],
        goal_vac=[1, 1, 1],
    )
    path = await planner.find_transition_path(context)

    # Path should include S, N1, N2, N3.
    # Total emotions = 4.
    # Logic 179 returns path.
    # Loop ran 3 times (range(3) is 0,1,2).
    # i=0: adds N1. curr=N1.
    # i=1: adds N2. curr=N2.
    # i=2: adds N3. curr=N3.
    # Ends.
    # Returns [S, N1, N2, N3]

    assert len(path.waypoints) == 2  # N1, N2. N3 becomes goal_emotion in TransitionPath logic?
    # Wait, TransitionPath(current=path[0], goal=path[-1])
    # path[-1] is N3.
    # so waypoints are N1, N2.
    assert path.goal_emotion == n3
    assert path.current_emotion == start


@pytest.mark.asyncio
async def test_user_history_branches(planner, mock_session):
    """Test lines 237->235, 242->239, 248->254: History parsing branches."""
    # 1. Invalid waypoints structure (not dict or missing key)
    j1 = MagicMock()
    j1.waypoints = []  # Not a dict

    # 2. Missing emotion key
    j2 = MagicMock()
    j2.waypoints = {
        "waypoints": [
            {"emotion": "A"},
            {"no_emotion": "B"},
        ]  # Missing "emotion" key for to_e
    }

    # 3. Empty transitions (if no valid ones found)
    # j1 and j2 should result in empty transitions map

    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [j1, j2]
    mock_session.execute.return_value = mock_res

    planner.emotion_mapper.find_nearest_by_vac_only.return_value = MagicMock()
    planner.graph.is_direct_transition_valid.return_value = False
    planner.searcher.find_path.return_value = ([], {})
    planner.harmonizer.validate_and_enhance_path.return_value = []

    # Python allows calling private methods in tests.
    # We'll fail later in fallback but _get_user_history runs first.
    # Or we can just call the private method directly if we want to isolate.
    # Python allows calling private methods in tests.

    hist = await planner._get_user_history(str(uuid4()))

    assert hist["total_journeys"] == 2
    assert hist["successful_transitions"] == {}  # Empty because no valid transitions
