"""Pydantic Request Models for Versor API.

This module defines the input data structures for Versor's REST API endpoints.
These models provide automatic validation, serialization, and OpenAPI documentation
generation for the FastAPI application.

Model Hierarchy:
    - VACVectorModel: 3D emotional state representation
    - QuaternionModel: 4D quaternion representation
    - StateRequest: Main calculation endpoint payload
    - SLERPRequest: Interpolation endpoint payload

Validation Strategy:
    Pydantic provides automatic validation for:
    - Type checking (float, int, Optional)
    - Range validation (Field with ge, le, gt constraints)
    - Required vs optional fields
    - JSON schema generation for API docs

    Invalid requests return 422 Unprocessable Entity with detailed error messages.

Why Pydantic?
    - **Type safety:** Catches errors at API boundary
    - **Auto-documentation:** OpenAPI/Swagger docs generated automatically
    - **Serialization:** JSON ↔ Python objects handled transparently
    - **Validation:** Complex constraints expressed declaratively
    - **IDE support:** Type hints enable autocomplete and static analysis

Performance:
    - Validation overhead: ~10-50μs per request
    - Negligible compared to quaternion calculations
    - Pydantic uses Rust core for speed (pydantic v2)

References:
    - Pydantic docs: https://docs.pydantic.dev/
    - FastAPI integration: https://fastapi.tiangolo.com/tutorial/body/
    - API spec: docs/modules/versor/reference/api-reference.md

Example:
    Request validation and parsing::

        from app.api.models.request import StateRequest

        # Valid request
        req_dict = {
            "current_vac": {"valence": 0.8, "arousal": 0.6, "connection": 0.7},
            "time_delta_seconds": 1.5
        }
        req = StateRequest(**req_dict)  # Validates and parses

        # Invalid request (out of range)
        invalid = {
            "current_vac": {"valence": 2.0, "arousal": 0.6, "connection": 0.7}
        }
        try:
            StateRequest(**invalid)
        except ValidationError as e:
            print(e)  # "Input should be less than or equal to 1"
"""

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class VACVectorModel(BaseModel):
    """VAC (Valence-Arousal-Connection) vector for API requests.

    This model validates incoming emotional state data from clients
    (typically Observer or Experience modules). All components must
    be within the valid range [-1.0, 1.0].

    Axes:
        - **Valence:** Pleasure (+1) to Displeasure (-1)
        - **Arousal:** High Energy (+1) to Low Energy (-1)
        - **Connection:** Connected (+1) to Disconnected (-1)

    Validation:
        - Type: Each field must be float
        - Range: ge=-1.0, le=1.0 (greater-or-equal, less-or-equal)
        - Required: All three fields are mandatory

    Why These Constraints?
        - **Type checking:** Prevents strings, booleans, null
        - **Range validation:** Ensures valid emotional space
        - **Fail fast:** Errors caught at API boundary, not in calculations

    JSON Example:
        {
            "valence": 0.9,
            "arousal": 0.7,
            "connection": 0.8
        }
    """

    model_config = ConfigDict(
        json_schema_extra={"example": {"valence": 0.9, "arousal": 0.7, "connection": 0.8}}
    )

    valence: float = Field(
        ge=-1.0,
        le=1.0,
        description="Pleasure (+1) vs Displeasure (-1)",
    )
    arousal: float = Field(
        ge=-1.0,
        le=1.0,
        description="High Energy (+1) vs Low Energy (-1)",
    )
    connection: float = Field(
        ge=-1.0,
        le=1.0,
        description="Connected (+1) vs Disconnected (-1)",
    )


class QuaternionModel(BaseModel):
    """Unit quaternion in scalar-first notation [w, x, y, z].

    Represents a 3D rotation using quaternion algebra. Used for:
    - Specifying previous emotional state
    - Providing pre-computed quaternions for SLERP

    Components:
        - **w:** Scalar/real part (cos(θ/2))
        - **x:** i component of vector part (sin(θ/2) * axis_x)
        - **y:** j component of vector part (sin(θ/2) * axis_y)
        - **z:** k component of vector part (sin(θ/2) * axis_z)

    Constraints:
        For valid rotations, must be unit quaternion: ||q|| = 1.0
        (Validation of unit length happens in business logic, not here)

    Scalar-First Convention:
        We use [w, x, y, z] order (scalar first) because:
        - Matches mathematical notation: w + xi + yj + zk
        - Aligns with our quaternion.py implementation
        - More intuitive for developers

        Note: SciPy uses [x, y, z, w] (scalar-last).
        Our scipy_adapter handles conversion.

    JSON Example:
        {
            "w": 1.0,
            "x": 0.0,
            "y": 0.0,
            "z": 0.0
        }
    """

    model_config = ConfigDict(
        json_schema_extra={"example": {"w": 1.0, "x": 0.0, "y": 0.0, "z": 0.0}}
    )

    w: float = Field(description="Scalar component (cos(θ/2))")
    x: float = Field(description="Vector component i (sin(θ/2)*axis_x)")
    y: float = Field(description="Vector component j (sin(θ/2)*axis_y)")
    z: float = Field(description="Vector component k (sin(θ/2)*axis_z)")


