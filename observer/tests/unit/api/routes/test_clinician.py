from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.api.routes import clinician as clinician_routes
from app.models.chat_session import ChatSession
from app.models.clinical_alert import ClinicalAlert
from app.models.clinical_note import ClinicalNote
from app.models.user import User, UserRole


@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.execute = AsyncMock()
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.delete = AsyncMock()  # Code awaits delete
    return db


# ... (rest of file)


@pytest.mark.asyncio
async def test_update_note_partial_fields(mock_db, mock_clinician):
    """Test updating only one field covers the None branches."""
    note = MagicMock(spec=ClinicalNote)
    note.clinician_id = mock_clinician.id
    note.content = "Old Content"
    note.category = "Old Cat"
    note.to_dict.return_value = {"content": "Old Content", "category": "New Cat"}

    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = note
    mock_db.execute.return_value = mock_res

    # Test update category only (content is None) - Covers line 284 False path
    await clinician_routes.update_note(uuid4(), mock_db, mock_clinician, category="New Cat")

    assert note.content == "Old Content"
    assert note.category == "New Cat"
    mock_db.commit.assert_awaited()


@pytest.fixture
def mock_clinician():
    user = MagicMock(spec=User)
    user.id = uuid4()
    user.role = UserRole.CLINICIAN
    return user


@pytest.fixture
def mock_admin():
    user = MagicMock(spec=User)
    user.id = uuid4()
    user.role = UserRole.ADMIN
    return user


@pytest.fixture
def mock_client(mock_clinician):
    user = MagicMock(spec=User)
    user.id = uuid4()
    user.assigned_clinician_id = mock_clinician.id
    user.deleted_at = None
    return user


# --- Helper Tests ---


@pytest.mark.asyncio
async def test_verify_client_assignment_success(mock_db, mock_clinician, mock_client):
    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = mock_client
    mock_db.execute.return_value = mock_res

    res = await clinician_routes._verify_client_assignment(mock_db, mock_clinician, mock_client.id)
    assert res == mock_client


@pytest.mark.asyncio
async def test_verify_client_assignment_not_found(mock_db, mock_clinician):
    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = mock_res

    with pytest.raises(HTTPException) as exc:
        await clinician_routes._verify_client_assignment(mock_db, mock_clinician, uuid4())
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_verify_client_assignment_forbidden(mock_db, mock_clinician):
    other_client = MagicMock(spec=User)
    other_client.id = uuid4()
    other_client.assigned_clinician_id = uuid4()  # Not the mock_clinician
    other_client.deleted_at = None

    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = other_client
    mock_db.execute.return_value = mock_res

    with pytest.raises(HTTPException) as exc:
        await clinician_routes._verify_client_assignment(mock_db, mock_clinician, other_client.id)
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_verify_client_assignment_admin_bypass(mock_db, mock_admin):
    # Admin accessing unassigned client
    client = MagicMock(spec=User)
    client.id = uuid4()
    client.assigned_clinician_id = uuid4()
    client.deleted_at = None

    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = client
    mock_db.execute.return_value = mock_res

    res = await clinician_routes._verify_client_assignment(mock_db, mock_admin, client.id)
    assert res == client


# --- Endpoint Tests ---


@pytest.mark.asyncio
async def test_list_clients_clinician(mock_db, mock_clinician, mock_client):
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [mock_client]
    mock_db.execute.return_value = mock_res

    res = await clinician_routes.list_clients(mock_db, mock_clinician)
    assert len(res) == 1
    assert res[0] == mock_client


@pytest.mark.asyncio
async def test_list_clients_admin(mock_db, mock_admin, mock_client):
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [mock_client]
    mock_db.execute.return_value = mock_res

    res = await clinician_routes.list_clients(mock_db, mock_admin)
    assert len(res) == 1


