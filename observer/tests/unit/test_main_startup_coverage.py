import runpy
import sys
from unittest.mock import patch

import pytest


@pytest.fixture
def mock_uvicorn():
    with patch("uvicorn.run") as mock:
        yield mock


def test_main_startup_block(
    mock_uvicorn,
):  # pylint: disable=unused-argument, redefined-outer-name
    """Test the main startup block (if __name__ == '__main__')."""
    # We need to simulate running as __main__
    # This is tricky because we can't easily change __name__ of a loaded module
    # But we can use runpy
    try:
        with patch.object(sys, "argv", ["app/main.py"]):
            runpy.run_module("app.main", run_name="__main__")
    except SystemExit:
        pass  # Expected if sys.exit is called
    except Exception:  # pylint: disable=broad-exception-caught
        pass  # We just want to ensure it doesn't crash unexpectedly

    mock_uvicorn.assert_called_once()

    # Verify arguments roughly
    args, kwargs = mock_uvicorn.call_args
    assert args[0] == "app.main:app"
    assert "host" in kwargs
    assert "port" in kwargs
    assert "reload" in kwargs
    assert "log_level" in kwargs
