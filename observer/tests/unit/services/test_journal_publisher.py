"""Unit tests for JournalPublisher.

Tests subject construction, payload encoding, and all publish methods
with both connected and disconnected NATS states.
"""

import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.stream.publisher import JournalPublisher

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def publisher():
    return JournalPublisher()


@pytest.fixture
def user_id():
    return uuid.uuid4()


# ---------------------------------------------------------------------------
# Internal Methods
# ---------------------------------------------------------------------------


class TestSubjectAndPayload:
    """Test _subject and _payload helper methods."""

    def test_subject_construction(self, publisher, user_id):
        subject = publisher._subject(user_id, "event")
        assert subject == f"journal.{user_id}.event"

    def test_subject_correlation(self, publisher, user_id):
        subject = publisher._subject(user_id, "correlation")
        assert subject == f"journal.{user_id}.correlation"

    def test_payload_encoding(self, publisher):
        data = {"key": "value", "count": 42}
        payload = publisher._payload(data)
        decoded = json.loads(payload)
        assert decoded["key"] == "value"
        assert decoded["count"] == 42
        assert "published_at" in decoded

    def test_payload_preserves_existing_timestamp(self, publisher):
        data = {"published_at": "2026-01-01T00:00:00Z"}
        payload = publisher._payload(data)
        decoded = json.loads(payload)
        assert decoded["published_at"] == "2026-01-01T00:00:00Z"


# ---------------------------------------------------------------------------
# publish_life_event
# ---------------------------------------------------------------------------


class TestPublishLifeEvent:
    """Test publishing life events."""

    @pytest.mark.asyncio
    @patch("app.services.stream.publisher.nats_client")
    async def test_publish_when_connected(self, mock_client, publisher, user_id):
        mock_client.is_connected = True
        mock_client.jetstream = MagicMock()
        mock_client.jetstream.publish = AsyncMock(return_value=MagicMock(seq=1))

        event_id = uuid.uuid4()
        await publisher.publish_life_event(
            user_id=user_id,
            event_id=event_id,
            event_type="exercise",
            title="Morning run",
        )

        mock_client.jetstream.publish.assert_awaited_once()
        args = mock_client.jetstream.publish.call_args
        assert f"journal.{user_id}.event" == args[0][0]

    @pytest.mark.asyncio
    @patch("app.services.stream.publisher.nats_client")
    async def test_publish_when_disconnected(self, mock_client, publisher, user_id):
        mock_client.is_connected = False

        await publisher.publish_life_event(
            user_id=user_id,
            event_id=uuid.uuid4(),
            event_type="exercise",
            title="Run",
        )

        # Should not attempt to publish
        assert not hasattr(mock_client, "jetstream") or not mock_client.jetstream.publish.called

    @pytest.mark.asyncio
    @patch("app.services.stream.publisher.nats_client")
    async def test_publish_with_event_data(self, mock_client, publisher, user_id):
        mock_client.is_connected = True
        mock_client.jetstream = MagicMock()
        mock_client.jetstream.publish = AsyncMock(return_value=MagicMock(seq=2))

        await publisher.publish_life_event(
            user_id=user_id,
            event_id=uuid.uuid4(),
            event_type="social",
            title="Dinner",
            action="updated",
            event_data={"location": "restaurant"},
        )

        payload = mock_client.jetstream.publish.call_args[0][1]
        decoded = json.loads(payload)
        assert decoded["action"] == "updated"
        assert decoded["event_data"]["location"] == "restaurant"

    @pytest.mark.asyncio
    @patch("app.services.stream.publisher.nats_client")
    async def test_publish_handles_exception(self, mock_client, publisher, user_id):
        """Exceptions should be caught and logged, not raised."""
        mock_client.is_connected = True
        mock_client.jetstream = MagicMock()
        mock_client.jetstream.publish = AsyncMock(side_effect=RuntimeError("NATS error"))

        # Should not raise
        await publisher.publish_life_event(
            user_id=user_id,
            event_id=uuid.uuid4(),
            event_type="exercise",
            title="Run",
        )


# ---------------------------------------------------------------------------
# publish_emotion_state
# ---------------------------------------------------------------------------


