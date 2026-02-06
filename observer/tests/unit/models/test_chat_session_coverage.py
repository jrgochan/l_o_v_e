from uuid import uuid4

from app.models.chat_session import ChatSession


def test_chat_session_repr():
    """Test ChatSession string representation."""
    session_id = uuid4()
    user_id = "user_test_123"
    session = ChatSession(id=session_id, user_id=user_id, message_count=5)
    expected = f"<ChatSession {session_id} user={user_id} messages=5>"
    assert repr(session) == expected
