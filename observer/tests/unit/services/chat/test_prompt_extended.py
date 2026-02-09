from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.ai.prompts import PromptService


@pytest.fixture
def mock_session():
    return AsyncMock(spec=AsyncSession)


@pytest.fixture
def service(mock_session):
    return PromptService(mock_session)


@pytest.mark.asyncio
async def test_get_active_prompt_error(service, mock_session):
    """Test exception handling in get_active_prompt."""
    mock_session.execute.side_effect = SQLAlchemyError("DB Error")
    res = await service.get_active_prompt("func")
    assert res is None


@pytest.mark.asyncio
async def test_list_prompts_error(service, mock_session):
    """Test exception handling in list_prompts."""
    mock_session.execute.side_effect = SQLAlchemyError("DB Error")
    res = await service.list_prompts()
    assert res == []


@pytest.mark.asyncio
async def test_create_prompt_error(service, mock_session):
    """Test rollback on creation error."""
    mock_session.add.side_effect = SQLAlchemyError("DB Error")

    with pytest.raises(SQLAlchemyError):
        await service.create_prompt(
            MagicMock(
                function_name="func",
                version="v1",
                is_active=True,
                input_variables=[],
                description="desc",
                created_by="user",
            )
        )

    mock_session.rollback.assert_awaited()


@pytest.mark.asyncio
async def test_update_prompt_not_found_and_error(service, mock_session):
    """Test update logic for missing prompt and error handling."""
    # Case 1: Not found
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result

    res = await service.update_prompt(uuid4(), is_active=True)
    assert res is None

    # Case 2: Error during update
    # Reset mock to return a prompt
    mock_prompt = MagicMock()
    mock_prompt.function_name = "func"
    mock_prompt.is_active = False

    mock_result.scalar_one_or_none.return_value = mock_prompt
    mock_session.execute.return_value = mock_result
    mock_session.commit.side_effect = SQLAlchemyError("Commit Failed")

    with pytest.raises(SQLAlchemyError):
        await service.update_prompt(uuid4(), description="New")

    mock_session.rollback.assert_awaited()