@pytest.mark.asyncio
async def test_get_client_sessions(mock_db, mock_clinician, mock_client):
    # Unified Mock Result
    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = mock_client
    session = MagicMock(spec=ChatSession)
    session.to_dict.return_value = {"id": "s1"}
    mock_res.scalars.return_value.all.return_value = [session]

    mock_db.execute.return_value = mock_res

    res = await clinician_routes.get_client_sessions(
        mock_client.id, mock_db, mock_clinician, limit=10
    )
    assert len(res) == 1
    assert res[0]["id"] == "s1"


@pytest.mark.asyncio
async def test_get_client_trajectory(mock_db, mock_clinician, mock_client):
    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = mock_client
    traj = MagicMock()
    traj.to_dict.return_value = {"t": 1}
    mock_res.scalars.return_value.all.return_value = [traj]

    mock_db.execute.return_value = mock_res

    res = await clinician_routes.get_client_trajectory(
        mock_client.id, mock_db, mock_clinician, limit=100
    )
    assert len(res) == 1


@pytest.mark.asyncio
async def test_list_clinician_alerts(mock_db, mock_clinician):
    alert = MagicMock(spec=ClinicalAlert)
    alert.to_dict.return_value = {"id": "a1"}

    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [alert]
    mock_db.execute.return_value = mock_res

    res = await clinician_routes.list_clinician_alerts(mock_db, mock_clinician, limit=50)
    assert len(res) == 1


@pytest.mark.asyncio
async def test_list_clinician_alerts_admin(mock_db, mock_admin):
    alert = MagicMock(spec=ClinicalAlert)
    alert.to_dict.return_value = {"id": "a1"}

    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [alert]
    mock_db.execute.return_value = mock_res

    res = await clinician_routes.list_clinician_alerts(mock_db, mock_admin, limit=50)
    assert len(res) == 1


@pytest.mark.asyncio
async def test_get_alert_summary(mock_db, mock_clinician):
    # This one DOES need separate returns because .all() and .scalar() return different things
    # and might be called on different steps.
    # But effectively 2 queries.
    mock_res_agg = MagicMock()
    mock_res_agg.all.return_value = [("high", 2), ("medium", 3)]

    mock_res_count = MagicMock()
    mock_res_count.scalar.return_value = 5

    mock_db.execute.side_effect = [mock_res_agg, mock_res_count]

    res = await clinician_routes.get_alert_summary(mock_db, mock_clinician)
    assert res["total_clients"] == 5
    assert res["alerts_by_severity"] == {"high": 2, "medium": 3}
    assert res["total_alerts"] == 5


# --- Notes CRUD ---


@pytest.mark.asyncio
async def test_list_client_notes(mock_db, mock_clinician, mock_client):
    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = mock_client
    note = MagicMock(spec=ClinicalNote)
    note.to_dict.return_value = {"id": "n1"}
    mock_res.scalars.return_value.all.return_value = [note]

    mock_db.execute.return_value = mock_res

    res = await clinician_routes.list_client_notes(mock_client.id, mock_db, mock_clinician)
    assert len(res) == 1


@pytest.mark.asyncio
async def test_create_client_note(mock_db, mock_clinician, mock_client):
    # Verify User
    mock_res_user = MagicMock()
    mock_res_user.scalars.return_value.first.return_value = mock_client
    mock_db.execute.return_value = mock_res_user

    # Mock DB Refresh to populate timestamps
    async def side_effect_refresh(obj):
        obj.created_at = datetime.utcnow()
        obj.updated_at = datetime.utcnow()
        obj.id = uuid4()

    mock_db.refresh.side_effect = side_effect_refresh

    res = await clinician_routes.create_client_note(
        mock_client.id, mock_db, mock_clinician, content="Notes", category="general"
    )

    assert res["content"] == "Notes"
    mock_db.add.assert_called_once()
    mock_db.commit.assert_awaited()


@pytest.mark.asyncio
async def test_update_note_success(mock_db, mock_clinician):
    note = MagicMock(spec=ClinicalNote)
    note.clinician_id = mock_clinician.id
    note.content = "Old"
    note.to_dict.return_value = {"content": "New"}

    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = note
    mock_db.execute.return_value = mock_res

    await clinician_routes.update_note(
        uuid4(), mock_db, mock_clinician, content="New", category="urgent"
    )

    assert note.content == "New"
    assert note.category == "urgent"
    mock_db.commit.assert_awaited()


