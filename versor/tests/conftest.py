"""Test configuration for Versor module."""

from typing import Generator

import pytest

from app.api.deps import get_current_user
from app.main import app


@pytest.fixture(autouse=True)
def override_auth() -> Generator[None, None, None]:
    """Mock authentication for all tests."""
    app.dependency_overrides[get_current_user] = lambda: {
        "sub": "test@example.com",
        "role": "admin",
    }
    yield None
    app.dependency_overrides = {}
