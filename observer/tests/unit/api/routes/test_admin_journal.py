"""Unit tests for admin journal API routes.

Tests all 9 admin journal endpoints: events, correlations,
integrations, and stream status.
"""

import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.api.routes.admin.journal import (
    correlation_stats,
    delete_event,
    event_stats,
    force_disconnect_integration,
    integration_health,
    list_all_correlations,
    list_all_events,
    list_all_integrations,
    stream_status,
)
from app.models.user import User, UserRole

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def mock_admin():
    """An admin user."""
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.email = "admin@test.com"
    user.role = UserRole.ADMIN
    return user


@pytest.fixture
def mock_db():
    """Mock async database session."""
    db = AsyncMock()
    db.execute = AsyncMock()
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    return db


def _make_life_event(**overrides):
    """Create a mock LifeEvent."""
    defaults = {
        "id": uuid.uuid4(),
        "user_id": uuid.uuid4(),
        "event_type": "exercise",
        "title": "Morning run",
        "description": "5km jog",
        "timestamp": datetime(2026, 7, 24, 8, 0, 0),
        "duration_minutes": 30,
        "source": "manual",
        "tags": ["fitness", "outdoor"],
        "impact": 0.7,
        "is_recurring": True,
        "created_at": datetime(2026, 7, 24, 8, 5, 0),
    }
    defaults.update(overrides)
    event = MagicMock()
    for k, v in defaults.items():
        setattr(event, k, v)
    return event


def _make_correlation(**overrides):
    """Create a mock EmotionEventCorrelation."""
    defaults = {
        "id": uuid.uuid4(),
        "user_id": uuid.uuid4(),
        "emotion_name": "Joy",
        "event_type": "exercise",
        "event_pattern": "Morning run",
        "correlation_type": "temporal",
        "strength": 0.85,
        "direction": "positive",
        "confidence": 0.92,
        "lag_seconds": 3600,
        "sample_size": 15,
        "status": "validated",
        "user_feedback": "confirmed",
        "first_detected": datetime(2026, 7, 1),
        "last_validated": datetime(2026, 7, 24),
    }
    defaults.update(overrides)
    corr = MagicMock()
    for k, v in defaults.items():
        setattr(corr, k, v)
    return corr


def _make_integration(**overrides):
    """Create a mock IntegrationCredential."""
    defaults = {
        "id": uuid.uuid4(),
        "user_id": uuid.uuid4(),
        "adapter_id": "openweathermap",
        "sync_status": "success",
        "sync_error": None,
        "last_sync_at": datetime(2026, 7, 24, 12, 0),
        "created_at": datetime(2026, 7, 1),
    }
    defaults.update(overrides)
    intg = MagicMock()
    for k, v in defaults.items():
        setattr(intg, k, v)
    return intg


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------


