"""Pydantic Response Models for Versor API.

This module defines the output data structures for Versor's REST API endpoints.
These models ensure consistent, well-documented responses that clients
(Observer, Experience modules) can reliably parse and use.

Model Hierarchy:
    - QuaternionModel: 4D quaternion representation (reused in requests)
    - TrajectoryResponse: Complete emotional state analysis
    - SLERPResponse: Interpolation path data

Response Design Principles:
    1. **Comprehensive:** Include all computed metrics in one response
    2. **Redundant:** Provide both radians and degrees for convenience
    3. **Self-contained:** No need for follow-up requests
    4. **Documented:** Field descriptions explain each metric
    5. **Typed:** Strong typing enables client code generation

Why Include Everything?
    Rather than separate endpoints for each metric, we compute and return
    everything in one response. This:
    - Reduces API calls (1 instead of 5+)
    - Lowers latency (no round-trip delays)
    - Simplifies client code (one request gets all data)
    - Enables atomic consistency (all metrics from same snapshot)

Performance:
    - Serialization overhead: ~20-50μs per response
    - Negligible compared to quaternion calculations
    - JSON is compact (~500 bytes typical response)

References:
    - API Specification: docs/modules/versor/reference/api-reference.md
    - Client Integration: docs/modules/versor/managers/02-integration-points.md
    - Pydantic docs: https://docs.pydantic.dev/

Example:
    Parsing API response::

        import requests

        response = requests.post(
            "http://localhost:8002/calculate",
            json={
                "current_vac": {"valence": 0.8, "arousal": 0.6, "connection": 0.7}
            }
        )

        data = response.json()

        # Access computed metrics
        print(f"Angular distance: {data['angular_distance_degrees']}°")
        print(f"Flooding: {data['is_flooding']}")

        # Access animation path
        for frame in data['interpolation_path']:
            quaternion = frame  # Each frame is a QuaternionModel
"""

from typing import List

from pydantic import BaseModel, ConfigDict, Field


class QuaternionModel(BaseModel):
    """Unit quaternion in scalar-first notation [w, x, y, z].

    Represents a 3D rotation as a 4-component quaternion.
    This model is used in both requests and responses.

    Components:
        - w: Scalar part (cos(θ/2))
        - x: Vector i component (sin(θ/2) * axis_x)
        - y: Vector j component (sin(θ/2) * axis_y)
        - z: Vector k component (sin(θ/2) * axis_z)

    JSON Example:
        {
            "w": 0.707,
            "x": 0.707,
            "y": 0.0,
            "z": 0.0
        }
    """

    w: float
    x: float
    y: float
    z: float


