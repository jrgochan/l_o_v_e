from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.models.chat_message import ChatMessage
from app.models.chat_session import ChatSession
from app.services.chat.messages import MessageManager
from app.services.chat.types import MessageCreationContext


@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.add = MagicMock()
    return db


@pytest.fixture
def manager(mock_db):
    m = MessageManager(mock_db)
    m.session_manager = AsyncMock()
    return m


@pytest.mark.asyncio
async def test_save_user_message_with_relationship(manager, mock_db):
    session_id = uuid4()
    related_id = uuid4()

    # Mock session for message count update
    mock_session = ChatSession(id=session_id, message_count=0)
    manager.session_manager.get_session.return_value = mock_session

    # Mock auto-link engine
    with patch("app.services.memory.association.get_association_engine") as mock_get_engine:
        mock_engine = AsyncMock()
        mock_get_engine.return_value = mock_engine

        context = MessageCreationContext(
            session_id=session_id,
            content="Reply",
            related_message_id=related_id,
            relationship_type="reply",
            message_type="user_text",
        )
        msg = await manager.save_user_message(context)

        assert msg.content == "Reply"
        assert manager.session_manager.get_session.called
        assert mock_session.message_count == 1

        # Verify relationship creation (mock_db.add called twice: message + relationship)
        assert mock_db.add.call_count == 2

        mock_engine.auto_link.assert_called_with(msg.id, mock_db)


@pytest.mark.asyncio
async def test_save_user_message_autolink_failure(manager, mock_db):
    session_id = uuid4()
    manager.session_manager.get_session.return_value = ChatSession(id=session_id, message_count=0)

    with patch("app.services.memory.association.get_association_engine") as mock_get_engine:
        mock_engine = AsyncMock()
        mock_engine.auto_link.side_effect = Exception("Boom")
        mock_get_engine.return_value = mock_engine

        # Should not raise
        context = MessageCreationContext(
            session_id=session_id, content="Hello", message_type="user_text"
        )
        await manager.save_user_message(context)


@pytest.mark.asyncio
async def test_get_message_relationships(manager, mock_db):
    mid = uuid4()

    # Outgoing
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = ["Rel1"]
    mock_db.execute.return_value = mock_result

    res = await manager.get_message_relationships(mid, "outgoing")
    assert res == ["Rel1"]

    # Incoming
    res = await manager.get_message_relationships(mid, "incoming")
    assert res == ["Rel1"]


@pytest.mark.asyncio
async def test_get_session_statistics(manager, mock_db):
    sid = uuid4()
    start = datetime.now(timezone.utc) - timedelta(seconds=100)
    end = datetime.now(timezone.utc)

    mock_session = ChatSession(id=sid, message_count=10, started_at=start, ended_at=end)
    manager.session_manager.get_session.return_value = mock_session

    # Mock execute results
    # 1. Message counts
    # 2. Emotion IDs

    # We need side_effect for execute to return different things
    mock_res_counts = MagicMock()
    mock_res_counts.__iter__.return_value = [("user_text", 5), ("bot_text", 5)]

    mock_res_emotions = MagicMock()
    mock_res_emotions.__iter__.return_value = [("saddness",), ("joy",)]

    mock_db.execute.side_effect = [mock_res_counts, mock_res_emotions]

    stats = await manager.get_session_statistics(sid)

    assert stats["session_id"] == str(sid)
    assert stats["total_messages"] == 10
    assert stats["message_counts"] == {"user_text": 5, "bot_text": 5}
    assert stats["detected_emotions_count"] == 2
    assert stats["duration_seconds"] > 99


@pytest.mark.asyncio
async def test_get_session_statistics_no_session(manager, mock_db):
    sid = uuid4()
    manager.session_manager.get_session.return_value = None
    stats = await manager.get_session_statistics(sid)
    assert stats == {}


@pytest.mark.asyncio
async def test_get_recent_messages(manager, mock_db):
    sid = uuid4()
    m1 = ChatMessage(content="1")
    m2 = ChatMessage(content="2")

    mock_res = MagicMock()
    # reversed() is used in implementation, so if we return [m2, m1] (desc timestamp),
    # result should be [m1, m2]
    mock_res.scalars.return_value.all.return_value = [m2, m1]
    mock_db.execute.return_value = mock_res

    res = await manager.get_recent_messages(sid, 2)
    assert res == [m1, m2]


