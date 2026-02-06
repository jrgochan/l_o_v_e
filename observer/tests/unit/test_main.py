from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app

# -----------------------------------------------------------------------------
# Fixtures
# -----------------------------------------------------------------------------


@pytest.fixture
def client():
    return TestClient(app)


# -----------------------------------------------------------------------------
# Tests: Startup & Shutdown Events
# -----------------------------------------------------------------------------


def test_lifespan_startup_success():
    """Test successful startup initialization via lifespan."""
    with patch("app.main.init_db", new_callable=AsyncMock) as mock_init:
        with TestClient(app):
            mock_init.assert_awaited_once()


def test_lifespan_startup_failure():
    """Test startup failure handling via lifespan."""
    with patch("app.main.init_db", new_callable=AsyncMock) as mock_init:
        mock_init.side_effect = Exception("DB fail")
        with pytest.raises(Exception, match="DB fail"):
            with TestClient(app):
                pass


def test_lifespan_shutdown_success():
    """Test successful shutdown cleanup via lifespan."""
    with (
        patch("app.main.init_db", new_callable=AsyncMock),
        patch("app.main.close_db", new_callable=AsyncMock) as mock_close,
    ):
        with TestClient(app):
            pass  # Application runs here
        mock_close.assert_awaited_once()


def test_lifespan_shutdown_failure():
    """Test shutdown failure handling via lifespan (should not raise)."""
    with (
        patch("app.main.init_db", new_callable=AsyncMock),
        patch("app.main.close_db", new_callable=AsyncMock) as mock_close,
    ):
        mock_close.side_effect = Exception("Cleanup fail")
        # Should catch and log error, not raise
        with TestClient(app):
            pass


# -----------------------------------------------------------------------------
# Tests: Root Endpoint
# -----------------------------------------------------------------------------


def test_read_root(client):
    """Test root endpoint returns API metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "L.O.V.E. Observer API"
    assert "version" in data
    assert "endpoints" in data