class TrajectoryResponse(BaseModel):
    """Comprehensive response from /calculate endpoint.

    This response contains everything needed to:
    1. Understand the current emotional state
    2. Analyze the transition from previous state
    3. Assess clinical risk (flooding)
    4. Animate the Soul Sphere (interpolation path)
    5. Provide user insights (dominant axis)

    Fields Explained:
        **State Information:**
        - current_state: Where the user is now (quaternion)

        **Transition Analysis:**
        - transition_quaternion: The rotation from previous to current
        - angular_distance_*: How far they've moved (emotional work)
        - elasticity_metric: How fast they're moving (velocity)

        **Clinical Indicators:**
        - is_flooding: Crisis detection flag
        - insight_code: Which dimension changed most

        **Animation Data:**
        - interpolation_path: 60-frame SLERP path for smooth animation

    Why Both Radians and Degrees?
        - **Radians:** Used in calculations (mathematical standard)
        - **Degrees:** Easier for humans to interpret

        Example: "2.094 radians" vs "120 degrees" - degrees are intuitive!

    Typical Response Size:
        - Without interpolation_path: ~200 bytes
        - With 60-frame path: ~2KB
        - Gzipped: ~500 bytes (JSON compresses well)

    Client Integration:
        **Observer:** Uses this for trajectory tracking and alerts
        **Experience:** Uses interpolation_path for Soul Sphere animation
        **Analytics:** Logs all metrics for pattern analysis

    JSON Example:
        {
            "current_state": {
                "w": 0.306,
                "x": 0.615,
                "y": 0.478,
                "z": 0.546
            },
            "transition_quaternion": {
                "w": 0.306,
                "x": 0.615,
                "y": 0.478,
                "z": 0.546
            },
            "angular_distance_radians": 2.525,
            "angular_distance_degrees": 144.7,
            "elasticity_metric": 2.525,
            "is_flooding": true,
            "insight_code": "AROUSAL_SHIFT",
            "interpolation_path": [...]
        }
    """

    current_state: QuaternionModel = Field(
        description="Current emotional state as quaternion (post-conversion from VAC)"
    )
    transition_quaternion: QuaternionModel = Field(
        description="Rotation quaternion from previous to current state"
    )
    angular_distance_radians: float = Field(
        description="Emotional work in radians [0, π] - higher = more difficult transition"
    )
    angular_distance_degrees: float = Field(
        description="Emotional work in degrees [0, 180] - same as radians but human-readable"
    )
    elasticity_metric: float = Field(
        description="Velocity of change (rad/s) - higher = faster transition, risk of flooding"
    )
    is_flooding: bool = Field(
        description="True if rapid change indicates overwhelm (elasticity > threshold)"
    )
    insight_code: str = Field(
        description="Dominant axis: VALENCE_SHIFT | AROUSAL_SHIFT | CONNECTION_SHIFT | NEUTRAL"
    )
    interpolation_path: List[QuaternionModel] = Field(
        description="SLERP animation path (default 60 frames for 1s @ 60fps)"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "current_state": {"w": 0.306, "x": 0.615, "y": 0.478, "z": 0.546},
                "transition_quaternion": {"w": 0.306, "x": 0.615, "y": 0.478, "z": 0.546},
                "angular_distance_radians": 2.525,
                "angular_distance_degrees": 144.7,
                "elasticity_metric": 2.525,
                "is_flooding": True,
                "insight_code": "AROUSAL_SHIFT",
                "interpolation_path": [],  # Truncated for example brevity
            }
        }
    )


class SLERPResponse(BaseModel):
    """Response from /slerp endpoint.

    This endpoint generates interpolation paths between two quaternions
    without the full VAC processing. Returns just the animation data
    needed for visualization.

    Fields:
        - path: List of interpolated quaternions (frames)
        - total_frames: Number of frames (matches len(path))
        - angular_distance: Total rotation amount for the transition

    Use Cases:
        **Direct quaternion animation:**
        When client already has quaternions and just needs interpolation.

        **Testing:**
        Verify SLERP implementation with known quaternion pairs.

        **Caching:**
        Pre-generate common transition paths for faster playback.

    Why Include total_frames?
        Redundant with len(path) but convenient for clients that:
        - Want to know frame count without parsing full array
        - Need to preallocate buffers
        - Display progress bars during generation

    Why Include angular_distance?
        Provides context for the interpolation:
        - Small distance: Quick animation
        - Large distance: Slower animation or more frames needed
        - Helps clients adjust playback speed

    Typical Response Size:
        - 60 frames: ~2KB
        - 120 frames: ~4KB
        - 300 frames: ~10KB
        - Gzipped: ~50-70% reduction

    JSON Example:
        {
            "path": [
                {"w": 1.0, "x": 0.0, "y": 0.0, "z": 0.0},
                {"w": 0.9808, "x": 0.1951, "y": 0.0, "z": 0.0},
                ...
            ],
            "total_frames": 60,
            "angular_distance": 1.5708
        }
    """

    path: List[QuaternionModel] = Field(
        description="Interpolated quaternion frames from start to target"
    )
    total_frames: int = Field(description="Number of frames in path (equals len(path))")
    angular_distance: float = Field(description="Total rotation distance in radians [0, π]")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "path": [
                    {"w": 1.0, "x": 0.0, "y": 0.0, "z": 0.0},
                    {"w": 0.9808, "x": 0.1951, "y": 0.0, "z": 0.0},
                ],
                "total_frames": 60,
                "angular_distance": 1.5708,
            }
        }
    )
