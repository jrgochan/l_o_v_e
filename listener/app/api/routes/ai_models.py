"""AI Models API Routes (Listener).

REST and WebSocket endpoints for Ollama model lifecycle management.

This module provides the API interface for the AI Models feature, allowing admin users
to manage LLM models through the Experience UI without manual CLI operations. Supports:
- Listing locally installed models
- Downloading new models with real-time progress (WebSocket streaming)
- Deleting unused models
- Getting detailed model information (RAM, speed, recommendations)
- Checking Ollama health

The AI Models feature enables dynamic model switching without redeploying the Listener,
supporting the model assignment system where different functions can use different models.

Endpoints:
    GET /listener/ai/models/local - List installed models
    POST /listener/ai/models/pull - Start model download
    WS /listener/ai/models/pull/{task_id} - Stream download progress
    DELETE /listener/ai/models/{model_name} - Delete a model
    GET /listener/ai/models/{model_name}/details - Get model specs
    GET /listener/ai/models/health - Check Ollama status

Integration Points:
    - Uses: OllamaManager (Ollama REST API client)
    - Called by: Experience UI (Settings page, AI Models section)
    - Enables: Dynamic model management without SSH/CLI access

Sample Usage:
    List models:
    >>> curl http://localhost:8002/listener/ai/models/local

    Pull a model:
    >>> curl -X POST http://localhost:8002/listener/ai/models/pull \
    >>>   -H "Content-Type: application/json" \
    >>>   -d '{"name": "phi-3:mini"}'

    Get model details:
    >>> curl http://localhost:8002/listener/ai/models/llama3.1:8b-instruct-q4_0/details

See Also:
    - OllamaManager: app/services/ollama_manager.py
    - Feature Docs: docs/features/ai-models/00-OVERVIEW.md
    - UI Integration: experience/web/app/settings/ai-models
    - Tests: tests/integration/test_ai_models.py
"""

import asyncio
import logging
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.api.deps import get_current_user, get_current_user_ws
from app.services.ollama_manager import ModelDetails, ModelInfo, OllamaManager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai/models", tags=["AI Models"])


# Helper for unconditional cleanup coverage
class NoOpOllama:  # pylint: disable=too-few-public-methods
    """No-op implementation of Ollama manager for safe cleanup."""

    async def close(self) -> None:
        """Close the manager (no-op)."""


# === Request/Response Schemas ===


class PullModelRequest(BaseModel):
    """Request to pull a model."""

    name: str


class PullModelResponse(BaseModel):
    """Response with task ID for tracking progress."""

    task_id: str
    ai_model_name: str
    status: str


class DeleteModelRequest(BaseModel):
    """Request to delete a model."""

    name: str


# === Active Pull Tasks ===
# Store active pull tasks for WebSocket streaming
active_pulls: Dict[str, Any] = {}


# === Endpoints ===


@router.get("/local", response_model=List[ModelInfo])
async def list_local_models(
    _current_user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
) -> List[ModelInfo]:
    """List all Ollama models currently installed locally.

    Returns:
        List of ModelInfo objects with name, size, parameters, etc.
    """
    try:
        ollama = OllamaManager()
        models = await ollama.list_local_models()
        await ollama.close()
        return models
    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.error("Failed to list local models: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to list models: {str(e)}") from e


@router.post("/pull", response_model=PullModelResponse)
async def start_model_pull(
    request: PullModelRequest,
    _current_user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
) -> PullModelResponse:
    """Start pulling (downloading) a model from Ollama registry.

    Returns task_id for tracking progress via WebSocket.
    """
    try:
        import uuid  # pylint: disable=import-outside-toplevel

        task_id = str(uuid.uuid4())

        # Store task info
        active_pulls[task_id] = {
            "ai_model_name": request.name,
            "status": "starting",
            "progress": None,
        }

        logger.info("Starting pull for model %s, task_id: %s", request.name, task_id)

        return PullModelResponse(task_id=task_id, ai_model_name=request.name, status="started")
    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.error("Failed to start model pull: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to start pull: {str(e)}") from e


