"""Unit tests for config module."""

import importlib
import sys
from unittest.mock import patch

from pydantic_settings import BaseSettings as _BaseSettings

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


def test_fallback_to_base_settings_when_shared_missing() -> None:
    """Cover the ImportError fallback on lines 54-55 of config.py."""
    saved_settings = sys.modules.pop("settings", None)
    saved_config = sys.modules.pop("app.config", None)
    try:
        sys.modules["settings"] = None  # type: ignore[assignment]
        import app.config as reloaded_config  # noqa: F811 # pylint: disable=import-outside-toplevel

        assert reloaded_config.LoveBaseSettings is _BaseSettings  # type: ignore[attr-defined]
        instance = reloaded_config.Settings()
        assert instance.PORT == 8002
    finally:
        sys.modules.pop("settings", None)
        sys.modules.pop("app.config", None)
        if saved_settings is not None:
            sys.modules["settings"] = saved_settings
        if saved_config is not None:
            sys.modules["app.config"] = saved_config
        else:
            importlib.import_module("app.config")
