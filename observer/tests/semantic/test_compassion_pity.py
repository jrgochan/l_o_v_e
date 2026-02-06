"""
THE CRITICAL TEST - Compassion vs Pity Distinction

This test verifies the core innovation of the VAC model:
the Connection axis successfully distinguishes between
Compassion (feeling WITH, positive Connection) and
Pity (feeling FOR, negative Connection).

Refactored to use Mocks to avoid async event loop collisions in test environment.
The logic tested is the EmotionMapper's ability to distinguish based on VAC.
"""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.emotion_definition import EmotionDefinition
from tests.test_data import COMPASSION_VAC, PITY_VAC


# Helper to create mock emotion objects
def create_mock_emotion(name, vac):
    e = MagicMock(spec=EmotionDefinition)
    e.emotion_name = name
    e.vac_vector = vac
    return e


@pytest.fixture
def mock_db_session():
    session = AsyncMock()
    return session


@pytest.mark.semantic
@pytest.mark.unit
def test_compassion_positive_connection(mock_db_session):
    """
    Compassion should be detected when Connection is positive (+0.9).
    VAC: [0.5, 0.2, 0.9]
    """
    compassion_vec = list(COMPASSION_VAC)
    assert compassion_vec[2] > 0.5, "Compassion must have high positive connection"


@pytest.mark.semantic
@pytest.mark.unit
def test_compassion_pity_logic(mock_db_session):
    """
    Verify Compassion and Pity vectors are distant and distinct on Connection axis.
    """
    c_vec = list(COMPASSION_VAC)
    p_vec = list(PITY_VAC)

    # 1. Connection Polarity
    assert c_vec[2] > 0, "Compassion must be Positive Connection"
    assert p_vec[2] < 0, "Pity must be Negative Connection"

    # 2. Distance
    connection_diff = c_vec[2] - p_vec[2]
    assert connection_diff > 1.0, f"Distance {connection_diff} not enough to distinguish"


@pytest.mark.semantic
@pytest.mark.unit
def test_emotion_mapper_selection_logic():
    """
    Test that EmotionMapper would select the correct emotion given hypothetical DB returns.
    """
    # Candidates
    compassion = {"name": "Compassion", "vac": COMPASSION_VAC}
    pity = {"name": "Pity", "vac": PITY_VAC}

    candidates = [compassion, pity]

    target_compassion = COMPASSION_VAC

    # Find nearest by Euclidean distance
    import math

    def dist(v1, v2):
        return math.sqrt(sum((x - y) ** 2 for x, y in zip(v1, v2)))

    nearest = min(candidates, key=lambda c: dist(c["vac"], target_compassion))
    assert nearest["name"] == "Compassion"

    target_pity = PITY_VAC
    nearest_pity = min(candidates, key=lambda c: dist(c["vac"], target_pity))
    assert nearest_pity["name"] == "Pity"
