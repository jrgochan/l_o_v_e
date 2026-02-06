from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.models.chat_session import ChatSession
from app.services.chat_service import ChatService


@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.fixture
def chat_service(mock_db):
    service = ChatService(mock_db)
    service.session_manager = AsyncMock()
    service.message_manager = AsyncMock()
    service.analysis_manager = AsyncMock()
    return service


@pytest.mark.asyncio
async def test_create_session(chat_service):
    user_id = "u1"
    auth_id = uuid4()

    expected = ChatSession(id=uuid4(), user_id=user_id)
    chat_service.session_manager.create_session.return_value = expected

    result = await chat_service.create_session(user_id, "clinical", auth_id)

    assert result == expected
    chat_service.session_manager.create_session.assert_called_with(user_id, "clinical", auth_id)


@pytest.mark.asyncio
async def test_get_session(chat_service):
    sid = uuid4()
    chat_service.session_manager.get_session.return_value = "Session"

    res = await chat_service.get_session(sid)
    assert res == "Session"
    chat_service.session_manager.get_session.assert_called_with(sid)


@pytest.mark.asyncio
async def test_end_session(chat_service):
    sid = uuid4()
    chat_service.session_manager.end_session.return_value = "Ended"

    res = await chat_service.end_session(sid)
    assert res == "Ended"
    chat_service.session_manager.end_session.assert_called_with(sid)


@pytest.mark.asyncio
async def test_save_user_message(chat_service):
    sid = uuid4()
    chat_service.message_manager.save_user_message.return_value = "Message"

    res = await chat_service.save_user_message(sid, "Hi")
    assert res == "Message"
    chat_service.message_manager.save_user_message.assert_called_with(
        sid, "Hi", None, None, "user_text", None, None, None
    )


@pytest.mark.asyncio
async def test_save_analysis_message(chat_service):
    sid = uuid4()
    chat_service.analysis_manager.save_analysis_message.return_value = "Analysis"

    res = await chat_service.save_analysis_message(sid, "Joy", [0, 0, 0], 0.9, "Txt", "warm")
    assert res == "Analysis"
    chat_service.analysis_manager.save_analysis_message.assert_called_with(
        sid, "Joy", [0, 0, 0], 0.9, "Txt", "warm", None
    )


@pytest.mark.asyncio
async def test_save_insight_message(chat_service):
    sid = uuid4()
    chat_service.analysis_manager.save_insight_message.return_value = "Insight"

    res = await chat_service.save_insight_message(sid, "Content", {}, "warm")
    assert res == "Insight"
    chat_service.analysis_manager.save_insight_message.assert_called_with(
        sid, "Content", {}, "warm"
    )


@pytest.mark.asyncio
async def test_get_session_statistics(chat_service):
    sid = uuid4()
    chat_service.message_manager.get_session_statistics.return_value = {"stats": 1}

    res = await chat_service.get_session_statistics(sid)
    assert res == {"stats": 1}


@pytest.mark.asyncio
async def test_save_multi_emotion_analysis(chat_service):
    msg_id = uuid4()
    sid = uuid4()
    chat_service.analysis_manager.save_multi_emotion_analysis.return_value = "Multi"

    res = await chat_service.save_multi_emotion_analysis(
        msg_id, sid, [], [], [0, 0, 0], 0.5, 0.5, "pattern"
    )
    assert res == "Multi"


@pytest.mark.asyncio
async def test_update_deep_feeling_mode(chat_service):
    sid = uuid4()
    chat_service.session_manager.update_deep_feeling_mode.return_value = "Session"
    res = await chat_service.update_deep_feeling_mode(sid, True)
    assert res == "Session"


@pytest.mark.asyncio
async def test_delete_session(chat_service):
    sid = uuid4()
    chat_service.session_manager.delete_session.return_value = True
    res = await chat_service.delete_session(sid)
    assert res is True
    assert res is True


@pytest.mark.asyncio
async def test_get_message(chat_service):
    mid = uuid4()
    chat_service.message_manager.get_message.return_value = "Msg"
    res = await chat_service.get_message(mid)
    assert res == "Msg"
    chat_service.message_manager.get_message.assert_called_with(mid)


@pytest.mark.asyncio
async def test_get_message_relationships(chat_service):
    mid = uuid4()
    chat_service.message_manager.get_message_relationships.return_value = ["Rel"]
    res = await chat_service.get_message_relationships(mid, "incoming")
    assert res == ["Rel"]
    chat_service.message_manager.get_message_relationships.assert_called_with(mid, "incoming")


@pytest.mark.asyncio
async def test_get_recent_messages(chat_service):
    sid = uuid4()
    chat_service.message_manager.get_recent_messages.return_value = ["M1", "M2"]
    res = await chat_service.get_recent_messages(sid, 10)
    assert res == ["M1", "M2"]
    chat_service.message_manager.get_recent_messages.assert_called_with(sid, 10)


@pytest.mark.asyncio
async def test_get_multi_emotion_analysis(chat_service):
    mid = uuid4()
    chat_service.analysis_manager.get_multi_emotion_analysis.return_value = "Analysis"
    res = await chat_service.get_multi_emotion_analysis(mid)
    assert res == "Analysis"
    chat_service.analysis_manager.get_multi_emotion_analysis.assert_called_with(mid)


@pytest.mark.asyncio
async def test_get_session_multi_emotion_history(chat_service):
    sid = uuid4()
    chat_service.analysis_manager.get_session_multi_emotion_history.return_value = ["H1"]
    res = await chat_service.get_session_multi_emotion_history(sid, 20)
    assert res == ["H1"]
    chat_service.analysis_manager.get_session_multi_emotion_history.assert_called_with(sid, 20)


@pytest.mark.asyncio
async def test_get_user_sessions(chat_service):
    uid = "u1"
    chat_service.session_manager.get_user_sessions.return_value = ["S1"]
    res = await chat_service.get_user_sessions(uid, 5, 2)
    assert res == ["S1"]
    chat_service.session_manager.get_user_sessions.assert_called_with(uid, 5, 2)


@pytest.mark.asyncio
async def test_update_tone_preference(chat_service):
    sid = uuid4()
    chat_service.session_manager.update_tone_preference.return_value = "S1"
    res = await chat_service.update_tone_preference(sid, "clinical")
    assert res == "S1"
    chat_service.session_manager.update_tone_preference.assert_called_with(sid, "clinical")


@pytest.mark.asyncio
async def test_create_message_relationship(chat_service):
    src = uuid4()
    tgt = uuid4()
    chat_service.message_manager.create_message_relationship.return_value = "Rel"
    res = await chat_service.create_message_relationship(src, tgt, "type", {})
    assert res == "Rel"
    chat_service.message_manager.create_message_relationship.assert_called_with(
        src, tgt, "type", {}
    )


@pytest.mark.asyncio
async def test_get_message_thread(chat_service):
    root = uuid4()
    chat_service.message_manager.get_message_thread.return_value = ["M1"]
    res = await chat_service.get_message_thread(root, 5)
    assert res == ["M1"]
    chat_service.message_manager.get_message_thread.assert_called_with(root, 5)


@pytest.mark.asyncio
async def test_get_session_messages(chat_service):
    sid = uuid4()
    chat_service.message_manager.get_session_messages.return_value = ["M1"]
    res = await chat_service.get_session_messages(sid, 10, 0, True)
    assert res == ["M1"]
    chat_service.message_manager.get_session_messages.assert_called_with(sid, 10, 0, True)