class TestPublishEmotionState:
    """Test publishing emotion state changes."""

    @pytest.mark.asyncio
    @patch("app.services.stream.publisher.nats_client")
    async def test_publish_emotion(self, mock_client, publisher, user_id):
        mock_client.is_connected = True
        mock_client.jetstream = MagicMock()
        mock_client.jetstream.publish = AsyncMock(return_value=MagicMock(seq=3))

        await publisher.publish_emotion_state(
            user_id,
            emotion_name="Joy",
            emotion_category="positive",
            vac_values=[0.8, 0.6, 0.7],
        )

        payload = mock_client.jetstream.publish.call_args[0][1]
        decoded = json.loads(payload)
        assert decoded["emotion_name"] == "Joy"
        assert decoded["vac_values"] == [0.8, 0.6, 0.7]

    @pytest.mark.asyncio
    @patch("app.services.stream.publisher.nats_client")
    async def test_publish_emotion_disconnected(self, mock_client, publisher, user_id):
        mock_client.is_connected = False

        await publisher.publish_emotion_state(
            user_id,
            emotion_name="Joy",
        )

    @pytest.mark.asyncio
    @patch("app.services.stream.publisher.nats_client")
    async def test_publish_emotion_with_session(self, mock_client, publisher, user_id):
        mock_client.is_connected = True
        mock_client.jetstream = MagicMock()
        mock_client.jetstream.publish = AsyncMock(return_value=MagicMock(seq=4))

        session_id = uuid.uuid4()
        trajectory_id = uuid.uuid4()
        await publisher.publish_emotion_state(
            user_id,
            emotion_name="Calm",
            session_id=session_id,
            trajectory_id=trajectory_id,
        )

        payload = mock_client.jetstream.publish.call_args[0][1]
        decoded = json.loads(payload)
        assert decoded["session_id"] == str(session_id)
        assert decoded["trajectory_id"] == str(trajectory_id)

    @pytest.mark.asyncio
    @patch("app.services.stream.publisher.nats_client")
    async def test_publish_emotion_handles_exception(self, mock_client, publisher, user_id):
        mock_client.is_connected = True
        mock_client.jetstream = MagicMock()
        mock_client.jetstream.publish = AsyncMock(side_effect=RuntimeError("NATS error"))

        await publisher.publish_emotion_state(
            user_id,
            emotion_name="Joy",
        )


# ---------------------------------------------------------------------------
# publish_correlation
# ---------------------------------------------------------------------------


class TestPublishCorrelation:
    """Test publishing correlation results."""

    @pytest.mark.asyncio
    @patch("app.services.stream.publisher.nats_client")
    async def test_publish_correlation(self, mock_client, publisher, user_id):
        mock_client.is_connected = True
        mock_client.jetstream = MagicMock()
        mock_client.jetstream.publish = AsyncMock(return_value=MagicMock(seq=5))

        corr_id = uuid.uuid4()
        await publisher.publish_correlation(
            user_id=user_id,
            correlation_id=corr_id,
            correlation_type="temporal_proximity",
            emotion_name="Joy",
            event_type="exercise",
            strength=0.85,
        )

        args = mock_client.jetstream.publish.call_args
        assert f"journal.{user_id}.correlation" == args[0][0]

        payload = json.loads(args[0][1])
        assert payload["correlation_type"] == "temporal_proximity"
        assert payload["strength"] == 0.85

    @pytest.mark.asyncio
    @patch("app.services.stream.publisher.nats_client")
    async def test_publish_correlation_disconnected(self, mock_client, publisher, user_id):
        mock_client.is_connected = False

        await publisher.publish_correlation(
            user_id=user_id,
            correlation_id=uuid.uuid4(),
            correlation_type="temporal",
            emotion_name="Joy",
            event_type="exercise",
            strength=0.5,
        )

    @pytest.mark.asyncio
    @patch("app.services.stream.publisher.nats_client")
    async def test_publish_correlation_handles_exception(self, mock_client, publisher, user_id):
        mock_client.is_connected = True
        mock_client.jetstream = MagicMock()
        mock_client.jetstream.publish = AsyncMock(side_effect=RuntimeError("NATS error"))

        await publisher.publish_correlation(
            user_id=user_id,
            correlation_id=uuid.uuid4(),
            correlation_type="temporal",
            emotion_name="Joy",
            event_type="exercise",
            strength=0.5,
        )
