"""AI Settings API - Dynamic AI Model Configuration.

REST endpoints for managing Ollama model assignments to L.O.V.E.'s four AI functions with
performance monitoring, evidence-based recommendations, and runtime configuration updates.
Enables A/B testing, performance optimization, and function-specific model selection without
service restarts.

API Architecture:

    Five endpoint categories::

        1. View Configuration
           GET /ai/assignments - Current model assignments
           GET /ai/functions - Available AI functions

        2. Update Configuration
           POST /ai/assignments - Assign model to function

        3. Performance Monitoring
           GET /ai/performance - Latency and usage stats

        4. Evidence-Based Guidance
           GET /ai/recommendations - Model recommendations

Endpoint Details:

    GET /ai/assignments
    ───────────────────
    Purpose: View current configuration

    Response:
    {
        "assignments": {
            "semantic_vac": "llama3.1:8b-instruct-q4_0",
            "multi_emotion": "llama3.1:70b-instruct-q4_0",
            "insight_generation": "mixtral:8x7b-instruct-v0.1",
            "atlas_mapping": "phi-3:mini"
        },
        "functions": ["semantic_vac", "multi_emotion", ...],
        "default_model": "llama3.1:8b-instruct-q4_0"
    }

    Use cases:
    - Admin dashboard display
    - Configuration review
    - Debugging model issues

    POST /ai/assignments
    ────────────────────
    Purpose: Update model assignment

    Request:
    {
        "function": "semantic_vac",
        "ai_model_name": "phi-3:mini",
        "assigned_by": "admin_user"
    }

    Response:
    {
        "function": "semantic_vac",
        "model": "phi-3:mini",
        "assigned_at": "2026-01-02T22:58:00Z",
        "status": "success"
    }

    Effect: Immediate (next AI call uses new model)

    Use cases:
    - A/B testing different models
    - Performance optimization
    - Cost reduction (smaller models)
    - Quality improvement (larger models)

    GET /ai/performance
    ───────────────────
    Purpose: Monitor model performance

    Response:
    {
        "performance": {
            "semantic_vac": {
                "model": "phi-3:mini",
                "avg_latency_ms": 1923.5,
                "total_invocations": 1247,
                "last_used": "2026-01-02T22:57:45Z"
            },
            ...
        }
    }

    Metrics:
    - avg_latency_ms: Exponential moving average
    - total_invocations: Usage counter
    - last_used: Activity timestamp

    Use cases:
    - Performance dashboards
    - Model comparison
    - Optimization decisions
    - SLA monitoring

    GET /ai/recommendations
    ───────────────────────
    Purpose: Evidence-based model suggestions

    Response:
    {
        "recommendations": {
            "semantic_vac": {
                "recommended": ["llama3.1:8b", "phi-3:mini"],
                "not_recommended": ["llama3.1:70b"],
                "reasoning": "Real-time needs speed. Target <3s."
            },
            ...
        }
    }

    Based on:
    - Function requirements (speed/quality)
    - Model benchmarks
    - Resource constraints
    - Use case analysis

    GET /ai/functions
    ─────────────────
    Purpose: List[Any] available AI functions

    Returns function descriptions and requirements

Performance Characteristics:
    - GET /assignments: <5ms (4 rows)
    - POST /assignments: 10-20ms (single update)
    - GET /performance: <10ms (4 rows)
    - GET /recommendations: <1ms (static data)
    - GET /functions: <1ms (static data)

Dynamic Configuration Benefits:

    Runtime model updates::

        A/B Testing:
        - Test phi-3:mini vs llama3.1:8b for semantic_vac
        - Compare latency and quality
        - Choose winner
        - Update without deployment

        Performance Optimization:
        - semantic_vac too slow? → Switch to phi-3:mini
        - insight_generation quality low? → Upgrade to llama3.1:70b
        - Immediate effect

        Cost Management:
        - High load? → Use smaller models
        - Off-peak? → Use larger models
        - Dynamic resource allocation

        Quick Rollback:
        - New model causing issues?
        - Revert via API call
        - No deployment needed
        - Instant recovery

Integration Points:

    Configuration consumers::

        Called by:
        - Admin UI (configuration interface)
        - Monitoring dashboards
        - Performance analysis tools

        Read by:
        - Listener (semantic_vac, multi_emotion)
        - Observer (insight_generation, atlas_mapping)
        - AIModelService (configuration layer)

Example Usage:

    View current assignments::

        GET /ai/assignments

        Response shows which models are assigned

    Update semantic_vac model::

        POST /ai/assignments
        {
            "function": "semantic_vac",
            "ai_model_name": "phi-3:mini",
            "assigned_by": "admin"
        }

        Next semantic analysis uses phi-3:mini

    Monitor performance::

        GET /ai/performance

        See latency trends, usage patterns

Design Decisions:

    Why separate configuration API?::

        Dedicated endpoints chosen:
        + Clear administrative intent
        + Easy to secure (admin-only)
        + Separate concerns
        + Simpler RBAC

        Alternative (mixed with other APIs):
        - Less clear boundaries
        - Harder to secure
        - Cluttered routes

        Decision: Dedicated /ai prefix

    Why immediate effect vs restart?::

        Dynamic configuration chosen:
        + Zero downtime updates
        + Fast iteration
        + A/B testing enabled
        + Quick rollback

        Alternative (restart required):
        - Safer (explicit deployment)
        - Configuration versioned
        - But: Downtime required

        Decision: Dynamic with audit trail

References:
    - AI Model Service: observer/app/services/ai_model_service.py
    - Model Assignment Model: observer/app/models/model_assignment.py
    - Ollama models: https://github.com/ollama/ollama/blob/main/docs/api.md
    - Dynamic configuration: 12-factor app methodology
    - Admin UI: docs/features/ai-models/README.md
"""

