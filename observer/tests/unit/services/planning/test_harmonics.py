from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.models.emotion_definition import EmotionDefinition
from app.services.planning.harmonics import PathHarmonizer


@pytest.fixture
def mock_session():
    s = AsyncMock()
    s.execute = AsyncMock()
    return s


@pytest.fixture
def harmonizer(mock_session):
    return PathHarmonizer(mock_session)


def make_emotion(name, v, a, c):
    e = MagicMock(spec=EmotionDefinition)
    e.id = uuid4()
    e.emotion_name = name
    e.vac_vector = [v, a, c]
    return e


@pytest.mark.asyncio
async def test_needs_vulnerability_bridge_false(harmonizer):
    start = make_emotion("A", 0, 0, 0)
    goal = make_emotion("B", 0, 0, 0)
    # Simple path, no huge connection jump
    assert not harmonizer._needs_vulnerability_bridge(start, goal, [])


@pytest.mark.asyncio
async def test_needs_vulnerability_bridge_true(harmonizer):
    # Negative connection -> Positive connection
    start = make_emotion("Shame", -0.5, 0.5, -0.8)
    goal = make_emotion("Love", 0.8, 0.5, 0.8)

    # Empty path -> needs bridge
    assert harmonizer._needs_vulnerability_bridge(start, goal, [])


@pytest.mark.asyncio
async def test_needs_vulnerability_bridge_already_present(harmonizer):
    start = make_emotion("Shame", -0.5, 0.5, -0.8)
    goal = make_emotion("Love", 0.8, 0.5, 0.8)

    # Path already has vulnerability-like emotion
    # Vulnerability sig: |v|<0.2, 0.2<a<0.5, c>0.5
    vuln = make_emotion("Vuln", 0.1, 0.3, 0.6)

    assert not harmonizer._needs_vulnerability_bridge(start, goal, [vuln])


@pytest.mark.asyncio
async def test_ensure_arousal_regulation_no_drop(harmonizer):
    e1 = make_emotion("High", 0, 0.8, 0)
    e2 = make_emotion("Med", 0, 0.6, 0)
    path = [e1, e2]

    res = await harmonizer._ensure_arousal_regulation(path)
    assert len(res) == 2
    assert res == path


@pytest.mark.asyncio
async def test_ensure_arousal_regulation_unsafe_drop(harmonizer, mock_session):
    # Panic (0.9) -> Calm (0.1) = Drop 0.8 (>0.5 threshold)
    e1 = make_emotion("Panic", -0.5, 0.9, -0.5)
    e2 = make_emotion("Calm", 0.5, 0.1, 0.5)
    path = [e1, e2]

    # Mock bridge find
    bridge = make_emotion("Med", 0, 0.5, 0)

    # setup mock session for _find_arousal_bridge
    # It queries for candidates
    # We need strict control over _find_arousal_bridge or the session query
    # Since _find_arousal_bridge is complex (checking ranges), let's mock the method directly?
    # Or mock the session to return a valid candidate.

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [bridge]
    mock_session.execute.return_value = mock_result

    # We rely on logic in _find_arousal_bridge to pick it
    # Target arousal = (0.9 + 0.1)/2 = 0.5. Bridge has 0.5. Perfect.
    # Bridge checks:
    # a range: 0.5 +/- 0.15 -> 0.35-0.65. Bridge 0.5 OK.
    # v check: v > current_v - 0.2 -> 0 > -0.5 - 0.2 -> 0 > -0.7. OK.
    # c check: c > -0.3. Bridge 0 OK.

    res = await harmonizer._ensure_arousal_regulation(path)

    assert len(res) == 3
    assert res[1].emotion_name == "Med"


@pytest.mark.asyncio
async def test_find_arousal_bridge_logic(harmonizer, mock_session):
    current = make_emotion("High", 0, 0.9, 0)
    target_a = 0.5

    # Cand 1: Good
    c1 = make_emotion("Good", 0, 0.5, 0)
    # Cand 2: Bad Arousal (too high)
    c2 = make_emotion("BadA", 0, 0.9, 0)
    # Cand 3: Bad Valence (drop too big)
    c3 = make_emotion("BadV", -0.8, 0.5, 0)
    # Cand 4: Bad Connection (disconnecting)
    c4 = make_emotion("BadC", 0, 0.5, -0.9)
    # Cand 5: Current (skip)
    c5 = current

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [c1, c2, c3, c4, c5]
    mock_session.execute.return_value = mock_result

    bridge = await harmonizer._find_arousal_bridge(current, target_a)
    assert bridge
    assert bridge.emotion_name == "Good"


@pytest.mark.asyncio
async def test_add_vulnerability_waypoint_not_found(harmonizer, mock_session):
    """Test line 75: Vulnerability emotion not found in DB."""
    path = [make_emotion("S", 0, 0, 0), make_emotion("E", 0, 0, 0)]

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result

    new_path = await harmonizer._add_vulnerability_waypoint(path)
    # Should return original path
    assert new_path == path


@pytest.mark.asyncio
async def test_ensure_arousal_regulation_empty(harmonizer):
    """Test line 82: Empty path."""
    res = await harmonizer._ensure_arousal_regulation([])
    assert res == []


@pytest.mark.asyncio
async def test_ensure_arousal_regulation_no_bridge_found(harmonizer, mock_session):
    """Test lines 102->108: Unsafe drop but no bridge found."""
    e1 = make_emotion("Panic", -0.5, 0.9, -0.5)
    e2 = make_emotion("Calm", 0.5, 0.1, 0.5)
    path = [e1, e2]

    # Mock finding bridge returns None
    # We can mock _find_arousal_bridge directly or the session query
    # Let's mock the session query to return empty
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_session.execute.return_value = mock_result

    res = await harmonizer._ensure_arousal_regulation(path)

    # Should contain only original emotions, no bridge inserted
    assert len(res) == 2
    assert res[0] == e1
    assert res[1] == e2


@pytest.mark.asyncio
async def test_find_arousal_bridge_suboptimal_candidate(harmonizer, mock_session):
    """Test lines 145->125: Ignore candidate if not better than current best."""
    current = make_emotion("High", 0, 0.9, 0)
    target_a = 0.5

    # Best candidate (dist 0)
    c1 = make_emotion("Best", 0, 0.5, 0)
    # Suboptimal candidate (valid but dist 0.1)
    c2 = make_emotion("Okay", 0, 0.6, 0)

    mock_result = MagicMock()
    # Return Best FIRST, then Okay.
    # Logic:
    # 1. Process Best. min_dist = 0.
    # 2. Process Okay. dist 0.1 not < 0. Skip. (Cover 145->125)
    mock_result.scalars.return_value.all.return_value = [c1, c2]
    mock_session.execute.return_value = mock_result

    bridge = await harmonizer._find_arousal_bridge(current, target_a)
    assert bridge.emotion_name == "Best"
