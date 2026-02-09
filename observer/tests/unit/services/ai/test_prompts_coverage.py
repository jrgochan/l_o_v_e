from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from sqlalchemy.exc import SQLAlchemyError

from app.models.prompt_template import PromptTemplate
from app.services.ai.prompts import PromptService
from app.types.insights import PromptCreateContext


@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.add = MagicMock()
    db.delete = MagicMock()
    return db


@pytest.fixture
def service(mock_db):
    return PromptService(mock_db)


@pytest.mark.asyncio
async def test_get_active_prompt_success(service, mock_db):
    """Test getting active prompt successfully."""
    mock_prompt = MagicMock(spec=PromptTemplate)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_prompt
    mock_db.execute.return_value = mock_result

    result = await service.get_active_prompt("func")
    assert result == mock_prompt


@pytest.mark.asyncio
async def test_get_active_prompt_error(service, mock_db):
    """Test db error logs and returns None."""
    mock_db.execute.side_effect = SQLAlchemyError("DB Error")

    with patch("app.services.ai.prompts.logger") as mock_logger:
        result = await service.get_active_prompt("func")
        assert result is None
        mock_logger.error.assert_called()


@pytest.mark.asyncio
async def test_list_prompts(service, mock_db):
    """Test listing prompts."""
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [MagicMock(), MagicMock()]
    mock_db.execute.return_value = mock_result

    # Test with filter
    results = await service.list_prompts("func")
    assert len(results) == 2

    # Test without filter
    results = await service.list_prompts()
    assert len(results) == 2


@pytest.mark.asyncio
async def test_list_prompts_error(service, mock_db):
    """Test list prompts error."""
    mock_db.execute.side_effect = SQLAlchemyError("DB Error")
    results = await service.list_prompts()
    assert results == []


@pytest.mark.asyncio
async def test_create_prompt_standard(service, mock_db):
    """Test creating prompt."""
    context = PromptCreateContext(
        function_name="func",
        version="1.0",
        template_content="Hello {{ name }}",
        input_variables=["name"],
        is_active=False,
    )

    result = await service.create_prompt(context)
    assert result.function_name == "func"
    mock_db.add.assert_called()
    mock_db.commit.assert_called()


@pytest.mark.asyncio
async def test_create_prompt_error(service, mock_db):
    """Test create prompt rollback."""
    mock_db.commit.side_effect = SQLAlchemyError("Commit Fail")
    context = PromptCreateContext(
        function_name="func", version="1.0", template_content="Hi", is_active=False
    )

    with pytest.raises(SQLAlchemyError):
        await service.create_prompt(context)

    mock_db.rollback.assert_called()


@pytest.mark.asyncio
async def test_create_active_prompt_deactivates_others(service, mock_db):
    """Test creating active prompt calls deactivate."""
    context = PromptCreateContext(
        function_name="func", version="1.0", template_content="Hi", is_active=True
    )

    # Spy on _deactivate_others by patching it on the instance?
    # Or just verify execute call for update?

    await service.create_prompt(context)

    # Verify update query was executed (for deactivation)
    # mock_db.execute will be called for update and refresh?
    # Actually _deactivate_others calls execute(update...)
    # We can check checks.
    assert mock_db.execute.call_count >= 1


@pytest.mark.asyncio
async def test_update_prompt_not_found(service, mock_db):
    """Test update non-existent prompt."""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    result = await service.update_prompt(uuid4(), description="New")
    assert result is None


@pytest.mark.asyncio
async def test_update_prompt_success(service, mock_db):
    """Test update success with activation."""
    mock_prompt = MagicMock(spec=PromptTemplate)
    mock_prompt.is_active = False  # Current state
    mock_prompt.function_name = "func"

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_prompt
    mock_db.execute.return_value = mock_result

    result = await service.update_prompt(uuid4(), is_active=True, description="Updated")

    assert result == mock_prompt
    assert mock_prompt.description == "Updated"  # MagicMock stores attrs
    # Check commit
    mock_db.commit.assert_called()


@pytest.mark.asyncio
async def test_update_prompt_error(service, mock_db):
    """Test update rollback."""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = MagicMock(spec=PromptTemplate)
    mock_db.execute.return_value = mock_result
    mock_db.commit.side_effect = SQLAlchemyError("Fail")

    with pytest.raises(SQLAlchemyError):
        await service.update_prompt(uuid4(), is_active=True)

    mock_db.rollback.assert_called()


@pytest.mark.asyncio
async def test_render_active_prompt(service):
    """Test render flow."""
    # Patch get_active_prompt
    mock_tmpl = MagicMock(spec=PromptTemplate)
    mock_tmpl.template_content = "Hello {{ name }}"

    service.get_active_prompt = AsyncMock(return_value=mock_tmpl)

    # Patch PromptRenderer
    with patch("app.services.ai.prompts.PromptRenderer") as mock_renderer_cls:
        mock_renderer = mock_renderer_cls.return_value
        mock_renderer.render.return_value = "Hello World"

        result = await service.render_active_prompt("func", {"name": "World"})
        assert result == "Hello World"
        mock_renderer.render.assert_called_with(mock_tmpl, {"name": "World"})


@pytest.mark.asyncio
async def test_render_active_prompt_none(service):
    """Test render when no active prompt."""
    service.get_active_prompt = AsyncMock(return_value=None)
    result = await service.render_active_prompt("func", {})
    assert result is None


@pytest.mark.asyncio
async def test_get_prompt_service_factory():
    """Test service factory."""
    from app.services.ai.prompts import get_prompt_service

    mock_session = AsyncMock()
    svc = await get_prompt_service(mock_session)
    assert isinstance(svc, PromptService)
    assert svc.db is mock_session


@pytest.mark.asyncio
async def test_update_prompt_ignores_invalid_fields(service, mock_db):
    """Test update ignores fields not on model (Line 106 branch)."""
    mock_prompt = MagicMock(spec=PromptTemplate)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_prompt
    mock_db.execute.return_value = mock_result

    # Pass 'invalid_field' which PromptTemplate doesn't have
    await service.update_prompt(uuid4(), invalid_field="IgnoreMe")

    # Verify setattr was NOT called for invalid_field
    # MagicMock specs restrict attribute access but setattr might still work or raise if strict
    # With spec=PromptTemplate, setting unknown attr might fail if spec_set is used.
    # Standard MagicMock allows setting new attrs.
    # But code checks hasattr first.
    # existing Mock with spec usually says hasattr=False for unknown?
    # Actually explicit spec objects: hasattr(mock, 'foo') works if foo in spec.
    assert not hasattr(mock_prompt, "invalid_field")

    # Verify commit called (even if no changes made to fields, it commits)
    mock_db.commit.assert_called()
