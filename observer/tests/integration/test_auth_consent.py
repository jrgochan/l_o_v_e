import pytest
from httpx import AsyncClient

from app.core.consent_policies import get_required_policies

pytestmark = pytest.mark.no_auth_override


@pytest.mark.integration
async def test_register_with_consents(client: AsyncClient):
    """Registering with consents list should auto-grant them."""
    payload = {
        "email": "newuser@example.com",
        "password": "StrongPassword123!",
        "full_name": "New User",
        "consents": ["terms_of_service", "emotional_data_processing"],
    }

    response = await client.post("/auth/register", json=payload)
    assert response.status_code == 201
    # Log in to check status
    # First get token
    login_data = {"username": "newuser@example.com", "password": "StrongPassword123!"}
    res = await client.post("/auth/login", data=login_data)
    token = res.json()["access_token"]

    # Check consent status
    headers = {"Authorization": f"Bearer {token}"}
    res = await client.get("/consent/me", headers=headers)
    status = res.json()
    granted_keys = {p["key"] for p in status["granted"]}

    assert "terms_of_service" in granted_keys
    assert "emotional_data_processing" in granted_keys


@pytest.mark.integration
async def test_login_consent_required(client: AsyncClient):
    """Login should return consent_required=True if required policies missing."""
    # The seeded user has NO consents by default.
    # The user_token is valid, but the user hasn't consented.

    # We can use the token to check status, but let's test the LOGIN endpoint response.
    # We need to use the seeded user credentials.
    # From fixtures/users.py: email="test@example.com", password="test_password"

    login_data = {"username": "test@example.com", "password": "test_password"}
    res = await client.post("/auth/login", data=login_data)
    assert res.status_code == 200
    data = res.json()

    assert data["consent_required"] is True
    assert "outstanding_policies" in data
    assert len(data["outstanding_policies"]) > 0

    outstanding_keys = {p["key"] for p in data["outstanding_policies"]}
    assert "terms_of_service" in outstanding_keys


@pytest.mark.integration
async def test_login_consent_satisfied(client: AsyncClient, user_token: str):
    """Login should NOT return consent_required if all satisfied."""
    headers = {"Authorization": f"Bearer {user_token}"}

    # Grant all required
    required_keys = [p.key for p in get_required_policies()]
    await client.post("/consent/me", json={"policy_keys": required_keys}, headers=headers)

    # Login again
    login_data = {"username": "test@example.com", "password": "test_password"}
    res = await client.post("/auth/login", data=login_data)
    data = res.json()

    assert data["consent_required"] is False
    assert len(data["outstanding_policies"]) == 0
