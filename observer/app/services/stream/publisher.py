"""Journal Publisher — Publishes structured events to NATS JetStream.

Provides typed methods for publishing life events, emotional state
changes, and correlation results to the JOURNAL stream.

Subject hierarchy:
    journal.{user_id}.emotion      — Emotional state changes
    journal.{user_id}.event        — Life events (created/updated/deleted)
    journal.{user_id}.context      — Contextual data
    journal.{user_id}.correlation  — Correlation results
"""

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import UUID

from app.services.stream.client import nats_client

logger = logging.getLogger(__name__)


class JournalPublisher:
    """Publishes journal events to NATS JetStream.

    All methods are no-ops if NATS is not connected, enabling
    graceful degradation when NATS is unavailable.
    """

    def _subject(self, user_id: UUID, event_kind: str) -> str:
        """Build a NATS subject: journal.{user_id}.{kind}."""
        return f"journal.{user_id}.{event_kind}"

    def _payload(self, data: Dict[str, Any]) -> bytes:
        """JSON-encode a payload with timestamp."""
        data.setdefault("published_at", datetime.now(timezone.utc).isoformat())
        return json.dumps(data, default=str).encode("utf-8")

    async def publish_life_event(
        self,
        user_id: UUID,
        event_id: UUID,
        event_type: str,
        title: str,
        action: str = "created",
        *,
        event_data: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Publish a life event to the stream.

        Args:
            user_id: The user who owns this event
            event_id: UUID of the LifeEvent record
            event_type: e.g., "wellness.exercise"
            title: Human-readable event title
            action: "created", "updated", or "deleted"
            event_data: Additional event payload
        """
        if not nats_client.is_connected:
            return

        try:
            ack = await nats_client.jetstream.publish(
                self._subject(user_id, "event"),
                self._payload(
                    {
                        "action": action,
                        "event_id": str(event_id),
                        "event_type": event_type,
                        "title": title,
                        "user_id": str(user_id),
                        "event_data": event_data or {},
                    }
                ),
            )
            logger.debug(
                "Published life event to stream",
                extra={"seq": ack.seq, "event_id": str(event_id)},
            )
        except Exception:
            logger.exception("Failed to publish life event %s", event_id)

    async def publish_emotion_state(
        self,
        user_id: UUID,
        *,
        emotion_name: str,
        emotion_category: Optional[str] = None,
        vac_values: Optional[list] = None,
        session_id: Optional[UUID] = None,
        trajectory_id: Optional[UUID] = None,
    ) -> None:
        """Publish an emotional state change to the stream.

        This feeds the correlation engine, which watches for
        emotional shifts near life events.
        """
        if not nats_client.is_connected:
            return

        try:
            ack = await nats_client.jetstream.publish(
                self._subject(user_id, "emotion"),
                self._payload(
                    {
                        "user_id": str(user_id),
                        "emotion_name": emotion_name,
                        "emotion_category": emotion_category,
                        "vac_values": vac_values,
                        "session_id": str(session_id) if session_id else None,
                        "trajectory_id": str(trajectory_id) if trajectory_id else None,
                    }
                ),
            )
            logger.debug(
                "Published emotion state to stream",
                extra={"seq": ack.seq, "emotion": emotion_name},
            )
        except Exception:
            logger.exception("Failed to publish emotion state for user %s", user_id)

    async def publish_correlation(
        self,
        user_id: UUID,
        correlation_id: UUID,
        correlation_type: str,
        emotion_name: str,
        event_type: str,
        strength: float,
    ) -> None:
        """Publish a new or updated correlation to the stream."""
        if not nats_client.is_connected:
            return

        try:
            ack = await nats_client.jetstream.publish(
                self._subject(user_id, "correlation"),
                self._payload(
                    {
                        "user_id": str(user_id),
                        "correlation_id": str(correlation_id),
                        "correlation_type": correlation_type,
                        "emotion_name": emotion_name,
                        "event_type": event_type,
                        "strength": strength,
                    }
                ),
            )
            logger.debug(
                "Published correlation to stream",
                extra={"seq": ack.seq, "correlation_id": str(correlation_id)},
            )
        except Exception:
            logger.exception("Failed to publish correlation %s", correlation_id)


# Module-level singleton
journal_publisher = JournalPublisher()
