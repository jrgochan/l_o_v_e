"""State Recording Schemas - Listener-Observer API Contract.

Request/response models for Observer's core state ingestion endpoint. Defines the data contract
between Listener (emotion analysis) and Observer (trajectory tracking), ensuring validated
transmission of VAC coordinates, semantic content, and temporal metadata for persistence.

Schema Purpose:

    Type-safe API contract for state recording::

        StateInput: What Listener sends to Observer
        StateResponse: What Observer returns to Listener

        Ensures:
        - Valid VAC coordinates
        - Proper UUID formatting
        - Timestamp correctness
        - PII-stripped text
        - Consistent response structure

Request Schema (StateInput):

    Listener → Observer payload::

        Required fields:
        - user_id: UUID (privacy-protected identifier)
        - session_id: UUID (groups related states)
        - input_text: String (max 5000 chars, PII-stripped)
        - vac_scalars: VACVector (validated coordinates)

        Optional fields:
        - timestamp: datetime (defaults to server time)
        - prosody_data: Dict[str, Any] (voice analysis, if audio)

        Validation ensures:
        - VAC values in [-1, 1] range
        - UUIDs properly formatted
        - Text not exceeding limits
        - Timestamps in correct format

Response Schema (StateResponse):

    Observer → Listener enriched result::

        Fields returned:
        - state_id: UUID of created trajectory point
        - dominant_emotion: Nearest emotion from collection
        - quaternion: Rotation representation
        - previous_quaternion: Prior state (if exists)
        - metrics: Temporal analytics
        - timestamp: Recorded time

        Provides Observer intelligence:
        - Emotion classification
        - Quaternion conversion
        - Temporal metrics (E, R)
        - Alert detection
        - Complete state information

References:
    - State recording API: observer/app/api/routes/state.py
    - Common schemas: observer/app/api/schemas/common.py
    - Listener integration: listener/app/services/observer_client.py
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.api.schemas.common import EmotionInfo, MetricsInfo, QuaternionModel, VACVector


class StateInput(BaseModel):
    """Request body for recording emotional state."""

    user_id: UUID = Field(description="User UUID")
    session_id: UUID = Field(description="Session UUID")
    input_text: str = Field(max_length=5000, description="Sanitized input text (PII stripped)")
    vac_scalars: VACVector = Field(description="VAC coordinates from Listener")
    timestamp: Optional[datetime] = Field(default=None, description="Timestamp (defaults to now)")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "session_id": "789e0123-e89b-12d3-a456-426614174001",
                "input_text": "I'm feeling amazing today, everything is clicking!",
                "vac_scalars": {"valence": 0.9, "arousal": 0.7, "connection": 0.8},
                "timestamp": "2025-12-03T09:45:00Z",
            }
        }
    )


class StateResponse(BaseModel):
    """Response from recording emotional state."""

    state_id: str = Field(description="UUID of created state")
    dominant_emotion: Optional[EmotionInfo] = Field(
        default=None, description="Nearest emotion from active collection"
    )
    quaternion: QuaternionModel = Field(description="Quaternion representation")
    previous_quaternion: Optional[QuaternionModel] = Field(
        default=None, description="Previous quaternion state (if exists)"
    )
    metrics: MetricsInfo = Field(description="Temporal metrics")
    timestamp: datetime = Field(description="Recorded timestamp")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "state_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "dominant_emotion": {
                    "id": "emotion-uuid",
                    "name": "Joy",
                    "category": "Places We Go When Life Is Good",
                    "vac": [0.9, 0.7, 0.8],
                },
                "quaternion": {"w": 0.68, "x": 0.50, "y": 0.39, "z": 0.45},
                "previous_quaternion": {"w": 0.85, "x": 0.30, "y": 0.20, "z": 0.35},
                "metrics": {
                    "elasticity": 0.8,
                    "rigidity": 0.2,
                    "angular_distance": 0.45,
                    "alerts": [],
                },
                "timestamp": "2025-12-03T09:45:00Z",
            }
        }
    )
