from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.api.routes import consent
from app.models.user import User


@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.fixture
def mock_user():
    user = MagicMock(spec=User)
    user.id = "user_id"
    return user


@pytest.fixture
def mock_request():
    req = MagicMock()
    req.client.host = "127.0.0.1"
    return req


@pytest.mark.asyncio
async def test_list_policies():
    res = await consent.list_policies()
    assert "policies" in res
    assert isinstance(res["policies"], list)


@pytest.mark.asyncio
async def test_grant_consents_success(mock_db, mock_user, mock_request):
    with patch("app.api.routes.consent.ConsentService") as MockService:
        mock_service = MockService.return_value
        mock_record = MagicMock()
        mock_record.to_dict.return_value = {"id": "123", "key": "terms_of_service"}
        mock_service.grant_bulk = AsyncMock(return_value=[mock_record])

        body = MagicMock()
        body.policy_keys = ["terms_of_service"]

        res = await consent.grant_consents(body, mock_user, mock_db, mock_request)

        assert mock_db.commit.called
        assert len(res["granted"]) == 1
        assert res["granted"][0]["key"] == "terms_of_service"


@pytest.mark.asyncio
async def test_grant_consents_unknown_policy(mock_db, mock_user, mock_request):
    body = MagicMock()
    body.policy_keys = ["non_existent_policy"]

    with pytest.raises(HTTPException) as exc:
        await consent.grant_consents(body, mock_user, mock_db, mock_request)
    assert exc.value.status_code == 422
    assert "Unknown consent policies" in exc.value.detail


@pytest.mark.asyncio
async def test_revoke_consent_unknown_policy(mock_db, mock_user, mock_request):
    with pytest.raises(HTTPException) as exc:
        await consent.revoke_consent("non_existent_policy", mock_user, mock_db, mock_request)
    assert exc.value.status_code == 404
    assert "Unknown consent policy" in exc.value.detail


@pytest.mark.asyncio
async def test_revoke_consent_not_granted(mock_db, mock_user, mock_request):
    with patch("app.api.routes.consent.ConsentService") as MockService:
        mock_service = MockService.return_value
        mock_service.revoke_consent = AsyncMock(return_value=None)

        with pytest.raises(HTTPException) as exc:
            await consent.revoke_consent("terms_of_service", mock_user, mock_db, mock_request)
        assert exc.value.status_code == 404
        assert "No active consent found" in exc.value.detail


@pytest.mark.asyncio
async def test_revoke_consent_success(mock_db, mock_user, mock_request):
    with patch("app.api.routes.consent.ConsentService") as MockService:
        mock_service = MockService.return_value
        mock_record = MagicMock()
        mock_record.to_dict.return_value = {
            "key": "terms_of_service",
            "status": "revoked",
        }
        mock_service.revoke_consent = AsyncMock(return_value=mock_record)

        res = await consent.revoke_consent("terms_of_service", mock_user, mock_db, mock_request)

        assert mock_db.commit.called
        assert res["revoked"]["status"] == "revoked"


@pytest.mark.asyncio
async def test_get_my_consent_status(mock_db, mock_user):
    with patch("app.api.routes.consent.ConsentService") as MockService:
        mock_service = MockService.return_value
        mock_service.get_consent_status = AsyncMock(return_value={"granted": [], "missing": []})

        res = await consent.get_my_consent_status(mock_user, mock_db)

        assert "granted" in res
        assert "missing" in res
