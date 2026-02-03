"""Health Check Routes.

Health check and readiness probe endpoints for PersonaPlex service.
"""

import logging
from typing import Any, Dict

from app.config import settings
from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """Basic health check endpoint.

    Returns:
        dict: Health status information

    Example:
        >>> curl http://localhost:8003/health
        {
          "status": "healthy",
          "service": "PersonaPlex Voice Service",
          "version": "0.1.0"
        }
    """
    return {
        "status": "healthy",
        "service": settings.SERVICE_NAME,
        "version": settings.VERSION,
    }


@router.get("/health/ready")
async def readiness_check() -> Dict[str, Any]:
    """Readiness probe - checks if service is ready to handle requests.

    Verifies:
        - PersonaPlex models are loaded
        - GPU/CPU resources are available
        - Configuration is valid

    Returns:
        dict: Readiness status information

    Raises:
        HTTPException: If service is not ready (503)

    Example:
        >>> curl http://localhost:8003/health/ready
        {
          "status": "ready",
          "model": "nvidia/personaplex-7b-v1",
          "compute": "gpu",
          "active_sessions": 0
        }
    """
    try:
        # TODO: Add actual model readiness check once PersonaPlex is integrated
        # For now, return basic readiness based on configuration

        if not settings.HF_TOKEN:
            logger.warning("HF_TOKEN not configured - model download may fail")
            raise HTTPException(
                status_code=503, detail="Service not ready: HuggingFace token not configured"
            )

        compute_type = "cpu_offload" if settings.CPU_OFFLOAD else "gpu"

        return {
            "status": "ready",
            "model": settings.MODEL_NAME,
            "compute": compute_type,
            "active_sessions": 0,  # TODO: Track active WebSocket sessions
            "hf_token_configured": bool(settings.HF_TOKEN),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        raise HTTPException(status_code=503, detail=f"Service not ready: {str(e)}")
