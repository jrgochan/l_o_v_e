r"""Versor FastAPI Application.

This is the main entry point for the Versor mathematical engine. It sets up
the FastAPI application, configures middleware, and registers API routes.

Versor is a stateless, pure-mathematics microservice that:
1. Converts VAC vectors to quaternions
2. Calculates emotional transition metrics
3. Generates SLERP interpolation paths

Architecture:
    Versor follows a clean, layered architecture:

    - **API Layer** (this file): FastAPI routes and middleware
    - **Models Layer:** Pydantic request/response validation
    - **Core Layer:** Pure mathematical functions (quaternions, VAC, SLERP)
    - **Utils Layer:** SciPy integration adapter

Design Philosophy:
    - **Stateless:** No database, no sessions, no caching
    - **Pure functions:** Same input always gives same output
    - **Single responsibility:** Only mathematical calculations
    - **Fast:** No I/O, all in-memory computation
    - **Scalable:** Horizontally scalable (stateless design)

Why FastAPI?
    - **Performance:** Async support, minimal overhead
    - **Type safety:** Pydantic integration for validation
    - **Auto-docs:** OpenAPI/Swagger UI generated automatically
    - **Modern:** ASGI server, Python 3.9+ features
    - **Developer experience:** Excellent error messages

Deployment:
    - **Development:** uvicorn app.main:app --reload --port 8002
    - **Production:** gunicorn + uvicorn workers
    - **Container:** Runs in Docker/Podman via compose
    - **Port:** 8002 (standard for Versor in L.O.V.E. stack)

API Endpoints:
    - GET  /: Service information and endpoint list
    - GET  /health: Health check with dependency versions
    - POST /versor/calculate: Main VAC→quaternion calculation
    - POST /versor/slerp: Generate SLERP interpolation paths
    - GET  /docs: Interactive API documentation (Swagger UI)
    - GET  /redoc: Alternative API documentation (ReDoc)

Performance:
    - Cold start: ~100ms (import numpy/scipy)
    - Request latency: ~1-5ms typical
    - Throughput: ~500-1000 req/s (single worker)
    - Memory: ~50MB baseline (numpy/scipy loaded)

References:
    - API Specification: docs/modules/versor/reference/api-reference.md
    - Deployment: docs/modules/versor/managers/02-integration-points.md
    - FastAPI docs: https://fastapi.tiangolo.com/

Example:
    Running the application::

        # Development mode (hot reload)
        $ uvicorn app.main:app --reload --port 8002

        # Production mode (multiple workers)
        $ gunicorn app.main:app \\
            --workers 4 \\
            --worker-class uvicorn.workers.UvicornWorker \\
            --bind 0.0.0.0:8002
"""

# Configure structured logging
import logging

from asgi_correlation_id import CorrelationIdMiddleware  # pylint: disable=import-error
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import calculate, slerp
from app.config import settings

logging.basicConfig(level=settings.LOG_LEVEL)

# Configure rate limiting
try:
    from security import setup_rate_limiting
except ImportError:

    def setup_rate_limiting(_app: FastAPI) -> None:
        """Dummy rate limiting setup for when security module is missing."""


# ═══════════════════════════════════════════════════════════════════════
# FASTAPI APPLICATION INITIALIZATION
# ═══════════════════════════════════════════════════════════════════════
# Create the FastAPI application instance with metadata from config.
#
# These settings appear in:
# - OpenAPI/Swagger UI (/docs)
# - ReDoc documentation (/redoc)
# - API root endpoint (/)
#
# Version management:
# - Hardcoded here for now (1.0.0)
# - Future: Load from package metadata or git tags
app = FastAPI(title=settings.API_TITLE, description=settings.API_DESCRIPTION, version="1.0.0")

# ═══════════════════════════════════════════════════════════════════════
# CORS MIDDLEWARE CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════
# Configure Cross-Origin Resource Sharing to allow web clients from
# different origins (domains/ports) to call this API.
#
# Why CORS?
# - Browser security prevents cross-origin requests by default
# - Experience module (port 3000) needs to call Versor (port 8002)
# - Without CORS, browser blocks the request
#
# Security considerations:
# - Development: localhost origins (broad access for dev)
# - Production: Restrict to specific domains
# - Credentials: Allow cookies/auth headers
# - Methods: Only GET/POST needed (not DELETE, PUT, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,  # Which domains can call us
    allow_credentials=True,  # Allow cookies/auth headers
    allow_methods=["GET", "POST"],  # HTTP methods we support
    allow_headers=["Content-Type"],  # Headers we accept
)

