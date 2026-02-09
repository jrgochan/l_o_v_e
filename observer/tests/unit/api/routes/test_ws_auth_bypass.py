from unittest.mock import AsyncMock, MagicMock

import pytest

from app.api.deps import get_current_user_ws


@pytest.mark.asyncio
async def test_dev_token_bypass_missing_user_bug_repro():
    """Test dev-token-bypass when user does not exist (Reproduction of fix requirement).

    Currently, if user is missing, it falls through to JWT decoding which fails.
    We want it to auto-create the user.
    """
    mock_db = AsyncMock()

    # Simulate DB returning None for user lookup
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = mock_result

    # Mocks for user creation
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    # With the fix, this should create the user and return it
    user = await get_current_user_ws("dev-token-bypass", mock_db)

    assert user is not None
    assert user.email == "dev@admin.com"
    assert user.role == "admin"  # UserRole.ADMIN enum value

    # Verify creation happened
    mock_db.add.assert_called_once()
    mock_db.commit.assert_awaited_once()
    mock_db.refresh.assert_awaited_once()
