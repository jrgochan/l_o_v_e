"""Listener Module - FastAPI Application.

Main application entry point for the Listener API server.

This module creates and configures the FastAPI application instance, registers all
routes, sets up middleware, and defines application lifecycle events (startup/shutdown).

Application Structure:
    - FastAPI instance with automatic OpenAPI docs
    - CORS middleware for cross-origin requests (Experience UI, mobile apps)
    - Three router groups: Health, Ingestion, AI Models
    - Lifecycle events for initialization and cleanup

Endpoints Registered:
    - /health - Health check (liveness probe)
    - /health/ready - Readiness probe
    - /listener/analyze - Synchronous text analysis
    - /listener/analyze-audio - Synchronous audio analysis
    - /listener/analyze-multi-emotion - Multi-emotion analysis
    - /listener/ingest - Async audio processing
    - /listener/status/{job_id} - Job status check
    - /listener/ai/models/* - Model management

Running the Application:
    Development:
        uvicorn app.main:app --reload --port 8002

    Production:
        uvicorn app.main:app --host 0.0.0.0 --port 8002 --workers 4

Interactive Documentation:
    - Swagger UI: http://localhost:8002/docs
    - ReDoc: http://localhost:8002/redoc
    - OpenAPI JSON: http://localhost:8002/openapi.json

Examples:
    Import the app for testing:
    >>> from app.main import app
    >>> from fastapi.testclient import TestClient
    >>> client = TestClient(app)
    >>> response = client.get("/health")
    >>> assert response.status_code == 200

See Also:
    - Configuration: app/config.py
    - Routes: app/api/routes/ (health.py, ingest.py, ai_models.py)
    - Deployment: docs/modules/listener/senior-developers/01-deep-dive-architecture.md
    - ADR: Why FastAPI - docs/modules/listener/senior-developers/07-architecture-decisions.md
"""

import logging
from typing import Any, Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import ai_models, health, ingest
from app.config import settings

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Listener API",
    description="Audio transcription and semantic VAC extraction service",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(ingest.router, prefix="/listener", tags=["Ingestion"])
app.include_router(ai_models.router, prefix="/listener", tags=["AI Models"])


# Startup event
@app.on_event("startup")
async def startup_event() -> None:
    """Application startup event handler.

    Called once when the FastAPI application starts. Use this for:
    - Logging startup information
    - Initializing connections (databases, external services)
    - Preloading models (if needed)
    - Health checks of dependencies

    Currently logs:
    - Environment (development, staging, production)
    - Ollama URL (for LLM inference)
    - Observer URL (for state storage)

    Sample Usage:
        This runs automatically on startup:
        $ uvicorn app.main:app --port 8002
        INFO: 🎧 Listener API starting up...
        INFO: Environment: development
        INFO: Ollama: http://localhost:11434
        INFO: Observer: http://localhost:8000

    Notes:
        - Models are lazy-loaded (not preloaded here)
        - No blocking operations (startup should be fast)
        - Health checks happen in /health/ready endpoint

    See Also:
        - Shutdown: shutdown_event()
        - Configuration: app/config.py
    """
    logger.info("🎧 Listener API starting up...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Ollama: {settings.OLLAMA_BASE_URL}")
    logger.info(f"Observer: {settings.OBSERVER_URL}")
    logger.info("Listener API ready to receive audio/text input")


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event() -> None:
    """Application shutdown event handler.

    Called once when the FastAPI application shuts down. Use this for:
    - Cleanup of resources
    - Closing connections
    - Saving state (if needed)
    - Final logging

    Sample Usage:
        This runs automatically on shutdown:
        $ uvicorn app.main:app --port 8002
        # Press Ctrl+C
        INFO: Listener API shutting down...

    Notes:
        - Currently just logs shutdown
        - Could add connection cleanup in future
        - Should not have long-running operations

    See Also:
        - Startup: startup_event()
    """
    logger.info("Listener API shutting down...")


# Root endpoint
@app.get("/")
async def root() -> Dict[str, Any]:
    """Root endpoint providing API information and available endpoints.

    Useful for:
    - Quick check that service is running
    - Discovering available endpoints
    - Getting service version

    Returns:
        dict: Service metadata and endpoint list

    Sample Usage:
        Check service is running:
        >>> curl http://localhost:8002/
        {
          "service": "Listener API",
          "version": "0.1.0",
          "status": "running",
          "endpoints": {...}
        }

    Notes:
        - Does NOT check dependencies (use /health/ready for that)
        - Returns immediately (no processing)
        - Useful for service discovery

    See Also:
        - Health check: /health
        - Interactive docs: /docs
    """
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