app.add_middleware(CorrelationIdMiddleware)
setup_rate_limiting(app)


@app.get("/")
async def root() -> dict[str, str | dict[str, str]]:
    """Root endpoint - service information.

    Returns basic information about the Versor engine and available
    endpoints. Useful for:
    - Service discovery
    - Health checks (simple ping)
    - Client orientation

    This endpoint requires no authentication and provides no sensitive data.

    Returns:
        dict: Service metadata and endpoint list

    Example Response:
        {
            "service": "L.O.V.E. Versor Engine",
            "version": "1.0.0",
            "status": "operational",
            "endpoints": {
                "docs": "/docs",
                "health": "/health",
                "calculate": "/versor/calculate",
                "slerp": "/versor/slerp"
            }
        }
    """
    # ═══════════════════════════════════════════════════════════════════════
    # SERVICE METADATA
    # ═══════════════════════════════════════════════════════════════════════
    # Provide basic information about this service.
    # Clients can call this endpoint to verify:
    # - Service is running
    # - Version information
    # - Available endpoints
    return {
        "service": "L.O.V.E. Versor Engine",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "docs": "/docs",  # Interactive Swagger UI
            "health": "/health",  # Detailed health check
            "calculate": "/versor/calculate",  # Main calculation endpoint
            "slerp": "/versor/slerp",  # SLERP interpolation
        },
    }


@app.get("/health")
async def health() -> dict[str, str | dict[str, str]]:
    """Health check endpoint.

    Verifies that the service is operational and reports dependency versions.
    Used by:
    - Container orchestration (Docker health checks)
    - Load balancers (upstream health monitoring)
    - Monitoring systems (Prometheus, Datadog, etc.)
    - Integration tests

    Checks performed:
    - Service is responsive (HTTP 200)
    - Dependencies are loaded (numpy, scipy)
    - No critical errors at startup

    Does NOT check:
    - Mathematical correctness (covered by tests)
    - Performance benchmarks (covered by monitoring)
    - External service connectivity (Versor has none)

    Returns:
        dict: Health status and dependency versions

    Example Response:
        {
            "status": "healthy",
            "version": "1.0.0",
            "dependencies": {
                "numpy": "1.24.3",
                "scipy": "1.11.2"
            }
        }
    """
    # ═══════════════════════════════════════════════════════════════════════
    # DEPENDENCY VERSION CHECKS
    # ═══════════════════════════════════════════════════════════════════════
    # Import numpy and scipy to:
    # 1. Verify they're installed correctly
    # 2. Get version numbers for debugging
    #
    # If these imports fail, the endpoint will return 500 Internal Server Error,
    # which correctly indicates the service is unhealthy.
    import numpy as np  # pylint: disable=import-outside-toplevel
    import scipy  # pylint: disable=import-outside-toplevel

    # ═══════════════════════════════════════════════════════════════════════
    # HEALTH STATUS RESPONSE
    # ═══════════════════════════════════════════════════════════════════════
    # Return successful response with version information.
    #
    # Status "healthy" indicates:
    # - Service is running
    # - Dependencies are loaded
    # - Ready to process requests
    # pragma: no cover - tested via integration test
    return {
        "status": "healthy",
        "version": "1.0.0",
        "dependencies": {
            "numpy": np.__version__,  # NumPy version (array operations)
            "scipy": scipy.__version__,  # SciPy version (SLERP implementation)
        },
    }


# ═══════════════════════════════════════════════════════════════════════
# ROUTE REGISTRATION
# ═══════════════════════════════════════════════════════════════════════
# Register API route modules with the FastAPI application.
#
# Each router is:
# - Defined in separate file (app/api/routes/*.py)
# - Grouped by functionality (calculate, slerp)
# - Prefixed with /versor for namespace isolation
# - Tagged for OpenAPI documentation organization
#
# Why separate routers?
# - Modularity: Each file has single responsibility
# - Organization: Easier to find and maintain routes
# - Testing: Can test routers independently
# - Scaling: Can split to separate services if needed

# Main calculation endpoint: VAC → quaternion + metrics
# Tag: "Calculation" groups in Swagger UI
app.include_router(calculate.router, prefix="/versor", tags=["Calculation"])

# SLERP interpolation endpoint: quaternion → animation path
# Tag: "Interpolation" groups in Swagger UI
app.include_router(slerp.router, prefix="/versor", tags=["Interpolation"])
