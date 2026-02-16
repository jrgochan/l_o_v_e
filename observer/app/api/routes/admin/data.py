"""Admin Routes — Clinical alerts, bootstrap data, and prompt templates."""

import logging
from typing import Annotated, Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.database import get_db
from app.models.clinical_alert import ClinicalAlert
from app.models.user import User
from app.schemas.bootstrap import BootstrapDataCreate, BootstrapDataResponse, BootstrapDataUpdate
from app.schemas.prompts import (
    PromptTemplateCreate,
    PromptTemplateResponse,
    PromptTemplateUpdate,
    PromptTestRequest,
)
from app.services.ai.prompts import PromptService, get_prompt_service
from app.types.insights import PromptCreateContext

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Clinical Alerts ──────────────────────────────────────────────────────────


@router.get("/alerts", response_model=Dict[str, Any])
async def list_clinical_alerts(
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
    skip: int = 0,
    limit: int = 50,
    level: Optional[str] = None,
) -> Any:
    """List clinical alerts (paginated). Optional filter by severity level."""
    from sqlalchemy import func  # pylint: disable=import-outside-toplevel

    query = select(ClinicalAlert)
    count_query = select(func.count(ClinicalAlert.id))  # pylint: disable=not-callable

    if level:
        query = query.where(ClinicalAlert.level == level)
        count_query = count_query.where(ClinicalAlert.level == level)

    count_res = await db.execute(count_query)
    total = count_res.scalar()

    query = query.order_by(ClinicalAlert.timestamp.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    alerts = result.scalars().all()

    return {
        "total": total,
        "items": alerts,
        "skip": skip,
        "limit": limit,
    }


# ── Bootstrap Data ───────────────────────────────────────────────────────────


@router.get("/bootstrap", response_model=List[BootstrapDataResponse])
async def list_bootstrap_data(
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
    data_type: Optional[str] = None,
) -> Any:
    """List bootstrap data items (optional filter by type)."""
    from app.models.bootstrap_data import BootstrapData  # pylint: disable=import-outside-toplevel

    stmt = select(BootstrapData)
    if data_type:
        stmt = stmt.where(BootstrapData.data_type == data_type)

    stmt = stmt.order_by(BootstrapData.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/bootstrap", response_model=BootstrapDataResponse)
async def create_bootstrap_data(
    data_in: BootstrapDataCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """Create new bootstrap data item."""
    from app.models.bootstrap_data import BootstrapData  # pylint: disable=import-outside-toplevel

    item = BootstrapData(
        data_type=data_in.data_type,
        data_category=data_in.data_category,
        content=data_in.content,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/bootstrap/{item_id}", response_model=BootstrapDataResponse)
async def update_bootstrap_data(
    item_id: UUID,
    data_in: BootstrapDataUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """Update bootstrap data item."""
    from app.models.bootstrap_data import BootstrapData  # pylint: disable=import-outside-toplevel

    stmt = select(BootstrapData).where(BootstrapData.id == item_id)
    result = await db.execute(stmt)
    item = result.scalars().first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    update_data = data_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/bootstrap/{item_id}")
async def delete_bootstrap_data(
    item_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """Delete bootstrap data item."""
    from app.models.bootstrap_data import BootstrapData  # pylint: disable=import-outside-toplevel

    stmt = select(BootstrapData).where(BootstrapData.id == item_id)
    result = await db.execute(stmt)
    item = result.scalars().first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(item)  # type: ignore
    await db.commit()
    return {"status": "success", "id": str(item_id)}


# ── Prompt Templates ────────────────────────────────────────────────────────


@router.get("/prompts", response_model=List[PromptTemplateResponse])
async def list_prompts(
    prompt_service: Annotated[PromptService, Depends(get_prompt_service)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
    function_name: Optional[str] = None,
) -> Any:
    """List prompt templates."""
    return await prompt_service.list_prompts(function_name)


@router.post("/prompts", response_model=PromptTemplateResponse)
async def create_prompt(
    prompt_in: PromptTemplateCreate,
    prompt_service: Annotated[PromptService, Depends(get_prompt_service)],
    current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """Create a new prompt template version."""
    ctx = PromptCreateContext(
        function_name=prompt_in.function_name,
        version=prompt_in.version,
        template_content=prompt_in.template_content,
        input_variables=prompt_in.input_variables,
        description=prompt_in.description,
        is_active=prompt_in.is_active,
        created_by=str(current_admin.id),
    )
    return await prompt_service.create_prompt(ctx)


@router.put("/prompts/{prompt_id}", response_model=PromptTemplateResponse)
async def update_prompt(
    prompt_id: UUID,
    prompt_in: PromptTemplateUpdate,
    prompt_service: Annotated[PromptService, Depends(get_prompt_service)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """Update a prompt template."""
    updated = await prompt_service.update_prompt(
        prompt_id, **prompt_in.model_dump(exclude_unset=True)
    )

    if not updated:
        raise HTTPException(status_code=404, detail="Prompt template not found")

    return updated


@router.post("/prompts/test")
async def test_prompt_render(
    request: PromptTestRequest,
    _current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """Test rendering a prompt with variables."""
    try:
        rendered = request.template_content.format(**request.input_variables)
        return {"rendered_content": rendered}
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing variable in input: {e}") from e
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Render failed: {str(e)}") from e
