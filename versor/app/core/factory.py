r"""Versor Application Factory.

Creates and configures the FastAPI application using the modern
lifespan context manager pattern (replaces deprecated @app.on_event).

Versor is a stateless, pure-mathematics microservice that:
1. Converts VAC vectors to quaternions
2. Calculates emotional transition metrics
3. Generates SLERP interpolation paths

Design Philosophy:
    - **Stateless:** No database, no sessions, no caching
    - **Pure functions:** Same input always gives same output
    - **Fast:** No I/O, all in-memory computation
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

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
    from tracing import configure_tracing
except ImportError:

    def configure_tracing(_app: FastAPI, **_kwargs: str) -> None:
        """Dummy tracing setup for when tracing module is missing."""


logging.basicConfig(level=settings.LOG_LEVEL)


@asynccontextmanager
async def lifespan(_app_instance: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager.

    Versor is stateless, so startup/shutdown are minimal — mainly
    for logging and future extensibility.
    """
    import structlog  # pylint: disable=import-outside-toplevel

    logger = structlog.get_logger(__name__)
    logger.info("⚡ Versor Engine starting up...")
    yield
    logger.info("Versor Engine shutting down...")


def create_app() -> FastAPI:
    """Create and configure the Versor FastAPI application."""
    app = FastAPI(
        title=settings.API_TITLE,
        description=settings.API_DESCRIPTION,
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # ── Middleware ────────────────────────────────────────────
    app.add_middleware(CorrelationIdMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )
    setup_rate_limiting(app)

    # Distributed tracing
    configure_tracing(app, service_name="versor")

    # ── Routers ──────────────────────────────────────────────
    from app.api.routes import calculate, slerp  # pylint: disable=import-outside-toplevel

    app.include_router(calculate.router, prefix="/versor", tags=["Calculation"])
    app.include_router(slerp.router, prefix="/versor", tags=["Interpolation"])

    # ── Root & Health endpoints ──────────────────────────────
    @app.get("/", tags=["Root"])
    async def root() -> dict[str, str | dict[str, str]]:
        """Root endpoint - service information."""
        return {
            "service": "L.O.V.E. Versor Engine",
            "version": "1.0.0",
            "status": "operational",
            "endpoints": {
                "docs": "/docs",
                "health": "/health",
                "calculate": "/versor/calculate",
                "slerp": "/versor/slerp",
            },
        }

    @app.get("/health", tags=["Health"])
    async def health() -> dict[str, str | dict[str, str]]:
        """Health check with dependency versions."""
        import numpy as np  # pylint: disable=import-outside-toplevel
        import scipy  # pylint: disable=import-outside-toplevel

        return {
            "status": "healthy",
            "version": "1.0.0",
            "dependencies": {
                "numpy": np.__version__,
                "scipy": scipy.__version__,
            },
        }

    return app