class TestListAllEvents:
    """GET /admin/journal/events"""

    @pytest.mark.asyncio
    async def test_list_events_no_filters(self, mock_db, mock_admin):
        events = [_make_life_event(), _make_life_event(title="Meditation")]
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = events
        scalar_mock = MagicMock(return_value=2)

        mock_db.execute = AsyncMock(
            side_effect=[
                MagicMock(scalar=scalar_mock),  # count
                MagicMock(scalars=MagicMock(return_value=scalars_mock)),  # events
            ]
        )

        result = await list_all_events(db=mock_db, _current_admin=mock_admin)

        assert result["total"] == 2
        assert len(result["events"]) == 2
        assert result["events"][0]["title"] == "Morning run"

    @pytest.mark.asyncio
    async def test_list_events_with_user_filter(self, mock_db, mock_admin):
        user_id = str(uuid.uuid4())
        events = [_make_life_event()]
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = events

        mock_db.execute = AsyncMock(
            side_effect=[
                MagicMock(scalar=MagicMock(return_value=1)),
                MagicMock(scalars=MagicMock(return_value=scalars_mock)),
            ]
        )

        result = await list_all_events(
            db=mock_db,
            _current_admin=mock_admin,
            user_id=user_id,
        )

        assert result["total"] == 1

    @pytest.mark.asyncio
    async def test_list_events_with_type_filter(self, mock_db, mock_admin):
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = []

        mock_db.execute = AsyncMock(
            side_effect=[
                MagicMock(scalar=MagicMock(return_value=0)),
                MagicMock(scalars=MagicMock(return_value=scalars_mock)),
            ]
        )

        result = await list_all_events(
            db=mock_db,
            _current_admin=mock_admin,
            event_type="exercise",
        )

        assert result["total"] == 0
        assert result["events"] == []

    @pytest.mark.asyncio
    async def test_list_events_with_source_filter(self, mock_db, mock_admin):
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = []

        mock_db.execute = AsyncMock(
            side_effect=[
                MagicMock(scalar=MagicMock(return_value=0)),
                MagicMock(scalars=MagicMock(return_value=scalars_mock)),
            ]
        )

        result = await list_all_events(db=mock_db, _current_admin=mock_admin, source="ical")

        assert result["events"] == []

    @pytest.mark.asyncio
    async def test_list_events_with_date_range(self, mock_db, mock_admin):
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = []

        mock_db.execute = AsyncMock(
            side_effect=[
                MagicMock(scalar=MagicMock(return_value=0)),
                MagicMock(scalars=MagicMock(return_value=scalars_mock)),
            ]
        )

        result = await list_all_events(
            db=mock_db,
            _current_admin=mock_admin,
            since="2026-07-01",
            until="2026-07-31",
        )

        assert result["total"] == 0

    @pytest.mark.asyncio
    async def test_list_events_pagination(self, mock_db, mock_admin):
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = []

        mock_db.execute = AsyncMock(
            side_effect=[
                MagicMock(scalar=MagicMock(return_value=100)),
                MagicMock(scalars=MagicMock(return_value=scalars_mock)),
            ]
        )

        result = await list_all_events(db=mock_db, _current_admin=mock_admin, limit=10, offset=50)

        assert result["total"] == 100

    @pytest.mark.asyncio
    async def test_list_events_serialization(self, mock_db, mock_admin):
        """Verify all fields are correctly serialized."""
        event = _make_life_event()
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = [event]

        mock_db.execute = AsyncMock(
            side_effect=[
                MagicMock(scalar=MagicMock(return_value=1)),
                MagicMock(scalars=MagicMock(return_value=scalars_mock)),
            ]
        )

        result = await list_all_events(db=mock_db, _current_admin=mock_admin)
        e = result["events"][0]

        assert e["id"] == str(event.id)
        assert e["user_id"] == str(event.user_id)
        assert e["event_type"] == "exercise"
        assert e["title"] == "Morning run"
        assert e["description"] == "5km jog"
        assert e["duration_minutes"] == 30
        assert e["source"] == "manual"
        assert e["tags"] == ["fitness", "outdoor"]
        assert e["impact"] == 0.7
        assert e["is_recurring"] is True


class TestEventStats:
    """GET /admin/journal/events/stats"""

    @pytest.mark.asyncio
    async def test_event_stats(self, mock_db, mock_admin):
        mock_db.execute = AsyncMock(
            side_effect=[
                MagicMock(scalar=MagicMock(return_value=42)),  # total
                MagicMock(scalar=MagicMock(return_value=5)),  # today
                MagicMock(scalar=MagicMock(return_value=8)),  # users
                MagicMock(all=MagicMock(return_value=[("manual", 30), ("ical", 12)])),  # by source
                MagicMock(all=MagicMock(return_value=[("exercise", 20), ("sleep", 22)])),  # by type
            ]
        )

        result = await event_stats(db=mock_db, _current_admin=mock_admin)

        assert result["total_events"] == 42
        assert result["events_today"] == 5
        assert result["users_with_events"] == 8
        assert result["by_source"] == {"manual": 30, "ical": 12}
        assert result["by_type"] == {"exercise": 20, "sleep": 22}

    @pytest.mark.asyncio
    async def test_event_stats_empty(self, mock_db, mock_admin):
        mock_db.execute = AsyncMock(
            side_effect=[
                MagicMock(scalar=MagicMock(return_value=0)),
                MagicMock(scalar=MagicMock(return_value=0)),
                MagicMock(scalar=MagicMock(return_value=0)),
                MagicMock(all=MagicMock(return_value=[])),
                MagicMock(all=MagicMock(return_value=[])),
            ]
        )

        result = await event_stats(db=mock_db, _current_admin=mock_admin)

        assert result["total_events"] == 0
        assert result["events_today"] == 0
        assert result["by_source"] == {}
        assert result["by_type"] == {}


