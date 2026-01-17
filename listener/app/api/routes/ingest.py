"""Listener API - Ingestion Endpoints.

Main API routes for audio and text ingestion with analysis.

This module contains the primary API endpoints that clients (Experience UI, mobile apps)
use to analyze emotional content. Provides both synchronous (immediate) and asynchronous
(queued) processing options.

Endpoints:
    POST /listener/ingest - Queue audio for async processing
    GET /listener/status/{job_id} - Check async job status
    POST /listener/analyze - Synchronous text analysis
    POST /listener/analyze-audio - Synchronous audio analysis
    POST /listener/analyze-multi-emotion - Multi-emotion text analysis
    POST /listener/analyze-audio-multi-emotion - Multi-emotion audio analysis (3-way)

Features:
    - Synchronous endpoints for interactive use (chat, real-time feedback)
    - Asynchronous endpoints for batch processing (audio queue)
    - Complete pipeline: transcription → semantic analysis → PII scrubbing → Observer storage
    - Multi-emotion support (Deep Feeling mode)
    - 3-way analysis (content, voice, blended)
    - Non-blocking Observer integration

Integration Points:
    - Uses: All services (transcription, semantic, PII, prosody, Observer)
    - Called by: Experience UI, mobile apps, admin panel
    - Queue: Redis + Arq for async processing

Performance:
    - Text analysis: ~2s
    - Audio analysis: ~3s
    - Multi-emotion: ~4s
    - 3-way analysis: ~12-16s (3 parallel analyses)

Sample Usage:
    Text analysis:
    >>> curl -X POST http://localhost:8002/listener/analyze \
    >>>   -F "text=I'm feeling overwhelmed but hopeful"

    Audio analysis:
    >>> curl -X POST http://localhost:8002/listener/analyze-audio \
    >>>   -F "audio=@recording.wav"

    Multi-emotion:
    >>> curl -X POST http://localhost:8002/listener/analyze-multi-emotion \
    >>>   -F "text=I'm hopeful but also anxious"

See Also:
    - Services: app/services/ (all analysis services)
    - Workers: app/workers/audio_processor.py (async processing)
    - API Reference: docs/modules/listener/reference/api-reference.md
    - Tests: tests/integration/test_full_pipeline.py
"""

import logging
import os
import tempfile
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

