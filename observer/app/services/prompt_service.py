"""Prompt Service.

Manages AI prompt templates, including versioning, activation, and retrieval.
"""

import logging
from typing import Any, List, Optional
from uuid import UUID

from fastapi import Depends
from sqlalchemy import and_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.prompt_template import PromptTemplate

logger = logging.getLogger(__name__)


class PromptService:
    """Service for managing AI prompt templates."""

    def __init__(self, db: AsyncSession) -> None:
        """Initialize PromptService with database session."""
        self.db = db

    async def get_active_prompt(self, function_name: str) -> Optional[PromptTemplate]:
        """Get the currently active prompt for a function."""
        try:
            result = await self.db.execute(
                select(PromptTemplate).where(
                    and_(
                        PromptTemplate.function_name == function_name,
                        PromptTemplate.is_active.is_(True),
                    )
                )
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Failed to get active prompt for {function_name}: {e}")
            return None

    async def list_prompts(self, function_name: Optional[str] = None) -> List[PromptTemplate]:
        """List all prompt templates, optionally filtered by function."""
        try:
            query = select(PromptTemplate).order_by(
                PromptTemplate.function_name, PromptTemplate.created_at.desc()
            )

            if function_name:
                query = query.where(PromptTemplate.function_name == function_name)

            result = await self.db.execute(query)
            return list(result.scalars().all())
        except Exception as e:
            logger.error(f"Failed to list prompts: {e}")
            return []

    async def create_prompt(
        self,
        function_name: str,
        version: str,
        template_content: str,
        input_variables: Optional[List[str]] = None,
        description: Optional[str] = None,
        is_active: bool = False,
        created_by: Optional[str] = None,
    ) -> PromptTemplate:
        """Create a new prompt template version."""
        try:
            if is_active:
                # Deactivate other prompts for this function if this one is active
                await self._deactivate_others(function_name)

            prompt = PromptTemplate(
                function_name=function_name,
                version=version,
                template_content=template_content,
                input_variables=input_variables or [],
                description=description,
                is_active=is_active,
                created_by=created_by,
            )
            self.db.add(prompt)
            await self.db.commit()
            await self.db.refresh(prompt)
            return prompt
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to create prompt: {e}")
            raise

    async def update_prompt(self, prompt_id: UUID, **kwargs: Any) -> Optional[PromptTemplate]:
        """Update an existing prompt template."""
        try:
            result = await self.db.execute(
                select(PromptTemplate).where(PromptTemplate.id == prompt_id)
            )
            prompt = result.scalar_one_or_none()

            if not prompt:
                return None

            # Handle activation logic
            if kwargs.get("is_active") is True and not prompt.is_active:
                await self._deactivate_others(prompt.function_name)

            for key, value in kwargs.items():
                if hasattr(prompt, key):
                    setattr(prompt, key, value)

            await self.db.commit()
            await self.db.refresh(prompt)
            return prompt
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to update prompt {prompt_id}: {e}")
            raise

    async def _deactivate_others(self, function_name: str) -> None:
        """Deactivate all other prompts for a function."""
        await self.db.execute(
            update(PromptTemplate)
            .where(PromptTemplate.function_name == function_name)
            .values(is_active=False)
        )


async def get_prompt_service(db: AsyncSession = Depends(get_db)) -> PromptService:
    """Get PromptService instance with database session."""
    return PromptService(db)
