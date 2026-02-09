from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.clinical_alert import AlertLevel, ClinicalAlert
from app.models.session_analytics import SessionAnalytics
from app.services.analytics.session import SessionAnalyticsService
from app.types.emotions import EmotionAnalysisResult


@pytest.fixture
def mock_db():
    m = AsyncMock()
    # add/flush are async/sync depending on implementation,
    # but db interface is usually async for execute/commit
    # SQLAlchemy's AsyncSession.add is synchronous
    m.add = MagicMock()
    m.delete = MagicMock()
    m.commit = AsyncMock()
    m.rollback = AsyncMock()
    m.refresh = AsyncMock()
    m.flush = AsyncMock()
    return m


@pytest.fixture
def service(mock_db):
    return SessionAnalyticsService(mock_db)


@pytest.mark.asyncio
async def test_update_metrics_new_session(service, mock_db):
    """Test creating new stats for a fresh session."""
    # Mock execute to return no existing analytics
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    # Alerts to process
    alert = MagicMock(spec=ClinicalAlert)
    alert.level = AlertLevel.WARNING.value

    analytics = await service.update_metrics(
        session_id="sess_new",
        analysis_result=EmotionAnalysisResult(
            emotion_name="Joy",
            category="Positive",
            vac_data={"valence": 0.8, "arousal": 0.5, "connection": 0.6},
            confidence=0.9,
            alerts=[alert],
        ),
    )

    # Verify creation
    mock_db.add.assert_called_once()
    mock_db.flush.assert_called_once()

    # Verify metrics
    assert analytics.emotion_count == 1
    assert analytics.average_confidence == 0.9
    assert analytics.warning_alert_count == 1
    assert analytics.vac_stats["valence_avg"] == 0.8
    assert analytics.category_counts["Positive"] == 1


@pytest.mark.asyncio
async def test_update_metrics_existing_session(service, mock_db):
    """Test updating existing stats."""
    existing = SessionAnalytics(
        session_id="sess_exist",
        start_time=datetime.now(timezone.utc),
        emotion_count=10,
        average_confidence=0.8,
        vac_stats={"valence_avg": 0.5},
        category_counts={"Neutral": 10},
        critical_alert_count=0,
        warning_alert_count=0,
        attention_alert_count=0,
    )

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = existing
    mock_db.execute.return_value = mock_result

    # Update with new data
    analytics = await service.update_metrics(
        session_id="sess_exist",
        analysis_result=EmotionAnalysisResult(
            emotion_name="Anger",
            category="Negative",
            vac_data={"valence": -0.5, "arousal": 0.0, "connection": 0.0},
            confidence=0.6,
            alerts=[],
        ),
    )

    # Verify running average update
    # Old sum: 10 * 0.8 = 8.0. New total: 8.6. Count: 11. Avg: 8.6/11 ≈ 0.7818...
    assert analytics.emotion_count == 11
    assert 0.78 < analytics.average_confidence < 0.79
    assert analytics.category_counts["Negative"] == 1
    # Verify VAC update (valence_avg was 0.5, new is -0.5, n=11)
    # (0.5 * 10 + -0.5) / 11 = 4.5 / 11 ≈ 0.409
    assert analytics.vac_stats["valence_avg"] == 0.409


@pytest.mark.asyncio
async def test_update_metrics_all_alerts(service, mock_db):
    """Test counting logic for all alert levels."""
    mock_result = MagicMock()
    # Return None to trigger new session creation path (simplest)
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    alerts = [
        MagicMock(spec=ClinicalAlert, level=AlertLevel.CRITICAL.value),
        MagicMock(spec=ClinicalAlert, level=AlertLevel.WARNING.value),
        MagicMock(spec=ClinicalAlert, level=AlertLevel.ATTENTION.value),
        MagicMock(spec=ClinicalAlert, level="UNKNOWN"),  # Should be ignored
    ]

    analytics = await service.update_metrics(
        session_id="sess_alerts",
        analysis_result=EmotionAnalysisResult(
            emotion_name="Fear",
            category="Negative",
            vac_data={"valence": 0.0, "arousal": 0.0, "connection": 0.0},
            confidence=0.9,
            alerts=alerts,
        ),
    )

    assert analytics.critical_alert_count == 1
    assert analytics.warning_alert_count == 1
    assert analytics.attention_alert_count == 1


@pytest.mark.asyncio
async def test_get_metrics_found(service, mock_db):
    """Test retrieving existing metrics."""
    existing = MagicMock(spec=SessionAnalytics)
    existing.to_dict.return_value = {"session_id": "sess_1", "emotion_count": 5}

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = existing
    mock_db.execute.return_value = mock_result

    metrics = await service.get_metrics("sess_1")
    assert metrics["session_id"] == "sess_1"
    assert metrics["emotion_count"] == 5


@pytest.mark.asyncio
async def test_get_metrics_not_found(service, mock_db):
    """Test retrieving non-existent metrics."""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    metrics = await service.get_metrics("sess_ghost")
    assert metrics is None


@pytest.mark.asyncio
async def test_get_session_summary_no_data(service, mock_db):
    """Test summary for new session."""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    summary = await service.get_session_summary("sess_empty")
    assert summary["status"] == "no_data"
    assert summary["emotion_count"] == 0


@pytest.mark.asyncio
async def test_get_session_summary_data(service, mock_db):
    """Test comprehensive summary generation."""
    # Mock data directly returning a dict from get_metrics
    service.get_metrics = AsyncMock(
        return_value={
            "session_id": "sess_full",
            "average_confidence": 0.85,
            "emotion_count": 15,
            "alert_counts": {"critical": 1, "warning": 1, "attention": 0},
        }
    )

    summary = await service.get_session_summary("sess_full")
    assert summary["avg_confidence_percent"] == 85.0
    assert summary["total_alert_count"] == 2
    assert summary["session_status"] == "critical"  # > 0 critical


@pytest.mark.asyncio
async def test_session_status_logic(service):
    """Test status derivation rules."""

    # Wrapper to test logic without DB
    async def get_status(critical, warning, count):
        service.get_metrics = AsyncMock(
            return_value={
                "average_confidence": 0.8,
                "emotion_count": count,
                "alert_counts": {
                    "critical": critical,
                    "warning": warning,
                    "attention": 0,
                },
            }
        )
        s = await service.get_session_summary("test")
        return s["session_status"]

    assert await get_status(1, 0, 5) == "critical"
    assert await get_status(0, 3, 5) == "concerning"
    assert await get_status(0, 2, 11) == "active"
    assert await get_status(0, 2, 5) == "normal"


@pytest.mark.asyncio
async def test_get_or_create_new(service, mock_db):
    """Test creating a new analytics record."""
    # Mock no existing record
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    analytics = await service.get_or_create("sess_new_2")

    # Verify creation
    assert analytics.session_id == "sess_new_2"
    assert analytics.emotion_count == 0
    mock_db.add.assert_called_once()
    mock_db.flush.assert_called_once()


@pytest.mark.asyncio
async def test_get_or_create_existing(service, mock_db):
    """Test returning an existing analytics record."""
    existing = SessionAnalytics(session_id="sess_exist_2", emotion_count=5)

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = existing
    mock_db.execute.return_value = mock_result

    analytics = await service.get_or_create("sess_exist_2")

    assert analytics == existing
    mock_db.add.assert_not_called()
