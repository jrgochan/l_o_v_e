"""Tests for app.core.factory — factory function and import fallbacks."""

import importlib
import sys


class TestCreateApp:
    """Verify the factory produces a working FastAPI application."""

    def test_create_app_returns_fastapi(self) -> None:
        from app.core.factory import create_app

        application = create_app()
        assert application is not None
        assert "listener" in application.title.lower() or application.title != ""


class TestImportFallbacks:
    """Cover the ImportError fallback branches for security, exceptions, and tracing."""

    def test_fallback_when_all_optional_modules_missing(self) -> None:
        """When ``security``, ``exceptions``, and ``tracing`` modules cannot
        be imported, the dummy fallbacks should be defined and create_app
        should still work."""
        saved_factory = sys.modules.pop("app.core.factory", None)
        saved_security = sys.modules.pop("security", None)
        saved_exceptions = sys.modules.pop("exceptions", None)
        saved_tracing = sys.modules.pop("tracing", None)
        try:
            # Block all three modules so the except branches run
            sys.modules["security"] = None  # type: ignore[assignment]
            sys.modules["exceptions"] = None  # type: ignore[assignment]
            sys.modules["tracing"] = None  # type: ignore[assignment]
            # Fresh import to hit the fallback definitions
            import app.core.factory as factory_mod  # noqa: F811

            app = factory_mod.create_app()
            assert app is not None
        finally:
            # Cleanup blocked entries
            for mod_name in ("security", "exceptions", "tracing", "app.core.factory"):
                sys.modules.pop(mod_name, None)
            # Restore originals
            if saved_security is not None:
                sys.modules["security"] = saved_security
            if saved_exceptions is not None:
                sys.modules["exceptions"] = saved_exceptions
            if saved_tracing is not None:
                sys.modules["tracing"] = saved_tracing
            if saved_factory is not None:
                sys.modules["app.core.factory"] = saved_factory
            else:
                importlib.import_module("app.core.factory")
