import logging
import runpy
from unittest.mock import patch

import pytest
from typer.testing import CliRunner

from app.cli import app, main

runner = CliRunner()


def test_cli_main_callback():
    """Test the main callback sets logging level."""
    # Test with verbose=True
    with patch("logging.basicConfig") as mock_logging:
        result = runner.invoke(app, ["--verbose", "seed", "--help"])
        assert result.exit_code == 0
        mock_logging.assert_called_with(level=logging.DEBUG, format="%(message)s")

    # Test with verbose=False (default)
    with patch("logging.basicConfig") as mock_logging:
        result = runner.invoke(app, ["seed", "--help"])
        assert result.exit_code == 0
        # Typer might not call the callback if help is invoked immediately on subcommand?
        # Let's invoke the callback directly to be sure logic is tested
        main(verbose=False)
        mock_logging.assert_called_with(level=logging.INFO, format="%(message)s")


def test_cli_execution_block():
    """Test line 26: app() is called when run as __main__."""
    with patch("typer.Typer") as mock_typer:
        mock_app_instance = mock_typer.return_value
        try:
            runpy.run_module("app.cli", run_name="__main__")
        except Exception as e:  # pylint: disable=broad-exception-caught
            pytest.fail(f"Failed to run app.cli: {e}")

        # Verify the app instance (created by Typer()) was called
        mock_app_instance.assert_called_once()
