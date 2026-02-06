"""Common API Schemas - Shared Data Contracts.

Reusable Pydantic models defining core data structures used across Observer's REST API.
Ensures type safety, validation, and consistent JSON serialization for VAC coordinates,
quaternions, emotion metadata, and temporal metrics. Foundation of Observer's API contracts.

Schema Architecture:

    Four foundational models::

        VACVector
        ─────────
        Three-dimensional emotional coordinate system
        Fields: valence, arousal, connection (each -1 to +1)
        Validation: Range constraints enforced

        QuaternionModel
        ───────────────
        Four-dimensional rotation representation
        Fields: w, x, y, z (unit quaternion)
        Helpers: from_list(), to_list()

        EmotionInfo
        ───────────
        Emotion reference from a collection
        Fields: id, name, category, vac
        Use: Emotion classification results

        MetricsInfo
        ───────────
        Temporal metrics for state changes
        Fields: elasticity, rigidity, angular_distance, alerts
        Use: Emotional flexibility tracking

Validation & Type Safety:

    Pydantic enforces correctness::

        Range validation:
        - VAC dimensions: -1.0 ≤ value ≤ 1.0
        - Automatically rejects invalid requests
        - HTTP 422 on validation failure

        Type checking:
        - UUID fields validated
        - Float precision maintained
        - Lists properly typed

        JSON serialization:
        - Automatic dict conversion
        - Example schemas for OpenAPI
        - Consistent response format

VAC Vector Schema:

    Emotional coordinate validation::

        Field constraints:
        - valence: -1 (unpleasant) to +1 (pleasant)
        - arousal: -1 (low energy) to +1 (high energy)
        - connection: -1 (isolated) to +1 (connected)

        Example:
        {
            "valence": 0.9,   # Very pleasant
            "arousal": 0.7,   # High energy
            "connection": 0.8 # Strong connection
        }

        Represents: Joy state

Quaternion Schema:

    Rotation representation::

        Four components:
        - w: Real part (scalar)
        - x, y, z: Imaginary parts (vector)

        Unit quaternion: w² + x² + y² + z² = 1

        Helper methods:
        - from_list([w,x,y,z]): Factory
        - to_list(): Serialization

        Use: Smooth emotional transitions

Emotion Info Schema:

    Emotion reference from an active collection::

        Fields:
        - id: UUID from atlas_definitions
        - name: "Anxiety", "Joy", etc.
        - category: "When Things Are Uncertain", etc.
        - vac: [v, a, c] coordinates

        Example:
        {
            "id": "uuid",
            "name": "Joy",
            "category": "When Life Is Good",
            "vac": [0.9, 0.7, 0.8]
        }

Metrics Info Schema:

    Temporal measurement data::

        Fields:
        - elasticity: Rotation rate (rad/s)
        - rigidity: Resistance to change
        - angular_distance: Rotation magnitude (radians)
        - alerts: ["flooding", "stuckness"]

        Example:
        {
            "elasticity": 0.8,      # High flexibility
            "rigidity": 0.2,        # Low resistance
            "angular_distance": 1.2, # Moderate change
            "alerts": []            # No concerns
        }

Design Decisions:

    Why Pydantic vs plain dicts?::

        Pydantic advantages:
        + Automatic validation
        + Type safety
        + OpenAPI generation
        + IDE autocomplete
        + Self-documenting

        Plain dict alternative:
        - Manual validation
        - No type safety
        - More error-prone

        Decision: Pydantic for robustness

    Why separate schema files?::

        Modularity benefits:
        + Reusable across endpoints
        + Single source of truth
        + Easier to maintain
        + Clear API contracts

        Inline schemas alternative:
        - Duplication
        - Inconsistency risk
        - Harder maintenance

        Decision: Shared schema modules

References:
    - Pydantic V2: https://docs.pydantic.dev/latest/
    - FastAPI validation: https://fastapi.tiangolo.com/tutorial/body/
    - VAC model: Russell (1980). A Circumplex Model of Affect
    - Quaternions: Shoemake (1985). Animating rotation with quaternion curves
    - API design: Fielding (2000). REST architectural style
"""

from typing import List

from pydantic import BaseModel, ConfigDict, Field


class VACVector(BaseModel):
    """Valence-Arousal-Connection vector."""

    valence: float = Field(ge=-1.0, le=1.0, description="Pleasure/displeasure [-1, 1]")
    arousal: float = Field(ge=-1.0, le=1.0, description="Energy level [-1, 1]")
    connection: float = Field(ge=-1.0, le=1.0, description="Relational alignment [-1, 1]")

    model_config = ConfigDict(
        json_schema_extra={"example": {"valence": 0.9, "arousal": 0.7, "connection": 0.8}}
    )


class QuaternionModel(BaseModel):
    """Quaternion representation [w, x, y, z]."""

    w: float = Field(description="Real component")
    x: float = Field(description="i component")
    y: float = Field(description="j component")
    z: float = Field(description="k component")

    model_config = ConfigDict(
        json_schema_extra={"example": {"w": 0.68, "x": 0.50, "y": 0.39, "z": 0.45}}
    )

    @staticmethod
    def from_list(q: List[float]) -> "QuaternionModel":
        """Create from list [w, x, y, z]."""
        return QuaternionModel(w=q[0], x=q[1], y=q[2], z=q[3])

    def to_list(self) -> List[float]:
        """Convert to list [w, x, y, z]."""
        return [self.w, self.x, self.y, self.z]


class EmotionInfo(BaseModel):
    """Information about an emotion from a collection."""

    id: str = Field(description="UUID of emotion")
    name: str = Field(description="Emotion name (e.g., 'Joy', 'Shame')")
    category: str = Field(description="Category name")
    vac: List[float] = Field(description="VAC coordinates [v, a, c]")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "name": "Joy",
                "category": "Places We Go When Life Is Good",
                "vac": [0.9, 0.7, 0.8],
            }
        }
    )


class MetricsInfo(BaseModel):
    """Temporal metrics for emotional state."""

    elasticity: float = Field(description="Speed of change (rad/s)")
    rigidity: float = Field(description="Resistance to change")
    angular_distance: float = Field(description="Angular distance from previous state (radians)")
    alerts: List[str] = Field(default=[], description="Alert flags (flooding, stuckness)")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "elasticity": 0.8,
                "rigidity": 0.2,
                "angular_distance": 1.2,
                "alerts": [],
            }
        }
    )
