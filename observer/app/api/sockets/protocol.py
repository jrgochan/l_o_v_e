from typing import Optional

from app.api.sockets.connection import manager


async def send_progress(
    session_id: str,
    stage: str,
    status: str,
    percentage: int,
    elapsed_ms: Optional[int] = None,
) -> None:
    """Helper to send progress updates to the client."""
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
