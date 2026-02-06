"""Admin Routes - System Configuration & Management.

Administrative endpoints for user management and data oversight.
Protected by admin role requirement.
"""

import logging
from datetime import datetime
from typing import Annotated, Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.database import get_db
from app.models.chat_session import ChatSession
from app.models.clinical_alert import ClinicalAlert
from app.models.emotion_definition import EmotionDefinition
from app.models.model_assignment import ModelAssignment
from app.models.transition_strategy import TransitionStrategy
from app.models.user import User
from app.models.user_trajectory import UserTrajectory
from app.schemas.ai_models import ModelAssignmentResponse, ModelAssignmentUpdate
from app.schemas.bootstrap import BootstrapDataCreate, BootstrapDataResponse, BootstrapDataUpdate
from app.schemas.emotions import EmotionResponse, EmotionUpdate
from app.schemas.prompts import (
    PromptTemplateCreate,
    PromptTemplateResponse,
    PromptTemplateUpdate,
    PromptTestRequest,
)
from app.schemas.strategies import StrategyResponse, StrategyUpdate
from app.schemas.user import UserResponse, UserUpdate
from app.services.prompt_service import PromptService, get_prompt_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[User, Depends(get_current_admin)],
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """List all users (paginated)."""
    stmt = select(User).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """Get user by ID."""
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    user_in: UserUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """Update user (role, status, etc)."""
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_in.model_dump(exclude_unset=True)

    # Handle password update if present - should be hashed!
    # Ideally should be a separate endpoint or handled security utils,
    # but for admin helper we might want to reset password.
    # For now, excluding password update from this generic update for safety
    if "password" in update_data:
        from app.core.security import get_password_hash  # pylint: disable=import-outside-toplevel

        update_data["password_hash"] = get_password_hash(update_data.pop("password"))

    for field, value in update_data.items():
        setattr(user, field, value)

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/users/{user_id}/sessions")
async def get_user_sessions(
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[User, Depends(get_current_admin)],
    limit: int = 20,
) -> Any:
    """Get recent sessions for a user."""
    # Note: user might have sessions linked via user_id (string) OR auth_user_id (UUID)
    # We should query using the relationship if possible, or support both.
    # The relationship User.sessions is back_populating on auth_user_id.
    # But sessions from before auth integration only have user_id string.

    # Let's get the user to check their email/id string if needed, or just rely on the UUID link
    # For robust admin view, we'll check the direct link (auth_user_id)

    stmt = (
        select(ChatSession)
        .where(ChatSession.auth_user_id == user_id)
        .order_by(ChatSession.started_at.desc())
        .limit(limit)
    )

    result = await db.execute(stmt)
    sessions = result.scalars().all()

    return [s.to_dict() for s in sessions]


@router.get("/users/{user_id}/trajectory")
async def get_user_trajectory(
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[User, Depends(get_current_admin)],
    limit: int = 100,
) -> Any:
    """Get trajectory points for a user."""
    stmt = (
        select(UserTrajectory)
        .where(UserTrajectory.user_id == user_id)
        .order_by(UserTrajectory.timestamp.desc())
        .limit(limit)
    )

    result = await db.execute(stmt)
    points = result.scalars().all()

    return [p.to_dict() for p in points]


@router.get("/sessions")
async def list_sessions(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[User, Depends(get_current_admin)],
    skip: int = 0,
    limit: int = 50,
) -> Any:
    """List all chat sessions (paginated)."""
    # Get total count
    # Get total count
    from sqlalchemy import func  # pylint: disable=import-outside-toplevel

    count_stmt = select(func.count(ChatSession.id))  # pylint: disable=not-callable
    count_res = await db.execute(count_stmt)
    total = count_res.scalar()

    # Get sessions with user info
    # Get sessions with user info
    # We want to eager load the user if possible, but user relationship is optional
    from sqlalchemy.orm import selectinload  # pylint: disable=import-outside-toplevel

    stmt = (
        select(ChatSession)
        .options(selectinload(ChatSession.user))
        .order_by(ChatSession.started_at.desc())
        .offset(skip)
        .limit(limit)
    )

    result = await db.execute(stmt)
    sessions = result.scalars().all()

    return {
        "total": total,
        "items": [s.to_dict() for s in sessions],
        "skip": skip,
        "limit": limit,
    }


