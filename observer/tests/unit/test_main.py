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