class TestDeleteEvent:
    """DELETE /admin/journal/events/{id}"""

    @pytest.mark.asyncio
    async def test_delete_event_success(self, mock_db, mock_admin):
        event_id = uuid.uuid4()
        mock_db.execute = AsyncMock(return_value=MagicMock(rowcount=1))

        result = await delete_event(event_id=event_id, db=mock_db, _current_admin=mock_admin)

        assert result["status"] == "deleted"
        assert result["id"] == str(event_id)
        mock_db.commit.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_delete_event_not_found(self, mock_db, mock_admin):
        event_id = uuid.uuid4()
        mock_db.execute = AsyncMock(return_value=MagicMock(rowcount=0))

        with pytest.raises(HTTPException) as exc_info:
            await delete_event(event_id=event_id, db=mock_db, _current_admin=mock_admin)

        assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# Correlations
# ---------------------------------------------------------------------------


class TestListAllCorrelations:
    """GET /admin/journal/correlations"""

    @pytest.mark.asyncio
    async def test_list_correlations_no_filters(self, mock_db, mock_admin):
        corrs = [_make_correlation(), _make_correlation(emotion_name="Calm")]
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = corrs

        mock_db.execute = AsyncMock(
            side_effect=[
                MagicMock(scalar=MagicMock(return_value=2)),
                MagicMock(scalars=MagicMock(return_value=scalars_mock)),
            ]
        )

        result = await list_all_correlations(db=mock_db, _current_admin=mock_admin)

        assert result["total"] == 2
        assert len(result["correlations"]) == 2

    @pytest.mark.asyncio
    async def test_list_correlations_with_status_filter(self, mock_db, mock_admin):
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = []

        mock_db.execute = AsyncMock(
            side_effect=[
                MagicMock(scalar=MagicMock(return_value=0)),
                MagicMock(scalars=MagicMock(return_value=scalars_mock)),
            ]
        )

        result = await list_all_correlations(
            db=mock_db, _current_admin=mock_admin, status="validated"
        )

        assert result["total"] == 0

    @pytest.mark.asyncio
    async def test_list_correlations_with_user_filter(self, mock_db, mock_admin):
        user_id = str(uuid.uuid4())
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = []

        mock_db.execute = AsyncMock(
            side_effect=[
                MagicMock(scalar=MagicMock(return_value=0)),
                MagicMock(scalars=MagicMock(return_value=scalars_mock)),
            ]
        )

        result = await list_all_correlations(db=mock_db, _current_admin=mock_admin, user_id=user_id)

        assert result["total"] == 0

    @pytest.mark.asyncio
    async def test_list_correlations_with_event_type_filter(self, mock_db, mock_admin):
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = []

        mock_db.execute = AsyncMock(
            side_effect=[
                MagicMock(scalar=MagicMock(return_value=0)),
                MagicMock(scalars=MagicMock(return_value=scalars_mock)),
            ]
        )

        result = await list_all_correlations(
            db=mock_db, _current_admin=mock_admin, event_type="exercise"
        )

        assert result["total"] == 0

    @pytest.mark.asyncio
    async def test_list_correlations_with_min_strength(self, mock_db, mock_admin):
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = []

        mock_db.execute = AsyncMock(
            side_effect=[
                MagicMock(scalar=MagicMock(return_value=0)),
                MagicMock(scalars=MagicMock(return_value=scalars_mock)),
            ]
        )

        result = await list_all_correlations(
            db=mock_db, _current_admin=mock_admin, min_strength=0.5
        )

        assert result["total"] == 0

    @pytest.mark.asyncio
    async def test_correlation_serialization(self, mock_db, mock_admin):
        corr = _make_correlation()
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = [corr]

        mock_db.execute = AsyncMock(
            side_effect=[
                MagicMock(scalar=MagicMock(return_value=1)),
                MagicMock(scalars=MagicMock(return_value=scalars_mock)),
            ]
        )

        result = await list_all_correlations(db=mock_db, _current_admin=mock_admin)
        c = result["correlations"][0]

        assert c["id"] == str(corr.id)
        assert c["emotion_name"] == "Joy"
        assert c["event_type"] == "exercise"
        assert c["strength"] == 0.85
        assert c["direction"] == "positive"
        assert c["confidence"] == 0.92
        assert c["sample_size"] == 15
        assert c["status"] == "validated"
        assert c["user_feedback"] == "confirmed"