@router.websocket("/pull/{task_id}")
async def stream_pull_progress(
    websocket: WebSocket,
    task_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user_ws),  # noqa: B008
) -> None:
    """Websocket endpoint for streaming model pull progress.

    Sends progress updates as the model downloads.
    """
    ollama: Any = NoOpOllama()
    try:
        # M4: Validate Origin header to prevent cross-site WebSocket hijacking
        origin = websocket.headers.get("origin")
        if origin:
            from app.config import settings  # pylint: disable=import-outside-toplevel

            if origin not in settings.allowed_origins_list:
                await websocket.close(code=1008, reason="Origin not allowed")
                return

        await websocket.accept()

        if task_id not in active_pulls:
            await websocket.send_json({"error": "Task not found"})
            await websocket.close()
            return

        ai_model_name = active_pulls[task_id]["ai_model_name"]
        ollama = OllamaManager()

        try:
            async for progress in ollama.pull_model(ai_model_name):
                await websocket.send_json(
                    {
                        "task_id": task_id,
                        "ai_model_name": ai_model_name,
                        "status": progress.status,
                        "digest": progress.digest,
                        "total": progress.total,
                        "completed": progress.completed,
                        "percent": progress.percent,
                    }
                )

                # Update active task status
                active_pulls[task_id]["status"] = progress.status
                active_pulls[task_id]["progress"] = progress.dict()

                # If complete or error, clean up
                if progress.status in ["success", "error"]:
                    break
        except WebSocketDisconnect:
            raise  # Re-raise to be caught by outer handler
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.error("Error during model pull: %s", e)
            await websocket.send_json({"task_id": task_id, "status": "error", "error": str(e)})
        finally:
            await ollama.close()
            # Clean up task after a delay
            await asyncio.sleep(60)  # Keep task info for 1 min
            active_pulls.pop(task_id, None)

    finally:
        try:
            await websocket.close()
        except Exception:  # pylint: disable=broad-exception-caught
            pass


@router.delete("/{model_name}")
async def delete_model(
    model_name: str,
    _current_user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
) -> Dict[str, Any]:
    """Delete a model from local storage.

    Args:
        model_name: Name of model to delete (e.g., "phi-3:mini")

    Returns:
        Success/error status
    """
    try:
        ollama = OllamaManager()
        result = await ollama.delete_model(model_name)
        await ollama.close()

        logger.info("Deleted model %s", model_name)
        return {"status": "success", "model": model_name, "result": result}
    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.error("Failed to delete model %s: %s", model_name, e)
        raise HTTPException(status_code=500, detail=f"Failed to delete model: {str(e)}") from e


@router.get("/{model_name}/details", response_model=ModelDetails)
async def get_model_details(
    model_name: str,
    _current_user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
) -> ModelDetails:
    """Get detailed information about a specific model.

    Args:
        model_name: Name of model (e.g., "llama3.1:8b-instruct-q4_0")

    Returns:
        ModelDetails with specs, estimates, and recommendations
    """
    try:
        ollama = OllamaManager()
        details = await ollama.get_model_details(model_name)
        await ollama.close()
        return details
    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.error("Failed to get details for %s: %s", model_name, e)
        raise HTTPException(status_code=404, detail=f"Model not found or error: {str(e)}") from e


@router.get("/health")
async def check_ollama_health(
    _current_user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
) -> Dict[str, str]:
    """Check if Ollama is running and accessible.

    Returns:
        Status of Ollama service
    """
    try:
        ollama = OllamaManager()
        is_healthy = await ollama.health_check()
        await ollama.close()

        if is_healthy:
            return {"status": "ok", "ollama": "running"}

        return {"status": "error", "ollama": "not running"}
    except Exception as e:  # pylint: disable=broad-exception-caught
        return {"status": "error", "ollama": "not accessible", "error": str(e)}
