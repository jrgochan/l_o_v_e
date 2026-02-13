"""Unit tests for config module."""

from unittest.mock import patch

from app.config import Settings


def test_allowed_origins_list_json() -> None:
    """Test allowed_origins_list parses valid JSON array."""
    with patch.dict(
        "os.environ",
        {"ALLOWED_ORIGINS": '["http://a.com", "http://b.com"]'},
        clear=False,
    ):
        settings = Settings()
        result = settings.allowed_origins_list
        assert result == ["http://a.com", "http://b.com"]


def test_allowed_origins_list_csv_fallback() -> None:
    """Test allowed_origins_list falls back to CSV when JSON is invalid (lines 157-158)."""
    with patch.dict(
        "os.environ",
        {"ALLOWED_ORIGINS": "http://a.com, http://b.com"},
        clear=False,
    ):
        settings = Settings()
        result = settings.allowed_origins_list
        assert result == ["http://a.com", "http://b.com"]
