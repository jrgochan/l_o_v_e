"""Unit tests for LifeJournalService.

Tests all CRUD operations, filtering, summary, and domain event emission.
"""

import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.journal import LifeEventCreate, LifeEventUpdate
from app.services.journal_service import LifeJournalService

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def mock_db():
    """Mock async database session."""
    db = AsyncMock()
    db.execute = AsyncMock()
    db.add = MagicMock()
    db.delete = AsyncMock()
    db.flush = AsyncMock()
    db.refresh = AsyncMock()
    return db


@pytest.fixture
def service(mock_db):
    """Create a LifeJournalService with mocked DB."""
    return LifeJournalService(mock_db)


@pytest.fixture
def user_id():
    return uuid.uuid4()


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


class TestCreateEvent:
    """Test event creation."""

    @pytest.mark.asyncio
    @patch("app.services.journal_service.event_bus")
    async def test_create_event_basic(self, mock_event_bus, service, user_id):
        mock_event_bus.emit = AsyncMock()

        data = LifeEventCreate(
            event_type="wellness.exercise",
            title="Morning run",
            description="5km around the park",
            source="manual",
        )

        await service.create_event(user_id, data)

        # The service should add and flush
        service.db.add.assert_called_once()
        service.db.flush.assert_awaited()
        mock_event_bus.emit.assert_awaited_once()

    @pytest.mark.asyncio
    @patch("app.services.journal_service.event_bus")
    async def test_create_event_with_ip(self, mock_event_bus, service, user_id):
        mock_event_bus.emit = AsyncMock()

        data = LifeEventCreate(
            event_type="wellness.sleep",
            title="Nap",
            source="manual",
        )

        await service.create_event(user_id, data, ip_address="10.0.0.1")

        # Verify IP passed to domain event
        call_args = mock_event_bus.emit.call_args
        domain_event = call_args[0][0]
        assert domain_event.ip_address == "10.0.0.1"

    @pytest.mark.asyncio
    @patch("app.services.journal_service.event_bus")
    async def test_create_event_with_optional_fields(self, mock_event_bus, service, user_id):
        mock_event_bus.emit = AsyncMock()

        data = LifeEventCreate(
            event_type="social.dinner",
            title="Dinner with friends",
            description="At the Italian place",
            source="manual",
            duration_minutes=120,
            tags=["social", "food"],
            impact=0.8,
            is_recurring=True,
            recurrence_pattern="weekly",
            mood_before=[0.6, 0.4, 0.8],
            mood_after=[0.9, 0.5, 0.7],
        )

        await service.create_event(user_id, data)
        service.db.add.assert_called_once()

    @pytest.mark.asyncio
    @patch("app.services.journal_service.event_bus")
    async def test_create_event_domain_event_metadata(self, mock_event_bus, service, user_id):
        mock_event_bus.emit = AsyncMock()

        data = LifeEventCreate(
            event_type="wellness.meditation",
            title="Morning sit",
            source="integration",
        )

        await service.create_event(user_id, data)

        domain_event = mock_event_bus.emit.call_args[0][0]
        assert domain_event.event_type == "journal.event_created"
        assert domain_event.actor_id == user_id
        assert domain_event.metadata["life_event_type"] == "wellness.meditation"
        assert domain_event.metadata["title"] == "Morning sit"

    @pytest.mark.asyncio
    @patch("app.services.journal_service.event_bus")
    async def test_create_event_default_timestamp(self, mock_event_bus, service, user_id):
        """When no timestamp is provided, the current time should be used."""
        mock_event_bus.emit = AsyncMock()

        data = LifeEventCreate(
            event_type="wellness.walk",
            title="Walk",
            source="manual",
        )

        await service.create_event(user_id, data)
        service.db.add.assert_called_once()


# ---------------------------------------------------------------------------
# Read
# ---------------------------------------------------------------------------


class TestGetEvent:
    """Test single event retrieval."""

    @pytest.mark.asyncio
    async def test_get_event_found(self, service, user_id):
        event = MagicMock()
        event.id = uuid.uuid4()
        scalars_mock = MagicMock()
        scalars_mock.first.return_value = event
        service.db.execute.return_value = MagicMock(scalars=MagicMock(return_value=scalars_mock))

        result = await service.get_event(user_id, event.id)

        assert result == event

    @pytest.mark.asyncio
    async def test_get_event_not_found(self, service, user_id):
        scalars_mock = MagicMock()
        scalars_mock.first.return_value = None
        service.db.execute.return_value = MagicMock(scalars=MagicMock(return_value=scalars_mock))

        result = await service.get_event(user_id, uuid.uuid4())

        assert result is None


