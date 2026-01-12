
import pytest
from app.config import settings, Settings

def test_settings_json_decode_error():
    """Test ALLOWED_ORIGINS_LIST handles JSON decode error."""
    # Assuming the logic is in the property access
    settings = Settings(ALLOWED_ORIGINS="invalid-json")
    # Default behavior fallback
    assert "http://localhost:3000" in settings.ALLOWED_ORIGINS_LIST

def test_get_settings_call():
    """Test get_settings convenience function."""
    from app.config import get_settings
    assert isinstance(get_settings(), Settings)
