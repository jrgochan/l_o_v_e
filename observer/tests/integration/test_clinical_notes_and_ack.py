"""Integration tests for clinician notes CRUD and alert acknowledgment endpoints.

Tests the new endpoints added in Phase 6:
  - GET    /clinician/clients/{id}/notes
  - POST   /clinician/clients/{id}/notes
  - PUT    /clinician/notes/{id}
  - DELETE /clinician/notes/{id}
  - POST   /clinician/alerts/{id}/acknowledge
"""

from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat_session import ChatSession
from app.models.clinical_alert import AlertLevel, AlertType, ClinicalAlert
from app.models.user import User

pytestmark = pytest.mark.no_auth_override


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _assign_client(db: AsyncSession, client: User, clinician: User):
    """Assign a client to a clinician."""
    client.assigned_clinician_id = clinician.id
    db.add(client)
    await db.commit()


async def _create_session(db: AsyncSession, user: User) -> ChatSession:
    """Create a chat session for a user."""
    session = ChatSession(user_id=str(uuid4()), auth_user_id=user.id)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def _create_alert(db: AsyncSession, session: ChatSession) -> ClinicalAlert:
    """Create a clinical alert for a session."""
    alert = ClinicalAlert(
        session_id=session.id,
        level=AlertLevel.WARNING.value,
        type=AlertType.HIGH_AROUSAL.value,
        message="Elevated distress detected",
        suggestion="Consider check-in",
        triggered_by={"arousal": 0.8, "valence": -0.6},
        threshold_used={"arousal": 0.7, "valence": -0.5},
        version="1.0",
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    return alert


# ===========================================================================
# Clinical Notes
# ===========================================================================


@pytest.mark.integration
async def test_list_notes_empty(
    client: AsyncClient,
    clinician_token: str,
    seeded_user: User,
    seeded_clinician_user: User,
    test_db: AsyncSession,
):
    """Clinician with no notes sees empty list."""
    await _assign_client(test_db, seeded_user, seeded_clinician_user)
    headers = {"Authorization": f"Bearer {clinician_token}"}
    res = await client.get(f"/clinician/clients/{seeded_user.id}/notes", headers=headers)
    assert res.status_code == 200
    assert res.json() == []


@pytest.mark.integration
async def test_create_note(
    client: AsyncClient,
    clinician_token: str,
    seeded_user: User,
    seeded_clinician_user: User,
    test_db: AsyncSession,
):
    """Clinician can create a note for an assigned client."""
    await _assign_client(test_db, seeded_user, seeded_clinician_user)
    headers = {"Authorization": f"Bearer {clinician_token}"}
    res = await client.post(
        f"/clinician/clients/{seeded_user.id}/notes",
        params={"content": "Initial assessment complete", "category": "progress"},
        headers=headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["content"] == "Initial assessment complete"
    assert data["category"] == "progress"
    assert data["client_id"] == str(seeded_user.id)
    assert data["clinician_id"] == str(seeded_clinician_user.id)


@pytest.mark.integration
async def test_list_notes_after_create(
    client: AsyncClient,
    clinician_token: str,
    seeded_user: User,
    seeded_clinician_user: User,
    test_db: AsyncSession,
):
    """Notes appear in list after creation."""
    await _assign_client(test_db, seeded_user, seeded_clinician_user)
    headers = {"Authorization": f"Bearer {clinician_token}"}

    # Create a note
    await client.post(
        f"/clinician/clients/{seeded_user.id}/notes",
        params={"content": "Test note", "category": "general"},
        headers=headers,
    )

    # List notes
    res = await client.get(f"/clinician/clients/{seeded_user.id}/notes", headers=headers)
    assert res.status_code == 200
    notes = res.json()
    assert len(notes) == 1
    assert notes[0]["content"] == "Test note"


@pytest.mark.integration
async def test_update_note(
    client: AsyncClient,
    clinician_token: str,
    seeded_user: User,
    seeded_clinician_user: User,
    test_db: AsyncSession,
):
    """Clinician can update their own note."""
    await _assign_client(test_db, seeded_user, seeded_clinician_user)
    headers = {"Authorization": f"Bearer {clinician_token}"}

    # Create
    create_res = await client.post(
        f"/clinician/clients/{seeded_user.id}/notes",
        params={"content": "Draft", "category": "general"},
        headers=headers,
    )
    note_id = create_res.json()["id"]

    # Update
    res = await client.put(
        f"/clinician/notes/{note_id}",
        params={"content": "Revised assessment", "category": "progress"},
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["content"] == "Revised assessment"
    assert data["category"] == "progress"


@pytest.mark.integration
async def test_delete_note(
    client: AsyncClient,
    clinician_token: str,
    seeded_user: User,
    seeded_clinician_user: User,
    test_db: AsyncSession,
):
    """Clinician can delete their own note."""
    await _assign_client(test_db, seeded_user, seeded_clinician_user)
    headers = {"Authorization": f"Bearer {clinician_token}"}

    # Create
    create_res = await client.post(
        f"/clinician/clients/{seeded_user.id}/notes",
        params={"content": "To delete"},
        headers=headers,
    )
    note_id = create_res.json()["id"]

    # Delete
    res = await client.delete(f"/clinician/notes/{note_id}", headers=headers)
    assert res.status_code == 204

    # Verify gone
    list_res = await client.get(f"/clinician/clients/{seeded_user.id}/notes", headers=headers)
    assert list_res.json() == []


@pytest.mark.integration
async def test_notes_scoped_to_clinician(
    client: AsyncClient,
    clinician_token: str,
    admin_token: str,
    seeded_user: User,
    seeded_clinician_user: User,
    test_db: AsyncSession,
):  # pylint: disable=too-many-positional-arguments, too-many-arguments
    """Clinician only sees their own notes, not other clinicians'."""
    await _assign_client(test_db, seeded_user, seeded_clinician_user)

    # Admin creates a note for the same client (admin bypasses assignment)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    await client.post(
        f"/clinician/clients/{seeded_user.id}/notes",
        params={"content": "Admin observation"},
        headers=admin_headers,
    )

    # Clinician creates a note
    clin_headers = {"Authorization": f"Bearer {clinician_token}"}
    await client.post(
        f"/clinician/clients/{seeded_user.id}/notes",
        params={"content": "Clinician observation"},
        headers=clin_headers,
    )

    # Clinician sees only their note
    res = await client.get(f"/clinician/clients/{seeded_user.id}/notes", headers=clin_headers)
    notes = res.json()
    assert len(notes) == 1
    assert notes[0]["content"] == "Clinician observation"


@pytest.mark.integration
async def test_create_note_unassigned_client_forbidden(
    client: AsyncClient,
    clinician_token: str,
    seeded_user: User,
):
    """Clinician cannot create notes for unassigned clients."""
    headers = {"Authorization": f"Bearer {clinician_token}"}
    res = await client.post(
        f"/clinician/clients/{seeded_user.id}/notes",
        params={"content": "Should fail"},
        headers=headers,
    )
    assert res.status_code == 403


@pytest.mark.integration
async def test_update_nonexistent_note_404(
    client: AsyncClient,
    clinician_token: str,
):
    """Updating a non-existent note returns 404."""
    headers = {"Authorization": f"Bearer {clinician_token}"}
    fake_id = str(uuid4())
    res = await client.put(
        f"/clinician/notes/{fake_id}",
        params={"content": "Nope"},
        headers=headers,
    )
    assert res.status_code == 404


@pytest.mark.integration
async def test_delete_nonexistent_note_404(
    client: AsyncClient,
    clinician_token: str,
):
    """Deleting a non-existent note returns 404."""
    headers = {"Authorization": f"Bearer {clinician_token}"}
    fake_id = str(uuid4())
    res = await client.delete(f"/clinician/notes/{fake_id}", headers=headers)
    assert res.status_code == 404


# ===========================================================================
# Alert Acknowledgment
# ===========================================================================


@pytest.mark.integration
async def test_acknowledge_alert(
    client: AsyncClient,
    clinician_token: str,
    seeded_user: User,
    seeded_clinician_user: User,
    test_db: AsyncSession,
):
    """Clinician can acknowledge an existing alert."""
    await _assign_client(test_db, seeded_user, seeded_clinician_user)
    session = await _create_session(test_db, seeded_user)
    alert = await _create_alert(test_db, session)

    headers = {"Authorization": f"Bearer {clinician_token}"}
    res = await client.post(
        f"/clinician/alerts/{alert.id}/acknowledge",
        params={"action_taken": "reviewed", "response_note": "Checked with client"},
        headers=headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["alert_id"] == str(alert.id)
    assert data["clinician_id"] == str(seeded_clinician_user.id)
    assert data["action_taken"] == "reviewed"
    assert data["response_note"] == "Checked with client"


@pytest.mark.integration
async def test_acknowledge_alert_duplicate_409(
    client: AsyncClient,
    clinician_token: str,
    seeded_user: User,
    seeded_clinician_user: User,
    test_db: AsyncSession,
):
    """Acknowledging the same alert twice returns 409 Conflict."""
    await _assign_client(test_db, seeded_user, seeded_clinician_user)
    session = await _create_session(test_db, seeded_user)
    alert = await _create_alert(test_db, session)

    headers = {"Authorization": f"Bearer {clinician_token}"}

    # First ack
    res1 = await client.post(
        f"/clinician/alerts/{alert.id}/acknowledge",
        params={"action_taken": "reviewed"},
        headers=headers,
    )
    assert res1.status_code == 201

    # Second ack
    res2 = await client.post(
        f"/clinician/alerts/{alert.id}/acknowledge",
        params={"action_taken": "escalated"},
        headers=headers,
    )
    assert res2.status_code == 409


@pytest.mark.integration
async def test_acknowledge_nonexistent_alert_404(
    client: AsyncClient,
    clinician_token: str,
):
    """Acknowledging a non-existent alert returns 404."""
    headers = {"Authorization": f"Bearer {clinician_token}"}
    fake_id = str(uuid4())
    res = await client.post(
        f"/clinician/alerts/{fake_id}/acknowledge",
        params={"action_taken": "reviewed"},
        headers=headers,
    )
    assert res.status_code == 404


@pytest.mark.integration
async def test_acknowledge_default_action(
    client: AsyncClient,
    clinician_token: str,
    seeded_user: User,
    seeded_clinician_user: User,
    test_db: AsyncSession,
):
    """Default action_taken is 'reviewed'."""
    await _assign_client(test_db, seeded_user, seeded_clinician_user)
    session = await _create_session(test_db, seeded_user)
    alert = await _create_alert(test_db, session)

    headers = {"Authorization": f"Bearer {clinician_token}"}
    res = await client.post(
        f"/clinician/alerts/{alert.id}/acknowledge",
        headers=headers,
    )
    assert res.status_code == 201
    assert res.json()["action_taken"] == "reviewed"
    assert res.json()["response_note"] is None
