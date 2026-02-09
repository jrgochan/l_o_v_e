"""Socket Types.

Data structures and types for WebSocket handling.
"""

from dataclasses import dataclass
from typing import Any, Dict, Optional
from uuid import UUID

from fastapi import WebSocket


@dataclass
class UserContext:
    """Encapsulates user-related context."""

    identifier: str = "guest"
    auth_user_id: Optional[UUID] = None
    tone_preference: str = "warm"


@dataclass
class MessageContext:
    """Encapsulates context for processing a WebSocket message."""

    session_id: str
    websocket: WebSocket
    user: UserContext
    deep_feeling_enabled: bool = False

    # Relationship linking
    related_message_id: Optional[UUID] = None
    relationship_type: Optional[str] = None
    relationship_metadata: Optional[Dict[str, Any]] = None
