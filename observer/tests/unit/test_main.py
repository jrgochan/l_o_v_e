import runpy
import sys
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_lifespan_startup_success():
    """Test successful startup initialization via lifespan."""
    mock_init = AsyncMock(return_value=None)

    # Mock structlog logger to be async compatible or just mock the logger instance
    mock_logger = MagicMock()
    # logger.info is sync now
    mock_logger.info = MagicMock(return_value=None)

    with patch("app.db_init.init_db", new=mock_init):
        with patch("structlog.get_logger", return_value=mock_logger):
            with TestClient(app):
                pass
            mock_init.assert_awaited_once()
            # Verify logger.info was called (not awaited)
            assert mock_logger.info.called


def test_lifespan_startup_failure():
    """Test startup failure handling via lifespan."""
    mock_init = AsyncMock(side_effect=Exception("DB fail"))
    mock_logger = MagicMock()
    mock_logger.info = MagicMock(return_value=None)

    with patch("app.db_init.init_db", new=mock_init):
        with patch("structlog.get_logger", return_value=mock_logger):
            with pytest.raises(Exception, match="DB fail"):
                with TestClient(app):
                    pass


def test_lifespan_shutdown_success():
    """Test successful shutdown cleanup via lifespan."""
    mock_init = AsyncMock(return_value=None)
    mock_close = AsyncMock(return_value=None)
    mock_logger = MagicMock()
    mock_logger.info = MagicMock(return_value=None)

    with (
        patch("app.db_init.init_db", new=mock_init),
        patch("app.database.close_db", new=mock_close),
        patch("structlog.get_logger", return_value=mock_logger),
    ):
        with TestClient(app):
            pass
        mock_close.assert_awaited_once()
        assert mock_logger.info.called


def test_lifespan_shutdown_failure():
    """Test shutdown failure handling via lifespan."""
    mock_init = AsyncMock(return_value=None)
    mock_close = AsyncMock(side_effect=Exception("Cleanup fail"))
    mock_logger = MagicMock()
    mock_logger.info = MagicMock(return_value=None)

    with (
        patch("app.db_init.init_db", new=mock_init),
        patch("app.database.close_db", new=mock_close),
        patch("structlog.get_logger", return_value=mock_logger),
    ):
        # We expect the shutdown exception to bubble up
        with pytest.raises(Exception, match="Cleanup fail"):
            with TestClient(app):
                pass

    mock_close.assert_awaited_once()


@asynccontextmanager
async def mock_lifespan(_app):
    yield


def test_main_app_loads():
    """Verify main app instantiates and root endpoint works."""
    app.router.lifespan_context = mock_lifespan

    with TestClient(app) as test_client:
        response = test_client.get("/")
        assert response.status_code == 200
        assert response.json()["service"] == "L.O.V.E. Observer API"


@pytest.fixture
def mock_uvicorn():
    with patch("uvicorn.run") as mock:
        yield mock


def test_main_startup_block(
    mock_uvicorn,
):  # pylint: disable=unused-argument, redefined-outer-name
    """Test the main startup block (if __name__ == '__main__')."""
    try:
        with patch.object(sys, "argv", ["app/main.py"]):
            runpy.run_module("app.main", run_name="__main__")
    except SystemExit:
        pass
    except Exception:  # pylint: disable=broad-exception-caught
        pass

    mock_uvicorn.assert_called_once()

    args, kwargs = mock_uvicorn.call_args
    assert args[0] == "app.main:app"
    assert "host" in kwargs
    assert "port" in kwargs
    assert "reload" in kwargs
    assert "log_level" in kwargs
