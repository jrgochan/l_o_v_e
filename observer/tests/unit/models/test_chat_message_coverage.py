from uuid import uuid4

from app.models.chat_message import ChatMessage


def test_chat_message_repr():
    """Test ChatMessage string representation."""
    msg_id = uuid4()
    session_id = uuid4()
    msg = ChatMessage(id=msg_id, session_id=session_id, message_type="user_text", content="Hello")
    expected = f"<ChatMessage {msg_id} type=user_text session={session_id}>"
    assert repr(msg) == expected
