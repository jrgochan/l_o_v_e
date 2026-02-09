"""Base Repository Interface.

Implements standard CRUD operations for SQLAlchemy models using AsyncSession.
"""

from typing import Any, Dict, Generic, Optional, Sequence, Type, TypeVar, Union

from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import Base

TModel = TypeVar("TModel", bound=Base)  # pylint: disable=invalid-name
TCreateSchema = TypeVar("TCreateSchema", bound=BaseModel)  # pylint: disable=invalid-name
TUpdateSchema = TypeVar(  # pylint: disable=invalid-name
    "TUpdateSchema", bound=Union[BaseModel, Dict[str, Any]]
)


class BaseRepository(Generic[TModel, TCreateSchema, TUpdateSchema]):
    """Base repository with default CRUD operations."""

    def __init__(self, model: Type[TModel], session: AsyncSession):
        """Initialize repository.

        Args:
            model: The SQLAlchemy model class
            session: The AsyncSession instance
        """
        self.model = model
        self.session = session

    async def get(self, record_id: Any) -> Optional[TModel]:
        """Get a single record by ID."""
        # mypy doesn't know TModel has 'id' because it's bound to Base.
        # We assume strict adherence to IDMixin or similar in models.
        stmt = select(self.model).where(self.model.id == record_id)  # type: ignore
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_multi(self, skip: int = 0, limit: int = 100) -> Sequence[TModel]:
        """Get multiple records with pagination."""
        result = await self.session.execute(select(self.model).offset(skip).limit(limit))
        return result.scalars().all()

    async def create(self, obj_in: TCreateSchema) -> TModel:
        """Create a new record."""
        obj_in_data = jsonable_encoder(obj_in)
        db_obj = self.model(**obj_in_data)
        self.session.add(db_obj)
        await self.session.commit()
        await self.session.refresh(db_obj)
        return db_obj

    async def update(self, db_obj: TModel, obj_in: Union[TUpdateSchema, Dict[str, Any]]) -> TModel:
        """Update an existing record."""
        obj_data = jsonable_encoder(db_obj)
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)

        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])

        self.session.add(db_obj)
        await self.session.commit()
        await self.session.refresh(db_obj)
        return db_obj

    async def delete(self, record_id: Any) -> Optional[TModel]:
        """Delete a record by ID."""
        obj = await self.get(record_id)
        if obj:
            await self.session.delete(obj)
            await self.session.commit()
        return obj