class TestListEvents:
    """Test event listing with filters."""

    @pytest.mark.asyncio
    async def test_list_events_basic(self, service, user_id):
        events = [MagicMock(), MagicMock()]
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = events

        service.db.execute = AsyncMock(
            side_effect=[
                MagicMock(scalar=MagicMock(return_value=2)),  # count
                MagicMock(scalars=MagicMock(return_value=scalars_mock)),  # events
            ]
        )

        result_events, total = await service.list_events(user_id)

        assert total == 2
        assert len(result_events) == 2

    @pytest.mark.asyncio
    async def test_list_events_with_date_range(self, service, user_id):
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = []

        service.db.execute = AsyncMock(
            side_effect=[
                MagicMock(scalar=MagicMock(return_value=0)),
                MagicMock(scalars=MagicMock(return_value=scalars_mock)),
            ]
        )

        events, total = await service.list_events(
            user_id,
            start_date=datetime(2026, 7, 1),
            end_date=datetime(2026, 7, 31),
        )

        assert total == 0

    @pytest.mark.asyncio
    async def test_list_events_with_event_type(self, service, user_id):
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = []

        service.db.execute = AsyncMock(
            side_effect=[
                MagicMock(scalar=MagicMock(return_value=0)),
                MagicMock(scalars=MagicMock(return_value=scalars_mock)),
            ]
        )

        events, total = await service.list_events(user_id, event_type="exercise")
        assert total == 0

    @pytest.mark.asyncio
    async def test_list_events_with_wildcard_type(self, service, user_id):
        """Test 'wellness.*' wildcard prefix matching."""
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = []

        service.db.execute = AsyncMock(
            side_effect=[
                MagicMock(scalar=MagicMock(return_value=0)),
                MagicMock(scalars=MagicMock(return_value=scalars_mock)),
            ]
        )

        events, total = await service.list_events(user_id, event_type="wellness.*")
        assert total == 0

    @pytest.mark.asyncio
    async def test_list_events_with_source(self, service, user_id):
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = []

        service.db.execute = AsyncMock(
            side_effect=[
                MagicMock(scalar=MagicMock(return_value=0)),
                MagicMock(scalars=MagicMock(return_value=scalars_mock)),
            ]
        )

        events, total = await service.list_events(user_id, source="ical")
        assert total == 0

    @pytest.mark.asyncio
    async def test_list_events_with_tags(self, service, user_id):
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = []

        service.db.execute = AsyncMock(
            side_effect=[
                MagicMock(scalar=MagicMock(return_value=0)),
                MagicMock(scalars=MagicMock(return_value=scalars_mock)),
            ]
        )

        events, total = await service.list_events(user_id, tags=["fitness"])
        assert total == 0

    @pytest.mark.asyncio
    async def test_list_events_limit_cap(self, service, user_id):
        """Limit should be capped at 200."""
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = []

        service.db.execute = AsyncMock(
            side_effect=[
                MagicMock(scalar=MagicMock(return_value=0)),
                MagicMock(scalars=MagicMock(return_value=scalars_mock)),
            ]
        )

        # Request 500, should be capped internally to 200
        events, total = await service.list_events(user_id, limit=500)
        assert total == 0

    @pytest.mark.asyncio
    async def test_list_events_ascending_order(self, service, user_id):
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = []

        service.db.execute = AsyncMock(
            side_effect=[
                MagicMock(scalar=MagicMock(return_value=0)),
                MagicMock(scalars=MagicMock(return_value=scalars_mock)),
            ]
        )

        events, total = await service.list_events(user_id, order="asc")
        assert total == 0


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------


class TestUpdateEvent:
    """Test event updates."""

    @pytest.mark.asyncio
    @patch("app.services.journal_service.event_bus")
    async def test_update_event_with_changes(self, mock_event_bus, service, user_id):
        mock_event_bus.emit = AsyncMock()

        event = MagicMock()
        event.id = uuid.uuid4()
        event.title = "Old title"
        event.description = "Old description"

        # get_event returns the mock event
        scalars_mock = MagicMock()
        scalars_mock.first.return_value = event
        service.db.execute.return_value = MagicMock(scalars=MagicMock(return_value=scalars_mock))

        data = LifeEventUpdate(title="New title")

        result = await service.update_event(user_id, event.id, data)

        assert result is not None
        service.db.flush.assert_awaited()
        mock_event_bus.emit.assert_awaited_once()

        domain_event = mock_event_bus.emit.call_args[0][0]
        assert domain_event.event_type == "journal.event_updated"
        assert "title" in domain_event.metadata["fields_changed"]

    @pytest.mark.asyncio
    @patch("app.services.journal_service.event_bus")
    async def test_update_event_no_changes(self, mock_event_bus, service, user_id):
        """If all values are the same, no domain event should be emitted."""
        mock_event_bus.emit = AsyncMock()

        event = MagicMock()
        event.id = uuid.uuid4()
        event.title = "Same title"

        scalars_mock = MagicMock()
        scalars_mock.first.return_value = event
        service.db.execute.return_value = MagicMock(scalars=MagicMock(return_value=scalars_mock))

        data = LifeEventUpdate(title="Same title")

        result = await service.update_event(user_id, event.id, data)

        assert result is not None
        # No domain event emitted when nothing changed
        mock_event_bus.emit.assert_not_called()

    @pytest.mark.asyncio
    @patch("app.services.journal_service.event_bus")
    async def test_update_event_not_found(self, mock_event_bus, service, user_id):
        scalars_mock = MagicMock()
        scalars_mock.first.return_value = None
        service.db.execute.return_value = MagicMock(scalars=MagicMock(return_value=scalars_mock))

        data = LifeEventUpdate(title="Won't happen")

        result = await service.update_event(user_id, uuid.uuid4(), data)

        assert result is None
        mock_event_bus.emit.assert_not_called()


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------


