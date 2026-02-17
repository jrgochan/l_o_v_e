import pytest
from pydantic import ValidationError

from app.core.settings import Settings


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
    from app.core.settings import get_settings  # pylint: disable=import-outside-toplevel

    s = get_settings()
    assert isinstance(s, Settings)


def test_assemble_db_connection_builds_url():
    """Cover line 41 — DATABASE_URL assembled from components when not set."""
    s = Settings(DATABASE_URL=None)
    assert s.DATABASE_URL is not None
    assert "postgresql+asyncpg://" in s.DATABASE_URL
    assert "love_user" in s.DATABASE_URL


def test_love_base_settings_fallback():
    """Cover lines 14-16 — ImportError fallback to BaseSettings."""
    import importlib  # pylint: disable=import-outside-toplevel
    import sys  # pylint: disable=import-outside-toplevel

    # pylint: disable=import-outside-toplevel
    from pydantic_settings import BaseSettings as _BaseSettings

    saved_settings = sys.modules.pop("settings", None)
    saved_config = sys.modules.pop("app.core.settings", None)
    try:
        sys.modules["settings"] = None
        # pylint: disable=import-outside-toplevel
        import app.core.settings as reloaded  # noqa: F811

        assert reloaded.LoveBaseSettings is _BaseSettings
        instance = reloaded.Settings()
        assert instance.APP_NAME == "L.O.V.E. Observer API"
    finally:
        sys.modules.pop("settings", None)
        sys.modules.pop("app.core.settings", None)
        if saved_settings is not None:
            sys.modules["settings"] = saved_settings
        if saved_config is not None:
            sys.modules["app.core.settings"] = saved_config
        else:
            importlib.import_module("app.core.settings")
