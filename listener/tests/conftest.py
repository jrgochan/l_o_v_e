"""
Listener Module - Test Configuration

Pytest fixtures and configuration for testing.
"""

from pathlib import Path

import pytest

from app.api.deps import get_current_user
from app.main import app


@pytest.fixture(autouse=True)
def override_auth():
    """Mock authentication for all tests."""
    app.dependency_overrides[get_current_user] = lambda: {
        "sub": "test@example.com",
        "role": "admin",
    }
    # Need to import locally or global import to avoid circular dep issues in conftest?
    from app.api.deps import get_current_user_ws

    app.dependency_overrides[get_current_user_ws] = lambda: {
        "sub": "test@example.com",
        "role": "admin",
    }
    yield
    app.dependency_overrides = {}


@pytest.fixture(scope="session", autouse=True)
def suppress_shutdown_logging_errors():
    """Suppress logging errors during interpreter shutdown.

    Fixes 'ValueError: I/O operation on closed file' from huggingface_hub/httpx.
    """
    import logging

    yield
    # Remove handlers to prevent writing to closed streams
    logging.getLogger().handlers = []


@pytest.fixture
def fixtures_dir() -> Path:
    """Get path to test fixtures directory"""
    return Path(__file__).parent / "fixtures"


@pytest.fixture
def sample_text():
    """Sample text for testing semantic analysis"""
    return "I'm feeling overwhelmed by everything today."


@pytest.fixture
def pity_text():
    """Text expressing pity (negative Connection)"""
    return "I feel sorry for them. They're really struggling."


@pytest.fixture
def compassion_text():
    """Text expressing compassion (positive Connection)"""
    return "I understand their pain. I'm here with them."


@pytest.fixture
def grief_text():
    """Text expressing grief (negative Valence, positive Connection)"""
    return (
        "I miss them so much. The pain of losing them is overwhelming, "
        "but I still feel connected to the love we shared."
    )


@pytest.fixture
def belonging_text():
    """Text expressing belonging (positive Connection)"""
    return "I can just be myself here. I'm accepted for who I am."


@pytest.fixture
def fitting_in_text():
    """Text expressing fitting in (negative Connection)"""
    return "I have to pretend to be someone I'm not to fit in."


@pytest.fixture
def joy_text():
    """Text expressing joy"""
    return "I'm feeling amazing today! Everything is clicking and I feel so alive!"


@pytest.fixture
def anguish_text():
    """Text expressing anguish (high arousal, negative valence, isolation)"""
    return (
        "I'm in agony and nobody understands what I'm going through. "
        "I'm completely alone in this suffering."
    )
