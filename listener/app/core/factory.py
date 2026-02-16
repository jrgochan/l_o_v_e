"""Listener Application Factory.

Creates and configures the FastAPI application instance using the modern
lifespan context manager pattern (replaces deprecated @app.on_event).

Usage:
    from app.core.factory import create_app
    app = create_app()
"""

import logging
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator, Dict

import structlog
from asgi_correlation_id import CorrelationIdMiddleware
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

try:
    from security import setup_rate_limiting
except ImportError:

    def setup_rate_limiting(_app: FastAPI) -> None:
        """Dummy rate limiting setup for when security module is missing."""


try:
    from exceptions import register_error_handlers
except ImportError:

    def register_error_handlers(_app: FastAPI) -> None:
        """Dummy error handler setup for when exceptions module is missing."""


try:
    from tracing import configure_tracing
except ImportError:

    def configure_tracing(_app: FastAPI, **_kwargs: str) -> None:
        """Dummy tracing setup for when tracing module is missing."""


# Configure logging
logging.basicConfig(level=settings.LOG_LEVEL)
logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(_app_instance: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager.

    Replaces the deprecated @app.on_event("startup") / @app.on_event("shutdown")
    pattern with a single async context manager.

    Startup phase (before yield):
        - Log environment configuration
        - Future: initialize connections, preload models

    Shutdown phase (after yield):
        - Log shutdown
        - Future: cleanup resources, close connections
    """
    # ── Startup ──────────────────────────────────────────────
    logger.info("🎧 Listener API starting up...")
    logger.info("environment", env=settings.ENVIRONMENT)
    logger.info("ollama_url", url=settings.OLLAMA_BASE_URL)
    logger.info("observer_url", url=settings.OBSERVER_URL)
    logger.info("Listener API ready to receive audio/text input")

    yield

    # ── Shutdown ─────────────────────────────────────────────
    logger.info("Listener API shutting down...")


def create_app() -> FastAPI:
    """Create and configure the Listener FastAPI application.

    Returns:
        Fully configured FastAPI application instance.
    """
    app = FastAPI(
        title="Listener API",
        description="Audio transcription and semantic VAC extraction service",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # ── Middleware ────────────────────────────────────────────
    app.add_middleware(CorrelationIdMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    setup_rate_limiting(app)

    # Error handlers
    register_error_handlers(app)

    # Distributed tracing
    configure_tracing(app, service_name="listener")

    # ── Routers ──────────────────────────────────────────────
    # Lazy import to avoid circular dependencies
    from app.api.routes import ai_models, health, ingest  # pylint: disable=import-outside-toplevel

    app.include_router(health.router, tags=["Health"])
    app.include_router(ingest.router, prefix="/listener", tags=["Ingestion"])
    app.include_router(ai_models.router, prefix="/listener", tags=["AI Models"])

    # ── Root endpoint ────────────────────────────────────────
    @app.get("/", tags=["Root"])
    async def root() -> Dict[str, Any]:
        """Root endpoint providing API information and available endpoints."""
        return {
            "service": "Listener API",
            "version": "0.1.0",
            "description": "Audio transcription and semantic VAC extraction",
            "status": "running",
            "endpoints": {
                "health": "/health",
                "docs": "/docs",
                "ingest": "/listener/ingest",
                "status": "/listener/status/{job_id}",
                "ai_models": "/listener/ai/models",
            },
        }

    return app
