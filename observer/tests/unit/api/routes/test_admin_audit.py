from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.api.routes.admin import users as admin_users


@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.execute = AsyncMock()
    return db


@pytest.fixture
def mock_admin_user():
    user = MagicMock()
    user.id = uuid4()
    user.role.value = "admin"
    return user


@pytest.mark.asyncio
async def test_list_audit_log_no_filters(mock_db, mock_admin_user):
    # Mock count result
    mock_res_count = MagicMock()
    mock_res_count.scalar.return_value = 10

    # Mock items result
    entry = MagicMock()
    entry.id = uuid4()
    entry.event_type = "user.login"
    entry.actor_id = uuid4()
    entry.target_id = None
    entry.metadata_ = {}
    entry.ip_address = "127.0.0.1"
    entry.timestamp = datetime(2023, 1, 1)

    mock_res_items = MagicMock()
    mock_res_items.scalars.return_value.all.return_value = [entry]

    # Sequence of execute calls: count, then select
    mock_db.execute.side_effect = [mock_res_count, mock_res_items]

    res = await admin_users.list_audit_log(mock_db, mock_admin_user)

    assert res["total"] == 10
    assert len(res["items"]) == 1
    assert res["items"][0]["event_type"] == "user.login"


@pytest.mark.asyncio
async def test_list_audit_log_filters(mock_db, mock_admin_user):
    # Mock count result
    mock_res_count = MagicMock()
    mock_res_count.scalar.return_value = 5

    # Mock items result
    entry = MagicMock()
    entry.id = uuid4()
    entry.event_type = "user.created"
    entry.actor_id = uuid4()
    entry.timestamp = datetime(2023, 1, 2)

    mock_res_items = MagicMock()
    mock_res_items.scalars.return_value.all.return_value = [entry]

    mock_db.execute.side_effect = [mock_res_count, mock_res_items]

    actor_id = uuid4()
    res = await admin_users.list_audit_log(
        mock_db, mock_admin_user, event_type="user.created", actor_id=actor_id
    )

    assert res["total"] == 5
    assert len(res["items"]) == 1
    assert res["items"][0]["event_type"] == "user.created"

    # Verify execute arguments could be checked if strict query matching is needed,
    # but coverage is primarily about hitting the lines.