import logging
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.ai_model_service import AIModelService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["AI Settings"])


# === Request/Response Schemas ===


class AssignModelRequest(BaseModel):
    """Request to assign a model to a function."""

    function: str
    ai_model_name: str
    assigned_by: str | None = None


class AssignModelResponse(BaseModel):
    """Response after assigning a model."""

    function: str
    model: str
    assigned_at: str
    status: str


# === Endpoints ===


@router.get("/assignments")
async def get_model_assignments(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Get current model assigned to each AI function.

    Returns:
        Dict of {function: model_name} for all 4 functions
    """
    try:
        service = AIModelService(db)
        assignments = await service.get_model_assignments()

        return {
            "assignments": assignments,
            "functions": AIModelService.FUNCTIONS,
            "default_model": AIModelService.DEFAULT_MODEL,
        }
    except Exception as e:
        logger.error(f"Failed to get model assignments: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get assignments: {str(e)}")


@router.post("/assignments", response_model=AssignModelResponse)
async def assign_model(
    request: AssignModelRequest, db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Assign a model to a specific AI function.

    Args:
        request: Function name and model name

    Returns:
        Assignment confirmation with timestamp
    """
    try:
        service = AIModelService(db)
        result = await service.assign_model(
            function=request.function,
            ai_model_name=request.ai_model_name,
            assigned_by=request.assigned_by,
        )

        return result
    except ValueError as e:
        # Invalid function name
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to assign model: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to assign model: {str(e)}")


@router.get("/recommendations")
async def get_model_recommendations(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Get recommended models for each AI function.

    Based on:
    - Performance characteristics (speed/quality trade-offs)
    - Use case requirements
    - Resource constraints

    Returns:
        Recommendations for each function with reasoning
    """
    try:
        service = AIModelService(db)
        recommendations = await service.get_recommendations()

        return {
            "recommendations": recommendations,
            "note": "Recommendations based on performance testing and use case analysis",
        }
    except Exception as e:
        logger.error(f"Failed to get recommendations: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get recommendations: {str(e)}")


@router.get("/performance")
async def get_performance_stats(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Get performance statistics for all model assignments.

    Includes:
    - Average latency per function
    - Total invocations
    - Last used timestamp

    Returns:
        Performance stats for each function/model pair
    """
    try:
        service = AIModelService(db)
        stats = await service.get_performance_stats()

        return {"performance": stats, "note": "Statistics are exponential moving averages"}
    except Exception as e:
        logger.error(f"Failed to get performance stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")


@router.get("/functions")
async def list_ai_functions() -> Dict[str, Any]:
    """List all AI functions that can have model assignments.

    Returns:
        List of function names with descriptions
    """
    return {
        "functions": [
            {
                "name": "semantic_vac",
                "description": "Real-time VAC extraction from text/transcripts",
                "requirements": "Fast (<3s), consistent, good semantic understanding",
            },
            {
                "name": "multi_emotion",
                "description": "Complex multi-emotion detection with relationships",
                "requirements": "Nuanced, handles complexity, empathetic",
            },
            {
                "name": "insight_generation",
                "description": "Therapeutic insights and guidance generation",
                "requirements": "Empathetic, clinical knowledge, warm/clinical tone flexibility",
            },
            {
                "name": "atlas_mapping",
                "description": "Emotion classification to 87-emotion atlas",
                "requirements": "Precise, consistent, fast",
            },
        ]
    }
