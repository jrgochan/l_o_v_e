"""Unit tests for the Correlation Engine.

Tests orchestration logic, persistence (create/update), and NATS publishing.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.correlation.engine import CorrelationEngine
from app.services.correlation.temporal import TemporalCorrelation

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.execute = AsyncMock()
    db.add = MagicMock()
    db.flush = AsyncMock()
    return db


@pytest.fixture
def engine(mock_db):
    return CorrelationEngine(mock_db)


@pytest.fixture
def user_id():
    return uuid.uuid4()


def _make_temporal_correlation(**overrides):
    """Build a TemporalCorrelation dataclass."""
    defaults = {
        "event_type": "exercise",
        "emotion_name": "Joy",
        "emotion_category": "positive",
        "strength": 0.75,
        "direction": "positive",
        "confidence": 0.88,
        "lag_seconds": 3600,
        "sample_size": 12,
        "window_label": "1h",
        "evidence": {"events": 12, "emotion_matches": 10},
    }
    defaults.update(overrides)
    return TemporalCorrelation(**defaults)


# ---------------------------------------------------------------------------
# run_analysis
# ---------------------------------------------------------------------------


class TestRunAnalysis:
    """Test the full correlation analysis orchestration."""

    @pytest.mark.asyncio
    @patch("app.services.correlation.engine.journal_publisher")
    @patch("app.services.correlation.engine.event_bus")
    @patch("app.services.correlation.engine.TemporalProximityAnalyzer")
    async def test_run_analysis_finds_correlations(
        self, mock_analyzer_cls, mock_event_bus, mock_publisher, engine, user_id
    ):
        mock_event_bus.emit = AsyncMock()
        mock_publisher.publish_correlation = AsyncMock()

        # Analyzer returns one result
        corr = _make_temporal_correlation()
        mock_analyzer = AsyncMock()
        mock_analyzer.analyze.return_value = [corr]
        mock_analyzer_cls.return_value = mock_analyzer

        # No existing correlation found → create
        scalars_mock = MagicMock()
        scalars_mock.first.return_value = None
        engine.db.execute.return_value = MagicMock(scalars=MagicMock(return_value=scalars_mock))

        results = await engine.run_analysis(user_id)

        assert results["correlations_found"] == 1
        assert results["correlations_created"] == 1
        assert results["correlations_updated"] == 0
        assert "temporal_proximity" in results["algorithms_run"]
        mock_event_bus.emit.assert_awaited_once()

    @pytest.mark.asyncio
    @patch("app.services.correlation.engine.journal_publisher")
    @patch("app.services.correlation.engine.event_bus")
    @patch("app.services.correlation.engine.TemporalProximityAnalyzer")
    async def test_run_analysis_no_results(
        self, mock_analyzer_cls, mock_event_bus, mock_publisher, engine, user_id
    ):
        mock_event_bus.emit = AsyncMock()

        mock_analyzer = AsyncMock()
        mock_analyzer.analyze.return_value = []
        mock_analyzer_cls.return_value = mock_analyzer

        results = await engine.run_analysis(user_id)

        assert results["correlations_found"] == 0
        assert results["correlations_created"] == 0
        assert results["correlations_updated"] == 0

    @pytest.mark.asyncio
    @patch("app.services.correlation.engine.journal_publisher")
    @patch("app.services.correlation.engine.event_bus")
    @patch("app.services.correlation.engine.TemporalProximityAnalyzer")
    async def test_run_analysis_with_ip(
        self, mock_analyzer_cls, mock_event_bus, mock_publisher, engine, user_id
    ):
        mock_event_bus.emit = AsyncMock()
        mock_analyzer = AsyncMock()
        mock_analyzer.analyze.return_value = []
        mock_analyzer_cls.return_value = mock_analyzer

        await engine.run_analysis(user_id, ip_address="192.168.1.1")

        domain_event = mock_event_bus.emit.call_args[0][0]
        assert domain_event.ip_address == "192.168.1.1"


# ---------------------------------------------------------------------------
# _persist_correlations
# ---------------------------------------------------------------------------


class TestPersistCorrelations:
    """Test correlation upsert logic."""

    @pytest.mark.asyncio
    @patch("app.services.correlation.engine.journal_publisher")
    async def test_persist_new_correlation(self, mock_publisher, engine, user_id):
        mock_publisher.publish_correlation = AsyncMock()

        corr = _make_temporal_correlation()

        # No existing → create
        scalars_mock = MagicMock()
        scalars_mock.first.return_value = None
        engine.db.execute.return_value = MagicMock(scalars=MagicMock(return_value=scalars_mock))

        created, updated = await engine._persist_correlations(user_id, [corr])

        assert created == 1
        assert updated == 0
        engine.db.add.assert_called_once()
        mock_publisher.publish_correlation.assert_awaited_once()

    @pytest.mark.asyncio
    @patch("app.services.correlation.engine.journal_publisher")
    async def test_persist_update_existing(self, mock_publisher, engine, user_id):
        mock_publisher.publish_correlation = AsyncMock()

        corr = _make_temporal_correlation(strength=0.85)

        # Existing found → update
        existing = MagicMock()
        existing.status = "active"
        scalars_mock = MagicMock()
        scalars_mock.first.return_value = existing
        engine.db.execute.return_value = MagicMock(scalars=MagicMock(return_value=scalars_mock))

        created, updated = await engine._persist_correlations(user_id, [corr])

        assert created == 0
        assert updated == 1
        assert existing.strength == 0.85
        assert existing.direction == "positive"
        assert existing.confidence == 0.88
        assert existing.status == "active"  # stays active (strength >= 0.3)

    @pytest.mark.asyncio
    @patch("app.services.correlation.engine.journal_publisher")
    async def test_persist_update_weakening(self, mock_publisher, engine, user_id):
        """When strength drops below 0.3 and was active, status → weakening."""
        mock_publisher.publish_correlation = AsyncMock()

        corr = _make_temporal_correlation(strength=0.2)

        existing = MagicMock()
        existing.status = "active"
        scalars_mock = MagicMock()
        scalars_mock.first.return_value = existing
        engine.db.execute.return_value = MagicMock(scalars=MagicMock(return_value=scalars_mock))

        created, updated = await engine._persist_correlations(user_id, [corr])

        assert updated == 1
        assert existing.status == "weakening"

    @pytest.mark.asyncio
    @patch("app.services.correlation.engine.journal_publisher")
    async def test_persist_update_non_active_stays(self, mock_publisher, engine, user_id):
        """Non-active status with low strength stays unchanged."""
        mock_publisher.publish_correlation = AsyncMock()

        corr = _make_temporal_correlation(strength=0.2)

        existing = MagicMock()
        existing.status = "discovered"
        scalars_mock = MagicMock()
        scalars_mock.first.return_value = existing
        engine.db.execute.return_value = MagicMock(scalars=MagicMock(return_value=scalars_mock))

        created, updated = await engine._persist_correlations(user_id, [corr])

        assert updated == 1
        assert existing.status == "discovered"  # Unchanged

    @pytest.mark.asyncio
    @patch("app.services.correlation.engine.journal_publisher")
    async def test_persist_multiple_mixed(self, mock_publisher, engine, user_id):
        """Mix of new and existing correlations."""
        mock_publisher.publish_correlation = AsyncMock()

        corr1 = _make_temporal_correlation(event_type="exercise")
        corr2 = _make_temporal_correlation(event_type="sleep")

        # First call: existing found, second: not found
        existing = MagicMock()
        existing.status = "active"

        scalars_none = MagicMock()
        scalars_none.first.return_value = None
        scalars_existing = MagicMock()
        scalars_existing.first.return_value = existing

        engine.db.execute = AsyncMock(
            side_effect=[
                MagicMock(scalars=MagicMock(return_value=scalars_existing)),
                MagicMock(scalars=MagicMock(return_value=scalars_none)),
            ]
        )

        created, updated = await engine._persist_correlations(user_id, [corr1, corr2])

        assert created == 1
        assert updated == 1

    @pytest.mark.asyncio
    @patch("app.services.correlation.engine.journal_publisher")
    async def test_persist_empty_list(self, mock_publisher, engine, user_id):
        """No correlations to persist."""
        created, updated = await engine._persist_correlations(user_id, [])

        assert created == 0
        assert updated == 0
        engine.db.add.assert_not_called()
