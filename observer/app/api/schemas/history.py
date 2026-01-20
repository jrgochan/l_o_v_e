"""History Schemas - Time-Series Trajectory Data Contracts.

Response models for emotional journey history retrieval. Structures time-ordered emotional
states with VAC coordinates, quaternions, and elasticity metrics optimized for chart rendering
and pattern visualization. Supports temporal filtering and pagination for efficient data transfer.

Schema Purpose:

    Time-series data for visualization::

        TrajectoryPoint: Single state snapshot
        HistoryResponse: Complete trajectory array

        Optimized for:
        - Chart rendering (3D plots, timelines)
        - Pattern analysis (trend detection)
        - Progress tracking (session review)
        - Clinical reporting (journey summaries)

Trajectory Point Schema:

    Individual state in journey::

        Fields:
        - timestamp: Precise moment (ISO 8601)
        - vac: [valence, arousal, connection]
        - quaternion: [w, x, y, z] for interpolation
        - emotion: Classified emotion name
        - elasticity: Rate of change metric

        Use: Single data point for charting

        Example:
        {
            "timestamp": "2026-01-02T16:00:00Z",
            "vac": [0.9, 0.7, 0.8],
            "quaternion": [0.68, 0.50, 0.39, 0.45],
            "emotion": "Joy",
            "elasticity": 0.3
        }

History Response Schema:

    Complete trajectory payload::

        Metadata:
        - user_id: Whose trajectory
        - start_date: Query range start
        - end_date: Query range end
        - data_points: Array length

        Data:
        - trajectory: Array of TrajectoryPoint

        Chronologically ordered for:
        - Left-to-right timeline charts
        - Sequential pattern analysis
        - Animation playback

References:
    - History API: observer/app/api/routes/history.py
    - User trajectory model: observer/app/models/user_trajectory.py
    - Visualization: docs/features/data-visualization/README.md
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class TrajectoryPoint(BaseModel):
    """Single point in emotional trajectory."""

    timestamp: datetime = Field(description="Moment of this state")
    vac: List[float] = Field(description="VAC coordinates [v, a, c]")
    quaternion: List[float] = Field(description="Quaternion state [w, x, y, z]")
    emotion: str = Field(description="Dominant emotion name")
    emotion: str = Field(description="Dominant emotion name")
    elasticity: float = Field(description="Speed of change (rad/s)")

    # Linkage to Chat Message
    message_id: Optional[str] = Field(None, description="Associated ChatMessage ID")
    relationship_marker: Optional[Dict[str, Any]] = Field(
        None, description="Relationship metadata if linked"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "timestamp": "2025-12-03T16:00:00Z",
                "vac": [0.9, 0.7, 0.8],
                "quaternion": [0.68, 0.50, 0.39, 0.45],
                "emotion": "Joy",
                "elasticity": 0.3,
            }
        }
    )


class HistoryResponse(BaseModel):
    """Response from historical trajectory query."""

    user_id: str = Field(description="User UUID")
    start_date: Optional[datetime] = Field(description="Query start date")
    end_date: Optional[datetime] = Field(description="Query end date")
    data_points: int = Field(description="Number of points returned")
    trajectory: List[TrajectoryPoint] = Field(description="Emotional journey data")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "start_date": "2025-12-01T00:00:00Z",
                "end_date": "2025-12-03T23:59:59Z",
                "data_points": 42,
                "trajectory": [
                    {
                        "timestamp": "2025-12-03T16:00:00Z",
                        "vac": [0.9, 0.7, 0.8],
                        "quaternion": [0.68, 0.50, 0.39, 0.45],
                        "emotion": "Joy",
                        "elasticity": 0.3,
                    }
                ],
            }
        }
    )
