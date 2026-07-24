"""EventBus → NATS Bridge — Republishes domain events to the NATS stream.

Subscribes to the in-process EventBus and forwards journal-related
events to NATS JetStream. This bridges the synchronous, in-process
event system with the persistent, distributed stream.

The existing EventBus is NOT modified — this is purely additive.
"""

import logging
from uuid import UUID

from app.core.events import DomainEvent, event_bus
from app.services.stream.publisher import journal_publisher

logger = logging.getLogger(__name__)

# Event types that should be bridged to NATS
BRIDGED_PREFIXES = (
    "journal.",  # Life Journal CRUD events
    "trajectory.",  # Emotional trajectory events
)


async def _bridge_handler(event: DomainEvent) -> None:
    """Forward domain events to NATS JetStream.

    Only events matching BRIDGED_PREFIXES are forwarded.
    Requires an actor_id (user_id) to route to the correct subject.
    """
    if not any(event.event_type.startswith(prefix) for prefix in BRIDGED_PREFIXES):
        return

    if event.actor_id is None:
        logger.debug("Skipping bridge for event '%s' — no actor_id", event.event_type)
        return

    user_id = event.actor_id

    # Route by event type
    if event.event_type.startswith("journal.event_"):
        # Life event CRUD
        action = event.event_type.replace("journal.event_", "")
        await journal_publisher.publish_life_event(
            user_id=user_id,
            event_id=event.target_id or UUID(int=0),
            event_type=event.metadata.get("life_event_type", "unknown"),
            title=event.metadata.get("title", ""),
            action=action,
            event_data=event.metadata,
        )

    elif event.event_type.startswith("trajectory."):
        # Emotional state changes
        await journal_publisher.publish_emotion_state(
            user_id=user_id,
            emotion_name=event.metadata.get("emotion_name", "unknown"),
            emotion_category=event.metadata.get("emotion_category"),
            vac_values=event.metadata.get("vac_values"),
            session_id=event.metadata.get("session_id"),
            trajectory_id=event.target_id,
        )


class EventBusBridge:
    """Registers the NATS bridge handler on the EventBus.

    Call `register()` at app startup to start bridging events.
    """

    _registered: bool = False

    @classmethod
    def register(cls) -> None:
        """Subscribe the bridge handler to all domain events."""
        if cls._registered:
            return

        event_bus.subscribe_all(_bridge_handler)
        cls._registered = True
        logger.info("EventBus → NATS bridge registered")

    @classmethod
    def is_registered(cls) -> bool:
        """Check if the bridge is active."""
        return cls._registered
