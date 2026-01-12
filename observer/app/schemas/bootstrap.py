"""Bootstrap Data Schemas."""

from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class BootstrapDataBase(BaseModel):
    """Base schema for bootstrap data."""

    data_type: str
    data_category: Optional[str] = None
    content: Dict[str, Any]


class BootstrapDataCreate(BootstrapDataBase):
    """Schema for creating bootstrap data."""

    pass


class BootstrapDataUpdate(BaseModel):
    """Schema for updating bootstrap data."""

    data_type: Optional[str] = None
    data_category: Optional[str] = None
    content: Optional[Dict[str, Any]] = None


class BootstrapDataResponse(BootstrapDataBase):
    """Schema for bootstrap data response."""

    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