@router.get("/sessions/{session_id}")
async def get_session_details(
    session_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """Get full details of a session including messages."""
    """Get full details of a session including messages."""
    from sqlalchemy.orm import selectinload  # pylint: disable=import-outside-toplevel

    stmt = (
        select(ChatSession)
        .options(selectinload(ChatSession.messages), selectinload(ChatSession.user))
        .where(ChatSession.id == session_id)
    )

    result = await db.execute(stmt)
    session = result.scalars().first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Serialize with messages included
    data = session.to_dict()

    # Add messages explicitly sorted by created_at
    messages = session.messages
    # Sort by created_at (assuming it exists, otherwise id)
    messages.sort(key=lambda m: m.created_at)

    data["messages"] = [m.to_dict() for m in messages]

    return data


# -----------------------------------------------------------------------------
# Atlas Management Routes
# -----------------------------------------------------------------------------


@router.get("/atlas/emotions", response_model=List[EmotionResponse])
async def list_atlas_emotions(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """List all 87 atlas emotions."""
    # Simply list all - no pagination needed for 87 items
    stmt = select(EmotionDefinition).order_by(EmotionDefinition.emotion_name)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.put("/atlas/emotions/{emotion_id}", response_model=EmotionResponse)
async def update_atlas_emotion(
    emotion_id: UUID,
    emotion_in: EmotionUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """Update an emotion definition.

    Triggers recalculation of derived vectors:
    - If VAC changes -> Recalculate Quaternion
    - If Definition/Name changes -> Recalculate Semantic Embedding
    """
    stmt = select(EmotionDefinition).where(EmotionDefinition.id == emotion_id)
    result = await db.execute(stmt)
    emotion = result.scalars().first()

    if not emotion:
        raise HTTPException(status_code=404, detail="Emotion not found")

    update_data = emotion_in.model_dump(exclude_unset=True)

    # 1. Handle VAC Change -> Recalculate Quaternion
    # 1. Handle VAC Change -> Recalculate Quaternion
    if "vac_vector" in update_data:
        from app.services import get_quaternion_builder  # pylint: disable=import-outside-toplevel

        try:
            qb = get_quaternion_builder()
            # This is async
            new_quat = await qb.from_vac(update_data["vac_vector"])
            emotion.q_constant = new_quat
            emotion.vac_vector = update_data["vac_vector"]
            # Remove from update_data so we don't double set
            del update_data["vac_vector"]
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to calculate quaternion: {str(e)}")

    # 2. Handle Definition Change -> Recalculate Embedding
    # Note: If name changed, we'd need that too, but name is not in Update schema currently
    # (immutable identity)
    if "definition" in update_data:
        from app.services import get_embedding_service  # pylint: disable=import-outside-toplevel

        try:
            es = get_embedding_service()
            # Combine name + new definition
            text = f"{emotion.emotion_name}: {update_data['definition']}"
            new_embedding = await es.generate_embedding(text)
            emotion.semantic_embedding = new_embedding
            emotion.definition = update_data["definition"]
            # Remove from update_data
            del update_data["definition"]
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to generate embedding: {str(e)}")

    # 3. Update remaining fields (category, haptic, etc)
    for field, value in update_data.items():
        setattr(emotion, field, value)

    db.add(emotion)
    await db.commit()
    await db.refresh(emotion)
    return emotion


@router.get("/atlas/export")
async def export_atlas_data(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """Export current state as JSON matching the canonical emotions.json format."""
    stmt = select(EmotionDefinition).order_by(EmotionDefinition.id)
    result = await db.execute(stmt)
    emotions = result.scalars().all()

    # Reconstruct the canonical format
    export_data: Dict[str, Any] = {
        "version": "1.1 (Exported)",
        "source": "L.O.V.E. Observer Database Export",
        "metadata": {
            "total_emotions": len(emotions),
            "generated_at": datetime.now().isoformat(),
        },
        "emotions": [],
    }

    for e in emotions:
        item = {
            "emotion_name": e.emotion_name,
            "category": e.category,
            "definition": e.definition,
            "vac": list(e.vac_vector) if e.vac_vector is not None else [0, 0, 0],
            "haptic_pattern_id": e.haptic_pattern_id,
        }
        export_data["emotions"].append(item)

    return export_data


@router.post("/atlas/import")
async def import_atlas_data(
    import_data: Dict[str, Any],  # Receive raw JSON body
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """Import emotions.json data.

    Updates existing emotions by name. Does NOT delete missing ones (safe update).
    """
    if "emotions" not in import_data or not isinstance(import_data["emotions"], list):
        raise HTTPException(status_code=400, detail="Invalid format: missing 'emotions' list")

    from app.services import get_embedding_service  # pylint: disable=import-outside-toplevel
    from app.services import get_quaternion_builder

    es = get_embedding_service()
    qb = get_quaternion_builder()

    updated_count = 0
    errors = []

    for item in import_data["emotions"]:
        name = item.get("emotion_name")
        if not name:
            continue

        # Find existing
        stmt = select(EmotionDefinition).where(EmotionDefinition.emotion_name == name)
        result = await db.execute(stmt)
        emotion = result.scalars().first()

        if emotion:
            # Update fields
            needs_embed_update = False
            needs_quat_update = False

            # Check definition change
            if "definition" in item and item["definition"] != emotion.definition:
                emotion.definition = item["definition"]
                needs_embed_update = True

            # Check VAC change
            if "vac" in item:
                new_vac = item["vac"]
                # simple equality check
                current_vac = list(emotion.vac_vector) if emotion.vac_vector is not None else []
                if new_vac != current_vac:
                    emotion.vac_vector = new_vac
                    needs_quat_update = True

            # Update others
            if "category" in item:
                emotion.category = item["category"]
            if "haptic_pattern_id" in item:
                emotion.haptic_pattern_id = item.get("haptic_pattern_id")

            # Perform calculations if needed
            try:
                if needs_embed_update:
                    text = f"{name}: {emotion.definition}"
                    emotion.semantic_embedding = await es.generate_embedding(text)

                if needs_quat_update:
                    emotion.q_constant = await qb.from_vac(emotion.vac_vector)

                db.add(emotion)
                updated_count += 1
            except Exception as e:
                errors.append(f"Failed to update {name}: {str(e)}")

    await db.commit()

    return {"status": "success", "updated": updated_count, "errors": errors}


# -----------------------------------------------------------------------------
# Strategies Management Routes
# -----------------------------------------------------------------------------


@router.get("/strategies", response_model=List[StrategyResponse])
async def list_strategies(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[User, Depends(get_current_admin)],
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
    current_admin: Annotated[User, Depends(get_current_admin)],
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
    current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """Export strategies as JSON."""
    stmt = select(TransitionStrategy).order_by(TransitionStrategy.strategy_name)
    result = await db.execute(stmt)
    strategies = result.scalars().all()

    export_data: Dict[str, Any] = {
        "version": "1.0",
        "source": "L.O.V.E. Observer Database Export",
        "metadata": {
            "total_strategies": len(strategies),
            "generated_at": datetime.now().isoformat(),
        },
        "strategies": [],
    }

    for s in strategies:
        item = {
            "name": s.strategy_name,
            "type": s.strategy_type,
            "description": s.description,
            "steps": s.detailed_steps,
            "time_required": s.time_required,
            "difficulty": s.difficulty_level,
            "evidence": s.evidence_level,
            "citations": s.research_citations,
            "contraindications": s.contraindications,
        }
        export_data["strategies"].append(item)

    return export_data


@router.post("/strategies/import", response_model=dict)
async def import_strategies(
    data: Dict[str, Any],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_admin)],
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
            # Check if strategy exists by name (unique constraint usually on name)
            # or we use it as key
            strategy_name = item.get("name") or item.get("strategy_name")
            if not strategy_name:
                continue

            stmt = select(TransitionStrategy).where(
                TransitionStrategy.strategy_name == strategy_name
            )
            result = await db.execute(stmt)
            strategy = result.scalar_one_or_none()

            if strategy:
                # Update existing
                for key, value in item.items():
                    if hasattr(strategy, key):
                        setattr(strategy, key, value)
                updated_count += 1
            else:
                # Create new
                strategy = TransitionStrategy(
                    strategy_name=item.get("name"),
                    strategy_type=item.get("type", "general"),
                    description=item.get("description", ""),
                    detailed_steps=item.get("steps", []),
                    time_required=item.get("time_required"),
                    difficulty_level=item.get("difficulty"),
                    evidence_level=item.get("evidence", "anecdotal"),
                    research_citations=item.get("citations", []),
                    contraindications=item.get("contraindications"),
                )
                db.add(strategy)
                created_count += 1

        except Exception as e:
            # errors.append(f"Failed to process {item.get('name', 'unknown')}: {str(e)}")
            # safer to just log or append generic error
            errors.append(f"Error: {str(e)}")

    try:
        await db.commit()
    except Exception as e:
        logger.error("Commit failed for strategies: %s", e)
        # If commit fails, we might have partial state or rollback needed
        # For this bulk op, just reporting it is safest fallback
        errors.append(f"Commit failed: {str(e)}")

    return {
        "status": "success",
        "updated": updated_count,
        "created": created_count,
        "errors": errors,
    }


# -----------------------------------------------------------------------------
# AI Model Assignments
# -----------------------------------------------------------------------------


@router.get("/ai-models", response_model=List[ModelAssignmentResponse])
async def list_ai_models(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[User, Depends(get_current_admin)],
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
        # If it doesn't exist yet (e.g. first time config), create it
        # Note: assigned_by should ideally be user ID, but using email content for now or just
        # string
        assignment = ModelAssignment(
            function=function,
            ai_model_name=update_data.ai_model_name,
            assigned_by=str(current_admin.id),
        )
        db.add(assignment)
    else:
        assignment.ai_model_name = update_data.ai_model_name
        assignment.assigned_by = str(current_admin.id)
        assignment.assigned_at = datetime.utcnow()

    await db.commit()
    await db.refresh(assignment)
    return assignment


# -----------------------------------------------------------------------------
# Clinical Alerts Routes
# -----------------------------------------------------------------------------


@router.get("/alerts", response_model=Dict[str, Any])
async def list_clinical_alerts(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[User, Depends(get_current_admin)],
    skip: int = 0,
    limit: int = 50,
    level: Optional[str] = None,
) -> Any:
    """List clinical alerts (paginated).

    Optional filter by severity level.
    """

    from sqlalchemy import func  # pylint: disable=import-outside-toplevel

    # Base query
    query = select(ClinicalAlert)
    count_query = select(func.count(ClinicalAlert.id))  # pylint: disable=not-callable

    if level:
        query = query.where(ClinicalAlert.level == level)
        count_query = count_query.where(ClinicalAlert.level == level)

    # Get total count
    count_res = await db.execute(count_query)
    total = count_res.scalar()

    # Get items
    query = query.order_by(ClinicalAlert.timestamp.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    alerts = result.scalars().all()

    return {
        "total": total,
        "items": alerts,
        "skip": skip,
        "limit": limit,
    }


# -----------------------------------------------------------------------------
# Bootstrap Data Routes
# -----------------------------------------------------------------------------


@router.get("/bootstrap", response_model=List[BootstrapDataResponse])
async def list_bootstrap_data(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[User, Depends(get_current_admin)],
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
    current_admin: Annotated[User, Depends(get_current_admin)],
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
    current_admin: Annotated[User, Depends(get_current_admin)],
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
    current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    """Delete bootstrap data item."""
    from app.models.bootstrap_data import BootstrapData  # pylint: disable=import-outside-toplevel

    stmt = select(BootstrapData).where(BootstrapData.id == item_id)
    result = await db.execute(stmt)
    item = result.scalars().first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(item)  # type: ignore[unused-coroutine]
    await db.commit()
    return {"status": "success", "id": str(item_id)}


# -----------------------------------------------------------------------------
# Prompt Template Routes
# -----------------------------------------------------------------------------


@router.get("/prompts", response_model=List[PromptTemplateResponse])
async def list_prompts(
    prompt_service: Annotated[PromptService, Depends(get_prompt_service)],
    current_admin: Annotated[User, Depends(get_current_admin)],
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
    return await prompt_service.create_prompt(
        function_name=prompt_in.function_name,
        version=prompt_in.version,
        template_content=prompt_in.template_content,
        input_variables=prompt_in.input_variables,
        description=prompt_in.description,
        is_active=prompt_in.is_active,
        created_by=str(current_admin.id),
    )


@router.put("/prompts/{prompt_id}", response_model=PromptTemplateResponse)
async def update_prompt(
    prompt_id: UUID,
    prompt_in: PromptTemplateUpdate,
    prompt_service: Annotated[PromptService, Depends(get_prompt_service)],
    current_admin: Annotated[User, Depends(get_current_admin)],
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
    current_admin: Annotated[User, Depends(get_current_admin)],
) -> Any:
    try:
        # Simple implementation using python formatting
        rendered = request.template_content.format(**request.input_variables)
        return {"rendered_content": rendered}
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing variable in input: {e}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Render failed: {str(e)}")
