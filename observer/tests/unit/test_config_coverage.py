import pytest
from pydantic import ValidationError

from app.config import Settings


def test_settings_db_url_override():
    """Test that DATABASE_URL is preserved if provided."""
    # Ensure DATABASE_URL is not overwritten
    s = Settings(DATABASE_URL="postgresql+asyncpg://user:pass@host:5432/db")
    assert s.DATABASE_URL == "postgresql+asyncpg://user:pass@host:5432/db"


def test_listener_api_url_property():
    """Test LISTENER_API_URL property."""
    s = Settings(LISTENER_URL="http://test:1234")
    assert s.LISTENER_API_URL == "http://test:1234"


def test_allowed_origins_fallback():
    """Test allowed origins fallback to comma-separated string."""
    s = Settings(ALLOWED_ORIGINS="http://a.com, http://b.com")
    assert s.ALLOWED_ORIGINS_LIST == ["http://a.com", "http://b.com"]


def test_embedding_config_validation():
    """Test validation of OpenAI config."""
    # Should raise error if openai provider but no key
    with pytest.raises(ValidationError):
        Settings(EMBEDDING_PROVIDER="openai", OPENAI_API_KEY="")


def test_embedding_dimension_property():
    """Test embedding dimension property lookup."""
    s = Settings(EMBEDDING_MODEL="all-mpnet-base-v2")
    assert s.EMBEDDING_DIMENSION == 768

    s = Settings(EMBEDDING_MODEL="unknown")
    assert s.EMBEDDING_DIMENSION == 384


def test_get_settings_helper():
    """Test get_settings helper."""
    from app.config import get_settings

    s = get_settings()
    assert isinstance(s, Settings)
