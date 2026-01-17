"""Prompt Template Schemas."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PromptTemplateBase(BaseModel):
    """Base schema for prompt templates."""

    function_name: str
    version: str
    template_content: str
    input_variables: List[str] = []
    description: Optional[str] = None
    is_active: bool = False


class PromptTemplateCreate(PromptTemplateBase):
    """Schema for creating prompt templates."""

    pass


class PromptTemplateUpdate(BaseModel):
    """Schema for updating prompt templates."""

    template_content: Optional[str] = None
    input_variables: Optional[List[str]] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class PromptTemplateResponse(PromptTemplateBase):
    """Schema for prompt template response."""

    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PromptTestRequest(BaseModel):
    """Schema for prompt testing request."""

    template_content: str
    input_variables: Dict[str, Any]
