import math
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.analytics.metrics import MetricsCalculator


@pytest.fixture
def mock_session():
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.delete = MagicMock()
    mock_db.commit = AsyncMock()
    return mock_db


@pytest.fixture
def calculator(mock_session):
    return MetricsCalculator(mock_session)


def test_angular_distance(calculator):
    """Test quaternion angular distance calculation."""
    # Identity (same rotation)
    q1 = [1, 0, 0, 0]
    q2 = [1, 0, 0, 0]
    assert calculator.angular_distance(q1, q2) == 0.0

    # 180 degree rotation around X axis (q = [0, 1, 0, 0])
    # Angle between identity and this is Pi/2 actually? No, angular distance formula:
    # theta = arccos(|q1.q2|)
    # q1.q2 = 0. theta = Pi/2.
    # Valid range [0, Pi].
    q3 = [0, 1, 0, 0]
    assert math.isclose(calculator.angular_distance(q1, q3), math.pi, rel_tol=1e-5)

    # Double cover check: q and -q should be distance 0
    q_neg = [-1, 0, 0, 0]
    assert calculator.angular_distance(q1, q_neg) == 0.0


def test_calculate_elasticity(calculator):
    """Test elasticity E = theta / dt."""
    q1 = [1, 0, 0, 0]
    q2 = [0, 1, 0, 0]  # theta = pi/2 approx 1.57
    dt = 1.0

    e = calculator.calculate_elasticity(q1, q2, dt)
    # Angular distance between 1 and i (180 deg rotation) is pi.
    assert math.isclose(e, math.pi, rel_tol=1e-5)

    # Zero time
    assert calculator.calculate_elasticity(q1, q2, 0) == 0.0
    assert calculator.calculate_elasticity(q1, q2, -1) == 0.0


@pytest.mark.asyncio
async def test_calculate_rigidity(calculator, mock_session):
    """Test rigidity R = 1 / variance."""
    # Mock states
    states = []
    # Create 10 states with low variance
    for _ in range(10):
        s = MagicMock()
        s.quaternion_state = [1.0, 0.0, 0.0, 0.0]
        states.append(s)

    mock_result = MagicMock()
    # Fix: return list of single-element tuples (row-like)
    mock_result.all.return_value = [(s.quaternion_state,) for s in states]
    mock_session.execute.return_value = mock_result

    # Variance should be 0 -> Rigidity infinity?
    # The code handles variance=0 by returning inf.
    # The internal `_quaternion_variance` method calculates it.
    assert calculator._quaternion_variance([[1.0, 0.0, 0.0, 0.0]] * 10) == 0.0

    from uuid import uuid4

    val = await calculator.calculate_rigidity(str(uuid4()), 10)
    assert val == float("inf")


@pytest.mark.asyncio
async def test_calculate_rigidity_normal(calculator, mock_session):
    """Test normal rigidity."""
    states = []
    # High variance
    s1 = MagicMock()
    s1.quaternion_state = [1, 0, 0, 0]
    s2 = MagicMock()
    s2.quaternion_state = [0, 1, 0, 0]
    states = [s1, s2]

    mock_result = MagicMock()
    mock_result.all.return_value = [(s.quaternion_state,) for s in states]
    mock_session.execute.return_value = mock_result

    from uuid import uuid4

    r = await calculator.calculate_rigidity(str(uuid4()), 10)
    # Variance of [1,0,0,0] and [0,1,0,0] via eigenvector method:
    # Mean is likely [1,0,0,0] or orthogonal, leading to variance of (0 + pi^2)/2 approx 2.467
    # Rigidity = 1 / 2.467 = 0.4053

    assert math.isclose(r, 0.40528, rel_tol=1e-3)


@pytest.mark.asyncio
async def test_calculate_rigidity_insufficient(calculator, mock_session):
    mock_result = MagicMock()
    mock_result.all.return_value = [(MagicMock(),)]
    mock_session.execute.return_value = mock_result

    from uuid import uuid4

    assert await calculator.calculate_rigidity(str(uuid4())) == 0.0


def test_detect_flooding(calculator):
    assert calculator.detect_flooding(2.1) is True
    assert calculator.detect_flooding(1.9) is False


def test_detect_stuckness(calculator):
    # High rigidity + neg valence
    assert calculator.detect_stuckness(6.0, -0.5) is True
    # Low rigidity
    assert calculator.detect_stuckness(2.0, -0.5) is False
    # Pos valence
    assert calculator.detect_stuckness(6.0, 0.5) is False


@pytest.mark.asyncio
async def test_calculate_rigidity_zero_variance(calculator, mock_session):
    """Test rigidity calculation with zero variance (infinity)."""
    # Create identical states
    states = []
    for _ in range(10):
        s = MagicMock()
        s.quaternion_state = [1.0, 0.0, 0.0, 0.0]
        states.append(s)

    mock_result = MagicMock()
    mock_result.all.return_value = [(s.quaternion_state,) for s in states]
    mock_session.execute.return_value = mock_result

    from uuid import uuid4

    rigidity = await calculator.calculate_rigidity(str(uuid4()), 10)
    assert rigidity == float("inf")
