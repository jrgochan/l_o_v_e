"""Unit tests for NATS stream infrastructure."""

from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest

from app.core.events import DomainEvent
from app.services.stream.bridge import BRIDGED_PREFIXES, EventBusBridge, _bridge_handler
from app.services.stream.client import NATSClient
from app.services.stream.publisher import JournalPublisher


class TestNATSClient:
    """Test the NATS client connection manager."""

    def test_initial_state(self) -> None:
        """Client starts disconnected."""
        client = NATSClient()
        assert not client.is_connected
        assert client._nc is None
        assert client._js is None

    def test_jetstream_raises_when_not_connected(self) -> None:
        """Accessing jetstream before connect raises RuntimeError."""
        client = NATSClient()
        with pytest.raises(RuntimeError, match="not connected"):
            _ = client.jetstream

    def test_nc_raises_when_not_connected(self) -> None:
        """Accessing nc before connect raises RuntimeError."""
        client = NATSClient()
        with pytest.raises(RuntimeError, match="not connected"):
            _ = client.nc


class TestJournalPublisher:
    """Test the journal publisher (without actual NATS)."""

    def test_subject_format(self) -> None:
        """Test subject hierarchy format."""
        pub = JournalPublisher()
        user_id = uuid4()
        subject = pub._subject(user_id, "emotion")
        assert subject == f"journal.{user_id}.emotion"

    def test_subject_event(self) -> None:
        """Test event subject."""
        pub = JournalPublisher()
        user_id = uuid4()
        subject = pub._subject(user_id, "event")
        assert subject == f"journal.{user_id}.event"

    def test_payload_includes_timestamp(self) -> None:
        """Test that payload includes published_at timestamp."""
        pub = JournalPublisher()
        payload = pub._payload({"key": "value"})
        import json

        data = json.loads(payload)
        assert "published_at" in data
        assert data["key"] == "value"

    def test_payload_preserves_existing_timestamp(self) -> None:
        """Don't overwrite an existing published_at."""
        pub = JournalPublisher()
        payload = pub._payload({"published_at": "2024-01-01T00:00:00"})
        import json

        data = json.loads(payload)
        assert data["published_at"] == "2024-01-01T00:00:00"

    @pytest.mark.asyncio
    async def test_publish_noop_when_disconnected(self) -> None:
        """Publishing should be a no-op when NATS is disconnected."""
        pub = JournalPublisher()
        # Should not raise — just no-ops
        await pub.publish_life_event(
            user_id=uuid4(),
            event_id=uuid4(),
            event_type="wellness.exercise",
            title="Morning run",
        )

    @pytest.mark.asyncio
    async def test_publish_emotion_noop_when_disconnected(self) -> None:
        """Emotion publishing should be a no-op when disconnected."""
        pub = JournalPublisher()
        await pub.publish_emotion_state(
            user_id=uuid4(),
            emotion_name="Joy",
        )

    @pytest.mark.asyncio
    async def test_publish_correlation_noop_when_disconnected(self) -> None:
        """Correlation publishing should be a no-op when disconnected."""
        pub = JournalPublisher()
        await pub.publish_correlation(
            user_id=uuid4(),
            correlation_id=uuid4(),
            correlation_type="temporal_proximity",
            emotion_name="Anxiety",
            event_type="wellness.substance",
            strength=0.67,
        )


class TestEventBusBridge:
    """Test the EventBus → NATS bridge."""

    def test_bridged_prefixes(self) -> None:
        """Verify bridged event prefixes."""
        assert "journal." in BRIDGED_PREFIXES
        assert "trajectory." in BRIDGED_PREFIXES

    @pytest.mark.asyncio
    async def test_non_journal_events_skipped(self) -> None:
        """Non-journal events should not trigger publishing."""
        event = DomainEvent(
            event_type="user.profile_updated",
            actor_id=uuid4(),
        )
        # Should not raise — just skips
        await _bridge_handler(event)

    @pytest.mark.asyncio
    async def test_no_actor_id_skipped(self) -> None:
        """Events without actor_id should be skipped."""
        event = DomainEvent(
            event_type="journal.event_created",
            actor_id=None,
        )
        await _bridge_handler(event)

    @pytest.mark.asyncio
    async def test_journal_event_forwards(self) -> None:
        """Journal events with actor_id should call publisher."""
        user_id = uuid4()
        event_id = uuid4()
        event = DomainEvent(
            event_type="journal.event_created",
            actor_id=user_id,
            target_id=event_id,
            metadata={
                "life_event_type": "wellness.exercise",
                "title": "Morning run",
            },
        )

        with patch("app.services.stream.bridge.journal_publisher") as mock_publisher:
            mock_publisher.publish_life_event = AsyncMock()
            await _bridge_handler(event)
            mock_publisher.publish_life_event.assert_called_once()

    @pytest.mark.asyncio
    async def test_trajectory_event_forwards(self) -> None:
        """Trajectory events should forward to emotion publisher."""
        user_id = uuid4()
        event = DomainEvent(
            event_type="trajectory.state_recorded",
            actor_id=user_id,
            metadata={
                "emotion_name": "Joy",
                "emotion_category": "When Things Are Good",
                "vac_values": [0.8, 0.5, 0.6],
            },
        )

        with patch("app.services.stream.bridge.journal_publisher") as mock_publisher:
            mock_publisher.publish_emotion_state = AsyncMock()
            await _bridge_handler(event)
            mock_publisher.publish_emotion_state.assert_called_once()

    def test_register_idempotent(self) -> None:
        """Calling register() twice should not double-subscribe."""
        # Reset state
        EventBusBridge._registered = False
        EventBusBridge.register()
        assert EventBusBridge.is_registered()
        EventBusBridge.register()  # Should be a no-op
        assert EventBusBridge.is_registered()
        # Reset for other tests
        EventBusBridge._registered = False
