"""Domain Event Bus — Lightweight event system for cross-cutting concerns.

Enables loose coupling between features. Actions emit events; any module can
subscribe to react (audit logging, notifications, cache invalidation, etc.).

Usage:
    from app.core.events import event_bus, DomainEvent

    # Subscribe (typically at app startup)
    event_bus.subscribe("user.profile_updated", my_handler)

    # Emit (from service layer)
    await event_bus.emit(DomainEvent(
        event_type="user.profile_updated",
        actor_id=user.id,
        metadata={"field": "email", "old": old, "new": new},
    ))
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Coroutine, Dict, List, Optional
from uuid import UUID

logger = logging.getLogger(__name__)

# Type alias for async event handlers
EventHandler = Callable[["DomainEvent"], Coroutine[Any, Any, None]]


@dataclass
class DomainEvent:
    """A domain event representing something that happened in the system."""

    event_type: str
    actor_id: Optional[UUID] = None
    target_id: Optional[UUID] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    ip_address: Optional[str] = None


class EventBus:
    """Simple async event bus with topic-based subscriptions.

    Designed to be lightweight and in-process. For distributed events,
    replace this with Redis pub/sub or a message queue in the future.
    """

    def __init__(self) -> None:
        """Initialize the event bus with empty handlers."""
        self._handlers: Dict[str, List[EventHandler]] = {}
        self._global_handlers: List[EventHandler] = []

    def subscribe(self, event_type: str, handler: EventHandler) -> None:
        """Subscribe a handler to a specific event type."""
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)
        logger.debug("Subscribed handler %s to event '%s'", handler.__name__, event_type)

    def subscribe_all(self, handler: EventHandler) -> None:
        """Subscribe a handler to ALL events (e.g., audit logging)."""
        self._global_handlers.append(handler)
        logger.debug("Subscribed global handler %s", handler.__name__)

    async def emit(self, event: DomainEvent) -> None:
        """Emit an event, invoking all matching handlers.

        Handlers are called sequentially. Errors are logged but do not
        prevent other handlers from executing (fire-and-forget pattern).
        """
        handlers = self._global_handlers + self._handlers.get(event.event_type, [])

        for handler in handlers:
            try:
                await handler(event)
            except Exception:  # pylint: disable=broad-except
                logger.exception(
                    "Event handler %s failed for event '%s'",
                    handler.__name__,
                    event.event_type,
                )


# Global singleton — imported by services
event_bus = EventBus()
