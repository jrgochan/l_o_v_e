"""Test configuration for Versor module."""
import pytest
from app.main import app
from app.api.deps import get_current_user

@pytest.fixture(autouse=True)
def override_auth():
    """Mock authentication for all tests."""
    app.dependency_overrides[get_current_user] = lambda: {"sub": "test@example.com", "role": "admin"}
    yield
    app.dependency_overrides = {}
