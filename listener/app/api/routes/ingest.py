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

import json
import logging
import os
import tempfile
import time
import uuid

# pylint: disable=duplicate-code
from datetime import datetime
from typing import Any, Dict, Optional

import aiofiles  # type: ignore[import-untyped]
from arq import create_pool
from arq.connections import RedisSettings
from arq.jobs import Job, JobStatus
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.api.deps import get_current_user
from app.config import settings
from app.services.multi_emotion_analyzer import get_multi_emotion_analyzer
from app.services.observer_client import get_observer_client
from app.services.pii_scrubber import get_pii_scrubber
from app.services.prosody_analyzer import get_prosody_analyzer
from app.services.semantic_analyzer import get_semantic_analyzer
from app.services.transcription import get_transcription_service

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/ingest")
async def ingest(
    audio: Optional[UploadFile] = File(None),  # noqa: B008
    text: Optional[str] = Form(None),  # noqa: B008
    user_id: str = Form(...),  # noqa: B008
    session_id: str = Form(...),  # noqa: B008
    _current_user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
) -> Dict[str, Any]:  # pylint: disable=too-many-locals
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
        try:
            audio_path = await _save_upload_file(audio)
        except Exception as e:
            logger.error("Failed to save audio file: %s", e)
            raise HTTPException(status_code=500, detail=f"Failed to save audio: {e}") from e

    # Queue job in Redis
    try:
        return await _queue_processing_job(audio_path, text, user_id, session_id)

    except Exception as e:
        logger.error("Failed to queue job: %s", e)
        # Cleanup audio file if job queueing failed
        if audio_path and os.path.exists(audio_path):
            os.remove(audio_path)
        raise HTTPException(status_code=500, detail=f"Failed to queue job: {e}") from e


