"""WebSocket Protocol Definitions.

Defines the structure and helpers for standardized WebSocket communication,
ensuring consistent message formats for progress updates, errors, and data payloads.
"""

from typing import Optional

from app.api.sockets.manager import manager


async def send_progress(
    session_id: str,
    stage: str,
    status: str,
    percentage: int,
    elapsed_ms: Optional[int] = None,
) -> None:
    """Send a standardized progress update to the client.

    Used to keep the UI informed during multi-step analysis pipelines (e.g., audio
    processing, transcription, emotion analysis).

    Args:
        session_id: The unique WebSocket session identifier.
        stage: The current processing stage (e.g., "transcription", "emotions").
        status: The status of the stage (e.g., "started", "in_progress", "complete").
        percentage: Estimated completion percentage (0-100).
        elapsed_ms: Optional time elapsed in milliseconds for performance tracking.

    Protocol:
        Sends a JSON message with type="progress_update".
    """
    message = {
        "type": "progress_update",
        "stage": stage,
        "status": status,
        "message": f"{stage} {status}",
        "percentage": percentage,
    }
    if elapsed_ms is not None:
        message["elapsed_ms"] = elapsed_ms
    await manager.send_message(session_id, message)
