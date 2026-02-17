from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.models.emotion_definition import EmotionDefinition
from app.services.planning.harmonics import PathHarmonizer
from app.services.planning.rules.definitions import ArousalRegulationRule, VulnerabilityBridgeRule


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
    # Add other attributes expected by rules if needed
    e.category = "TestCategory"
    return e


@pytest.mark.asyncio
async def test_validate_and_enhance_path_delegates_to_rules(harmonizer, mock_session):
    """Test that PathHarmonizer delegates to its rules."""
    start = make_emotion("A", 0, 0, 0)
    goal = make_emotion("B", 0, 0, 0)
    original_path = [start, goal]

    # Mock rules to verify they are called
    rule1 = MagicMock()
    rule1.check_and_fix = AsyncMock(return_value=(original_path, False))

    rule2 = MagicMock()
    rule2.check_and_fix = AsyncMock(return_value=(original_path, False))

    harmonizer.rules = [rule1, rule2]

    result = await harmonizer.validate_and_enhance_path(original_path, start, goal)

    assert result == original_path
    rule1.check_and_fix.assert_awaited_with(original_path, start, goal)
    rule2.check_and_fix.assert_awaited_with(original_path, start, goal)


@pytest.mark.asyncio
async def test_vulnerability_bridge_rule_logic(mock_session):
    """Test VulnerabilityBridgeRule logic directly."""
    rule = VulnerabilityBridgeRule(mock_session)

    # Needs bridge: Negative connection -> Positive connection
    start = make_emotion("Shame", -0.5, 0.5, -0.8)
    goal = make_emotion("Love", 0.8, 0.5, 0.8)

    # Mock finding a bridge
    bridge = make_emotion("Vuln", 0.1, 0.3, 0.6)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = bridge
    mock_session.execute.return_value = mock_result

    path = [start, goal]  # Path must include start to allow insertion after it

    new_path, modified = await rule.check_and_fix(path, start, goal)

    assert modified
    assert len(new_path) == 3
    assert new_path[1] == bridge


@pytest.mark.asyncio
async def test_arousal_regulation_rule_logic(mock_session):
    """Test ArousalRegulationRule logic directly."""
    rule = ArousalRegulationRule(mock_session)

    # Unsafe drop: 0.9 -> 0.1
    e1 = make_emotion("Panic", -0.5, 0.9, -0.5)
    e2 = make_emotion("Calm", 0.5, 0.1, 0.5)
    path = [e1, e2]

    # Mock bridge
    bridge = make_emotion("Med", 0, 0.5, 0)
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [bridge]
    mock_session.execute.return_value = mock_result

    new_path, modified = await rule.check_and_fix(
        path, e1, e2
    )  # start/goal irrelevant for this rule usually, but passed

    assert modified
    assert len(new_path) == 3
    assert new_path[1] == bridge