import aiofiles
from arq import create_pool
from arq.connections import RedisSettings
from arq.jobs import Job
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.api.deps import get_current_user
from app.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/ingest")
async def ingest(
    audio: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    user_id: str = Form(...),
    session_id: str = Form(...),
    current_user: dict[str, Any] = Depends(get_current_user),  # pylint: disable=unused-argument
) -> Dict[str, Any]:
    """Ingest audio or text for processing.

    Either audio file or text must be provided.
    Job is queued for async processing and job_id is returned.

    Args:
        audio: Audio file (WAV, M4A, AAC, etc.)
        text: Direct text input
        user_id: User identifier
        session_id: Session identifier

    Returns:
        Job information with job_id for status checking
    """
    # Validate input
    if not audio and not text:
        raise HTTPException(status_code=400, detail="Either audio file or text must be provided")

    if audio and text:
        raise HTTPException(status_code=400, detail="Provide either audio OR text, not both")

    # Handle audio upload
    audio_path = None
    if audio:
        # Generate unique filename
        filename = audio.filename or "unknown.wav"
        file_extension = os.path.splitext(filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        audio_path = os.path.join(tempfile.gettempdir(), unique_filename)

        # Save audio file
        try:
            async with aiofiles.open(audio_path, "wb") as f:
                content = await audio.read()
                await f.write(content)

            logger.info(f"Audio file saved: {audio_path} ({len(content)} bytes)")

        except Exception as e:
            logger.error(f"Failed to save audio file: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to save audio: {e}")

    # Queue job in Redis
    try:
        redis = await create_pool(
            RedisSettings(
                host=settings.REDIS_HOST, port=settings.REDIS_PORT, database=settings.REDIS_DB
            )
        )

        job = await redis.enqueue_job(
            "process_audio",
            audio_path=audio_path,
            text=text,
            user_id=user_id,
            session_id=session_id,
            timestamp=datetime.utcnow().isoformat(),
        )

        if not job:
            raise RuntimeError("Failed to enqueue job")

        logger.info(f"Job queued: {job.job_id} for user {user_id}")

        return {
            "status": "queued",
            "job_id": job.job_id,
            "user_id": user_id,
            "session_id": session_id,
            "message": "Processing started. Use job_id to check status.",
        }

    except Exception as e:
        logger.error(f"Failed to queue job: {e}")
        # Cleanup audio file if job queueing failed
        if audio_path and os.path.exists(audio_path):
            os.remove(audio_path)
        raise HTTPException(status_code=500, detail=f"Failed to queue job: {e}")


@router.get("/status/{job_id}")
async def get_status(
    job_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),  # pylint: disable=unused-argument
) -> Dict[str, Any]:
    """Get processing status for a job.

    Args:
        job_id: Job identifier from ingest response

    Returns:
        Job status and result if complete
    """
    try:
        redis = await create_pool(
            RedisSettings(
                host=settings.REDIS_HOST, port=settings.REDIS_PORT, database=settings.REDIS_DB
            )
        )

        job = Job(job_id, redis)

        # Check if job exists in Redis?
        # Job(job_id, redis) doesn't check existence immediately, but .info() will return None if not found?
        # Typically job.info() returns JobDef or None.

        # Get job status
        status = await job.status()

        # arq JobStatus enum: queued, deferred, in_progress, complete, not_found
        response = {"job_id": job_id, "status": status.value}

        # Add result if complete
        if status.value == "complete":
            try:
                # job.result() waits for result, but since we know it's complete it should return immediately
                result = await job.result(timeout=0.1)
                response["result"] = result
            except Exception as e:
                logger.warning(f"Failed to get result for complete job {job_id}: {e}")

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get job status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get status: {e}")


@router.post("/analyze")
async def analyze_text(
    text: str = Form(...),
    user_id: Optional[str] = Form("demo-user"),
    session_id: Optional[str] = Form("demo-session"),
    current_user: dict[str, Any] = Depends(get_current_user),  # pylint: disable=unused-argument
) -> Dict[str, Any]:
    """Synchronous text analysis endpoint.

    For quick analysis without audio, processes immediately without queueing.
    Also records state to Observer for trajectory tracking.

    Args:
        text: Text to analyze
        user_id: User identifier (defaults to "demo-user")
        session_id: Session identifier (defaults to "demo-session")

    Returns:
        Emotional analysis result compatible with Experience module
    """
    import time

    from app.services.observer_client import get_observer_client
    from app.services.pii_scrubber import get_pii_scrubber
    from app.services.semantic_analyzer import get_semantic_analyzer

    start_time = time.time()

    try:
        # Analyze emotion
        analyzer = get_semantic_analyzer()
        emotion = await analyzer.analyze(text)

        # Scrub PII
        scrubber = get_pii_scrubber()
        sanitized_text = scrubber.scrub(text)

        # Calculate processing time
        processing_time_ms = int((time.time() - start_time) * 1000)

        # Record state to Observer (non-blocking, log errors but don't fail)
        try:
            observer = get_observer_client()
            await observer.record_state(
                user_id=user_id or "demo-user",
                session_id=session_id or "demo-session",
                text=sanitized_text,
                emotion=emotion,
                timestamp=datetime.utcnow(),
            )
            logger.info(f"State recorded to Observer for user {user_id}")
        except Exception as observer_error:
            logger.warning(f"Failed to record state to Observer: {observer_error}")
            # Continue - Observer failure should not block the response

        # Return response in format expected by Experience module
        return {
            "user_id": user_id,
            "session_id": session_id,
            "transcription": text,
            "emotion": emotion.primary_emotion,
            "category": emotion.category,
            "vac": {
                "valence": emotion.vac.valence,
                "arousal": emotion.vac.arousal,
                "connection": emotion.vac.connection,
            },
            "confidence": emotion.confidence,
            "reasoning": emotion.reasoning,
            "processing_time_ms": processing_time_ms,
        }

    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")


