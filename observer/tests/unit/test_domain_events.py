from unittest.mock import AsyncMock

import pytest

from app.core.events import DomainEvent, EventBus


@pytest.mark.unit
class TestEventBus:

    @pytest.mark.asyncio
    async def test_emit_subscribe(self):
        """Test basic pub/sub mechanism."""
        bus = EventBus()
        handler = AsyncMock()

        bus.subscribe("test.event", handler)

        event = DomainEvent(
            event_type="test.event", actor_id=None, target_id=None, metadata={"foo": "bar"}
        )

        await bus.emit(event)

        handler.assert_called_once_with(event)

    @pytest.mark.asyncio
    async def test_subscribe_all(self):
        """Test global subscription."""
        bus = EventBus()
        handler = AsyncMock()

        bus.subscribe_all(handler)

        event = DomainEvent(event_type="any.event")
        await bus.emit(event)

        handler.assert_called_once_with(event)

    @pytest.mark.asyncio
    async def test_multiple_handlers(self):
        """Test multiple handlers for same event."""
        bus = EventBus()
        h1 = AsyncMock()
        h2 = AsyncMock()

        bus.subscribe("test.event", h1)
        bus.subscribe("test.event", h2)

        event = DomainEvent(event_type="test.event")
        await bus.emit(event)

        h1.assert_called_once()
        h2.assert_called_once()

    @pytest.mark.asyncio
    async def test_handler_error_safety(self):
        """Test that one handler failing doesn't stop others."""
        bus = EventBus()

        async def failing_handler(event):
            raise ValueError("Boom")

        success_handler = AsyncMock()

        bus.subscribe("test.event", failing_handler)
        bus.subscribe("test.event", success_handler)

        event = DomainEvent(event_type="test.event")

        # Should not raise exception
        await bus.emit(event)

        success_handler.assert_called_once()
