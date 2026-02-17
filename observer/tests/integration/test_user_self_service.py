import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.no_auth_override


@pytest.mark.integration
async def test_update_profile(client: AsyncClient, user_token: str):
    """User can update their own profile."""
    headers = {"Authorization": f"Bearer {user_token}"}

    payload = {"full_name": "Updated Name"}
    res = await client.put("/users/me", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["full_name"] == "Updated Name"

    # Verify persistence
    res = await client.get("/users/me", headers=headers)
    assert res.json()["full_name"] == "Updated Name"


@pytest.mark.integration
async def test_change_password(client: AsyncClient, user_token: str):
    """User can change password."""
    headers = {"Authorization": f"Bearer {user_token}"}

    # 1. Wrong current password
    payload = {
        "current_password": "WrongPassword",
        "new_password": "NewStrongPassword1!",
    }
    res = await client.put("/users/me/password", json=payload, headers=headers)
    assert res.status_code == 400

    # 2. Correct current password
    # Default seeded user password is "test_password"
    payload["current_password"] = "test_password"
    res = await client.put("/users/me/password", json=payload, headers=headers)
    assert res.status_code == 200

    # 3. Verify login with new password
    login_data = {"username": "test@example.com", "password": "NewStrongPassword1!"}
    res = await client.post("/auth/login", data=login_data)
    assert res.status_code == 200


@pytest.mark.integration
async def test_export_data(client: AsyncClient, user_token: str):
    """User can export their data."""
    headers = {"Authorization": f"Bearer {user_token}"}
    res = await client.get("/users/me/export", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "profile" in data
    assert "consents" in data
    assert "sessions" in data
