from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.models.emotion_definition import EmotionDefinition
from app.services.planning.rules.definitions import (
    ArousalRegulationRule,
    VulnerabilityBridgeRule,
)


@pytest.fixture
def mock_session():
    s = AsyncMock()
    s.execute = AsyncMock()
    return s


def make_emotion(name, v, a, c):
    e = MagicMock(spec=EmotionDefinition)
    e.id = uuid4()
    e.emotion_name = name
    e.vac_vector = [v, a, c]
    return e


@pytest.mark.asyncio
async def test_vulnerability_bridge_already_exists(mock_session):
    rule = VulnerabilityBridgeRule(mock_session)

    # Start: Low Connection (-0.4)
    start = make_emotion("Isolation", -0.5, -0.5, -0.4)
    # Goal: High Connection (0.6)
    goal = make_emotion("Connection", 0.5, 0.5, 0.6)

    # Path already has a "vulnerability-like" emotion
    # -0.2 < v < 0.2, 0.2 < a < 0.5, c > 0.5
    existing_bridge = make_emotion("ExistingVuln", 0.0, 0.3, 0.6)
    path = [start, existing_bridge, goal]

    new_path, modified = await rule.check_and_fix(path, start, goal)

    assert not modified
    assert new_path == path


@pytest.mark.asyncio
async def test_vulnerability_bridge_not_found_in_db(mock_session):
    rule = VulnerabilityBridgeRule(mock_session)
    start = make_emotion("Isolation", -0.5, -0.5, -0.4)
    goal = make_emotion("Connection", 0.5, 0.5, 0.6)
    path = [start, goal]

    # Mock DB returning None for "Vulnerability"
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result

    new_path, modified = await rule.check_and_fix(path, start, goal)

    assert not modified
    assert new_path == path


@pytest.mark.asyncio
async def test_arousal_regulation_empty_path(mock_session):
    rule = ArousalRegulationRule(mock_session)
    start = make_emotion("S", 0, 0, 0)
    goal = make_emotion("G", 0, 0, 0)

    path, modified = await rule.check_and_fix([], start, goal)
    assert path == []
    assert not modified


@pytest.mark.asyncio
async def test_arousal_regulation_no_bridge_candidate(mock_session):
    rule = ArousalRegulationRule(mock_session)

    # Huge drop: 0.9 -> 0.1
    e1 = make_emotion("Panic", -0.5, 0.9, -0.5)
    e2 = make_emotion("Calm", 0.5, 0.1, 0.5)
    path = [e1, e2]

    # Mock DB returning NO candidates
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_session.execute.return_value = mock_result

    new_path, modified = await rule.check_and_fix(path, e1, e2)

    assert not modified
    assert len(new_path) == 2


@pytest.mark.asyncio
async def test_arousal_regulation_filtering_logic(mock_session):
    rule = ArousalRegulationRule(mock_session)

    current = make_emotion("HighArousal", 0.0, 0.8, 0.0)
    target_arousal = 0.5

    # Candidates
    # 1. Same ID -> Should skip
    cand1 = make_emotion("Same", 0, 0.5, 0)
    cand1.id = current.id

    # 2. Arousal too far (abs(0.8 - 0.5) = 0.3 > 0.15 limit? Wait logic says abs(cand.a - target) > 0.15)
    # Target is 0.5.
    # Cand2: Arousal 0.1. abs(0.1 - 0.5) = 0.4 > 0.15 -> Skip
    cand2 = make_emotion("TooLowArousal", 0.0, 0.1, 0.0)

    # 3. Valence drops too much (v < current_v - 0.2)
    # Current v=0.0. Limit is -0.2.
    # Cand3: v = -0.3. -> Skip
    cand3 = make_emotion("BadValence", -0.3, 0.5, 0.0)

    # 4. Connection too low (c < -0.3)
    # Cand4: c = -0.4 -> Skip
    cand4 = make_emotion("BadConnection", 0.0, 0.5, -0.4)

    # 5. Valid candidate (Perfect)
    # Arousal 0.5 (perfect match), Valence 0.0, Connection 0.0
    cand5 = make_emotion("Perfect", 0.0, 0.5, 0.0)

    # 6. Valid candidate (Good but not best)
    # Arousal 0.55. Dist = 0.05.
    # If we process "Perfect" first (dist=0), this one (dist=0.05) will trigger the False branch of dist < min_dist
    cand6 = make_emotion("GoodButNotBest", 0.0, 0.55, 0.0)

    mock_result = MagicMock()
    # Order matters for branch coverage if we want to hit the False branch of `dist < min_dist`
    # We put Perfect first.
    mock_result.scalars.return_value.all.return_value = [
        cand1,
        cand2,
        cand3,
        cand4,
        cand5,
        cand6,
    ]
    mock_session.execute.return_value = mock_result

    # We call the internal method directly to test filtering
    bridge = await rule._find_arousal_bridge(current, target_arousal)

    assert bridge is not None
    assert bridge.emotion_name == "Perfect"


@pytest.mark.asyncio
async def test_vulnerability_bridge_condition_not_met(mock_session):
    rule = VulnerabilityBridgeRule(mock_session)

    # Start: High Connection (0.5) -> No need for bridge
    start = make_emotion("Con", 0.5, 0.5, 0.5)
    goal = make_emotion("Con2", 0.5, 0.5, 0.6)
    path = [start, goal]

    new_path, modified = await rule.check_and_fix(path, start, goal)

    assert not modified
    assert new_path == path


@pytest.mark.asyncio
async def test_arousal_regulation_safe_drop(mock_session):
    rule = ArousalRegulationRule(mock_session)

    # Safe drop: 0.7 -> 0.4 (diff 0.3 <= 0.5)
    e1 = make_emotion("High", 0, 0.7, 0)
    e2 = make_emotion("Med", 0, 0.4, 0)
    path = [e1, e2]

    new_path, modified = await rule.check_and_fix(path, e1, e2)

    assert not modified
    assert new_path == path
