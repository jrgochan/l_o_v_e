"""Test configuration for Versor module."""

import sys
from pathlib import Path
from typing import Generator

import pytest

# Make shared infra modules (exceptions, security, etc.) importable in tests,
# matching the PYTHONPATH setup used in containers.
INFRA_LIB = str(Path(__file__).resolve().parents[2] / "infra" / "lib" / "python")
if INFRA_LIB not in sys.path:
    sys.path.insert(0, INFRA_LIB)

from app.api.deps import get_current_user  # noqa: E402  # pylint: disable=wrong-import-position
from app.main import app  # noqa: E402  # pylint: disable=wrong-import-position


@pytest.fixture(autouse=True)
def override_auth() -> Generator[None, None, None]:
    """Mock authentication for all tests."""
    app.dependency_overrides[get_current_user] = lambda: {
        "sub": "test@example.com",
        "role": "admin",
    }
    yield None
    app.dependency_overrides = {}
