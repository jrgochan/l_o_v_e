import pytest
import uuid
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import timedelta
from jose import jwt
from app.config import settings
from app.core import security
from app import database

# === Security Tests ===

def test_password_hashing():
    pwd = "secretpassword"
    with patch("app.core.security.pwd_context") as mock_pwd_context:
        mock_pwd_context.hash.return_value = "hashed_secret"
        mock_pwd_context.verify.return_value = True
        
        hashed = security.get_password_hash(pwd)
        assert hashed == "hashed_secret"
        
        valid = security.verify_password(pwd, hashed)
        assert valid
        
        mock_pwd_context.verify.return_value = False
        invalid = security.verify_password("wrong", hashed)
        assert not invalid

def test_create_access_token():
    data = {"sub": "user123"}
    token = security.create_access_token(data)
    decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert decoded["sub"] == "user123"
    assert "exp" in decoded

def test_create_access_token_custom_expiry():
    data = {"sub": "user123"}
    expires = timedelta(minutes=5)
    token = security.create_access_token(data, expires_delta=expires)
    decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert decoded["sub"] == "user123"

# === Database Tests ===

def test_uuid_factory():
    uid = database.uuid_factory()
    assert isinstance(uid, uuid.UUID)

@pytest.mark.asyncio
async def test_get_db_flow():
    # Mock session
    mock_session = AsyncMock()
    
    # Mock SessionLocal to return mock_session
    # AsyncSessionLocal is called as a function returning a context manager (async)?
    # No, async_sessionmaker instances are callable and return a session
    # But usually used as: async with AsyncSessionLocal() as session:
    
    # Let's patch AsyncSessionLocal in app.database
    with patch("app.database.AsyncSessionLocal") as mock_maker:
        # The mock_maker() return value should be an async context manager
        # whose __aenter__ returns mock_session
        mock_cm = AsyncMock()
        mock_cm.__aenter__.return_value = mock_session
        mock_cm.__aexit__.return_value = None
        
        mock_maker.return_value = mock_cm
        
        # Test generator
        gen = database.get_db()
        db = await anext(gen)
        
        assert db == mock_session
        
        # Finish generator (trigger finally)
        try:
            await anext(gen)
        except StopAsyncIteration:
            pass
            
        # Verify close called
        mock_session.close.assert_awaited_once()

@pytest.mark.asyncio
async def test_get_db_error():
    with patch("app.database.AsyncSessionLocal") as mock_maker:
        mock_session = AsyncMock()
        mock_cm = AsyncMock()
        mock_cm.__aenter__.return_value = mock_session
        mock_maker.return_value = mock_cm
        
        gen = database.get_db()
        db = await anext(gen)
        
        # Simulate exception during use
        try:
            await gen.athrow(Exception("DB Error"))
        except Exception:
            pass
            
        # Verify rollback called
        mock_session.rollback.assert_awaited_once()
        # Verify close called
        mock_session.close.assert_awaited_once()

@pytest.mark.asyncio
async def test_init_db():
    with patch("app.database.engine") as mock_engine:
        mock_conn = AsyncMock()
        mock_engine.begin.return_value.__aenter__.return_value = mock_conn
        
        # Mock settings.DEBUG
        with patch("app.database.settings") as mock_settings:
            mock_settings.DEBUG = True
            
            await database.init_db()
            
            # Verify create_all called (via run_sync)
            mock_conn.run_sync.assert_called()

@pytest.mark.asyncio
async def test_close_db():
    # Use AsyncMock for engine since dispose is awaited
    mock_engine = AsyncMock()
    with patch("app.database.engine", mock_engine):
        await database.close_db()
        mock_engine.dispose.assert_awaited_once()
