import json
from unittest.mock import AsyncMock, MagicMock, mock_open, patch

import pytest
import typer
from sqlalchemy.exc import SQLAlchemyError

from app.commands.seed import seed_bootstrap_logic, seed_users_logic, users
from app.models.user import User


@pytest.fixture
def mock_db_session():
    session = AsyncMock()
    # Mock execute result for user lookup
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = None  # Default: user not found
    session.execute.return_value = mock_result
    session.add = MagicMock()
    return session


@pytest.fixture
def mock_session_ctx(mock_db_session):
    mock_cls = MagicMock()
    mock_cls.return_value.__aenter__.return_value = mock_db_session
    mock_cls.return_value.__aexit__.return_value = None
    return mock_cls


@pytest.mark.asyncio
async def test_seed_users_create_new(mock_db_session, mock_session_ctx):
    """Test creating new users."""
    with patch("app.commands.seed.AsyncSessionLocal", mock_session_ctx):
        with patch("app.commands.seed.get_password_hash", return_value="hashed"):
            result = await seed_users_logic()

    assert result is True
    # Should create 2 users (Admin and Demo)
    assert mock_db_session.add.call_count == 2
    mock_db_session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_seed_users_update_existing(mock_db_session, mock_session_ctx):
    """Test updating existing users."""
    # Mock existing user
    existing_user = MagicMock(spec=User)
    existing_user.email = "admin@admin.com"

    # Check return val logic
    # We need execute to return existing_user for both calls
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = existing_user
    mock_db_session.execute.return_value = mock_result

    with patch("app.commands.seed.AsyncSessionLocal", mock_session_ctx):
        with patch("app.commands.seed.get_password_hash", return_value="newhash"):
            result = await seed_users_logic()

    assert result is True
    # Should NOT add new users
    mock_db_session.add.assert_not_called()
    # Should commit updates
    mock_db_session.commit.assert_awaited_once()
    # Check password update
    assert existing_user.password_hash == "newhash"


@pytest.mark.asyncio
async def test_seed_users_error(mock_db_session, mock_session_ctx):
    """Test DB error during seeding."""
    mock_db_session.commit.side_effect = SQLAlchemyError("DB Fail")

    with patch("app.commands.seed.AsyncSessionLocal", mock_session_ctx):
        with patch("app.commands.seed.get_password_hash", return_value="hashed"):
            result = await seed_users_logic()

    assert result is False
    mock_db_session.rollback.assert_awaited_once()


def test_users_command():
    """Test users command wrapper."""

    def mock_run_side_effect(coro):
        coro.close()
        return True

    with patch("app.commands.seed.asyncio.run", side_effect=mock_run_side_effect) as mock_run:
        users()
        mock_run.assert_called_once()

    # Test failure exit
    with patch("app.commands.seed.asyncio.run", return_value=False):
        with pytest.raises(typer.Exit):
            users()


@pytest.mark.asyncio
async def test_seed_bootstrap_file_not_found():
    """Test bootstrap file missing."""
    with patch("pathlib.Path.exists", return_value=False):
        result = await seed_bootstrap_logic(dry_run=False, verify_only=False)
        assert result is False


@pytest.mark.asyncio
async def test_seed_bootstrap_json_error():
    """Test bad JSON."""
    with patch("pathlib.Path.exists", return_value=True):
        with patch("builtins.open", mock_open(read_data="{invalid_json")):
            # pathlib.read_text uses open
            with patch(
                "pathlib.Path.read_text",
                side_effect=json.JSONDecodeError("msg", "doc", 0),
            ):
                result = await seed_bootstrap_logic(dry_run=False, verify_only=False)
                assert result is False


@pytest.mark.asyncio
async def test_seed_bootstrap_success(mock_session_ctx):
    """Test successful bootstrap flow."""
    valid_json = '{"patterns": []}'

    with patch("pathlib.Path.exists", return_value=True):
        with patch("pathlib.Path.read_text", return_value=valid_json):
            with patch("app.commands.seed.AsyncSessionLocal", mock_session_ctx):
                result = await seed_bootstrap_logic(dry_run=True, verify_only=False)
                assert result is True

                # Test verify only
                result_verify = await seed_bootstrap_logic(dry_run=False, verify_only=True)
                assert result_verify is True


@pytest.mark.asyncio
async def test_seed_bootstrap_db_error(mock_session_ctx):
    """Test execution error in bootstrap leading to rollback (Lines 167-169)."""
    # We force an error by patching logger.info to raise SQLAlchemyError
    # This simulates a DB error occurring during the process
    from sqlalchemy.exc import SQLAlchemyError

    with patch("pathlib.Path.exists", return_value=True):
        with patch("pathlib.Path.read_text", return_value="{}"):
            with patch("app.commands.seed.AsyncSessionLocal", mock_session_ctx):
                # Target the logger info call inside the try block
                # Use a robust side effect that raises only on the specific message
                def logger_side_effect(*args, **kwargs):
                    if args and isinstance(args[0], str) and args[0].startswith("Seeding from"):
                        raise SQLAlchemyError("DB Error")

                with patch("app.commands.seed.logger.info", side_effect=logger_side_effect):
                    result = await seed_bootstrap_logic(dry_run=False, verify_only=False)
                    assert result is False


def test_bootstrap_commands_with_runner():
    """Test bootstrap command success and failure using CliRunner."""
    from typer.testing import CliRunner

    from app.commands.seed import app

    runner = CliRunner()

    # Success Case
    def mock_run_success(coro):
        coro.close()
        return True

    with patch("app.commands.seed.asyncio.run", side_effect=mock_run_success):
        result = runner.invoke(app, ["bootstrap", "--dry-run"])
        assert result.exit_code == 0

    # Failure Case
    def mock_run_fail(coro):
        coro.close()
        return False

    with patch("app.commands.seed.asyncio.run", side_effect=mock_run_fail):
        result = runner.invoke(app, ["bootstrap"])
        assert result.exit_code == 1


def test_users_command_with_runner():
    """Test users command success and failure using CliRunner."""
    from typer.testing import CliRunner

    from app.commands.seed import app

    runner = CliRunner()

    # Success Case
    def mock_run_success(coro):
        coro.close()
        return True

    with patch("app.commands.seed.asyncio.run", side_effect=mock_run_success):
        result = runner.invoke(app, ["users"])
        assert result.exit_code == 0

    # Failure Case
    def mock_run_fail(coro):
        coro.close()
        return False

    with patch("app.commands.seed.asyncio.run", side_effect=mock_run_fail):
        result = runner.invoke(app, ["users"])
        assert result.exit_code == 1


@pytest.mark.asyncio
async def test_seed_users_no_users_logic(mock_session_ctx):
    """Test 'No new users created' path (Line 75)."""
    # Patch the module level constant to empty list
    with patch("app.commands.seed.USERS_TO_SEED", []):
        with patch("app.commands.seed.AsyncSessionLocal", mock_session_ctx):
            result = await seed_users_logic()
            assert result is True
            # Check that no users were added
            mock_session = mock_session_ctx.return_value.__aenter__.return_value
            mock_session.add.assert_not_called()
            # Should NOT commit if count is 0
            mock_session.commit.assert_not_called()