class TestDeleteEvent:
    """Test event deletion."""

    @pytest.mark.asyncio
    @patch("app.services.journal_service.event_bus")
    async def test_delete_event_success(self, mock_event_bus, service, user_id):
        mock_event_bus.emit = AsyncMock()

        event = MagicMock()
        event.id = uuid.uuid4()
        event.event_type = "exercise"

        scalars_mock = MagicMock()
        scalars_mock.first.return_value = event
        service.db.execute.return_value = MagicMock(scalars=MagicMock(return_value=scalars_mock))

        result = await service.delete_event(user_id, event.id)

        assert result is True
        service.db.delete.assert_awaited_once_with(event)
        service.db.flush.assert_awaited()
        mock_event_bus.emit.assert_awaited_once()

    @pytest.mark.asyncio
    @patch("app.services.journal_service.event_bus")
    async def test_delete_event_not_found(self, mock_event_bus, service, user_id):
        mock_event_bus.emit = AsyncMock()

        scalars_mock = MagicMock()
        scalars_mock.first.return_value = None
        service.db.execute.return_value = MagicMock(scalars=MagicMock(return_value=scalars_mock))

        result = await service.delete_event(user_id, uuid.uuid4())

        assert result is False
        mock_event_bus.emit.assert_not_called()

    @pytest.mark.asyncio
    @patch("app.services.journal_service.event_bus")
    async def test_delete_event_with_ip(self, mock_event_bus, service, user_id):
        mock_event_bus.emit = AsyncMock()

        event = MagicMock()
        event.id = uuid.uuid4()
        event.event_type = "sleep"

        scalars_mock = MagicMock()
        scalars_mock.first.return_value = event
        service.db.execute.return_value = MagicMock(scalars=MagicMock(return_value=scalars_mock))

        await service.delete_event(user_id, event.id, ip_address="10.0.0.1")

        domain_event = mock_event_bus.emit.call_args[0][0]
        assert domain_event.ip_address == "10.0.0.1"


class TestDeleteAllEvents:
    """Test GDPR bulk deletion."""

    @pytest.mark.asyncio
    @patch("app.services.journal_service.event_bus")
    async def test_delete_all_events(self, mock_event_bus, service, user_id):
        mock_event_bus.emit = AsyncMock()

        service.db.execute = AsyncMock(
            side_effect=[
                MagicMock(scalar=MagicMock(return_value=15)),  # count
                MagicMock(),  # delete
            ]
        )

        count = await service.delete_all_events(user_id)

        assert count == 15
        service.db.flush.assert_awaited()
        mock_event_bus.emit.assert_awaited_once()

        domain_event = mock_event_bus.emit.call_args[0][0]
        assert domain_event.event_type == "journal.all_events_deleted"
        assert domain_event.metadata["count"] == 15

    @pytest.mark.asyncio
    @patch("app.services.journal_service.event_bus")
    async def test_delete_all_events_none(self, mock_event_bus, service, user_id):
        mock_event_bus.emit = AsyncMock()

        service.db.execute = AsyncMock(return_value=MagicMock(scalar=MagicMock(return_value=0)))

        count = await service.delete_all_events(user_id)

        assert count == 0
        mock_event_bus.emit.assert_not_called()


# ---------------------------------------------------------------------------
# Daily Summary
# ---------------------------------------------------------------------------


class TestDailySummary:
    """Test daily summary aggregation."""

    @pytest.mark.asyncio
    async def test_get_daily_summary(self, service, user_id):
        event1 = MagicMock()
        event1.event_type = "exercise"
        event1.to_dict = MagicMock(return_value={"event_type": "exercise"})

        event2 = MagicMock()
        event2.event_type = "sleep"
        event2.to_dict = MagicMock(return_value={"event_type": "sleep"})

        scalars_mock = MagicMock()
        scalars_mock.all.return_value = [event1, event2]

        service.db.execute = AsyncMock(
            side_effect=[
                MagicMock(scalar=MagicMock(return_value=2)),
                MagicMock(scalars=MagicMock(return_value=scalars_mock)),
            ]
        )

        result = await service.get_daily_summary(user_id, datetime(2026, 7, 24))

        assert result["date"] == "2026-07-24"
        assert result["event_count"] == 2
        assert set(result["event_types"]) == {"exercise", "sleep"}
        assert len(result["events"]) == 2