async def _save_upload_file(audio: UploadFile) -> str:
    """Save uploaded audio file to temp directory."""
    filename = audio.filename or "unknown.wav"
    file_extension = os.path.splitext(filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    audio_path = os.path.join(tempfile.gettempdir(), unique_filename)

    async with aiofiles.open(audio_path, "wb") as f:
        content = await audio.read()
        await f.write(content)

    logger.info("Audio file saved: %s (%d bytes)", audio_path, len(content))
    return audio_path


async def _queue_processing_job(
    audio_path: Optional[str], text: Optional[str], user_id: str, session_id: str
) -> Dict[str, Any]:
    """Queue processing job in Redis."""
    redis = await create_pool(
        RedisSettings(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            database=settings.REDIS_DB,
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

    logger.info("Job queued: %s for user %s", job.job_id, user_id)

    return {
        "status": "queued",
        "job_id": job.job_id,
        "user_id": user_id,
        "session_id": session_id,
        "message": "Processing started. Use job_id to check status.",
    }


@router.get("/status/{job_id}")
async def get_status(
    job_id: str,
    _current_user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
) -> Dict[str, Any]:
    """Get status of a processing job."""
    try:
        redis = await create_pool(
            RedisSettings(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                database=settings.REDIS_DB,
            )
        )
        job = Job(job_id, redis=redis)
        status = await job.status()

        result = None
        if status == JobStatus.complete:
            try:
                result = await job.result()
            except Exception as e:  # pylint: disable=broad-exception-caught
                logger.warning("Could not get job result: %s", e)

        response = {
            "job_id": job_id,
            "status": status,
        }

        if result is not None:
            response["result"] = result
        return response

    except HTTPException:
        raise
    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.error("Failed to get job status: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to get job status: {e}") from e


def _format_multi_emotion_response(analysis: Any) -> Dict[str, Any]:
    """Format multi-emotion analysis result into a dictionary."""
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


@router.post("/analyze")
async def analyze_text(
    text: str = Form(...),  # noqa: B008
    user_id: Optional[str] = Form("demo-user"),  # noqa: B008
    session_id: Optional[str] = Form("demo-session"),  # noqa: B008
    _current_user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
) -> Dict[str, Any]:  # pylint: disable=too-many-locals
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
            logger.info("State recorded to Observer for user %s", user_id)
        except Exception as observer_error:  # pylint: disable=broad-exception-caught
            logger.warning("Failed to record state to Observer: %s", observer_error)
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

    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.error("Analysis failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}") from e


@router.post("/extract-audio-features")
async def extract_audio_features(
    audio: UploadFile = File(...),  # noqa: B008
    user_id: str = Form("admin"),  # pylint: disable=unused-argument  # noqa: B008
    session_id: str = Form("chat-session"),  # pylint: disable=unused-argument  # noqa: B008
    _current_user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
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
    start_time = time.time()
    audio_path = None
    try:
        audio_path = await _save_upload_file(audio)
        logger.info("Extracting audio features: %s (%d bytes)", audio_path, audio.size)

        # Step 1: Transcription
        transcription_service = get_transcription_service()
        transcription = transcription_service.transcribe(audio_path)
        input_text = transcription.text

        logger.info("Transcription: %s", input_text)

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

    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.error("Feature extraction failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Feature extraction failed: {str(e)}") from e

    finally:
        # Cleanup temp file
        if audio_path and os.path.exists(audio_path):
            os.remove(audio_path)


@router.post("/analyze-multi-emotion")
async def analyze_multi_emotion(
    text: str = Form(...),  # noqa: B008
    prosody_data_json: Optional[str] = Form(None),  # noqa: B008
    user_id: Optional[str] = Form("demo-user"),  # noqa: B008
    session_id: Optional[str] = Form("demo-session"),  # noqa: B008
    _current_user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
) -> Dict[str, Any]:  # pylint: disable=too-many-locals
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
            # _format_multi_emotion_response is now a module-level helper

            # Extra data for 3-way
            extra_response_data = {
                "three_way_analysis": {
                    "content_only": _format_multi_emotion_response(
                        three_way_result["content_only"]
                    ),
                    "voice_only": (
                        _format_multi_emotion_response(three_way_result["voice_only"])
                        if three_way_result["voice_only"]
                        else None
                    ),
                    "blended": _format_multi_emotion_response(three_way_result["blended"]),
                    "discrepancy": three_way_result["discrepancy"],
                },
                "prosody": prosody_data,
            }

        else:
            # Standard text-only analysis
            multi_analysis = await analyzer.analyze(text)
            extra_response_data = {}

        # Scrub PII
        get_pii_scrubber().scrub(text)

        # Calculate processing time
        processing_time_ms = int((time.time() - start_time) * 1000)

        logger.info(
            "Multi-emotion analysis complete: %d emotions, complexity=%.2f",
            len(multi_analysis.emotions),
            multi_analysis.complexity_score,
        )

        # Base response
        response = {
            "user_id": user_id,
            "session_id": session_id,
            "transcription": text,
            "processing_time_ms": processing_time_ms,
        }
        # Add analysis data
        response.update(_format_multi_emotion_response(multi_analysis))

        # Add 3-way data if available
        response.update(extra_response_data)

        return response

    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.error("Multi-emotion analysis failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Multi-emotion analysis failed: {e}") from e


@router.post("/analyze-audio")
async def analyze_audio_sync(
    audio: UploadFile = File(...),  # noqa: B008
    user_id: str = Form("admin"),  # pylint: disable=unused-argument  # noqa: B008
    session_id: str = Form("chat-session"),  # pylint: disable=unused-argument  # noqa: B008
    _current_user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
) -> Dict[str, Any]:  # pylint: disable=too-many-locals
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
    start_time = time.time()
    audio_path = await _save_upload_file(audio)

    try:
        logger.info("Processing audio synchronously: %s (%d bytes)", audio_path, audio.size)

        # Step 1: Transcription
        transcription_service = get_transcription_service()
        transcription = transcription_service.transcribe(audio_path)
        input_text = transcription.text

        logger.info("Transcription: %s", input_text)

        # Step 2: Prosody Analysis
        prosody_analyzer = get_prosody_analyzer()
        prosody_data = prosody_analyzer.analyze(audio_path)

        logger.info("Prosody: pitch=%.1fHz", prosody_data.get("pitch_mean", 0))

        # Step 3: Semantic Analysis
        analyzer = get_semantic_analyzer()
        emotion = await analyzer.analyze(input_text)

        logger.info("Emotion: %s", emotion.primary_emotion)

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

    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.error("Audio analysis failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Audio analysis failed: {str(e)}") from e

    finally:
        # Cleanup temp file
        if os.path.exists(audio_path):
            os.remove(audio_path)
            logger.debug("Cleaned up temp file: %s", audio_path)


@router.post("/analyze-audio-multi-emotion")
async def analyze_audio_multi_emotion(
    audio: UploadFile = File(...),  # noqa: B008
    user_id: str = Form("admin"),  # pylint: disable=unused-argument  # noqa: B008
    session_id: str = Form("chat-session"),  # pylint: disable=unused-argument  # noqa: B008
    _current_user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
) -> Dict[str, Any]:  # pylint: disable=too-many-locals
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
    start_time = time.time()
    audio_path = await _save_upload_file(audio)

    try:
        logger.info(
            "Processing audio for multi-emotion analysis: %s (%d bytes)",
            audio_path,
            audio.size,
        )

        # Step 1: Transcription
        transcription = get_transcription_service().transcribe(audio_path)
        input_text = str(transcription.text)  # Explicit cast

        logger.info("Transcription: %s", input_text)

        if not input_text or not input_text.strip():
            logger.warning("Transcription resulted in empty text. Aborting multi-emotion analysis.")
            raise HTTPException(
                status_code=400, detail="Could not transcribe audio. Input text is empty."
            )

        # Step 2: Prosody Analysis
        prosody_data = get_prosody_analyzer().analyze(audio_path)

        logger.info(
            "Prosody: pitch=%.1fHz, energy=%.3f",
            prosody_data.get("pitch_mean", 0),
            prosody_data.get("energy", 0),
        )

        # Step 3: Multi-Emotion 3-Way Analysis (content, voice, blended)
        analyzer = get_multi_emotion_analyzer()
        three_way_result = await analyzer.analyze_three_way(input_text, prosody_data)

        logger.info(
            "3-way analysis complete: Content=%s, Voice=%s, Blended=%s, Discrepancy=%.3f",
            three_way_result["discrepancy"]["content_primary"],
            three_way_result["discrepancy"]["voice_primary"],
            three_way_result["discrepancy"]["blended_primary"],
            three_way_result["discrepancy"]["content_voice_distance"],
        )

        # Step 4: PII Scrubbing
        scrubber = get_pii_scrubber()
        scrubber.scrub(input_text)

        processing_time = time.time() - start_time

        # Helper conversion is now at module level

        # Return complete 3-way analysis with prosody
        response = {
            "status": "success",
            "transcription": input_text,
            "processing_time_seconds": processing_time,
            "prosody": prosody_data,
            "three_way_analysis": {
                "content_only": _format_multi_emotion_response(three_way_result["content_only"]),
                "voice_only": (
                    _format_multi_emotion_response(three_way_result["voice_only"])
                    if three_way_result["voice_only"]
                    else None
                ),
                "blended": _format_multi_emotion_response(three_way_result["blended"]),
                "discrepancy": three_way_result["discrepancy"],
            },
        }
        # Add blended analysis as main response
        response.update(_format_multi_emotion_response(three_way_result["blended"]))

        return response

    except HTTPException:
        raise
    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.error("Multi-emotion audio analysis failed: %s", e, exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Multi-emotion audio analysis failed: {str(e)}"
        ) from e

    finally:
        # Cleanup temp file
        if os.path.exists(audio_path):
            os.remove(audio_path)
            logger.info("Cleaned up temp file: %s", audio_path)
