"""WebSocket module for real-time updates.

Provides WebSocket connections for pushing emotional state updates
to connected clients instead of requiring polling.
"""

from typing import Any, Dict, List, Optional

from .connection_manager import ConnectionManager, manager
from .routes import router as websocket_router

__all__ = ["manager", "ConnectionManager", "websocket_router"]
