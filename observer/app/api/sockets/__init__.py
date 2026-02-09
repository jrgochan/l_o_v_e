"""WebSocket API Package for Real-Time Interaction.

This package implements the WebSocket interface for the Observer module, enabling:
- Real-time emotional analysis feedback.
- Bidirectional communication for audio/text streaming.
- Progress updates for long-running analysis tasks.
- Session management and connection lifecycle handling.

Architecture:
    - `router.py`: Entry point for WebSocket endpoints.
    - `handlers.py`: Request routing and delegation.
    - `processors.py`: Business logic for message processing (text/audio).
    - `manager.py`: Connection lifecycle management (connect/disconnect/map).
    - `protocol.py`: Standardized message formats and progress reporting.
"""

from app.api.sockets.router import router

__all__ = ["router"]
