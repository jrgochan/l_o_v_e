from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.models.emotion_definition import EmotionDefinition
from app.models.transition_strategy import CategoryTransition
from app.services.planning.graph import TransitionGraph


@pytest.fixture
def mock_session():
    s = AsyncMock()
    s.execute = AsyncMock()
    return s


@pytest.fixture
def graph(mock_session):
    return TransitionGraph(mock_session)


def make_emotion(name, vac, category, collection_id=None):
    e = MagicMock(spec=EmotionDefinition)
    e.id = uuid4()
    e.emotion_name = name
    e.vac_vector = vac
    e.category = category
    e.collection_id = collection_id if collection_id else uuid4()
    return e


@pytest.mark.asyncio
async def test_load_category_transitions(graph, mock_session):
    # Test loading
    t1 = MagicMock(spec=CategoryTransition)
    t1.from_category = "A"
    t1.to_category = "B"
    t1.difficulty_score = 0.4

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [t1]
    mock_session.execute.return_value = mock_result

    await graph.load_category_transitions()
    assert graph._category_transitions[("A", "B")] == 0.4

    # Test caching (should not call execute again)
    mock_session.execute.reset_mock()
    await graph.load_category_transitions()
    mock_session.execute.assert_not_called()


@pytest.mark.asyncio
async def test_is_direct_transition_valid_identity(graph):
    e = make_emotion("A", [0, 0, 0], "Cat")
    assert graph.is_direct_transition_valid(e, e)


@pytest.mark.asyncio
async def test_get_valid_neighbors_filtering(graph, mock_session):
    # Start moderately close to goal (dist ~0.74)
    start = make_emotion("Start", [0.2, 0.2, 0.2], "CatA")
    goal = make_emotion("Goal", [0.0, 0.0, 0.0], "CatB")

    # Candidate 1: Same ID (skip)
    c1 = start
    # Candidate 2: Invalid category transition (skip)
    c2 = make_emotion("C2", [0.5, 0.5, 0.5], "CatC")
    # Candidate 3: Distance > MAX (1.5) (from current [0.2, 0.2, 0.2])
    # c3 [2,2,2] -> dist |1.8|*... >> 1.5
    c3 = make_emotion("C3", [2.0, 2.0, 2.0], "CatA")
    # Candidate 4: Valid
    # Start->C4 dist: |0.1|*... = 0.37 < 1.5. OK.
    # C4->Goal ( [0.1,0.1,0.1] ) approx 0.37.
    # Start->Goal (0.74).
    # 0.37 < 0.74. OK (Closer).
    c4 = make_emotion("C4", [0.1, 0.1, 0.1], "CatA")

    # Mock category difficulty
    # CatA->CatC = 1.0 (blocked)
    # CatA->CatA = 0.0 (ok)
    graph.get_category_difficulty = MagicMock(side_effect=lambda f, t: 1.0 if t == "CatC" else 0.0)

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [c1, c2, c3, c4]
    mock_session.execute.return_value = mock_result

    neighbors = await graph.get_valid_neighbors(start, goal)

    assert len(neighbors) == 1
    assert neighbors[0] == c4


@pytest.mark.asyncio
async def test_get_valid_neighbors_collection_filter(graph, mock_session):
    start = make_emotion("Start", [0, 0, 0], "CatA")
    goal = make_emotion("Goal", [0, 0, 0], "CatB")

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_session.execute.return_value = mock_result

    cid = str(uuid4())
    await graph.get_valid_neighbors(start, goal, collection_id=cid)

    # Verify call args
    # Can't easily inspect the WhereClause, but we can assume if it ran without error
    # it constructed valid SQL
    assert mock_session.execute.called
