"""Application Factory."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from asgi_correlation_id import CorrelationIdMiddleware
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    admin,
    ai_settings,
    auth,
    bootstrap,
    collections,
    current,
    emotions,
    health,
    history,
    matrix,
    prompts,
    recommendations,
    state,
    transitions,
    users,
)
from app.api.sockets.router import router as socket_router
from app.core.settings import settings

# Configure structlog
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer(),
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)


@asynccontextmanager
async def lifespan(app_instance: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    # Startup
    from app.database import close_db
    from app.db_init import init_db

    # Startup
    logger = structlog.get_logger()
    logger.info("application_startup", version=settings.API_VERSION)
    await init_db()
    yield
    # Shutdown
    logger.info("application_shutdown")
    await close_db()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title=settings.APP_NAME,
        description=settings.APP_DESCRIPTION,
        version=settings.API_VERSION,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    # Middleware
    app.add_middleware(CorrelationIdMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS_LIST,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    app.include_router(health.router, tags=["Health"])
    app.include_router(state.router, tags=["State"])
    app.include_router(history.router, tags=["History"])
    app.include_router(current.router, tags=["Current"])
    app.include_router(collections.router, prefix="/observer", tags=["Collections"])
    app.include_router(emotions.router, prefix="/observer", tags=["Emotions"])
    app.include_router(matrix.router, prefix="/observer", tags=["Path Matrix"])
    app.include_router(recommendations.router, prefix="/observer", tags=["Smart Recommendations"])
    app.include_router(transitions.router, prefix="/observer", tags=["Transitions"])
    app.include_router(bootstrap.router, prefix="/observer/bootstrap", tags=["Bootstrap"])
    app.include_router(socket_router, tags=["Chat"])
    app.include_router(ai_settings.router, prefix="/observer", tags=["AI Settings"])
    app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
    app.include_router(users.router, prefix="/users", tags=["Users"])
    app.include_router(admin.router, prefix="/admin", tags=["Admin"])
    app.include_router(prompts.router, prefix="/observer", tags=["AI Prompts"])

    @app.get("/", tags=["Root"])
    async def root() -> dict[str, str]:
        """Root endpoint - API information."""
        return {
            "service": settings.APP_NAME,
            "version": settings.API_VERSION,
            "description": settings.APP_DESCRIPTION,
            "docs": "/docs",
            "health": "/health",
        }

    return app