class StateRequest(BaseModel):
    """Request payload for /calculate endpoint.

    This endpoint converts VAC to quaternion and computes all transition
    metrics in a single call. It's the primary interface for Observer
    and Experience modules.

    Required Fields:
        - current_vac: The new emotional state to process

    Optional Fields:
        - previous_state: Previous quaternion (defaults to identity)
        - time_delta_seconds: Time since last state (defaults to 1.0s)

    Processing Flow:
        1. Validate request (Pydantic)
        2. Convert current_vac to quaternion
        3. Get previous state (or use identity)
        4. Calculate transition metrics
        5. Generate SLERP animation path
        6. Return comprehensive response

    Common Use Cases:
        **First measurement:** Omit previous_state
            - Uses identity as previous (neutral baseline)
            - Computes absolute position, not relative change

        **Subsequent measurements:** Provide previous_state
            - Computes relative transition
            - Calculates elasticity and flooding
            - Tracks trajectory over time

        **Custom timing:** Adjust time_delta_seconds
            - Varies based on sample rate
            - Affects elasticity calculation
            - Typical: 1-60 seconds between samples

    Validation Rules:
        - current_vac: Must be valid VACVectorModel
        - previous_state: Optional QuaternionModel (null allowed)
        - time_delta_seconds: Must be > 0.0 (can't be zero or negative)

    JSON Example:
        {
            "current_vac": {
                "valence": 0.9,
                "arousal": 0.7,
                "connection": 0.8
            },
            "previous_state": {
                "w": 0.9,
                "x": 0.3,
                "y": 0.2,
                "z": 0.1
            },
            "time_delta_seconds": 30.0
        }
    """

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "current_vac": {"valence": 0.9, "arousal": 0.7, "connection": 0.8},
                "previous_state": None,
                "time_delta_seconds": 1.0,
            }
        }
    )

    current_vac: VACVectorModel
    previous_state: Optional[QuaternionModel] = Field(
        default=None, description="Previous emotional state (optional, defaults to identity)"
    )
    time_delta_seconds: float = Field(
        default=1.0, gt=0.0, description="Time elapsed since previous state (must be > 0)"
    )


class SLERPRequest(BaseModel):
    """Request payload for /slerp endpoint.

    This endpoint generates interpolation paths when you already have
    quaternions and don't need full VAC processing. Useful for:
    - Generating animations between known orientations
    - Creating transition previews
    - Testing SLERP implementation

    Required Fields:
        - start_quaternion: Beginning of interpolation
        - target_quaternion: End of interpolation

    Optional Fields:
        - steps: Number of frames (default: 60)

    Steps Parameter:
        Controls animation smoothness vs performance:
        - **30 steps:** Acceptable for low-end devices
        - **60 steps (default):** Smooth for web (1s @ 60fps)
        - **120 steps:** Extra smooth for high-end displays
        - **Max 1000:** Prevents abuse/DoS

    Why Maximum 1000?
        - Prevents excessive memory usage
        - Limits computation time (DoS protection)
        - More than enough for any legitimate use
        - Can be overridden in config if needed

    Common Use Cases:
        **Standard animation:** Default 60 frames
            - 1 second @ 60fps
            - Smooth for web browsers
            - Low latency (<5ms)

        **Slow motion:** 120+ frames
            - 2 seconds @ 60fps
            - Extra smooth for emphasis
            - Demo/tutorial mode

        **Quick preview:** 10-20 frames
            - Fast generation
            - Good enough for previews
            - Testing/debugging

    Validation Rules:
        - start_quaternion: Must be valid QuaternionModel
        - target_quaternion: Must be valid QuaternionModel
        - steps: Must be > 0 and <= 1000

    JSON Example:
        {
            "start_quaternion": {
                "w": 1.0,
                "x": 0.0,
                "y": 0.0,
                "z": 0.0
            },
            "target_quaternion": {
                "w": 0.7071,
                "x": 0.7071,
                "y": 0.0,
                "z": 0.0
            },
            "steps": 60
        }
    """

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "start_quaternion": {"w": 1.0, "x": 0.0, "y": 0.0, "z": 0.0},
                "target_quaternion": {"w": 0.7071, "x": 0.7071, "y": 0.0, "z": 0.0},
                "steps": 60,
            }
        }
    )

    start_quaternion: QuaternionModel
    target_quaternion: QuaternionModel
    steps: int = Field(
        default=60,
        gt=0,
        le=1000,
        description="Number of interpolation frames (1-1000, default: 60)",
    )
