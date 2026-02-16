"""Shared security utilities for L.O.V.E. stack services.

Provides rate limiting configuration and a safe import wrapper.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Callable

if TYPE_CHECKING:
    from fastapi import FastAPI

from settings import settings
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# Initialize limiter
# storage_uri should be "redis://host:port" or "memory://"
storage_uri = settings.REDIS_URL if settings.REDIS_URL else "memory://"

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=storage_uri,
    default_limits=["100/minute"],  # Global default limit
)


def setup_rate_limiting(app: FastAPI) -> None:
    """Configure rate limiting for a FastAPI application.

    Adds the limiter state and registers the exception handler.
    """
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


def get_rate_limiting_setup() -> Callable[[FastAPI], None]:
    """Return the rate limiting setup function, or a no-op if unavailable.

    Use this instead of try/except ImportError boilerplate::

        from security import get_rate_limiting_setup
        setup_rate_limiting = get_rate_limiting_setup()
        setup_rate_limiting(app)

    Falls back gracefully if the security module or its dependencies
    (slowapi, Redis settings) aren't available.
    """
    return setup_rate_limiting
