"""Pydantic Models for Octonion API Endpoints.

These models define the request/response schema for the parallel
octonion endpoints (/oct/calculate, /oct/slerp). They coexist with
the existing quaternion models and do not modify them.
"""

from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class OctonionVectorModel(BaseModel):
    """Extended emotional state with 7 appraisal dimensions.

    Extends the standard VACVectorModel with 4 additional dimensions.
    All components must be within [-1.0, 1.0].
    """

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "valence": 0.8,
                "arousal": 0.5,
                "connection": 0.7,
                "depth": 0.3,
                "coping": 0.6,
                "velocity": 0.0,
                "novelty": 0.4,
            }
        }
    )

    valence: float = Field(ge=-1.0, le=1.0, description="Pleasure (+1) ↔ Displeasure (-1)")
    arousal: float = Field(ge=-1.0, le=1.0, description="Energy (+1) ↔ Lethargy (-1)")
    connection: float = Field(ge=-1.0, le=1.0, description="Connected (+1) ↔ Isolated (-1)")
    depth: float = Field(
        default=0.0, ge=-1.0, le=1.0, description="Profound (+1) ↔ Superficial (-1)"
    )
    coping: float = Field(
        default=0.0, ge=-1.0, le=1.0, description="Empowered (+1) ↔ Helpless (-1)"
    )
    velocity: float = Field(
        default=0.0, ge=-1.0, le=1.0, description="Rapid change (+1) ↔ Stillness (-1)"
    )
    novelty: float = Field(default=0.0, ge=-1.0, le=1.0, description="Novel (+1) ↔ Familiar (-1)")


class OctonionModel(BaseModel):
    """Unit octonion in scalar-first notation [e0, e1, ..., e7].

    Represents an 8D emotional rotation on S⁷.
    """

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "e0": 1.0,
                "e1": 0.0,
                "e2": 0.0,
                "e3": 0.0,
                "e4": 0.0,
                "e5": 0.0,
                "e6": 0.0,
                "e7": 0.0,
            }
        }
    )

    e0: float = Field(description="Scalar component")
    e1: float = Field(description="Valence component")
    e2: float = Field(description="Arousal component")
    e3: float = Field(description="Connection component")
    e4: float = Field(description="Depth component")
    e5: float = Field(description="Coping component")
    e6: float = Field(description="Velocity component")
    e7: float = Field(description="Novelty component")


class OctonionCalculateRequest(BaseModel):
    """Request for /oct/calculate: 7D emotional state → octonion + metrics.

    Parallel to the quaternion /calculate endpoint but operates in 8D.
    """

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "current_state": {
                    "valence": 0.8,
                    "arousal": 0.5,
                    "connection": 0.7,
                    "depth": 0.3,
                    "coping": 0.6,
                    "velocity": 0.0,
                    "novelty": 0.4,
                },
                "previous_octonion": None,
                "time_delta_seconds": 1.0,
            }
        }
    )

    current_state: OctonionVectorModel
    previous_octonion: Optional[OctonionModel] = Field(
        default=None, description="Previous octonion (optional, defaults to identity)"
    )
    time_delta_seconds: float = Field(default=1.0, gt=0.0, description="Time since previous state")


class OctonionCalculateResponse(BaseModel):
    """Response from /oct/calculate with octonion, metrics, and insight."""

    octonion: OctonionModel
    angular_distance: float = Field(description="Distance on S⁷ in radians")
    dominant_axis: str = Field(description="Axis code of primary change dimension")
    insight: str = Field(description="User-friendly insight text")
    components: dict[str, float] = Field(description="Named dimension values (V, A, C, D, P, Ė, N)")


class OctonionSLERPRequest(BaseModel):
    """Request for /oct/slerp: generate SLERP path between octonions."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "start_octonion": {
                    "e0": 1.0,
                    "e1": 0.0,
                    "e2": 0.0,
                    "e3": 0.0,
                    "e4": 0.0,
                    "e5": 0.0,
                    "e6": 0.0,
                    "e7": 0.0,
                },
                "target_octonion": {
                    "e0": 0.9,
                    "e1": 0.3,
                    "e2": 0.2,
                    "e3": 0.1,
                    "e4": 0.1,
                    "e5": 0.1,
                    "e6": 0.05,
                    "e7": 0.05,
                },
                "steps": 60,
            }
        }
    )

    start_octonion: OctonionModel
    target_octonion: OctonionModel
    steps: int = Field(
        default=60, gt=0, le=1000, description="Number of interpolation frames (1-1000)"
    )


class OctonionSLERPResponse(BaseModel):
    """Response from /oct/slerp with interpolated path."""

    path: List[OctonionModel]
    angular_distance: float
    steps: int
