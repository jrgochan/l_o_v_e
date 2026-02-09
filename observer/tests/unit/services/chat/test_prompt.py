from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.prompt_template import PromptTemplate
from app.services.ai.prompts import PromptService, get_prompt_service
from app.types.insights import PromptCreateContext


@pytest.fixture
def mock_session():
    return AsyncMock(spec=AsyncSession)


@pytest.fixture
def service(mock_session):
    return PromptService(mock_session)


@pytest.fixture
def mock_template():
    t = MagicMock(spec=PromptTemplate)
    t.function_name = "test_func"
    t.version = "v1"
    t.is_active = False
    return t


@pytest.mark.asyncio
async def test_get_active_prompt(service, mock_session):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = "prompt"
    mock_session.execute.return_value = mock_result

    res = await service.get_active_prompt("func")
    assert res == "prompt"

    # Exception handling
    mock_session.execute.side_effect = SQLAlchemyError("error")
    res = await service.get_active_prompt("func")
    assert res is None


@pytest.mark.asyncio
async def test_list_prompts(service, mock_session):
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = ["p1", "p2"]
    mock_session.execute.return_value = mock_result

    # 1. No filter
    res = await service.list_prompts()
    assert len(res) == 2

    # 2. With filter
    res = await service.list_prompts("func")
    assert len(res) == 2


@pytest.mark.asyncio
async def test_prompt_service_update_invalid_key():
    """Test update_prompt with key not in model."""
    mock_session = AsyncMock()
    service = PromptService(mock_session)

    prompt = MagicMock(spec=PromptTemplate, id=uuid4())
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = prompt
    mock_session.execute.return_value = mock_res

    await service.update_prompt(prompt.id, non_existent_field="value")
    assert mock_session.commit.called


@pytest.mark.asyncio
async def test_get_prompt_service_dependency():
    """Test get_prompt_service dependency function."""
    mock_session = AsyncMock()
    service = await get_prompt_service(mock_session)
    assert isinstance(service, PromptService)


@pytest.mark.asyncio
async def test_create_prompt(service, mock_session):
    # 1. Create inactive
    context = PromptCreateContext(function_name="func", version="v1", template_content="content")
    _ = await service.create_prompt(context)
    mock_session.add.assert_called_once()
    mock_session.commit.assert_awaited_once()

    # 2. Create active (should deactivate others)
    mock_session.reset_mock()
    context_active = PromptCreateContext(
        function_name="func", version="v2", template_content="content", is_active=True
    )
    _ = await service.create_prompt(context_active)
    # Check that update was called to deactivate others
    # Since _deactivate_others calls execute(update...), check execute call count
    assert mock_session.execute.call_count >= 1


@pytest.mark.asyncio
async def test_update_prompt(service, mock_session, mock_template):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_template
    mock_session.execute.return_value = mock_result

    # 1. Update simple field
    await service.update_prompt(uuid4(), description="New Desc")
    assert mock_template.description == "New Desc"
    mock_session.commit.assert_awaited()

    # 2. Activate (should deactivate others)
    mock_session.reset_mock()
    await service.update_prompt(uuid4(), is_active=True)
    # Verify execute called for update query
    # One execute for select, one for update (deactivate)
    assert mock_session.execute.call_count == 2
