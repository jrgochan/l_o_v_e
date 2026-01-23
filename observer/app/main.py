"""Observer Module - Main FastAPI Application.

The memory and contextual core of the L.O.V.E. stack.
"""

import logging
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator, Dict

from fastapi import FastAPI  # pylint: disable=wrong-import-position
from fastapi.middleware.cors import CORSMiddleware  # pylint: disable=wrong-import-position

from app.api.routes import (  # pylint: disable=wrong-import-position
    admin,
    ai_settings,
    auth,
    bootstrap,
    chat_websocket,
    collections,
    current,
    emotions,
    health,
    history,
    prompts,
    state,
    transitions,
    users,
)
from app.config import settings  # pylint: disable=wrong-import-position
from app.database import close_db, init_db  # pylint: disable=wrong-import-position
from app.websocket import websocket_router  # pylint: disable=wrong-import-position

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan events.

    Handles startup and shutdown tasks:
    - Initialize database connection pool
    - Log configuration
    - Close database connections
    """
    # Startup
    logger.info("Starting Observer Module...")
    logger.info(f"Environment: {'DEBUG' if settings.DEBUG else 'PRODUCTION'}")
    logger.info(
        f"Database: {settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
    )
    logger.info(f"Embedding Provider: {settings.EMBEDDING_PROVIDER}")
    logger.info(f"Versor URL: {settings.VERSOR_URL}")

    try:
        await init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise

    yield

    # Shutdown
    logger.info("Shutting down Observer Module...")

    try:
        await close_db()
        logger.info("Database connections closed")
    except Exception as e:  # pragma: no cover
        logger.error(f"Error during shutdown: {e}")


# Initialize FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.API_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# CORS middleware for cross-origin requests (Experience module)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS_LIST,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register route modules
app.include_router(health.router, tags=["Health"])
app.include_router(state.router, tags=["State"])
app.include_router(history.router, tags=["History"])
app.include_router(current.router, tags=["Current"])
app.include_router(collections.router, prefix="/observer", tags=["Collections"])
app.include_router(emotions.router, prefix="/observer", tags=["Emotions"])
app.include_router(transitions.router, prefix="/observer", tags=["Transitions"])
app.include_router(bootstrap.router, prefix="/observer/bootstrap", tags=["Bootstrap"])
app.include_router(websocket_router, tags=["WebSocket"])
app.include_router(chat_websocket.router, prefix="/observer", tags=["Chat"])
app.include_router(ai_settings.router, prefix="/observer", tags=["AI Settings"])
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(prompts.router, prefix="/observer", tags=["AI Prompts"])


@app.get("/", tags=["Root"])
async def root() -> Dict[str, Any]:
    """Root endpoint - API information."""
    return {
        "service": "L.O.V.E. Observer API",
        "version": settings.API_VERSION,
        "description": settings.APP_DESCRIPTION,
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "record_state": "POST /observer/state",
            "health_check": "GET /health",
            "transition_path": "POST /observer/transition-path",
            "journey_management": "POST /observer/journey/*",
            "ai_settings": "GET /observer/ai/*",
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",  # nosec B104 - Binding to all interfaces for Docker container
        port=8000,
        reload=settings.DEBUG,
        log_level=str(settings.LOG_LEVEL).lower(),
    )
