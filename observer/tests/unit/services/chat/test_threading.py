from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.models.chat_message import ChatMessage
from app.services.chat.service import ChatService


@pytest.fixture
def mock_db_session():
    return AsyncMock()


@pytest.mark.asyncio
async def test_get_message_thread(mock_db_session):
    """Test get_message_thread constructs query and processes results."""
    service = ChatService(mock_db_session)
    root_id = uuid4()

    # Mock Root Message
    root_msg = ChatMessage(id=root_id, content="Root")

    # Mock Descendants
    child1 = ChatMessage(id=uuid4(), content="Child 1")
    child2 = ChatMessage(id=uuid4(), content="Child 2")

    # Mock DB Execute
    # Call 1: CTE Execution (fetch descendants)
    mock_result_cte = MagicMock()
    mock_result_cte.scalars().all.return_value = [child1, child2]

    # Call 2: get_message(root) -> returns root_msg
    mock_result_root = MagicMock()
    mock_result_root.scalar_one_or_none.return_value = root_msg

    mock_db_session.execute.side_effect = [mock_result_cte, mock_result_root]

    thread = await service.get_message_thread(root_id)

    assert len(thread) == 3
    assert thread[0] == root_msg
    assert thread[1] == child1
    assert thread[2] == child2

    # Verify execute called twice
    assert mock_db_session.execute.call_count == 2


@pytest.mark.asyncio
async def test_get_message_thread_no_root(mock_db_session):
    """Test get_message_thread when root message is missing."""
    service = ChatService(mock_db_session)
    root_id = uuid4()

    # Mock Descendants
    child1 = ChatMessage(id=uuid4(), content="Child 1")

    # Call 1: CTE returns descendants
    mock_result_cte = MagicMock()
    mock_result_cte.scalars().all.return_value = [child1]

    # Call 2: get_message returns None
    mock_result_root = MagicMock()
    mock_result_root.scalar_one_or_none.return_value = None

    mock_db_session.execute.side_effect = [mock_result_cte, mock_result_root]

    thread = await service.get_message_thread(root_id)

    assert len(thread) == 1
    assert thread[0] == child1
