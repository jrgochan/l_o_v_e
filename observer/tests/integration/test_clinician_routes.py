import pytest
from httpx import AsyncClient

from app.models.user import User

pytestmark = pytest.mark.no_auth_override


@pytest.mark.integration
async def test_list_clients_empty(client: AsyncClient, clinician_token: str):
    """Clinician with no clients sees empty list."""
    headers = {"Authorization": f"Bearer {clinician_token}"}
    res = await client.get("/clinician/clients", headers=headers)
    assert res.status_code == 200
    assert res.json() == []


@pytest.mark.integration
async def test_access_unassigned_client_forbidden(
    client: AsyncClient, clinician_token: str, seeded_user: User
):
    """Clinician cannot access unassigned client data."""
    headers = {"Authorization": f"Bearer {clinician_token}"}
    client_id = seeded_user.id

    # Try sessions
    res = await client.get(f"/clinician/clients/{client_id}/sessions", headers=headers)
    assert res.status_code == 403

    # Try trajectory
    res = await client.get(f"/clinician/clients/{client_id}/trajectory", headers=headers)
    assert res.status_code == 403


@pytest.mark.integration
async def test_admin_bypass(client: AsyncClient, admin_token: str, seeded_user: User):
    """Admin can access any client data regardless of assignment."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    client_id = seeded_user.id

    # Even if unassigned, admin gets access (might return empty lists if no data)
    res = await client.get(f"/clinician/clients/{client_id}/sessions", headers=headers)
    assert res.status_code == 200


@pytest.mark.integration
async def test_assigned_client_access(
    client: AsyncClient,
    clinician_token: str,
    seeded_user: User,
    seeded_clinician_user: User,
    test_db,
):
    """Clinician can access assigned client."""
    # Assign client to clinician
    seeded_user.assigned_clinician_id = seeded_clinician_user.id
    test_db.add(seeded_user)
    await test_db.commit()

    headers = {"Authorization": f"Bearer {clinician_token}"}

    # Verify list
    res = await client.get("/clinician/clients", headers=headers)
    assert res.status_code == 200
    clients = res.json()
    assert len(clients) == 1
    assert clients[0]["id"] == str(seeded_user.id)

    # Verify sessions access
    res = await client.get(f"/clinician/clients/{seeded_user.id}/sessions", headers=headers)
    assert res.status_code == 200
