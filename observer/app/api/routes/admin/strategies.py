"""Admin Routes — Strategies, AI models, and strategy import."""

import logging
import sys
from datetime import datetime, timezone
from typing import Annotated, Any, Dict, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.database import get_db
from app.models.model_assignment import ModelAssignment
from app.models.transition_strategy import TransitionStrategy
from app.models.user import User
from app.schemas.ai_models import ModelAssignmentResponse, ModelAssignmentUpdate
from app.schemas.strategies import StrategyResponse, StrategyUpdate
from app.services.admin.service import AdminService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/strategies", response_model=List[StrategyResponse])
async def list_strategies(
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """List all therapeutic strategies."""
    stmt = select(TransitionStrategy).order_by(TransitionStrategy.strategy_name)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.put("/strategies/{strategy_id}", response_model=StrategyResponse)
async def update_strategy(
    strategy_id: UUID,
    strategy_in: StrategyUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """Update a therapeutic strategy."""
    stmt = select(TransitionStrategy).where(TransitionStrategy.id == strategy_id)
    result = await db.execute(stmt)
    strategy = result.scalars().first()

    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    update_data = strategy_in.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(strategy, field, value)

    db.add(strategy)
    await db.commit()
    await db.refresh(strategy)
    return strategy


@router.get("/strategies/export")
async def export_strategies(
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """Export strategies as JSON."""
    service = AdminService(db)
    return await service.export_strategies()


@router.post("/strategies/import", response_model=Dict[str, Any])
async def import_strategies(
    data: Dict[str, Any],
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
) -> Dict[str, Any]:
    """Import strategies from JSON."""
    if "strategies" not in data:
        raise HTTPException(status_code=400, detail="Invalid format: 'strategies' key missing")

    strategies_list = data["strategies"]
    updated_count = 0
    created_count = 0
    errors = []

    for item in strategies_list:
        try:
            strategy_name = item.get("name") or item.get("strategy_name")
            if not strategy_name:
                continue

            strategy_data = item.copy()
            if "name" not in strategy_data and "strategy_name" in strategy_data:
                strategy_data["name"] = strategy_data["strategy_name"]

            # Dynamic lookup: tests patch app.api.routes.admin._process_strategy_import
            # so we look up on the parent package to honor that patch.
            _admin_pkg = sys.modules.get("app.api.routes.admin", sys.modules[__name__])
            process_fn = _admin_pkg._process_strategy_import
            is_updated = await process_fn(db, strategy_data)
            if is_updated:
                updated_count += 1
            else:
                created_count += 1

        except Exception as e:  # pylint: disable=broad-exception-caught
            errors.append(f"Error processing {item.get('name', 'unknown')}: {str(e)}")

    try:
        await db.commit()
    except SQLAlchemyError as e:
        logger.error("Commit failed for strategies: %s", e)
        errors.append(f"Commit failed: {str(e)}")

    return {
        "status": "success",
        "updated": updated_count,
        "created": created_count,
        "errors": errors,
    }


async def _process_strategy_import(db: AsyncSession, strategy_data: Dict[str, Any]) -> bool:
    """Process a single strategy for import."""
    stmt = select(TransitionStrategy).where(
        TransitionStrategy.strategy_name == strategy_data["name"]
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()
    is_updated = False

    if existing:
        existing.strategy_type = strategy_data["type"]
        existing.description = strategy_data["description"]
        existing.difficulty_level = strategy_data["difficulty"]
        existing.evidence_level = strategy_data["evidence"]
        existing.detailed_steps = strategy_data.get("steps", [])
        existing.contraindications = strategy_data.get("contraindications", [])
        is_updated = True
    else:
        new_strategy = TransitionStrategy(
            strategy_name=strategy_data["name"],
            strategy_type=strategy_data["type"],
            description=strategy_data["description"],
            difficulty_level=strategy_data["difficulty"],
            evidence_level=strategy_data["evidence"],
            detailed_steps=strategy_data.get("steps", []),
            contraindications=strategy_data.get("contraindications"),
        )
        db.add(new_strategy)
        is_updated = False

    return is_updated


@router.get("/ai-models", response_model=List[ModelAssignmentResponse])
async def list_ai_models(
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """List all AI function model assignments."""
    result = await db.execute(select(ModelAssignment))
    return result.scalars().all()


@router.put("/ai-models/{function}", response_model=ModelAssignmentResponse)
async def update_ai_model(
    function: str,
    update_data: ModelAssignmentUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """Update the AI model assigned to a specific function."""
    result = await db.execute(select(ModelAssignment).where(ModelAssignment.function == function))
    assignment = result.scalar_one_or_none()

    if not assignment:
        assignment = ModelAssignment(
            function=function,
            ai_model_name=update_data.ai_model_name,
            assigned_by=str(current_admin.id),
        )
        db.add(assignment)
    else:
        assignment.ai_model_name = update_data.ai_model_name
        assignment.assigned_by = str(current_admin.id)
        assignment.assigned_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(assignment)
    return assignment
