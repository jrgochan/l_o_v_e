r"""Versor FastAPI Application.

This is the main entry point for the Versor mathematical engine. It sets up
the FastAPI application, configures middleware, and registers API routes.

Versor is a stateless, pure-mathematics microservice that:
1. Converts VAC vectors to quaternions
2. Calculates emotional transition metrics
3. Generates SLERP interpolation paths

Architecture:
    - **API Layer** (this file): FastAPI routes and middleware
    - **Models Layer:** Pydantic request/response validation
    - **Core Layer:** Pure mathematical functions (quaternions, VAC, SLERP)
    - **Utils Layer:** SciPy integration adapter

Design Philosophy:
    - **Stateless:** No database, no sessions, no caching
    - **Pure functions:** Same input always gives same output
    - **Fast:** No I/O, all in-memory computation

API Endpoints:
    - GET  /: Service information and endpoint list
    - GET  /health: Health check with dependency versions
    - POST /versor/calculate: Main VAC→quaternion calculation
    - POST /versor/slerp: Generate SLERP interpolation paths
"""

import logging

from asgi_correlation_id import CorrelationIdMiddleware  # pylint: disable=import-error
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import calculate, slerp
from app.config import settings

logging.basicConfig(level=settings.LOG_LEVEL)

try:
    from security import setup_rate_limiting
except ImportError:

    def setup_rate_limiting(_app: FastAPI) -> None:
        """Dummy rate limiting setup for when security module is missing."""


app = FastAPI(title=settings.API_TITLE, description=settings.API_DESCRIPTION, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.add_middleware(CorrelationIdMiddleware)
setup_rate_limiting(app)


@app.get("/")
async def root() -> dict[str, str | dict[str, str]]:
    """Root endpoint - service information.

    Returns basic information about the Versor engine and available
    endpoints. Useful for service discovery and simple health pings.

    Returns:
        dict: Service metadata and endpoint list.
    """
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


@app.get("/health")
async def health() -> dict[str, str | dict[str, str]]:
    """Health check endpoint.

    Verifies that the service is operational and reports dependency versions.
    Used by container orchestration, load balancers, and monitoring systems.

    Returns:
        dict: Health status and dependency versions.
    """
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


app.include_router(calculate.router, prefix="/versor", tags=["Calculation"])
app.include_router(slerp.router, prefix="/versor", tags=["Interpolation"])