@pytest.mark.asyncio
async def test_update_note_not_found(mock_db, mock_clinician):
    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = mock_res

    with pytest.raises(HTTPException) as exc:
        await clinician_routes.update_note(uuid4(), mock_db, mock_clinician, content="New")
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_delete_note_success(mock_db, mock_clinician):
    note = MagicMock(spec=ClinicalNote)
    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = note
    mock_db.execute.return_value = mock_res

    await clinician_routes.delete_note(uuid4(), mock_db, mock_clinician)

    mock_db.delete.assert_called_with(note)
    mock_db.commit.assert_awaited()


@pytest.mark.asyncio
async def test_delete_note_not_found(mock_db, mock_clinician):
    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = mock_res

    with pytest.raises(HTTPException) as exc:
        await clinician_routes.delete_note(uuid4(), mock_db, mock_clinician)
    assert exc.value.status_code == 404


# --- Acknowledgment ---


@pytest.mark.asyncio
async def test_acknowledge_alert_success(mock_db, mock_clinician):
    # 1. Get Alert
    alert = MagicMock(spec=ClinicalAlert)

    # 2. Check Existing Ack (None)
    mock_res_alert = MagicMock()
    mock_res_alert.scalars.return_value.first.return_value = alert

    mock_res_ack = MagicMock()
    mock_res_ack.scalars.return_value.first.return_value = None

    mock_db.execute.side_effect = [mock_res_alert, mock_res_ack]

    # Mock Refresh to populate timestamp
    async def side_effect_refresh(obj):
        obj.acknowledged_at = datetime.utcnow()
        obj.id = uuid4()

    mock_db.refresh.side_effect = side_effect_refresh

    await clinician_routes.acknowledge_alert(uuid4(), mock_db, mock_clinician)

    mock_db.add.assert_called()
    mock_db.commit.assert_awaited()


@pytest.mark.asyncio
async def test_acknowledge_alert_not_found(mock_db, mock_clinician):
    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = mock_res

    with pytest.raises(HTTPException) as exc:
        await clinician_routes.acknowledge_alert(uuid4(), mock_db, mock_clinician)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_acknowledge_alert_conflict(mock_db, mock_clinician):
    # 1. Get Alert & 2. Existing Ack
    # Both need to return something.
    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = MagicMock()  # Alert or Ack

    mock_db.execute.return_value = mock_res

    with pytest.raises(HTTPException) as exc:
        await clinician_routes.acknowledge_alert(uuid4(), mock_db, mock_clinician)
    assert exc.value.status_code == 409


@pytest.mark.asyncio
async def test_get_alert_summary_admin(mock_db, mock_admin):
    # Mock Aggregation Result
    mock_res_agg = MagicMock()
    mock_res_agg.all.return_value = [("high", 5)]

    # Mock Total Clients Result
    mock_res_count = MagicMock()
    mock_res_count.scalar.return_value = 10

    mock_db.execute.side_effect = [mock_res_agg, mock_res_count]

    res = await clinician_routes.get_alert_summary(mock_db, mock_admin)
    assert res["total_clients"] == 10
    assert res["total_alerts"] == 5


@pytest.mark.asyncio
async def test_update_note_partial(mock_db, mock_clinician):
    note = MagicMock(spec=ClinicalNote)
    note.clinician_id = mock_clinician.id
    note.content = "Old Content"
    note.category = "Old Cat"
    note.to_dict.return_value = {"content": "New Content", "category": "Old Cat"}

    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = note
    mock_db.execute.return_value = mock_res

    # Test update content only
    await clinician_routes.update_note(uuid4(), mock_db, mock_clinician, content="New Content")

    assert note.content == "New Content"
    assert note.category == "Old Cat"  # Unchanged
    mock_db.commit.assert_awaited()