@pytest.mark.asyncio
async def test_get_session_messages_limit(manager, mock_db):
    sid = uuid4()
    mock_res = MagicMock()
    msg = ChatMessage(content="Hi")
    # msg.to_dict needs to work or be mocked. ChatMessage is a SQLA model but likely has a method.
    # We can mock to_dict
    msg.to_dict = MagicMock(return_value={"content": "Hi"})

    mock_res.scalars.return_value.all.return_value = [msg]
    mock_db.execute.return_value = mock_res

    res = await manager.get_session_messages(sid, limit=5)
    assert len(res) == 1
    assert res[0]["content"] == "Hi"


@pytest.mark.asyncio
async def test_get_message_thread(manager, mock_db):
    root_id = uuid4()
    root = ChatMessage(id=root_id, content="Root")
    child = ChatMessage(id=uuid4(), content="Child")

    # get_message is called for root
    # execute is called for hierarchy

    # We'll patch get_message on manager itself to simplify
    manager.get_message = AsyncMock(return_value=root)

    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [child]
    mock_db.execute.return_value = mock_res

    res = await manager.get_message_thread(root_id)
    assert res == [root, child]


@pytest.mark.asyncio
async def test_save_user_message_no_relationship(manager, mock_db):
    session_id = uuid4()
    manager.session_manager.get_session.return_value = ChatSession(id=session_id, message_count=0)

    with patch("app.services.memory.association.get_association_engine") as mock_get:
        mock_get.return_value = AsyncMock()
        context = MessageCreationContext(
            session_id=session_id, content="Hi", message_type="user_text"
        )
        msg = await manager.save_user_message(context)
        assert msg.content == "Hi"
        # Verify NO relationship created
        # mock_db.add called once for message
        assert mock_db.add.call_count == 1


@pytest.mark.asyncio
async def test_save_user_message_no_session(manager, mock_db):
    session_id = uuid4()
    manager.session_manager.get_session.return_value = None

    with patch("app.services.memory.association.get_association_engine") as mock_get:
        mock_get.return_value = AsyncMock()
        context = MessageCreationContext(
            session_id=session_id, content="Hi", message_type="user_text"
        )
        await manager.save_user_message(context)
        # Should not crash, just count not incremented


@pytest.mark.asyncio
async def test_get_message(manager, mock_db):
    mid = uuid4()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = ChatMessage(id=mid)
    mock_db.execute.return_value = mock_res

    res = await manager.get_message(mid)
    assert res.id == mid


@pytest.mark.asyncio
async def test_get_message_thread_no_root(manager, mock_db):
    root_id = uuid4()
    # Mock original get_message to return None
    # We need to un-mock it if it was mocked on class? No, we mocked on instance in other test.
    # Here we manipulate the manager instance fresh or just override.
    manager.get_message = AsyncMock(return_value=None)

    # logic: if root is None, returns descendents only?
    # code: if root: return [root] + descendants else return list(descendants)

    mock_res = MagicMock()
    child = ChatMessage(id=uuid4())
    mock_res.scalars.return_value.all.return_value = [child]
    # execute called for CTE
    mock_db.execute.return_value = mock_res

    res = await manager.get_message_thread(root_id)
    assert res == [child]


@pytest.mark.asyncio
async def test_get_session_messages_no_limit(manager, mock_db):
    sid = uuid4()
    mock_res = MagicMock()
    msg = ChatMessage(content="Hi")
    msg.to_dict = MagicMock(return_value={"content": "Hi"})
    mock_res.scalars.return_value.all.return_value = [msg]
    mock_db.execute.return_value = mock_res

    res = await manager.get_session_messages(sid, limit=None)
    assert len(res) == 1


@pytest.mark.asyncio
async def test_get_session_statistics_no_duration(manager, mock_db):
    sid = uuid4()
    # Started but not ended
    mock_session = ChatSession(
        id=sid, message_count=0, started_at=datetime.now(timezone.utc), ended_at=None
    )
    manager.session_manager.get_session.return_value = mock_session

    mock_db.execute.side_effect = [MagicMock(), MagicMock()]  # Empty counts

    stats = await manager.get_session_statistics(sid)
    assert stats["duration_seconds"] is None
