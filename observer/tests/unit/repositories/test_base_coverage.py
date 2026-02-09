from typing import Optional
from unittest.mock import AsyncMock, MagicMock

import pytest
from pydantic import BaseModel
from sqlalchemy.orm import Mapped, mapped_column

# Mock Model and Schemas
from app.database import Base
from app.repositories.base import BaseRepository


# Mock Model and Schemas
class MockModel(Base):
    __tablename__ = "mock_table"
    id: Mapped[str] = mapped_column(primary_key=True)
    name: Mapped[Optional[str]] = mapped_column(nullable=True)


class MockCreateSchema(BaseModel):
    name: str


class MockUpdateSchema(BaseModel):
    name: Optional[str] = None


class MockRepo(BaseRepository[MockModel, MockCreateSchema, MockUpdateSchema]):
    def __init__(self, session):
        super().__init__(MockModel, session)


@pytest.fixture
def repo():
    async def async_return(*args, **kwargs):
        return None

    session = MagicMock()
    session.add = MagicMock()
    session.delete = AsyncMock()
    session.execute = AsyncMock()
    session.commit = MagicMock(side_effect=async_return)
    session.refresh = MagicMock(side_effect=async_return)
    return MockRepo(session)


@pytest.mark.asyncio
async def test_get_multi(repo):
    """Test line 43-46: get_multi with pagination."""
    mock_objs = [MockModel(id="1"), MockModel(id="2")]

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = mock_objs
    repo.session.execute.return_value = mock_result

    result = await repo.get_multi(skip=10, limit=20)

    assert result == mock_objs
    repo.session.execute.assert_called_once()
    stmt = repo.session.execute.call_args[0][0]
    stmt_str = str(stmt)
    assert "OFFSET :param_1" in stmt_str or "OFFSET" in stmt_str
    assert "LIMIT :param_2" in stmt_str or "LIMIT" in stmt_str


@pytest.mark.asyncio
async def test_create(repo):
    """Test lines 48-55: create method."""
    create_schema = MockCreateSchema(name="Test")

    # We need to simulate the DB object creation
    # The base repo does: db_obj = self.model(**obj_in_data)
    # Our MockModel accepts kwargs

    result = await repo.create(create_schema)

    assert isinstance(result, MockModel)
    assert result.name == "Test"

    repo.session.add.assert_called_once()
    repo.session.commit.assert_called_once()
    repo.session.refresh.assert_called_once_with(result)


@pytest.mark.asyncio
async def test_update_with_schema(repo):
    """Test lines 57-72: update with Pydantic schema."""
    db_obj = MockModel(id="1", name="Old")
    update_schema = MockUpdateSchema(name="New")

    result = await repo.update(db_obj, update_schema)

    assert result.name == "New"
    repo.session.add.assert_called_with(db_obj)
    repo.session.commit.assert_called_once()
    repo.session.refresh.assert_called_once_with(db_obj)


@pytest.mark.asyncio
async def test_update_with_dict(repo):
    """Test lines 57-72: update with dict."""
    db_obj = MockModel(id="1", name="Old")
    update_data = {"name": "NewDict"}

    result = await repo.update(db_obj, update_data)

    assert result.name == "NewDict"
    repo.session.commit.assert_called_once()


@pytest.mark.asyncio
async def test_delete_found(repo):
    """Test lines 74-80: delete existing record."""
    # Mock lookup
    mock_obj = MockModel(id="1")

    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = mock_obj
    repo.session.execute.return_value = mock_result

    result = await repo.delete("1")

    assert result == mock_obj
    repo.session.delete.assert_awaited_with(mock_obj)
    repo.session.commit.assert_called_once()


@pytest.mark.asyncio
async def test_delete_not_found(repo):
    """Test lines 77: delete non-existent record."""
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = None
    repo.session.execute.return_value = mock_result

    result = await repo.delete("2")

    assert result is None
    repo.session.delete.assert_not_called()
    repo.session.commit.assert_not_called()  # line 79 skipped
