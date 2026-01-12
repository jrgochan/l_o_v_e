"""SLERP endpoint for standalone path generation.

Generates interpolation paths between two quaternions.
"""

from fastapi import APIRouter

from app.api.models.request import SLERPRequest
from app.api.models.response import QuaternionModel, SLERPResponse
from app.core import Quaternion, angular_distance, calculate_transition, generate_slerp_path

router = APIRouter()


@router.post("/slerp", response_model=SLERPResponse)
async def generate_path(request: SLERPRequest) -> SLERPResponse:
    """Generate SLERP interpolation path between two quaternions.

    Useful for animating transitions when you already have quaternions
    and don't need full VAC processing.
    """
    # Convert Pydantic models to core Quaternions
    q_start = Quaternion(
        w=request.start_quaternion.w,
        x=request.start_quaternion.x,
        y=request.start_quaternion.y,
        z=request.start_quaternion.z,
    )

    q_target = Quaternion(
        w=request.target_quaternion.w,
        x=request.target_quaternion.x,
        y=request.target_quaternion.y,
        z=request.target_quaternion.z,
    )

    # Generate SLERP path
    path = generate_slerp_path(q_start, q_target, steps=request.steps)

    # Calculate angular distance for metadata
    q_trans = calculate_transition(q_start, q_target)
    phi = angular_distance(q_trans)

    # Convert to Pydantic models
    path_models = [QuaternionModel(w=q.w, x=q.x, y=q.y, z=q.z) for q in path]

    return SLERPResponse(path=path_models, total_frames=len(path_models), angular_distance=phi)