class TestCorrelationStats:
    """GET /admin/journal/correlations/stats"""

    @pytest.mark.asyncio
    async def test_correlation_stats(self, mock_db, mock_admin):
        mock_db.execute = AsyncMock(
            side_effect=[
                MagicMock(scalar=MagicMock(return_value=20)),  # total
                MagicMock(scalar=MagicMock(return_value=12)),  # confirmed
                MagicMock(scalar=MagicMock(return_value=3)),  # dismissed
                MagicMock(scalar=MagicMock(return_value=0.72)),  # avg strength
                MagicMock(scalar=MagicMock(return_value=0.85)),  # avg confidence
                MagicMock(
                    all=MagicMock(return_value=[("validated", 15), ("discovered", 5)])
                ),  # by status
            ]
        )

        result = await correlation_stats(db=mock_db, _current_admin=mock_admin)

        assert result["total"] == 20
        assert result["confirmed"] == 12
        assert result["dismissed"] == 3
        assert result["pending"] == 5  # 20 - 12 - 3
        assert result["avg_strength"] == 0.72
        assert result["avg_confidence"] == 0.85
        assert result["by_status"] == {"validated": 15, "discovered": 5}

    @pytest.mark.asyncio
    async def test_correlation_stats_empty(self, mock_db, mock_admin):
        mock_db.execute = AsyncMock(
            side_effect=[
                MagicMock(scalar=MagicMock(return_value=0)),
                MagicMock(scalar=MagicMock(return_value=0)),
                MagicMock(scalar=MagicMock(return_value=0)),
                MagicMock(scalar=MagicMock(return_value=None)),  # avg_strength None
                MagicMock(scalar=MagicMock(return_value=None)),  # avg_confidence None
                MagicMock(all=MagicMock(return_value=[])),
            ]
        )

        result = await correlation_stats(db=mock_db, _current_admin=mock_admin)

        assert result["total"] == 0
        assert result["avg_strength"] == 0.0
        assert result["avg_confidence"] == 0.0


# ---------------------------------------------------------------------------
# Integrations
# ---------------------------------------------------------------------------


class TestListAllIntegrations:
    """GET /admin/journal/integrations"""

    @pytest.mark.asyncio
    async def test_list_integrations(self, mock_db, mock_admin):
        integrations = [_make_integration(), _make_integration(adapter_id="daylight")]
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = integrations

        mock_db.execute = AsyncMock(
            side_effect=[
                MagicMock(scalar=MagicMock(return_value=2)),
                MagicMock(scalars=MagicMock(return_value=scalars_mock)),
            ]
        )

        result = await list_all_integrations(db=mock_db, _current_admin=mock_admin)

        assert result["total"] == 2
        assert len(result["integrations"]) == 2

    @pytest.mark.asyncio
    async def test_list_integrations_with_adapter_filter(self, mock_db, mock_admin):
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = []

        mock_db.execute = AsyncMock(
            side_effect=[
                MagicMock(scalar=MagicMock(return_value=0)),
                MagicMock(scalars=MagicMock(return_value=scalars_mock)),
            ]
        )

        result = await list_all_integrations(
            db=mock_db, _current_admin=mock_admin, adapter_id="daylight"
        )

        assert result["total"] == 0

    @pytest.mark.asyncio
    async def test_integration_serialization(self, mock_db, mock_admin):
        intg = _make_integration()
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = [intg]

        mock_db.execute = AsyncMock(
            side_effect=[
                MagicMock(scalar=MagicMock(return_value=1)),
                MagicMock(scalars=MagicMock(return_value=scalars_mock)),
            ]
        )

        result = await list_all_integrations(db=mock_db, _current_admin=mock_admin)
        i = result["integrations"][0]

        assert i["id"] == str(intg.id)
        assert i["adapter_id"] == "openweathermap"
        assert i["sync_status"] == "success"
        assert i["sync_error"] is None


