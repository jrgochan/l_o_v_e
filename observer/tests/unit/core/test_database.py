
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app import database
from app.database import get_db, init_db, close_db

@pytest.mark.asyncio
async def test_database_init_success():
    """Test successful database initialization."""
    mock_engine = AsyncMock()
    
    class AsyncConnContext:
        def __init__(self):
            self.conn = AsyncMock()
        async def __aenter__(self):
            return self.conn
        async def __aexit__(self, exc_type, exc, tb):
            pass
            
    mock_ctx = AsyncConnContext()
    mock_engine.begin = MagicMock(return_value=mock_ctx)
    
    with patch("app.database.engine", mock_engine):
        with patch("app.config.settings.DEBUG", True):
            await database.init_db()
            
        mock_ctx.conn.run_sync.assert_called_once()

@pytest.mark.asyncio
async def test_database_init_failure():
    """Test database initialization failure."""
    mock_engine = AsyncMock()
    mock_engine.begin = MagicMock(side_effect=Exception("DB Error"))
    
    with patch("app.database.engine", mock_engine):
        with pytest.raises(Exception, match="DB Error"):
            await database.init_db()

@pytest.mark.asyncio
async def test_database_init_prod_skip():
    """Test prod skip."""
    mock_engine = AsyncMock()
    
    class AsyncConnContext:
        def __init__(self):
            self.conn = AsyncMock()
        async def __aenter__(self):
            return self.conn
        async def __aexit__(self, exc_type, exc, tb):
            pass
            
    mock_ctx = AsyncConnContext()
    mock_engine.begin = MagicMock(return_value=mock_ctx)
    
    with patch("app.database.engine", mock_engine):
        with patch("app.config.settings.DEBUG", False):
            await database.init_db()
            
        mock_ctx.conn.run_sync.assert_not_called()

@pytest.mark.asyncio
async def test_database_close():
    """Test close."""
    mock_engine = AsyncMock()
    with patch("app.database.engine", mock_engine):
        await database.close_db()
        mock_engine.dispose.assert_awaited_once()

@pytest.mark.asyncio
async def test_get_db_generator():
    """Test get_db."""
    mock_session = AsyncMock()
    mock_session_cls = MagicMock()
    
    mock_session_cls.return_value.__aenter__.return_value = mock_session
    mock_session_cls.return_value.__aexit__.return_value = None

    with patch("app.database.AsyncSessionLocal", mock_session_cls):
        gen = database.get_db()
        db = await anext(gen)
        assert db == mock_session
        
        try:
            await anext(gen)
        except StopAsyncIteration:
            pass
        mock_session.close.assert_awaited_once()
    
    # Test error path (rollback)
    mock_session.reset_mock()
    mock_session_cls.return_value.__aenter__.return_value = mock_session
    
    with patch("app.database.AsyncSessionLocal", mock_session_cls):
        gen = database.get_db()
        db = await anext(gen)
        
        try:
            await gen.athrow(Exception("Route Error"))
        except Exception:
            pass
            
        mock_session.rollback.assert_awaited_once()
