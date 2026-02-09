import pytest

from app.core.settings import Settings


def test_settings_json_decode_error():
    """Test ALLOWED_ORIGINS_LIST handles JSON decode error."""
    # Assuming the logic is in the property access
    settings = Settings(ALLOWED_ORIGINS="invalid-json")
    # Default behavior fallback
    # Fallback to comma-separated string parsing
    assert "invalid-json" in settings.ALLOWED_ORIGINS_LIST


def test_get_settings_call():
    """Test get_settings convenience function."""
    from app.core.settings import get_settings

    assert isinstance(get_settings(), Settings)


def test_config_validation_openai_key():
    """Test validation error when OpenAI Key is missing."""
    with pytest.raises(ValueError, match="OPENAI_API_KEY must be set"):
        Settings(EMBEDDING_PROVIDER="openai", OPENAI_API_KEY="")
