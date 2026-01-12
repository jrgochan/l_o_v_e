
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

# -----------------------------------------------------------------------------
# Fixtures
# -----------------------------------------------------------------------------

@pytest.fixture
def client():
    return TestClient(app)

# -----------------------------------------------------------------------------
# Tests: Startup & Shutdown Events
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_startup_event_success():
    """Test successful startup initialization."""
    with patch("app.main.init_db", new_callable=AsyncMock) as mock_init:
        # Trigger startup event manually
        await app.router.startup()
        mock_init.assert_awaited_once()

@pytest.mark.asyncio
async def test_startup_event_failure():
    """Test startup failure handling."""
    with patch("app.main.init_db", side_effect=Exception("DB fail")), \
         pytest.raises(Exception, match="DB fail"):
        await app.router.startup()

@pytest.mark.asyncio
async def test_shutdown_event_success():
    """Test successful shutdown cleanup."""
    with patch("app.main.close_db", new_callable=AsyncMock) as mock_close:
        # Trigger shutdown event manually
        await app.router.shutdown()
        mock_close.assert_awaited_once()

@pytest.mark.asyncio
async def test_shutdown_event_failure():
    """Test shutdown failure handling (should not raise)."""
    with patch("app.main.close_db", side_effect=Exception("Cleanup fail")):
        # Should catch and log error, not raise
        await app.router.shutdown()

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
