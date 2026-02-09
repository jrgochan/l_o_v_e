from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.models.chat_message import ChatMessage
from app.services.ai.embeddings import EmbeddingService
from app.services.memory.association import AssociationEngine


@pytest.fixture
def mock_embedding_service():
    service = MagicMock(spec=EmbeddingService)
    # Mock embedding generation
    service.generate_embedding = AsyncMock(return_value=[0.1] * 384)
    return service


@pytest.fixture
def mock_session():
    session = AsyncMock()
    session.execute = AsyncMock()
    session.add = MagicMock()
    session.commit = AsyncMock()
    return session


@pytest.mark.asyncio
async def test_auto_link_success(mock_session, mock_embedding_service):
    """Test standard auto-linking flow."""
    engine = AssociationEngine(embedding_service=mock_embedding_service)

    # Setup Data
    msg_id = uuid4()
    user_id = uuid4()

    # 1. Message Lookup Mock
    current_msg = ChatMessage(id=msg_id, session_id=uuid4(), content="Current msg")
    # Simulate embedding not present yet
    current_msg.semantic_embedding = None

    # 2. Session/User Lookup Mock
    # State 1: Get Message -> returns current_msg
    mock_result_msg = MagicMock()
    mock_result_msg.scalar_one_or_none.return_value = current_msg

    # State 2: Get User ID -> returns user_id
    mock_result_user = MagicMock()
    mock_result_user.scalar_one_or_none.return_value = user_id

    # State 3: Get Similar -> returns with distance
    past_msg = ChatMessage(id=uuid4(), content="Past msg")

    mock_result_similar = MagicMock()
    mock_result_similar.all.return_value = [(past_msg, 0.1)]

    # Apply side effects
    mock_session.execute.side_effect = [
        mock_result_msg,  # 1. Fetch msg
        mock_result_user,  # 2. Fetch user
        mock_result_similar,  # 3. Search
    ]

    links = await engine.auto_link(msg_id, mock_session)

    # Verification
    assert len(links) == 1
    link = links[0]
    assert link.source_message_id == msg_id
    assert link.target_message_id == past_msg.id
    assert link.relationship_type == "semantic_similarity"
    assert link.metadata["score"] == 0.9

    # Verify embedding was generated and set
    assert current_msg.semantic_embedding == [0.1] * 384
    mock_session.add.assert_any_call(current_msg)  # Should save the embedding
    mock_session.commit.assert_awaited()


@pytest.mark.asyncio
async def test_auto_link_no_matches(mock_session, mock_embedding_service):
    """Test low similarity results are filtered."""
    engine = AssociationEngine(embedding_service=mock_embedding_service)
    msg_id = uuid4()

    # Mocks
    current_msg = ChatMessage(id=msg_id, session_id=uuid4(), content="Test")
    mock_result_msg = MagicMock()
    mock_result_msg.scalar_one_or_none.return_value = current_msg

    mock_result_user = MagicMock()
    mock_result_user.scalar_one_or_none.return_value = uuid4()

    # Distance = 0.5 (Similarity = 0.5) -> Below threshold 0.8
    past_msg = ChatMessage(id=uuid4(), content="Far msg")
    mock_result_similar = MagicMock()
    mock_result_similar.all.return_value = [(past_msg, 0.5)]

    mock_session.execute.side_effect = [
        mock_result_msg,
        mock_result_user,
        mock_result_similar,
    ]

    links = await engine.auto_link(msg_id, mock_session)

    assert len(links) == 0


@pytest.mark.asyncio
async def test_auto_link_message_not_found(mock_session, mock_embedding_service):
    """Test when message does not exist or has no content."""
    engine = AssociationEngine(embedding_service=mock_embedding_service)

    # 1. Message not found
    mock_result_none = MagicMock()
    mock_result_none.scalar_one_or_none.return_value = None
    mock_session.execute.side_effect = [mock_result_none]

    assert await engine.auto_link(uuid4(), mock_session) == []

    # 2. Empty content
    mock_result_empty = MagicMock()
    mock_result_empty.scalar_one_or_none.return_value = ChatMessage(content="")
    mock_session.execute.side_effect = [mock_result_empty]

    assert await engine.auto_link(uuid4(), mock_session) == []


@pytest.mark.asyncio
async def test_auto_link_embedding_failure(mock_session, mock_embedding_service):
    """Test embedding generation failure."""
    mock_embedding_service.generate_embedding.side_effect = Exception("API Error")
    engine = AssociationEngine(embedding_service=mock_embedding_service)

    msg = ChatMessage(id=uuid4(), content="Fail", semantic_embedding=None)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = msg
    mock_session.execute.side_effect = [mock_result]

    assert await engine.auto_link(uuid4(), mock_session) == []


@pytest.mark.asyncio
async def test_auto_link_missing_user_id(mock_session, mock_embedding_service):
    """Test failure to find user_id."""
    engine = AssociationEngine(embedding_service=mock_embedding_service)

    msg = ChatMessage(
        id=uuid4(),
        session_id=uuid4(),
        content="No User",
        semantic_embedding=[0.1] * 384,
    )

    # 1. Get Message
    mock_result_msg = MagicMock()
    mock_result_msg.scalar_one_or_none.return_value = msg

    # 2. Get User ID -> None
    mock_result_user = MagicMock()
    mock_result_user.scalar_one_or_none.return_value = None

    mock_session.execute.side_effect = [mock_result_msg, mock_result_user]

    assert await engine.auto_link(uuid4(), mock_session) == []