class TestIntegrationHealth:
    """GET /admin/journal/integrations/health"""

    @pytest.mark.asyncio
    async def test_integration_health(self, mock_db, mock_admin):
        mock_db.execute = AsyncMock(
            return_value=MagicMock(
                all=MagicMock(
                    return_value=[
                        ("openweathermap", 10, 9),  # 1 error
                        ("daylight", 5, 5),  # 0 errors
                    ]
                )
            )
        )

        result = await integration_health(db=mock_db, _current_admin=mock_admin)

        assert len(result["adapters"]) == 2
        weather = result["adapters"][0]
        assert weather["adapter_id"] == "openweathermap"
        assert weather["total_connections"] == 10
        assert weather["error_count"] == 1
        assert weather["error_rate"] == 0.1

        daylight = result["adapters"][1]
        assert daylight["error_count"] == 0
        assert daylight["error_rate"] == 0

    @pytest.mark.asyncio
    async def test_integration_health_empty(self, mock_db, mock_admin):
        mock_db.execute = AsyncMock(return_value=MagicMock(all=MagicMock(return_value=[])))

        result = await integration_health(db=mock_db, _current_admin=mock_admin)

        assert result["adapters"] == []


class TestForceDisconnect:
    """DELETE /admin/journal/integrations/{id}"""

    @pytest.mark.asyncio
    async def test_force_disconnect_success(self, mock_db, mock_admin):
        intg_id = uuid.uuid4()
        mock_db.execute = AsyncMock(return_value=MagicMock(rowcount=1))

        result = await force_disconnect_integration(
            integration_id=intg_id, db=mock_db, _current_admin=mock_admin
        )

        assert result["status"] == "disconnected"
        assert result["id"] == str(intg_id)
        mock_db.commit.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_force_disconnect_not_found(self, mock_db, mock_admin):
        intg_id = uuid.uuid4()
        mock_db.execute = AsyncMock(return_value=MagicMock(rowcount=0))

        with pytest.raises(HTTPException) as exc_info:
            await force_disconnect_integration(
                integration_id=intg_id, db=mock_db, _current_admin=mock_admin
            )

        assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# Stream Status
# ---------------------------------------------------------------------------


class TestStreamStatus:
    """GET /admin/journal/stream/status"""

    @pytest.mark.asyncio
    async def test_stream_status_nats_disabled(self, mock_admin):
        with patch("app.core.settings.settings") as mock_settings:
            mock_settings.nats_enabled = False

            result = await stream_status(_current_admin=mock_admin)

            assert result["nats_enabled"] is False
            assert result["connected"] is False

    @pytest.mark.asyncio
    async def test_stream_status_nats_enabled(self, mock_admin):
        with (
            patch("app.core.settings.settings") as mock_settings,
            patch.dict(
                "sys.modules",
                {"app.services.journal_service": MagicMock()},
            ),
        ):
            mock_settings.nats_enabled = True
            mock_settings.nats_stream_name = "LIFE_EVENTS"

            result = await stream_status(_current_admin=mock_admin)

            assert result["nats_enabled"] is True
            assert result["connected"] is True
            assert result["stream_name"] == "LIFE_EVENTS"

    @pytest.mark.asyncio
    async def test_stream_status_nats_disabled_message(self, mock_admin):
        with patch("app.core.settings.settings") as mock_settings:
            mock_settings.nats_enabled = False

            result = await stream_status(_current_admin=mock_admin)

            assert "not enabled" in result["message"].lower()
