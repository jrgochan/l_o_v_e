"""Main calculation endpoint for Versor engine.

Converts VAC to quaternion and computes all transition metrics.
"""

import math

from fastapi import APIRouter

from app.api.models.request import StateRequest
from app.api.models.response import QuaternionModel, TrajectoryResponse
from app.config import settings
from app.core import (
    Quaternion,
    VACVector,
    angular_distance,
    calculate_elasticity,
    calculate_transition,
    detect_dominant_axis,
    detect_flooding,
    generate_slerp_path,
)

router = APIRouter()


@router.post("/calculate", response_model=TrajectoryResponse)
async def calculate_state(request: StateRequest) -> TrajectoryResponse:
    """Main calculation endpoint.

    Converts VAC to quaternion, calculates transition metrics,
    and generates SLERP animation path.
    """
    # Convert VAC to quaternion
    vac = VACVector(
        valence=request.current_vac.valence,
        arousal=request.current_vac.arousal,
        connection=request.current_vac.connection,
    )
    current_quat = vac.to_quaternion()

    # Get previous state or use identity
    if request.previous_state:
        previous_quat = Quaternion(
            w=request.previous_state.w,
            x=request.previous_state.x,
            y=request.previous_state.y,
            z=request.previous_state.z,
        )
    else:
        previous_quat = Quaternion.identity()

    # Calculate transition
    transition_quat = calculate_transition(previous_quat, current_quat)

    # Calculate angular distance
    phi = angular_distance(transition_quat)

    # Calculate elasticity
    elasticity = calculate_elasticity(phi, request.time_delta_seconds)

    # Detect flooding
    is_flooding = detect_flooding(elasticity, threshold=settings.FLOODING_THRESHOLD)

    # Detect dominant axis
    insight_code = detect_dominant_axis(transition_quat)

    # Generate SLERP path for animation
    slerp_path = generate_slerp_path(
        previous_quat, current_quat, steps=settings.DEFAULT_SLERP_STEPS
    )

    # Convert quaternions to Pydantic models
    def to_model(q: Quaternion) -> QuaternionModel:
        return QuaternionModel(w=q.w, x=q.x, y=q.y, z=q.z)

    return TrajectoryResponse(
        current_state=to_model(current_quat),
        transition_quaternion=to_model(transition_quat),
        angular_distance_radians=phi,
        angular_distance_degrees=math.degrees(phi),
        elasticity_metric=elasticity,
        is_flooding=is_flooding,
        insight_code=insight_code,
        interpolation_path=[to_model(q) for q in slerp_path],
    )
