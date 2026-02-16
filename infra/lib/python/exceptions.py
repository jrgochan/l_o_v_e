"""Shared Exception Hierarchy for L.O.V.E. backends.

Provides domain-specific exception classes and a ``register_error_handlers``
function that installs consistent JSON error responses on any FastAPI app.

Usage in a factory::

    from exceptions import register_error_handlers
    register_error_handlers(app)

Usage in route handlers (optional — existing HTTPException still works)::

    from exceptions import NotFoundError, ValidationError
    raise NotFoundError("Emotion not found")
    raise ValidationError("VAC vector must have 3 components")
"""

import logging
from typing import Any, Dict, Optional

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


# ── Base Exception ───────────────────────────────────────────────────────────


class LoveBaseError(Exception):
    """Base exception for all L.O.V.E. domain errors.

    Subclasses set ``status_code`` and ``code`` as class-level defaults.
    Individual instances can override ``detail`` and ``extra``.
    """

    status_code: int = 500
    code: str = "server_error"

    def __init__(
        self,
        detail: str = "An unexpected error occurred",
        *,
        extra: Optional[Dict[str, Any]] = None,
    ) -> None:
        self.detail = detail
        self.extra = extra or {}
        super().__init__(detail)

    def to_response(self) -> JSONResponse:
        """Serialize to a structured JSON response."""
        content: Dict[str, Any] = {
            "detail": self.detail,
            "code": self.code,
        }
        if self.extra:
            content["extra"] = self.extra
        return JSONResponse(status_code=self.status_code, content=content)


# ── Concrete Exceptions ─────────────────────────────────────────────────────


class NotFoundError(LoveBaseError):
    """Resource not found (404)."""

    status_code = 404
    code = "not_found"

    def __init__(self, detail: str = "Resource not found", **kwargs: Any) -> None:
        super().__init__(detail, **kwargs)


class ValidationError(LoveBaseError):
    """Client-supplied data is invalid (400)."""

    status_code = 400
    code = "validation_error"

    def __init__(self, detail: str = "Invalid input", **kwargs: Any) -> None:
        super().__init__(detail, **kwargs)


class AuthenticationError(LoveBaseError):
    """Missing or invalid credentials (401)."""

    status_code = 401
    code = "authentication_error"

    def __init__(self, detail: str = "Not authenticated", **kwargs: Any) -> None:
        super().__init__(detail, **kwargs)


class AuthorizationError(LoveBaseError):
    """Authenticated but insufficient permissions (403)."""

    status_code = 403
    code = "authorization_error"

    def __init__(self, detail: str = "Not authorized", **kwargs: Any) -> None:
        super().__init__(detail, **kwargs)


class ConflictError(LoveBaseError):
    """Resource state conflict (409)."""

    status_code = 409
    code = "conflict"

    def __init__(self, detail: str = "Resource conflict", **kwargs: Any) -> None:
        super().__init__(detail, **kwargs)


class ServiceUnavailableError(LoveBaseError):
    """Downstream service is unreachable (503)."""

    status_code = 503
    code = "service_unavailable"

    def __init__(self, detail: str = "Service unavailable", **kwargs: Any) -> None:
        super().__init__(detail, **kwargs)


# ── Global Error Handlers ────────────────────────────────────────────────────


def register_error_handlers(app: FastAPI) -> None:
    """Install global exception handlers on *app*.

    Handles four exception families in priority order:

    1. ``LoveBaseError`` — domain exceptions with code + status
    2. ``StarletteHTTPException`` — standard FastAPI / Starlette errors
    3. ``RequestValidationError`` — Pydantic 422 errors
    4. ``Exception`` — catch-all (never leaks internals)
    """

    @app.exception_handler(LoveBaseError)
    async def love_error_handler(_request: Request, exc: LoveBaseError) -> JSONResponse:
        """Handle domain-specific exceptions."""
        logger.warning("Domain error [%s]: %s", exc.code, exc.detail)
        return exc.to_response()

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        _request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        """Handle standard HTTP exceptions."""
        logger.warning("HTTP Exception: %s - %s", exc.status_code, exc.detail)
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail, "code": "http_error"},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        """Handle request validation errors."""
        logger.warning("Validation Error: %s", exc.errors())
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": exc.errors(), "code": "validation_error"},
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
        """Handle unexpected exceptions — never leaks internals."""
        logger.error("Unhandled Exception: %s", exc, exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal Server Error", "code": "server_error"},
        )
