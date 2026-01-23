"""API Schemas Package - Type-Safe Request/Response Contracts.

Central import point for Observer's Pydantic schemas providing type safety, automatic validation,
and OpenAPI documentation generation. Organized by endpoint functionality (common, state, history,
transition) with clear separation of concerns and reusable data structures.

Package Organization:

    Four schema modules::

        common.py
        ─────────
        Shared models used across endpoints
        - VACVector: Emotional coordinates
        - QuaternionModel: Rotation representation
        - EmotionInfo: Emotion entity reference
        - MetricsInfo: Temporal metrics

        state.py
        ────────
        State recording API contracts
        - StateInput: Listener → Observer
        - StateResponse: Observer → Listener

        history.py
        ──────────
        Trajectory history retrieval
        - TrajectoryPoint: Single state
        - HistoryResponse: Time-series array

        transition.py
        ─────────────
        Journey management (15+ schemas)
        - Path generation requests/responses
        - Journey tracking
        - Waypoint validation
        - Strategy effectiveness

Schema Benefits:

    Why Pydantic schemas matter::

        Type Safety:
        - Compile-time type checking
        - IDE autocomplete
        - Catch errors early

        Validation:
        - Automatic input validation
        - Range constraints (VAC: -1 to +1)
        - UUID format validation
        - HTTP 422 on invalid data

        Documentation:
        - Auto-generated OpenAPI specs
        - Interactive Swagger UI
        - Client SDK generation

        Consistency:
        - Single source of truth
        - Reusable across endpoints
        - Prevents drift

Usage Pattern:

    Import from this package::

        from app.api.schemas import VACVector, StateInput, StateResponse

        # Use in route
        @router.post("/state", response_model=StateResponse)
        async def record_state(input: StateInput):
            ...

        # Pydantic handles:
        - JSON deserialization
        - Validation
        - Type conversion
        - Error messages

References:
    - Pydantic documentation: https://docs.pydantic.dev/
    - FastAPI integration: https://fastapi.tiangolo.com/tutorial/body/
    - OpenAPI generation: https://swagger.io/specification/
"""

from typing import Any, Dict, List, Optional

from app.api.schemas.common import (
    EmotionInfo,
    MetricsInfo,
    QuaternionModel,
    VACVector,
)
from app.api.schemas.state import (
    StateInput,
    StateResponse,
)
from app.api.schemas.chat import (
    DisplayMessage,
    MessageRelationship,
)

__all__ = [
    "VACVector",
    "QuaternionModel",
    "EmotionInfo",
    "MetricsInfo",
    "StateInput",
    "StateResponse",
    "DisplayMessage",
    "MessageRelationship",
]
