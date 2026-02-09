"""Listener Module - Audio Processing Worker.

Arq worker for async audio and text processing pipeline.
"""

import logging
import time

# pylint: disable=duplicate-code
from datetime import datetime
from typing import Any, Dict, Optional

from arq.connections import RedisSettings

from app.config import settings
from app.services.observer_client import get_observer_client
from app.services.pii_scrubber import get_pii_scrubber
from app.services.prosody_analyzer import get_prosody_analyzer
from app.services.semantic_analyzer import get_semantic_analyzer
from app.services.transcription import get_transcription_service

logger = logging.getLogger(__name__)


async def process_audio(
    _ctx: Any,
    audio_path: Optional[str] = None,
    text: Optional[str] = None,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    timestamp: Optional[str] = None,
) -> Dict[str, Any]:
    # pylint: disable=too-many-locals
    """Process audio or text through complete pipeline.

    Pipeline:
    1. Transcription (if audio provided)
    2. Semantic VAC extraction
    3. PII scrubbing
    4. Observer storage

    Args:
        _ctx: Arq context (unused but required by arq)
        audio_path: Path to audio file (optional)
        text: Direct text input (optional)
        user_id: User identifier
        session_id: Session identifier
        timestamp: ISO format timestamp

    Returns:
        Processing result dictionary
    """
    start_time = time.time()
    logger.info("Starting audio processing job for user %s", user_id)

    try:
        # Step 1: Transcription
        transcription_service = get_transcription_service()
        input_text, transcription_details = _perform_transcription(
            transcription_service, audio_path, text
        )

        logger.info("Transcription complete: %d characters", len(input_text))

        # Step 1.5: Prosody Analysis (if audio provided)
        prosody_data = None
        if audio_path:
            prosody_data = _extract_prosody(audio_path)

        # Step 2: Semantic Analysis
        emotion = await _perform_semantic_analysis(input_text)

        # Step 3: PII Scrubbing
        sanitized_text, pii_found = _perform_pii_scrubbing(input_text)

        # Step 4: Store in Observer
        observer_state_id = None
        if user_id and session_id:
            observer_state_id = await _store_in_observer(
                user_id, session_id, sanitized_text, emotion, timestamp
            )
        else:
            logger.warning("No user_id/session_id provided, skipping Observer storage")

        # Calculate total processing time
        processing_time = time.time() - start_time

        # Build result
        result = {
            "status": "success",
            "transcription": {
                "text": input_text,
                "language": transcription_details.language,
                "duration_seconds": transcription_details.duration_seconds,
                "transcription_time_seconds": transcription_details.transcription_time_seconds,
            },
            "emotion": {
                "primary_emotion": emotion.primary_emotion,
                "category": emotion.category,
                "vac": {
                    "valence": emotion.vac.valence,
                    "arousal": emotion.vac.arousal,
                    "connection": emotion.vac.connection,
                },
                "confidence": emotion.confidence,
                "reasoning": emotion.reasoning,
            },
            "prosody": prosody_data,
            "sanitized_text": sanitized_text,
            "pii_detected": pii_found,
            "processing_time_seconds": processing_time,
            "observer_state_id": observer_state_id,
        }

        logger.info("Processing complete in %.2fs", processing_time)

        return result

    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.error("Processing failed: %s", e, exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "processing_time_seconds": time.time() - start_time,
        }


def _perform_transcription(
    service: Any, audio_path: Optional[str], text: Optional[str]
) -> tuple[str, Any]:
    """Perform transcription or use direct text."""
    if audio_path:
        logger.info("Transcribing audio: %s", audio_path)
        transcription = service.transcribe(audio_path)
        return transcription.text, transcription
    if text:  # Changed from elif to if
        logger.info("Using direct text input")
        transcription = service.transcribe_text(text)
        return text, transcription

    raise ValueError("Either audio_path or text must be provided")


def _extract_prosody(audio_path: str) -> Dict[str, Any]:
    """Extract prosody features from audio."""
    logger.info("Extracting prosody features...")
    analyzer = get_prosody_analyzer()
    data = analyzer.analyze(audio_path)
    logger.info("Prosody extracted: pitch=%.1fHz", data.get("pitch_mean", 0))
    return data


async def _perform_semantic_analysis(text: str) -> Any:
    """Perform semantic analysis on text."""
    logger.info("Analyzing emotional content...")
    analyzer = get_semantic_analyzer()
    emotion = await analyzer.analyze(text)

    logger.info(
        "Emotion detected: %s (VAC: %.2f, %.2f, %.2f)",
        emotion.primary_emotion,
        emotion.vac.valence,
        emotion.vac.arousal,
        emotion.vac.connection,
    )
    return emotion


def _perform_pii_scrubbing(text: str) -> tuple[str, bool]:
    """Scrub PII from text."""
    logger.info("Scrubbing PII from text...")
    scrubber = get_pii_scrubber()
    sanitized_text = scrubber.scrub(text)
    pii_found = scrubber.has_pii(text)

    if pii_found:
        logger.warning("PII detected and removed from text")
    return sanitized_text, pii_found


async def _store_in_observer(
    user_id: str, session_id: str, text: str, emotion: Any, timestamp: Optional[str]
) -> Optional[str]:
    """Store analysis state in Observer."""
    logger.info("Recording state in Observer...")
    observer = get_observer_client()

    ts = datetime.fromisoformat(timestamp) if timestamp else datetime.utcnow()

    response = await observer.record_state(
        user_id=user_id,
        session_id=session_id,
        text=text,
        emotion=emotion,
        timestamp=ts,
    )
    state_id = response.get("state_id")
    logger.info("State recorded in Observer: %s", state_id)
    return state_id


class WorkerSettings:  # pylint: disable=too-few-public-methods
    """Arq worker settings for audio processing.

    Usage:
        arq app.workers.audio_processor.WorkerSettings
    """

    functions = [process_audio]

    # Redis connection
    redis_settings = RedisSettings(
        host=settings.REDIS_HOST, port=settings.REDIS_PORT, database=settings.REDIS_DB
    )

    # Worker settings
    max_jobs = 5
    job_timeout = 300  # 5 minutes
    keep_result = 3600  # Keep results for 1 hour

    # Logging
    log_results = True

    # Handle errors
    retry_jobs = True
    max_tries = 3
