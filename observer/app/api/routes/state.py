"""State Recording API - Core Listener-Observer Integration.

Primary ingestion endpoint for emotional state persistence and real-time trajectory tracking.
Receives analyzed emotional data from Listener, enriches with Observer intelligence (emotion
mapping, quaternion conversion, temporal metrics), persists to user trajectory, and broadcasts
updates via WebSocket for real-time UI synchronization.

Integration Architecture:

    Listener → Observer data flow::

        1. User Input (Listener)
           ────────────────────
           User speaks or types
           → Audio/text processing
           → VAC extraction via LLM
           → Multimodal analysis

        2. State Transmission
           ─────────────────
           POST /observer/state
           Payload: {
               user_id, session_id,
               vac_scalars: {v, a, c},
               input_text,
               confidence,
               prosody_data
           }

        3. Observer Enrichment
           ──────────────────
           → Semantic embedding generation
           → Atlas emotion mapping
           → VAC → Quaternion conversion
           → Temporal metrics calculation
           → Previous state comparison

        4. Persistence & Broadcast
           ───────────────────────
           → Save to user_trajectory table
           → Broadcast via WebSocket
           → Return enriched response

        5. Real-Time UI Update
           ──────────────────
           → Dashboard receives WebSocket
           → Trajectory plot updated
           → Metrics refreshed
           → Alerts displayed

Endpoint Processing Pipeline:

    Eight-stage enrichment process::

        Stage 1: Semantic Embedding
        ────────────────────────────
        Input: "I'm worried about tomorrow"
        → Generate 384D vector via all-MiniLM-L6-v2
        → Used for semantic similarity search
        Time: 20-50ms

        Stage 2: Emotion Mapping
        ────────────────────────
        Input: VAC + text embedding + word count
        → Three-tier weighted fusion algorithm
        → Classify to nearest of 87 emotions
        → Return atlas emotion with definition
        Time: 10-30ms

        Stage 3: Quaternion Conversion
        ──────────────────────────────
        Input: VAC [v, a, c]
        → Convert to quaternion [w, x, y, z]
        → Enables smooth rotations/interpolations
        → Used for trajectory visualization
        Time: <1ms

        Stage 4: Previous State Lookup
        ──────────────────────────────
        Query: Most recent state for this user
        → Enables temporal metric calculation
        → None if first state
        Time: 5-10ms

        Stage 5: Temporal Metrics
        ─────────────────────────
        Calculate:
        - Elasticity: E = θ / Δt (rotation rate)
        - Rigidity: R = 1 / variance (stability)
        - Angular distance: θ between quaternions
        Time: 5-15ms

        Stage 6: Alert Detection
        ────────────────────────
        Check for:
        - Flooding (E > 0.8): Emotional overwhelm
        - Stuckness (R > 3.0 + negative valence): Depression pattern
        Time: <1ms

        Stage 7: Database Persistence
        ─────────────────────────────
        Insert UserTrajectory row:
        - All VAC, quaternion, metrics
        - Semantic embedding
        - Link to atlas emotion
        - Context metadata
        Time: 10-20ms

        Stage 8: WebSocket Broadcast
        ────────────────────────────
        Send to active connections:
        - State update notification
        - New emotion, metrics, alerts
        - Non-blocking (best effort)
        Time: <5ms

Request/Response Schema:

    POST /observer/state
    ────────────────────

    Request body (StateInput):
    {
        "user_id": "uuid",
        "session_id": "uuid",
        "vac_scalars": {
            "valence": -0.6,
            "arousal": 0.7,
            "connection": -0.3
        },
        "input_text": "I'm worried about tomorrow",
        "confidence": 0.87,
        "timestamp": "2026-01-02T22:00:00Z",  # Optional
        "prosody_data": {  # Optional
            "pitch_mean": 245.3,
            "pitch_std": 45.2,
            "energy": 0.78,
            "jitter": 4.1
        }
    }

    Response body (StateResponse):
    {
        "state_id": "uuid",
        "dominant_emotion": {
            "id": "uuid",
            "name": "Anxiety",
            "category": "When Things Are Uncertain",
            "vac": [-0.6, 0.7, -0.3]
        },
        "quaternion": {
            "w": 0.8,
            "x": 0.3,
            "y": 0.4,
            "z": 0.3
        },
        "previous_quaternion": {  # Null if first state
            "w": 0.9,
            "x": 0.2,
            "y": 0.3,
            "z": 0.2
        },
        "metrics": {
            "elasticity": 0.42,
            "rigidity": 1.2,
            "angular_distance": 0.15,
            "alerts": []  # ["flooding"] or ["stuckness"] if triggered
        },
        "timestamp": "2026-01-02T22:00:00Z"
    }

Performance Characteristics:
    - Total latency: 60-150ms typical
    - Embedding generation: 20-50ms
    - Emotion mapping: 10-30ms
    - Database operations: 15-30ms
    - Quaternion calc: <1ms
    - Metrics calc: 5-15ms
    - WebSocket broadcast: <5ms
    - Target: <200ms for good UX

Error Handling:

    Robust exception management::

        Validation errors (400):
        - Invalid UUID formats
        - Missing required fields
        - VAC out of range

        Database errors (500):
        - Connection failures
        - Constraint violations
        - Transaction rollback

        Service errors (500):
        - Embedding service unavailable
        - Atlas mapping failures

        WebSocket errors:
        - Non-blocking (logged warning)
        - Don't fail state recording
        - Best-effort delivery

Integration Points:

    Critical system integration::

        Called by:
        ─────────
        - Listener /ingest endpoint (after analysis)
        - Mobile apps (direct state submission)
        - Batch import scripts

        Calls:
        ─────
        - EmbeddingService: Text vectorization
        - EmotionMapper: Atlas classification
        - QuaternionBuilder: VAC conversion
        - MetricsCalculator: Temporal analysis
        - WebSocketManager: Real-time broadcast

        Data flow:
        ─────────
        Listener analysis → state.py → user_trajectory → WebSocket → UI

References:
    - User trajectory model: observer/app/models/user_trajectory.py
    - Emotion mapper: observer/app/services/emotion_mapper.py
    - Metrics calculator: observer/app/services/metrics_calculator.py
    - Quaternion builder: observer/app/services/quaternion_builder.py
    - WebSocket design: docs/modules/observer/senior-developers/05-websocket-realtime.md
    - Listener integration: listener/app/services/observer_client.py
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.schemas.common import EmotionInfo, MetricsInfo, QuaternionModel
from app.api.schemas.state import StateInput, StateResponse
from app.database import get_db
from app.models.user import User
from app.services.observer.pipeline import StateProcessingPipeline

logger = logging.getLogger(__name__)


router = APIRouter()


@router.post("/observer/state", response_model=StateResponse, tags=["State"])
async def record_state(
    _request: Request,
    input_data: StateInput,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StateResponse:  # pylint: disable=too-many-locals, too-many-statements
    """Record a new emotional state.

    This is the primary ingestion endpoint called by the Listener.
    Delegates processing to StateProcessingPipeline.

    Args:
        input_data: State recording request
        db: Database session

    Returns:
        StateResponse with emotion, quaternion, and metrics
    """
    # Authorization check: User can only record their own state
    if str(current_user.id) != str(input_data.user_id):
        raise HTTPException(
            status_code=403, detail="Not authorized to record state for another user"
        )

    try:
        pipeline = StateProcessingPipeline(db)
        result = await pipeline.process_state(input_data.user_id, input_data)

        # Build response
        response = StateResponse(
            state_id=str(result.persisted_state.id),
            dominant_emotion=EmotionInfo(
                id=str(result.nearest_emotion.id),
                name=result.nearest_emotion.emotion_name,
                category=result.nearest_emotion.category,
                vac=list(result.nearest_emotion.vac_vector),
            ),
            quaternion=QuaternionModel.from_list(result.quaternion_list),
            previous_quaternion=(
                QuaternionModel.from_list(result.metrics.previous_quat_list)
                if result.metrics.previous_quat_list
                else None
            ),
            metrics=MetricsInfo(
                elasticity=result.metrics.elasticity,
                rigidity=result.metrics.rigidity,
                angular_distance=result.metrics.angular_distance,
                alerts=result.metrics.alerts,
            ),
            timestamp=result.timestamp,
        )

        return response

    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.error("Failed to record state: %s", e, exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to record state: {str(e)}") from e
