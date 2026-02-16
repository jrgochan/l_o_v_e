"""Tests for app.config — Settings and LoveBaseSettings fallback."""

import importlib
import sys
from unittest.mock import patch

from app.config import Settings, settings


class TestSettingsDefaults:
    """Verify default settings values are loaded correctly."""

    def test_settings_instance_exists(self) -> None:
        assert settings is not None

    def test_epsilon_default(self) -> None:
        assert settings.EPSILON == 1e-6

    def test_flooding_threshold_default(self) -> None:
        assert settings.FLOODING_THRESHOLD == 2.0

    def test_default_slerp_steps(self) -> None:
        assert settings.DEFAULT_SLERP_STEPS == 60

    def test_smoothing_alpha_default(self) -> None:
        assert settings.SMOOTHING_ALPHA == 0.1

    def test_api_title(self) -> None:
        assert settings.API_TITLE == "L.O.V.E. Versor Engine"

    def test_log_level_default(self) -> None:
        assert settings.LOG_LEVEL == "INFO"

    def test_debug_default(self) -> None:
        assert settings.DEBUG is False

    def test_cors_origins_contains_localhost(self) -> None:
        assert "http://localhost:3000" in settings.CORS_ORIGINS


class TestLoveBaseSettingsFallback:
    """Cover the ImportError fallback on lines 50-53 of config.py."""

    def test_fallback_to_base_settings_when_shared_missing(self) -> None:
        """When ``settings`` module is absent, Settings should still work
        by falling back to plain ``BaseSettings``."""
        from pydantic_settings import BaseSettings as _BaseSettings

        # Remove 'settings' from sys.modules and block it
        saved_settings = sys.modules.pop("settings", None)
        saved_config = sys.modules.pop("app.config", None)
        try:
            # Blocking the module: setting to None causes ImportError on import
            sys.modules["settings"] = None  # type: ignore[assignment]
            # Re-import app.config from scratch so the try/except runs fresh
            import app.config as reloaded_config  # noqa: F811

            # The fallback should have set LoveBaseSettings = BaseSettings
            assert reloaded_config.LoveBaseSettings is _BaseSettings
            instance = reloaded_config.Settings()
            assert instance.EPSILON == 1e-6
        finally:
            # Clean up: remove blocked module entry
            sys.modules.pop("settings", None)
            sys.modules.pop("app.config", None)
            # Restore originals
            if saved_settings is not None:
                sys.modules["settings"] = saved_settings
            if saved_config is not None:
                sys.modules["app.config"] = saved_config
            else:
                # Force re-import to restore normal state
                importlib.import_module("app.config")
