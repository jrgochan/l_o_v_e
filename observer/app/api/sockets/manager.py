"""Module documentation."""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import UUID

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections and session state.

    Handles the lifecycle of WebSocket connections, including acceptance,
    disconnection, and mapping between ephemeral WebSocket session IDs and
    persistent database session UUIDs. Supports multi-device connections per user.

    Attributes:
        active_connections: Map of session_id (str) -> WebSocket instance.
        session_mapping: Map of session_id (str) -> db_session_id (UUID).
        user_connections: Map of user_id (str) -> Set of session_ids (str).
        session_user_mapping: Map of session_id (str) -> user_id (str).
    """

    def __init__(self) -> None:
        """Initialize the connection manager with empty registries."""
        self.active_connections: Dict[str, WebSocket] = {}
        self.session_mapping: Dict[str, UUID] = {}  # Maps string session_id to UUID
        self.user_connections: Dict[str, set[str]] = {}  # Maps user_id to session_ids
        self.session_user_mapping: Dict[str, str] = {}  # Maps session_id to user_id

    async def connect(
        self, session_id: str, websocket: WebSocket, user_id: Optional[UUID] = None
    ) -> None:
        """Accept a new WebSocket connection and register it.

        Args:
            session_id: Unique string identifier for the WebSocket session.
            websocket: The FastAPI WebSocket instance.
            user_id: Optional authenticated user ID.
        """
        await websocket.accept()
        self.active_connections[session_id] = websocket

        if user_id:
            user_id_str = str(user_id)
            if user_id_str not in self.user_connections:
                self.user_connections[user_id_str] = set()
            self.user_connections[user_id_str].add(session_id)
            self.session_user_mapping[session_id] = user_id_str

        logger.info("WebSocket connected for session %s (User: %s)", session_id, user_id)

    def set_db_session(self, session_id: str, db_session_id: UUID) -> None:
        """Link a WebSocket session to a persisted Database ChatSession.

        Args:
            session_id: The ephemeral WebSocket session ID.
            db_session_id: The persistent Database ChatSession UUID.
        """
        self.session_mapping[session_id] = db_session_id

    def get_db_session(self, session_id: str) -> Optional[UUID]:
        """Retrieve the Database Session ID for a given WebSocket session.

        Args:
            session_id: The WebSocket session ID to lookup.

        Returns:
            UUID of the database session if mapped, else None.
        """
        return self.session_mapping.get(session_id)

    def disconnect(self, session_id: str) -> None:
        """Clean up connection state upon disconnect.

        Removes the socket from active connections and clears any session mappings.

        Args:
            session_id: The session ID to remove.
        """
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        if session_id in self.session_mapping:
            del self.session_mapping[session_id]

        # Clean up user mapping
        if session_id in self.session_user_mapping:
            user_id = self.session_user_mapping[session_id]
            if user_id in self.user_connections:
                self.user_connections[user_id].discard(session_id)
                if not self.user_connections[user_id]:
                    del self.user_connections[user_id]
            del self.session_user_mapping[session_id]

        logger.info("WebSocket disconnected for session %s", session_id)

    async def send_message(self, session_id: str, message: Dict[str, object]) -> None:
        """Send a JSON message to a specific client.

        Args:
            session_id: The target session ID.
            message: Dictionary to be serialized as JSON.
        """
        if session_id in self.active_connections:
            try:
                await self.active_connections[session_id].send_json(message)
            except RuntimeError as e:
                # Often raised if connection is already closed
                logger.warning("Connection lost for session %s: %s", session_id, e)
                # Cleanup if necessary, though handler usually does this
            except Exception as e:  # pylint: disable=broad-exception-caught
                logger.error("Failed to send message to session %s: %s", session_id, e)

    async def send_text(self, session_id: str, text: str) -> None:
        """Send a raw text message to a specific client.

        Args:
            session_id: The target session ID.
            text: The string content to send.
        """
        if session_id in self.active_connections:
            try:
                await self.active_connections[session_id].send_text(text)
            except RuntimeError as e:
                logger.warning("Connection lost for session %s: %s", session_id, e)
            except Exception as e:  # pylint: disable=broad-exception-caught
                logger.error("Failed to send text to session %s: %s", session_id, e)

    async def send_to_user(self, user_id: str, message: Dict[str, Any]) -> None:
        """Send a message to all connections for a specific user.

        Args:
            user_id: The user ID to send to.
            message: The message dictionary to send.
        """
        if user_id not in self.user_connections:
            return

        for session_id in self.user_connections[user_id]:
            await self.send_message(session_id, message)

    async def send_state_update(self, user_id: str, state_data: Dict[str, Any]) -> None:
        """Send an emotional state update to a user.

        Args:
            user_id: The user ID to send to.
            state_data: State data.
        """
        message = {
            "type": "state_update",
            "data": state_data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await self.send_to_user(user_id, message)


# Global instance for application-wide access
manager = ConnectionManager()
