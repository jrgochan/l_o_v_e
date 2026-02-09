import math
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.models.clinical_alert import AlertLevel, ClinicalAlert
from app.models.session_analytics import SessionAnalytics
from app.services.analytics.metrics import MetricsCalculator
from app.types.emotions import EmotionAnalysisResult


@pytest.fixture
def mock_session():
    return AsyncMock()


@pytest.fixture
def calculator(mock_session):
    return MetricsCalculator(mock_session)


class MockRow:
    def __init__(self, val):
        self.val = val

    def __getitem__(self, idx):
        return self.val


def test_calculate_elasticity_basics(calculator):
    """Test elasticity calc."""
    q1 = [1.0, 0.0, 0.0, 0.0]
    q2 = [1.0, 0.0, 0.0, 0.0]  # Same
    assert calculator.calculate_elasticity(q1, q2, 1.0) == 0.0

    # 90 deg rotation
    # q2 = [0.707, 0.707, 0.0, 0.0]
    q2 = [math.sqrt(0.5), math.sqrt(0.5), 0.0, 0.0]
    # theta = 2 * acos(0.707) = 2 * 45deg = 90deg = pi/2 = 1.57
    elasticity = calculator.calculate_elasticity(q1, q2, 1.0)
    assert math.isclose(elasticity, math.pi / 2, rel_tol=1e-3)


def test_calculate_elasticity_edge_cases(calculator):
    """Test elasticity edge cases."""
    assert calculator.calculate_elasticity([1, 0, 0, 0], None, 1.0) == 0.0
    assert calculator.calculate_elasticity([1, 0, 0, 0], [1, 0, 0, 0], 0.0) == 0.0


@pytest.mark.asyncio
async def test_calculate_rigidity_no_session():
    """Test rigidity without session."""
    calc = MetricsCalculator(None)
    assert await calc.calculate_rigidity(str(uuid4())) == 0.0


@pytest.mark.asyncio
async def test_calculate_rigidity_not_enough_data(calculator, mock_session):
    """Test rigidity with insufficient data."""
    mock_result = MagicMock()
    mock_result.all.return_value = [MockRow([1.0, 0.0, 0.0, 0.0])]  # Only 1
    mock_session.execute.return_value = mock_result

    assert await calculator.calculate_rigidity(str(uuid4())) == 0.0


@pytest.mark.asyncio
async def test_calculate_rigidity_zero_variance(calculator, mock_session):
    """Test rigidity with zero variance (identical states)."""
    # 3 identical quaternions
    rows = [MockRow([1.0, 0.0, 0.0, 0.0])] * 3
    mock_result = MagicMock()
    mock_result.all.return_value = rows
    mock_session.execute.return_value = mock_result

    assert await calculator.calculate_rigidity(str(uuid4())) == float("inf")


@pytest.mark.asyncio
async def test_calculate_rigidity_normal(calculator, mock_session):
    """Test rigidity normal calculation."""
    # Varying quaternions
    q1 = [1.0, 0.0, 0.0, 0.0]
    q2 = [0.0, 1.0, 0.0, 0.0]  # orthogonal
    rows = [MockRow(q1), MockRow(q2)]
    mock_result = MagicMock()
    mock_result.all.return_value = rows
    mock_session.execute.return_value = mock_result

    rigidity = await calculator.calculate_rigidity(str(uuid4()))
    assert rigidity > 0.0
    assert rigidity != float("inf")


def test_detect_flags(calculator):
    """Test detection logic."""
    assert calculator.detect_flooding(2.1) is True
    assert calculator.detect_flooding(1.9) is False

    assert calculator.detect_stuckness(3.1, -0.3) is True  # Rigid + Negative
    assert calculator.detect_stuckness(2.9, -0.3) is False
    assert calculator.detect_stuckness(3.1, 0.1) is False


