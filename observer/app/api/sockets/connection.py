import logging
from typing import Dict, Optional
from uuid import UUID

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for chat sessions."""

    def __init__(self) -> None:
        """Initialize connection manager."""
        self.active_connections: Dict[str, WebSocket] = {}
        self.session_mapping: Dict[str, UUID] = {}  # Maps string session_id to UUID

    async def connect(self, session_id: str, websocket: WebSocket) -> None:
        """Accept and store a WebSocket connection."""
        await websocket.accept()
        self.active_connections[session_id] = websocket
        logger.info("WebSocket connected for session %s", session_id)

    def set_db_session(self, session_id: str, db_session_id: UUID) -> None:
        """Map string session_id to database UUID."""
        self.session_mapping[session_id] = db_session_id

    def get_db_session(self, session_id: str) -> Optional[UUID]:
        """Get database UUID for session."""
        return self.session_mapping.get(session_id)

    def disconnect(self, session_id: str) -> None:
        """Remove a WebSocket connection."""
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        if session_id in self.session_mapping:
            del self.session_mapping[session_id]
        logger.info("WebSocket disconnected for session %s", session_id)

    async def send_message(self, session_id: str, message: Dict[str, object]) -> None:
        """Send a message to a specific session."""
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_json(message)

    async def send_text(self, session_id: str, text: str) -> None:
        """Send plain text to a specific session."""
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_text(text)


# Global instance
manager = ConnectionManager()
