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
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.schemas.common import EmotionInfo, MetricsInfo, QuaternionModel
from app.api.schemas.state import StateInput, StateResponse
from app.database import get_db
from app.models.user import User
from app.models.user_trajectory import UserTrajectory
from app.services import (
    EmotionMapper,
    MetricsCalculator,
    get_embedding_service,
    get_quaternion_builder,
)
from app.websocket.connection_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/observer/state", response_model=StateResponse, tags=["State"])
async def record_state(
    request: Request,
    input_data: StateInput,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StateResponse:
    """Record a new emotional state.

    DEBUG: Logging incoming payload for troubleshooting


    This is the primary ingestion endpoint called by the Listener
    after processing user input.

    Process:
    1. Generate semantic embedding for input text
    2. Find nearest emotion from Atlas (weighted fusion)
    3. Convert VAC to quaternion via Versor
    4. Calculate temporal metrics (elasticity, rigidity)
    5. Persist to database
    6. Return complete state information

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
        logger.info(f"Recording state for user {input_data.user_id}")

        # Use provided timestamp or default to now (timezone-aware)
        from datetime import timezone

        timestamp = input_data.timestamp or datetime.now(timezone.utc)

        # 1. Generate semantic embedding
        embedding_service = get_embedding_service()
        text_embedding = await embedding_service.generate_embedding(input_data.input_text)
        word_count = len(input_data.input_text.split())

        logger.debug(f"Generated embedding: {len(text_embedding)} dimensions")

        # 2. Find nearest emotion
        emotion_mapper = EmotionMapper(db)
        vac_list = [
            input_data.vac_scalars.valence,
            input_data.vac_scalars.arousal,
            input_data.vac_scalars.connection,
        ]

        nearest_emotion = await emotion_mapper.find_nearest(
            vac_values=vac_list, text_embedding=text_embedding, word_count=word_count
        )

        logger.info(f"Nearest emotion: {nearest_emotion.emotion_name}")

        # 3. Convert VAC to quaternion
        quaternion_builder = get_quaternion_builder()
        quaternion_list = await quaternion_builder.from_vac(vac_list)

        logger.debug(f"Quaternion: {quaternion_list}")

        # 4. Get previous state for metrics
        stmt = (
            select(UserTrajectory)
            .where(UserTrajectory.user_id == input_data.user_id)
            .order_by(UserTrajectory.timestamp.desc())
            .limit(1)
        )
        result = await db.execute(stmt)
        previous_state = result.scalar_one_or_none()

        # 5. Calculate metrics
        metrics_calculator = MetricsCalculator(db)

        if previous_state:
            delta_time = (timestamp - previous_state.timestamp).total_seconds()
            previous_quat_list = list(previous_state.quaternion_state)

            elasticity = metrics_calculator.calculate_elasticity(
                quaternion_list, previous_quat_list, delta_time
            )

            angular_distance = metrics_calculator._angular_distance(
                quaternion_list, previous_quat_list
            )
        else:
            elasticity = 0.0
            angular_distance = 0.0
            previous_quat_list = None

        # Calculate rigidity (rolling window)
        rigidity = await metrics_calculator.calculate_rigidity(
            str(input_data.user_id), window_size=10
        )

        # Detect alerts
        alerts = []
        if metrics_calculator.detect_flooding(elasticity):
            alerts.append("flooding")
        if metrics_calculator.detect_stuckness(rigidity, vac_list[0]):
            alerts.append("stuckness")

        logger.info(f"Metrics: E={elasticity:.2f}, R={rigidity:.2f}, alerts={alerts}")

        # 6. Persist new state
        new_state = UserTrajectory(
            user_id=input_data.user_id,
            session_id=input_data.session_id,
            timestamp=timestamp,
            input_transcription=input_data.input_text,
            input_embedding=text_embedding,
            vac_values=vac_list,
            quaternion_state=quaternion_list,
            dominant_emotion_id=nearest_emotion.id,
            elasticity_metric=elasticity,
            rigidity_score=rigidity,
            context_metadata={},
        )

        db.add(new_state)
        await db.commit()
        await db.refresh(new_state)

        logger.info(f"State persisted: {new_state.id}")

        # 7. Build response
        response = StateResponse(
            state_id=str(new_state.id),
            dominant_emotion=EmotionInfo(
                id=str(nearest_emotion.id),
                name=nearest_emotion.emotion_name,
                category=nearest_emotion.category,
                vac=list(nearest_emotion.vac_vector),
            ),
            quaternion=QuaternionModel.from_list(quaternion_list),
            previous_quaternion=(
                QuaternionModel.from_list(previous_quat_list) if previous_quat_list else None
            ),
            metrics=MetricsInfo(
                elasticity=elasticity,
                rigidity=rigidity,
                angular_distance=angular_distance,
                alerts=alerts,
            ),
            timestamp=timestamp,
        )

        # 8. Broadcast to WebSocket clients (non-blocking)
        try:
            await manager.send_state_update(
                user_id=str(input_data.user_id),
                state_data={
                    "state_id": str(new_state.id),
                    "emotion": {
                        "name": nearest_emotion.emotion_name,
                        "category": nearest_emotion.category,
                        "vac": vac_list,
                    },
                    "quaternion": quaternion_list,
                    "metrics": {
                        "elasticity": elasticity,
                        "rigidity": rigidity,
                        "angular_distance": angular_distance,
                        "alerts": alerts,
                    },
                },
            )
            logger.info(f"Broadcast state update via WebSocket for user {input_data.user_id}")
        except Exception as ws_error:
            logger.warning(f"Failed to broadcast WebSocket update: {ws_error}")
            # Don't fail the request if WebSocket broadcast fails

        return response

    except Exception as e:
        logger.error(f"Failed to record state: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to record state: {str(e)}")