@router.post("/extract-audio-features")
async def extract_audio_features(
    audio: UploadFile = File(...),
    user_id: str = Form("admin"),  # pylint: disable=unused-argument
    session_id: str = Form("chat-session"),  # pylint: disable=unused-argument
    current_user: dict[str, Any] = Depends(get_current_user),  # pylint: disable=unused-argument
) -> Dict[str, Any]:
    """Extract audio features (transcription + prosody) without full analysis.

    Fast endpoint for getting immediate feedback (transcription) to the user.
    Returns text and prosody data that can be passed to analyze-multi-emotion.

    Args:
        audio: Audio file
        user_id: User identifier
        session_id: Session identifier

    Returns:
        JSON with transcription and prosody data
    """
    import time

    from app.services.prosody_analyzer import get_prosody_analyzer
    from app.services.transcription import get_transcription_service

    start_time = time.time()

    # Save audio file temporarily
    filename = audio.filename or "unknown.wav"
    file_extension = os.path.splitext(filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    audio_path = os.path.join(tempfile.gettempdir(), unique_filename)

    try:
        # Save uploaded file
        async with aiofiles.open(audio_path, "wb") as f:
            content = await audio.read()
            await f.write(content)

        logger.info(f"Extracting audio features: {audio_path} ({len(content)} bytes)")

        # Step 1: Transcription
        transcription_service = get_transcription_service()
        transcription = transcription_service.transcribe(audio_path)
        input_text = transcription.text

        logger.info(f"Transcription: {input_text}")

        # Step 2: Prosody Analysis
        prosody_analyzer = get_prosody_analyzer()
        prosody_data = prosody_analyzer.analyze(audio_path)

        processing_time = time.time() - start_time

        return {
            "status": "success",
            "transcription": input_text,
            "prosody": prosody_data,
            "processing_time_seconds": processing_time,
        }

    except Exception as e:
        logger.error(f"Feature extraction failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Feature extraction failed: {str(e)}")

    finally:
        # Cleanup temp file
        if os.path.exists(audio_path):
            os.remove(audio_path)


@router.post("/analyze-multi-emotion")
async def analyze_multi_emotion(
    text: str = Form(...),
    prosody_data_json: Optional[str] = Form(None),
    user_id: Optional[str] = Form("demo-user"),
    session_id: Optional[str] = Form("demo-session"),
    current_user: dict[str, Any] = Depends(get_current_user),  # pylint: disable=unused-argument
) -> Dict[str, Any]:
    """Synchronous multi-emotion analysis endpoint (Deep Feeling mode).

    Detects up to 3 concurrent emotions with relationships and aggregate state.
    Can optionally include prosody data for 3-way analysis.

    Args:
        text: Text to analyze
        prosody_data_json: Optional JSON string of prosody data (pitch, energy, etc.)
        user_id: User identifier
        session_id: Session identifier

    Returns:
        Multi-emotion analysis with emotions, relationships, and aggregate state
    """
    import json
    import time

    from app.services.multi_emotion_analyzer import get_multi_emotion_analyzer
    from app.services.pii_scrubber import get_pii_scrubber

    start_time = time.time()

    try:
        # Parse prosody data if provided
        prosody_data = None
        if prosody_data_json:
            try:
                prosody_data = json.loads(prosody_data_json)
            except json.JSONDecodeError:
                logger.warning("Failed to parse prosody_data_json")

        # Analyze with multi-emotion engine
        analyzer = get_multi_emotion_analyzer()

        if prosody_data:
            # Run 3-way analysis if prosody is available
            three_way_result = await analyzer.analyze_three_way(text, prosody_data)

            # Use blended result as the primary for standard fields
            multi_analysis = three_way_result["blended"]

            # Helper for response formatting
            def to_dict(analysis: Any) -> Dict[str, Any]:
                return {
                    "emotions": [
                        {
                            "emotion_name": e.emotion_name,
                            "category": e.category,
                            "vac": {
                                "valence": e.vac.valence,
                                "arousal": e.vac.arousal,
                                "connection": e.vac.connection,
                            },
                            "confidence": e.confidence,
                            "prominence": e.prominence,
                        }
                        for e in analysis.emotions
                    ],
                    "relationships": [
                        {
                            "emotion_a": r.emotion_a,
                            "emotion_b": r.emotion_b,
                            "type": r.type,
                            "strength": r.strength,
                            "description": r.description,
                        }
                        for r in analysis.relationships
                    ],
                    "aggregate_vac": {
                        "valence": analysis.aggregate_vac.valence,
                        "arousal": analysis.aggregate_vac.arousal,
                        "connection": analysis.aggregate_vac.connection,
                    },
                    "complexity_score": analysis.complexity_score,
                    "emotional_clarity": analysis.emotional_clarity,
                    "temporal_pattern": analysis.temporal_pattern,
                    "reasoning": analysis.reasoning,
                }

            # Extra data for 3-way
            extra_response_data = {
                "three_way_analysis": {
                    "content_only": to_dict(three_way_result["content_only"]),
                    "voice_only": (
                        to_dict(three_way_result["voice_only"])
                        if three_way_result["voice_only"]
                        else None
                    ),
                    "blended": to_dict(three_way_result["blended"]),
                    "discrepancy": three_way_result["discrepancy"],
                },
                "prosody": prosody_data,
            }

        else:
            # Standard text-only analysis
            multi_analysis = await analyzer.analyze(text)
            extra_response_data = {}

        # Scrub PII
        scrubber = get_pii_scrubber()
        scrubber.scrub(text)

        # Calculate processing time
        processing_time_ms = int((time.time() - start_time) * 1000)

        logger.info(
            f"Multi-emotion analysis complete: {len(multi_analysis.emotions)} emotions, "
            f"complexity={multi_analysis.complexity_score:.2f}"
        )

        # Convert to dict for JSON response
        emotions_list = [
            {
                "emotion_name": e.emotion_name,
                "category": e.category,
                "vac": {
                    "valence": e.vac.valence,
                    "arousal": e.vac.arousal,
                    "connection": e.vac.connection,
                },
                "confidence": e.confidence,
                "prominence": e.prominence,
            }
            for e in multi_analysis.emotions
        ]

        relationships_list = [
            {
                "emotion_a": r.emotion_a,
                "emotion_b": r.emotion_b,
                "type": r.type,
                "strength": r.strength,
                "description": r.description,
            }
            for r in multi_analysis.relationships
        ]

        # Base response
        response = {
            "user_id": user_id,
            "session_id": session_id,
            "transcription": text,
            "emotions": emotions_list,
            "relationships": relationships_list,
            "aggregate_vac": {
                "valence": multi_analysis.aggregate_vac.valence,
                "arousal": multi_analysis.aggregate_vac.arousal,
                "connection": multi_analysis.aggregate_vac.connection,
            },
            "complexity_score": multi_analysis.complexity_score,
            "emotional_clarity": multi_analysis.emotional_clarity,
            "temporal_pattern": multi_analysis.temporal_pattern,
            "reasoning": multi_analysis.reasoning,
            "processing_time_ms": processing_time_ms,
        }

        # Add 3-way data if available
        response.update(extra_response_data)

        return response

    except Exception as e:
        logger.error(f"Multi-emotion analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Multi-emotion analysis failed: {e}")


@router.post("/analyze-audio")
async def analyze_audio_sync(
    audio: UploadFile = File(...),
    user_id: str = Form("admin"),  # pylint: disable=unused-argument
    session_id: str = Form("chat-session"),  # pylint: disable=unused-argument
    current_user: dict[str, Any] = Depends(get_current_user),  # pylint: disable=unused-argument
) -> Dict[str, Any]:
    """Synchronous audio analysis endpoint for chat.

    Processes audio immediately without queueing (perfect for interactive chat).
    Extracts transcription, emotion, and prosody features.

    Args:
        audio: Audio file (WAV, WebM, etc.)
        user_id: User identifier
        session_id: Session identifier

    Returns:
        Complete analysis with transcription, emotion, and prosody
    """
    import time

    from app.services.pii_scrubber import get_pii_scrubber
    from app.services.prosody_analyzer import get_prosody_analyzer
    from app.services.semantic_analyzer import get_semantic_analyzer
    from app.services.transcription import get_transcription_service

    start_time = time.time()

    # Save audio file temporarily
    filename = audio.filename or "unknown.wav"
    file_extension = os.path.splitext(filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    audio_path = os.path.join(tempfile.gettempdir(), unique_filename)

    try:
        # Save uploaded file
        async with aiofiles.open(audio_path, "wb") as f:
            content = await audio.read()
            await f.write(content)

        logger.info(f"Processing audio synchronously: {audio_path} ({len(content)} bytes)")

        # Step 1: Transcription
        transcription_service = get_transcription_service()
        transcription = transcription_service.transcribe(audio_path)
        input_text = transcription.text

        logger.info(f"Transcription: {input_text}")

        # Step 2: Prosody Analysis
        prosody_analyzer = get_prosody_analyzer()
        prosody_data = prosody_analyzer.analyze(audio_path)

        logger.info(f"Prosody: pitch={prosody_data.get('pitch_mean', 0):.1f}Hz")

        # Step 3: Semantic Analysis
        analyzer = get_semantic_analyzer()
        emotion = await analyzer.analyze(input_text)

        logger.info(f"Emotion: {emotion.primary_emotion}")

        # Step 4: PII Scrubbing
        scrubber = get_pii_scrubber()
        scrubber.scrub(input_text)

        processing_time = time.time() - start_time

        # Return complete analysis
        return {
            "status": "success",
            "transcription": input_text,
            "emotion": emotion.primary_emotion,
            "category": emotion.category,
            "vac": {
                "valence": emotion.vac.valence,
                "arousal": emotion.vac.arousal,
                "connection": emotion.vac.connection,
            },
            "confidence": emotion.confidence,
            "reasoning": emotion.reasoning,
            "prosody": prosody_data,
            "processing_time_seconds": processing_time,
        }

    except Exception as e:
        logger.error(f"Audio analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Audio analysis failed: {str(e)}")

    finally:
        # Cleanup temp file
        if os.path.exists(audio_path):
            os.remove(audio_path)
            logger.debug(f"Cleaned up temp file: {audio_path}")


@router.post("/analyze-audio-multi-emotion")
async def analyze_audio_multi_emotion(
    audio: UploadFile = File(...),
    user_id: str = Form("admin"),  # pylint: disable=unused-argument
    session_id: str = Form("chat-session"),  # pylint: disable=unused-argument
    current_user: dict[str, Any] = Depends(get_current_user),  # pylint: disable=unused-argument
) -> Dict[str, Any]:
    """Synchronous multi-emotion audio analysis endpoint (Deep Feeling mode).

    Combines transcription, prosody, and multi-emotion analysis in one call.
    Detects up to 3 concurrent emotions with relationships and aggregate state.

    Args:
        audio: Audio file (WAV, WebM, etc.)
        user_id: User identifier
        session_id: Session identifier

    Returns:
        Complete multi-emotion analysis with transcription, prosody, emotions, relationships
    """
    import time

    from app.services.multi_emotion_analyzer import get_multi_emotion_analyzer
    from app.services.pii_scrubber import get_pii_scrubber
    from app.services.prosody_analyzer import get_prosody_analyzer
    from app.services.transcription import get_transcription_service

    start_time = time.time()

    # Save audio file temporarily
    filename = audio.filename or "unknown.wav"
    file_extension = os.path.splitext(filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    audio_path = os.path.join(tempfile.gettempdir(), unique_filename)

    try:
        # Save uploaded file
        async with aiofiles.open(audio_path, "wb") as f:
            content = await audio.read()
            await f.write(content)

        logger.info(
            f"Processing audio for multi-emotion analysis: {audio_path} ({len(content)} bytes)"
        )

        # Step 1: Transcription
        transcription_service = get_transcription_service()
        transcription = transcription_service.transcribe(audio_path)
        input_text = transcription.text

        logger.info(f"Transcription: {input_text}")

        if not input_text or not input_text.strip():
            logger.warning("Transcription resulted in empty text. Aborting multi-emotion analysis.")
            raise HTTPException(
                status_code=400, detail="Could not transcribe audio. Input text is empty."
            )

        # Step 2: Prosody Analysis
        prosody_analyzer = get_prosody_analyzer()
        prosody_data = prosody_analyzer.analyze(audio_path)

        logger.info(
            f"Prosody: pitch={prosody_data.get('pitch_mean', 0):.1f}Hz, energy={prosody_data.get('energy', 0):.3f}"
        )

        # Step 3: Multi-Emotion 3-Way Analysis (content, voice, blended)
        analyzer = get_multi_emotion_analyzer()
        three_way_result = await analyzer.analyze_three_way(input_text, prosody_data)

        # Extract the three analyses
        content_only = three_way_result["content_only"]
        voice_only = three_way_result["voice_only"]
        blended = three_way_result["blended"]
        discrepancy = three_way_result["discrepancy"]

        logger.info(
            f"3-way analysis complete: Content={discrepancy['content_primary']}, "
            f"Voice={discrepancy['voice_primary']}, Blended={discrepancy['blended_primary']}, "
            f"Discrepancy={discrepancy['content_voice_distance']:.3f}"
        )

        # Step 4: PII Scrubbing
        scrubber = get_pii_scrubber()
        scrubber.scrub(input_text)

        processing_time = time.time() - start_time

        # Helper function to convert MultiEmotionAnalysisResponse to dict
        def to_dict(analysis: Any) -> Dict[str, Any]:
            return {
                "emotions": [
                    {
                        "emotion_name": e.emotion_name,
                        "category": e.category,
                        "vac": {
                            "valence": e.vac.valence,
                            "arousal": e.vac.arousal,
                            "connection": e.vac.connection,
                        },
                        "confidence": e.confidence,
                        "prominence": e.prominence,
                    }
                    for e in analysis.emotions
                ],
                "relationships": [
                    {
                        "emotion_a": r.emotion_a,
                        "emotion_b": r.emotion_b,
                        "type": r.type,
                        "strength": r.strength,
                        "description": r.description,
                    }
                    for r in analysis.relationships
                ],
                "aggregate_vac": {
                    "valence": analysis.aggregate_vac.valence,
                    "arousal": analysis.aggregate_vac.arousal,
                    "connection": analysis.aggregate_vac.connection,
                },
                "complexity_score": analysis.complexity_score,
                "emotional_clarity": analysis.emotional_clarity,
                "temporal_pattern": analysis.temporal_pattern,
                "reasoning": analysis.reasoning,
            }

        # Return complete 3-way analysis with prosody
        return {
            "status": "success",
            "transcription": input_text,
            # Main analysis (blended) - for backward compatibility
            "emotions": to_dict(blended)["emotions"],
            "relationships": to_dict(blended)["relationships"],
            "aggregate_vac": to_dict(blended)["aggregate_vac"],
            "complexity_score": blended.complexity_score,
            "emotional_clarity": blended.emotional_clarity,
            "temporal_pattern": blended.temporal_pattern,
            "reasoning": blended.reasoning,
            "prosody": prosody_data,
            # NEW: 3-way analysis data
            "three_way_analysis": {
                "content_only": to_dict(content_only),
                "voice_only": to_dict(voice_only) if voice_only else None,
                "blended": to_dict(blended),
                "discrepancy": discrepancy,
            },
            "processing_time_seconds": processing_time,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Multi-emotion audio analysis failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Multi-emotion audio analysis failed: {str(e)}"
        )

    finally:
        # Cleanup temp file
        if os.path.exists(audio_path):
            os.remove(audio_path)
            logger.debug(f"Cleaned up temp file: {audio_path}")
