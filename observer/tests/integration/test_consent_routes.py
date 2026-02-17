import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.no_auth_override


@pytest.mark.integration
async def test_list_policies(client: AsyncClient):
    """Public endpoint should return all policies."""
    response = await client.get("/consent/policies")
    assert response.status_code == 200
    data = response.json()
    assert "policies" in data
    assert len(data["policies"]) >= 5

    # Check structure
    policy = data["policies"][0]
    assert "key" in policy
    assert "title" in policy
    assert "required" in policy


@pytest.mark.integration
async def test_grant_consent(client: AsyncClient, user_token: str):
    """Authenticated user can grant consent."""
    headers = {"Authorization": f"Bearer {user_token}"}

    # 1. Check status - should be missing
    res = await client.get("/consent/me", headers=headers)
    assert res.status_code == 200
    status = res.json()
    assert len(status["granted"]) == 0
    assert len(status["missing"]) > 0

    # 2. Grant consent
    payload = {"policy_keys": ["terms_of_service"]}
    res = await client.post("/consent/me", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data["granted"]) == 1
    assert data["granted"][0]["consent_type"] == "terms_of_service"

    # 3. Verify DB
    # We need to query the DB directly to be sure, or trust GET /me
    res = await client.get("/consent/me", headers=headers)
    status = res.json()
    granted_keys = [p["key"] for p in status["granted"]]
    assert "terms_of_service" in granted_keys


@pytest.mark.integration
async def test_revoke_consent(client: AsyncClient, user_token: str):
    """Authenticated user can revoke consent."""
    headers = {"Authorization": f"Bearer {user_token}"}

    # Grant first
    await client.post(
        "/consent/me", json={"policy_keys": ["research_participation"]}, headers=headers
    )

    # Revoke
    res = await client.delete("/consent/me/research_participation", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["revoked"]["consent_type"] == "research_participation"
    assert data["revoked"]["revoked_at"] is not None

    # Verify status
    res = await client.get("/consent/me", headers=headers)
    status = res.json()
    granted_keys = [p["key"] for p in status["granted"]]
    assert "research_participation" not in granted_keys


@pytest.mark.integration
async def test_grant_invalid_policy(client: AsyncClient, user_token: str):
    """Attempting to grant unknown policy fails."""
    headers = {"Authorization": f"Bearer {user_token}"}
    res = await client.post("/consent/me", json={"policy_keys": ["fake_policy"]}, headers=headers)
    assert res.status_code == 422
