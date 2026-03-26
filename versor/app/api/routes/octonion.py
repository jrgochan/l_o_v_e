"""Octonion API Routes — Parallel Endpoints for 8D Emotional State.

These routes provide octonion equivalents of the existing quaternion
/calculate and /slerp endpoints. They live on the /oct/ prefix:

    POST /oct/calculate  — Convert 7D state to octonion + metrics
    POST /oct/slerp      — Generate S⁷ SLERP path

The existing quaternion endpoints are UNMODIFIED. Both APIs coexist.
"""

from typing import Any

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.api.models.octonion_models import (
    OctonionCalculateRequest,
    OctonionCalculateResponse,
    OctonionModel,
    OctonionSLERPRequest,
    OctonionSLERPResponse,
)
from app.core.octonion import (
    DIMENSION_NAMES,
    Octonion,
    detect_dominant_octonion_axis,
    generate_octonion_insight,
    octonion_angular_distance,
    vac_extended_to_octonion,
)
from app.core.octonion_interpolation import generate_octonion_slerp_path

router = APIRouter(prefix="/oct", tags=["octonion"])


def _to_model(o: Octonion) -> OctonionModel:
    """Convert internal Octonion to Pydantic model."""
    return OctonionModel(**o.to_dict())


def _from_model(m: OctonionModel) -> Octonion:
    """Convert Pydantic model to internal Octonion."""
    return Octonion(e0=m.e0, e1=m.e1, e2=m.e2, e3=m.e3, e4=m.e4, e5=m.e5, e6=m.e6, e7=m.e7)


@router.post("/calculate", response_model=OctonionCalculateResponse)
async def calculate_octonion_state(
    request: OctonionCalculateRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> OctonionCalculateResponse:
    """Convert 7D emotional state to octonion and compute transition metrics.

    This is the octonion parallel to POST /calculate. It accepts
    the 4 extended dimensions (depth, coping, velocity, novelty)
    in addition to the standard VAC triple.
    """
    # Convert extended VAC to octonion
    current_oct = vac_extended_to_octonion(
        valence=request.current_state.valence,
        arousal=request.current_state.arousal,
        connection=request.current_state.connection,
        depth=request.current_state.depth,
        coping=request.current_state.coping,
        velocity=request.current_state.velocity,
        novelty=request.current_state.novelty,
    )

    # Get previous state or identity
    if request.previous_octonion:
        previous_oct = _from_model(request.previous_octonion)
    else:
        previous_oct = Octonion.identity()

    # Angular distance on S⁷
    distance = octonion_angular_distance(previous_oct, current_oct)

    # Dominant axis
    axis_code = detect_dominant_octonion_axis(current_oct)
    insight = generate_octonion_insight(axis_code)

    # Named component values
    imag = current_oct.imaginary()
    components = {DIMENSION_NAMES[i + 1]: imag[i] for i in range(7)}

    return OctonionCalculateResponse(
        octonion=_to_model(current_oct),
        angular_distance=distance,
        dominant_axis=axis_code,
        insight=insight,
        components=components,
    )


@router.post("/slerp", response_model=OctonionSLERPResponse)
async def octonion_slerp(
    request: OctonionSLERPRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> OctonionSLERPResponse:
    """Generate a SLERP interpolation path between two octonions on S⁷.

    This is the octonion parallel to POST /slerp.
    """
    start = _from_model(request.start_octonion)
    target = _from_model(request.target_octonion)

    path = generate_octonion_slerp_path(start, target, steps=request.steps)
    distance = octonion_angular_distance(start, target)

    return OctonionSLERPResponse(
        path=[_to_model(o) for o in path],
        angular_distance=distance,
        steps=request.steps,
    )
