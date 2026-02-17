from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.api.routes.auth import login_for_access_token, refresh_token, register_user
from app.schemas.user import UserCreate


@pytest.fixture
def mock_db():
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.delete = MagicMock()
    mock_db.commit = AsyncMock()
    return mock_db


@pytest.fixture
def mock_user():
    user = MagicMock()
    user.email = "test@example.com"
    user.password_hash = "hashed_secret"
    user.is_active = True
    user.role.value = "user"
    return user


@pytest.mark.asyncio
async def test_login_success(mock_db, mock_user):
    form_data = MagicMock()
    form_data.username = "test@example.com"
    form_data.password = "secret"

    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = mock_user
    mock_db.execute.return_value = mock_result

    with (
        patch("app.api.routes.auth.verify_password", return_value=True),
        patch("app.api.routes.auth.create_access_token", return_value="token"),
        patch("app.api.routes.auth.ConsentService") as MockConsentService,
    ):
        # Mock no missing consents
        consent_svc = MockConsentService.return_value
        consent_svc.get_missing_required = AsyncMock(return_value=[])

        response = await login_for_access_token(form_data, mock_db)
        assert response["access_token"] == "token"
        assert "consent_required" not in response


@pytest.mark.asyncio
async def test_login_failures(mock_db, mock_user):
    form_data = MagicMock()
    form_data.username = "test@example.com"
    form_data.password = "secret"

    # 1. User not found
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = mock_result

    with pytest.raises(HTTPException) as exc:
        await login_for_access_token(form_data, mock_db)
    assert exc.value.status_code == 401

    # 2. Wrong password
    mock_result.scalars.return_value.first.return_value = mock_user
    with patch("app.api.routes.auth.verify_password", return_value=False):
        with pytest.raises(HTTPException) as exc:
            await login_for_access_token(form_data, mock_db)
        assert exc.value.status_code == 401

    # 3. Inactive user
    mock_user.is_active = False
    with patch("app.api.routes.auth.verify_password", return_value=True):
        with pytest.raises(HTTPException) as exc:
            await login_for_access_token(form_data, mock_db)
        assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_register_success(mock_db):
    user_in = UserCreate(email="new@example.com", password="Password123!", full_name="New User")

    # User does not exist
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = mock_result

    with patch("app.api.routes.auth.get_password_hash", return_value="hashed"):
        response = await register_user(user_in, mock_db)

        # Should call db.add and commit
        mock_db.add.assert_called_once()
        mock_db.commit.assert_awaited_once()
        assert response.email == "new@example.com"


@pytest.mark.asyncio
async def test_register_duplicate(mock_db, mock_user):
    user_in = UserCreate(email="test@example.com", password="Password123!", full_name="Test")

    # User exists
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = mock_user
    mock_db.execute.return_value = mock_result

    with pytest.raises(HTTPException) as exc:
        await register_user(user_in, mock_db)
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_refresh_token_success(mock_user):
    """Test refresh endpoint returns a new token (lines 95-101)."""
    mock_user.role = "user"

    with patch("app.api.routes.auth.create_access_token", return_value="refreshed_token"):
        response = await refresh_token(mock_user)

    assert response["access_token"] == "refreshed_token"
    assert response["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_consent_required(mock_db, mock_user):
    """Test login execution path when consents are missing (lines 60-64)."""
    form_data = MagicMock()
    form_data.username = "test@example.com"
    form_data.password = "secret"

    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = mock_user
    mock_db.execute.return_value = mock_result

    # Mock Consent Service
    with patch("app.api.routes.auth.ConsentService") as MockConsentService:
        consent_svc = MockConsentService.return_value
        # Mock missing consents
        missing_policy = MagicMock()
        missing_policy.to_dict.return_value = {"id": "policy_1"}
        consent_svc.get_missing_required = AsyncMock(return_value=[missing_policy])

        with (
            patch("app.api.routes.auth.verify_password", return_value=True),
            patch("app.api.routes.auth.create_access_token", return_value="token"),
        ):
            response = await login_for_access_token(form_data, mock_db)

            assert response["access_token"] == "token"
            assert response["consent_required"] is True
            assert response["outstanding_policies"] == [{"id": "policy_1"}]


@pytest.mark.asyncio
async def test_register_disabled(mock_db):
    """Test registration when disabled (lines 73-77)."""
    user_in = UserCreate(email="new@example.com", password="Password123!", full_name="New User")

    with patch("app.api.routes.auth.settings") as mock_settings:
        mock_settings.REGISTRATION_ENABLED = False

        with pytest.raises(HTTPException) as exc:
            await register_user(user_in, mock_db)

        assert exc.value.status_code == 403
        assert "disabled" in str(exc.value.detail)


@pytest.mark.asyncio
async def test_register_with_consents(mock_db):
    """Test registration with consents payload (lines 103-109)."""
    # Create user input with consents
    user_in = UserCreate(
        email="consent@example.com",
        password="Password123!",
        full_name="Consent User",
        consents=["policy_1", "policy_2"],
    )

    # Mock user does not exist
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = mock_result

    with patch("app.api.routes.auth.settings") as mock_settings:
        mock_settings.REGISTRATION_ENABLED = True

        with patch("app.api.routes.auth.get_password_hash", return_value="hashed"):
            with patch("app.api.routes.auth.ConsentService") as MockConsentService:
                consent_svc = MockConsentService.return_value
                consent_svc.grant_bulk = AsyncMock()

                await register_user(user_in, mock_db)

                # Check execution of grant_bulk
                consent_svc.grant_bulk.assert_awaited_once()
                call_args = consent_svc.grant_bulk.call_args
                assert call_args[0][1] == ["policy_1", "policy_2"]
