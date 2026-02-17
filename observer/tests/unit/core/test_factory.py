"""Tests for app.core.factory — import fallbacks for exceptions and tracing."""

import importlib
import sys


class TestImportFallbacks:
    """Cover the ImportError fallback branches for exceptions/tracing."""

    def test_fallback_when_exceptions_and_tracing_missing(self) -> None:
        """When ``exceptions`` and ``tracing`` modules cannot be imported,
        the dummy fallbacks should be defined and create_app should still work."""
        saved_factory = sys.modules.pop("app.core.factory", None)
        saved_exceptions = sys.modules.pop("exceptions", None)
        saved_tracing = sys.modules.pop("tracing", None)
        try:
            # Block both modules so the except branches run
            sys.modules["exceptions"] = None  # type: ignore[assignment]
            sys.modules["tracing"] = None  # type: ignore[assignment]
            # Fresh import to hit the fallback definitions
            import app.core.factory as factory_mod  # noqa: F811

            app = factory_mod.create_app()
            assert app is not None
        finally:
            # Cleanup blocked entries
            for mod_name in ("exceptions", "tracing", "app.core.factory"):
                sys.modules.pop(mod_name, None)
            # Restore originals
            if saved_exceptions is not None:
                sys.modules["exceptions"] = saved_exceptions
            if saved_tracing is not None:
                sys.modules["tracing"] = saved_tracing
            if saved_factory is not None:
                sys.modules["app.core.factory"] = saved_factory
            else:
                importlib.import_module("app.core.factory")

    def test_fallback_when_security_missing(self) -> None:
        """When ``app.core.security`` cannot be imported, the dummy fallback
        should be defined and used."""
        saved_factory = sys.modules.pop("app.core.factory", None)
        saved_security = sys.modules.pop("app.core.security", None)

        try:
            # Block security module
            sys.modules["app.core.security"] = None  # type: ignore[assignment]

            # Fresh import
            import app.core.factory as factory_mod

            # Verify fallback is used
            # We can check __doc__ or compare against expected dummy
            assert (
                factory_mod.setup_rate_limiting.__doc__  # type: ignore[attr-defined]
                == "Set up dummy rate limiting for when security module is missing."
            )

            # Ensure app creation still works
            app = factory_mod.create_app()
            assert app is not None

        finally:
            # Cleanup
            sys.modules.pop("app.core.factory", None)
            sys.modules.pop("app.core.security", None)

            # Restore
            if saved_security is not None:
                sys.modules["app.core.security"] = saved_security

            if saved_factory is not None:
                sys.modules["app.core.factory"] = saved_factory
            else:
                importlib.import_module("app.core.factory")
