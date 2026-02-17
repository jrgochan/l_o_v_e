"""Tests for app.core.factory — factory function and import fallbacks."""

import importlib
import sys

from app.core.factory import create_app


class TestCreateApp:
    """Verify the factory produces a working FastAPI application."""

    def test_create_app_returns_fastapi(self) -> None:
        application = create_app()
        assert application is not None
        assert application.title == "L.O.V.E. Versor Engine"

    def test_app_has_cors_middleware(self) -> None:
        application = create_app()
        middleware_classes = [
            getattr(m.cls, "__name__", str(m.cls)) for m in application.user_middleware
        ]
        assert "CORSMiddleware" in middleware_classes


class TestImportFallbacks:
    """Cover the ImportError fallback branches for security/tracing."""

    def test_fallback_when_security_and_tracing_missing(self) -> None:
        """When ``security`` and ``tracing`` modules cannot be imported,
        the dummy fallbacks should be defined and create_app should still work."""
        saved_factory = sys.modules.pop("app.core.factory", None)
        saved_security = sys.modules.pop("security", None)
        saved_tracing = sys.modules.pop("tracing", None)
        try:
            # Block both modules so the except branches run
            sys.modules["security"] = None  # type: ignore[assignment]
            sys.modules["tracing"] = None  # type: ignore[assignment]
            # Fresh import to hit the fallback definitions
            import app.core.factory as factory_mod  # noqa: F811, E501 # pylint: disable=import-outside-toplevel

            app = factory_mod.create_app()
            assert app is not None
        finally:
            # Cleanup blocked entries
            sys.modules.pop("security", None)
            sys.modules.pop("tracing", None)
            sys.modules.pop("app.core.factory", None)
            # Restore originals
            if saved_security is not None:
                sys.modules["security"] = saved_security
            if saved_tracing is not None:
                sys.modules["tracing"] = saved_tracing
            if saved_factory is not None:
                sys.modules["app.core.factory"] = saved_factory
            else:
                importlib.import_module("app.core.factory")
