import uuid
from datetime import datetime, timezone

from app.models.chat_session import ChatSession


def test_chat_session_to_dict():
    """Test ChatSession serialization."""
    session = ChatSession(
        id=uuid.uuid4(),
        user_id="user_1",
        auth_user_id=uuid.uuid4(),
        started_at=datetime.now(timezone.utc),
        ended_at=datetime.now(timezone.utc),
        message_count=5,
        tone_preference="clinical",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    data = session.to_dict()
    assert data["user_id"] == "user_1"