def test_update_metrics():
    """Test static update_metrics."""
    analytics = MagicMock(spec=SessionAnalytics)
    analytics.emotion_count = 0
    analytics.average_confidence = 0.0
    analytics.category_counts = {}
    analytics.vac_stats = {}
    analytics.critical_alert_count = 0

    # Mock return values for analytics fields to simulate object behavior if needed
    # But MagicMock stores attributes set on it.

    analysis = MagicMock(spec=EmotionAnalysisResult)
    analysis.confidence = 0.8
    analysis.category = "Joy"
    analysis.alerts = [ClinicalAlert(level=AlertLevel.CRITICAL.value, message="msg")]
    analysis.vac_data = {"valence": 0.5, "arousal": 0.5, "connection": 0.5}

    MetricsCalculator.update_metrics(analytics, analysis)

    assert analytics.emotion_count == 1
    assert analytics.average_confidence == 0.8
    assert analytics.category_counts["Joy"] == 1
    assert analytics.critical_alert_count == 1
    assert analytics.vac_stats["valence_avg"] == 0.5


def test_update_vac_stats_accumulation():
    """Test VAC stats accumulation."""
    analytics = MagicMock()
    # Initial state: 1 count, average 0.5
    analytics.emotion_count = 2  # New count will be 2 (if we were calling update_metrics)
    # But here we test usage of running average formula
    # If existing stats has count=1 implied by earlier updates?

    # Let's just test that it calls update_running_average correctly and updates min/max
    analytics.vac_stats = {"valence_avg": 0.5, "valence_min": 0.5, "valence_max": 0.5}
    # analytics.emotion_count is N used for update_running_average
    analytics.emotion_count = 2

    with patch(
        "app.services.analytics.metrics.update_running_average", return_value=0.6
    ) as mock_ura:
        MetricsCalculator._update_vac_stats(analytics, {"valence": 0.7})

        # Check running average calls
        # args: (current_avg, new_count, new_value) -> (0.5, 2, 0.7)
        mock_ura.assert_any_call(0.5, 2, 0.7)

        # Check dict updates
        assert analytics.vac_stats["valence_avg"] == 0.6
        assert analytics.vac_stats["valence_min"] == 0.5  # min(0.5, 0.7)
        assert analytics.vac_stats["valence_max"] == 0.7  # max(0.5, 0.7)


@pytest.mark.asyncio
async def test_calculate_rigidity_none_values(calculator, mock_session):
    """Test rigidity with None values in rows (Line 97 branch)."""
    # Rows with valid and None values
    rows = [MockRow([1.0, 0.0, 0.0, 0.0]), MockRow(None), MockRow([0.0, 1.0, 0.0, 0.0])]
    mock_result = MagicMock()
    mock_result.all.return_value = rows
    mock_session.execute.return_value = mock_result

    # Should skip None, have 2 valid, calculate rigidity
    rigidity = await calculator.calculate_rigidity(str(uuid4()))
    assert rigidity > 0.0


def test_quaternion_variance_defensive(calculator):
    """Test _quaternion_variance defensive check (Line 143)."""
    assert calculator._quaternion_variance([]) == 0.0
    assert calculator._quaternion_variance([[1.0, 0.0, 0.0, 0.0]]) == 0.0


@pytest.mark.asyncio
async def test_calculate_rigidity_numpy(calculator, mock_session):
    """Test rigidity with numpy-like objects (Line 99)."""
    mock_val = MagicMock()
    mock_val.tolist.return_value = [1.0, 0.0, 0.0, 0.0]

    rows = [MockRow(mock_val), MockRow(mock_val)]
    mock_result = MagicMock()
    mock_result.all.return_value = rows
    mock_session.execute.return_value = mock_result

    # Just ensure it runs without error and returns something (inf if identical)
    await calculator.calculate_rigidity(str(uuid4()))
    mock_val.tolist.assert_called()


def test_update_alert_counts_levels():
    """Test all alert levels (Lines 208-211)."""
    analytics = MagicMock()
    analytics.critical_alert_count = 0
    analytics.warning_alert_count = 0
    analytics.attention_alert_count = 0

    alerts = [
        ClinicalAlert(level=AlertLevel.CRITICAL.value, message="c"),
        ClinicalAlert(level=AlertLevel.WARNING.value, message="w"),
        ClinicalAlert(level=AlertLevel.ATTENTION.value, message="a"),
    ]

    MetricsCalculator._update_alert_counts(analytics, alerts)

    assert analytics.critical_alert_count == 1
    assert analytics.warning_alert_count == 1
    assert analytics.attention_alert_count == 1
