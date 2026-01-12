"""Pydantic Models Package.

This package contains all Pydantic models used for API request validation
and response serialization. These models provide automatic JSON parsing,
type validation, and OpenAPI documentation generation.

Model Categories:
    **Request Models (request.py):**
    - VACVectorModel: 3D emotional state input
    - QuaternionModel: 4D quaternion representation
    - StateRequest: /calculate endpoint payload
    - SLERPRequest: /slerp endpoint payload

    **Response Models (response.py):**
    - TrajectoryResponse: Complete calculation results
    - SLERPResponse: Interpolation path data
    - QuaternionModel: Shared between request/response

Public API:
    All models are exported for use by route handlers.
    Import from app.api.models, not submodules:

    ✓ Good:  from app.api.models import StateRequest
    ✗ Avoid: from app.api.models.request import StateRequest

Pydantic Benefits:
    - **Automatic validation:** Type and constraint checking
    - **JSON serialization:** Seamless dict ↔ object conversion
    - **OpenAPI docs:** Schema generation for Swagger UI
    - **Error messages:** Clear validation failures
    - **IDE support:** Type hints and autocomplete

Example:
    Using models in routes::

        from app.api.models import StateRequest, TrajectoryResponse

        @router.post("/calculate", response_model=TrajectoryResponse)
        async def calculate(request: StateRequest) -> TrajectoryResponse:
            # Pydantic validates request automatically
            vac = request.current_vac
            # ... process ...
            return TrajectoryResponse(...)  # Pydantic serializes
"""

from .request import QuaternionModel, SLERPRequest, StateRequest, VACVectorModel
from .response import SLERPResponse, TrajectoryResponse

__all__ = [
    # Request models
    "VACVectorModel",
    "QuaternionModel",
    "StateRequest",
    "SLERPRequest",
    # Response models
    "TrajectoryResponse",
    "SLERPResponse",
]
