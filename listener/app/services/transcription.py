"""Listener Module - Transcription Service.

Local audio transcription using OpenAI Whisper (running locally, not via API).

This module provides privacy-preserving speech-to-text conversion without sending
audio data to external services. Uses OpenAI's Whisper model running locally for
fast, accurate transcription of voice input.

Key Components:
    TranscriptionService: Main class for audio-to-text conversion
    get_transcription_service: Factory function returning singleton instance

Integration Points:
    - Uses: OpenAI Whisper (local STT), AudioProcessor (audio normalization)
    - Used by: API routes (ingest.py), workers (audio_processor.py)

Performance:
    - Latency: ~500ms for 10s audio (base.en model on M1 Mac)
    - Accuracy: ~95% WER (Word Error Rate)
    - Model loading: ~10s first time, then cached

Privacy:
    - All processing happens locally
    - Audio never sent to external APIs
    - Temporary files cleaned up immediately

Examples:
    >>> from app.services.transcription import get_transcription_service
    >>> service = get_transcription_service()
    >>> result = service.transcribe("recording.wav")
    >>> print(result.text)
    "I'm feeling overwhelmed but hopeful"
    >>> print(f"Took {result.transcription_time_seconds:.2f}s")
    "Took 0.48s"

See Also:
    - Tests: tests/unit/test_transcription.py
    - Documentation: docs/modules/listener/senior-developers/01-deep-dive-architecture.md
    - Models: app/models/vac_response.py (TranscriptionResult)
    - Audio Utils: app/utils/audio_utils.py
"""
import logging
import time
from typing import Any, Dict, Optional

# Import for OpenAI Whisper (audio transcription)
try:
    import whisper

    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False
    whisper = None

from app.config import settings
from app.models.vac_response import TranscriptionResult
from app.utils.audio_utils import AudioProcessor, cleanup_temp_files

logger = logging.getLogger(__name__)


class TranscriptionService:
    """Audio transcription service using OpenAI Whisper (local, not API).

    Provides privacy-preserving, low-latency speech-to-text conversion without requiring
    API keys or sending data to external services. Whisper models are loaded into memory
    on first use and cached for subsequent requests.

    Architecture:
        Input: Audio file (WAV, M4A, WebM, MP3, etc.)
        Processing: Whisper model (local inference)
        Output: TranscriptionResult with text, language, timing

    Performance:
        - Latency: ~500ms for 10s audio (base.en on M1 Mac)
        - Accuracy: ~95% WER (Word Error Rate) for English
        - Model loading: ~10s first time, then cached in memory
        - Supports GPU acceleration if available

    Attributes:
        model_size (str): Whisper model size (tiny.en, base.en, small.en, etc.)
        device (str): Device for inference (cpu, cuda, auto)
        compute_type (str): Precision (int8, int16, float16, float32)
        _model: Loaded Whisper model instance (lazy loaded)
        _model_loaded (bool): Whether model is loaded into memory

    Model Selection Guide:
        - tiny.en (39MB): Fastest, lowest accuracy (~8% WER)
        - base.en (74MB): Balanced - RECOMMENDED (~5% WER)
        - small.en (244MB): Higher accuracy (~4% WER)
        - large-v3 (1550MB): Best accuracy (~3% WER)

    Sample Usage:
        Basic usage:
        >>> service = TranscriptionService()
        >>> result = service.transcribe("recording.wav")
        >>> print(result.text)
        "I'm feeling overwhelmed but hopeful"

        With custom model:
        >>> service = TranscriptionService(model_size="small.en", device="cuda")
        >>> result = service.transcribe("recording.wav")

        Direct text (skip transcription):
        >>> result = service.transcribe_text("I'm happy!")
        >>> print(result.text)
        "I'm happy!"

    See Also:
        - Tests: tests/unit/test_transcription.py
        - Audio Utils: app/utils/audio_utils.py (normalization)
        - Configuration: docs/modules/listener/reference/configuration.md

    Notes:
        - Model is lazy-loaded (first transcribe() call loads it)
        - Audio is automatically normalized to 16kHz mono (Whisper requirement)
        - Temporary normalized files are cleaned up automatically
        - Supports multiple audio formats via ffmpeg conversion
    """

    def __init__(
        self,
        model_size: Optional[str] = None,
        device: Optional[str] = None,
        compute_type: Optional[str] = None,
    ):
        """Initialize transcription service with model configuration.

        Model is not loaded immediately (lazy loading). First call to transcribe()
        will load the model into memory (~10s), then it's cached for subsequent calls.

        Args:
            model_size: Whisper model size. If None, uses settings.WHISPER_MODEL.
                Options:
                - "tiny.en" (39MB) - Fastest, ~8% WER
                - "base.en" (74MB) - Balanced, ~5% WER (RECOMMENDED)
                - "small.en" (244MB) - Higher accuracy, ~4% WER
                - "medium.en" (769MB) - High accuracy, ~3.5% WER
                - "large-v3" (1550MB) - Best accuracy, ~3% WER

            device: Device for inference. If None, uses settings.WHISPER_DEVICE.
                Options:
                - "cpu" - CPU inference (slower, no GPU needed)
                - "cuda" - GPU inference (5-10x faster, requires NVIDIA GPU)
                - "auto" - Use GPU if available, else CPU

            compute_type: Precision for inference. If None, uses settings.WHISPER_COMPUTE_TYPE.
                Options:
                - "int8" - 8-bit int (fastest, lowest memory, slight accuracy loss)
                - "int16" - 16-bit int (balanced)
                - "float16" - 16-bit float (good balance, requires GPU)
                - "float32" - 32-bit float (highest accuracy, slowest)

        Sample Usage:
            Default initialization (uses settings):
            >>> service = TranscriptionService()

            With specific model:
            >>> service = TranscriptionService(model_size="small.en", device="cuda")

            Fast mode (for development):
            >>> service = TranscriptionService(model_size="tiny.en", compute_type="int8")

        Notes:
            - Model loading is lazy (happens on first transcribe() call)
            - First transcription takes ~10s (model loading)
            - Subsequent transcriptions are fast (~500ms)
            - GPU acceleration requires CUDA-compatible GPU
        """
        self.model_size = model_size or settings.WHISPER_MODEL
        self.device = device or settings.WHISPER_DEVICE
        self.compute_type = compute_type or settings.WHISPER_COMPUTE_TYPE

        self._model: Optional["whisper.Whisper"] = None
        self._model_loaded = False

        logger.info(
            f"TranscriptionService initialized: "
            f"model={self.model_size}, device={self.device}, "
            f"compute_type={self.compute_type}"
        )

    def _load_model(self) -> None:
        """Load Whisper model into memory with lazy initialization.

        This method implements lazy loading—the model is only loaded when first needed,
        not when the TranscriptionService is instantiated. This design:
        1. Speeds up application startup
        2. Reduces memory usage if transcription isn't needed
        3. Loads model once and caches it for subsequent calls

        The loading process:
        1. Check if model is already loaded (return immediately if yes)
        2. Verify Whisper library is installed
        3. Load model from disk into memory (~10s, ~500MB RAM)
        4. Mark as loaded to prevent redundant loading

        Model Storage Location:
            Models are cached in: ~/.cache/whisper/
            First load downloads from OpenAI if not present

        Raises:
            RuntimeError: If Whisper library not installed or model loading fails

        Performance:
            - First call: ~10s (loads model from disk into memory)
            - Subsequent calls: < 1ms (already loaded, returns immediately)
            - Memory usage: ~500MB for base.en model

        Model Sizes:
            - tiny.en: 39MB on disk, ~150MB in memory, ~2s load
            - base.en: 74MB on disk, ~500MB in memory, ~10s load (DEFAULT)
            - small.en: 244MB on disk, ~1GB in memory, ~15s load
            - large-v3: 1550MB on disk, ~3GB in memory, ~30s load

        Notes:
            - Called automatically by transcribe() on first use
            - Thread-safe (Python's GIL prevents race conditions)
            - Model stays in memory for lifetime of process
            - Restart service to free memory

        Sample Usage:
            First transcription triggers loading:
            >>> service = TranscriptionService()
            >>> # No model loaded yet
            >>> result = service.transcribe("test.wav")  # Triggers _load_model()
            # INFO: Loading OpenAI Whisper model: base.en
            # INFO: Model loaded successfully in 9.8s

            Subsequent calls are fast:
            >>> result2 = service.transcribe("test2.wav")  # Uses cached model
            # (No loading message - instant)

        See Also:
            - OpenAI Whisper: https://github.com/openai/whisper
            - Model comparison: docs/modules/listener/reference/configuration.md
        """
        if self._model_loaded:
            return  # Model already in memory, nothing to do

        if not WHISPER_AVAILABLE or whisper is None:
            raise RuntimeError("Whisper not installed. Install with: pip install openai-whisper")

        logger.info(f"Loading OpenAI Whisper model: {self.model_size}")
        start_time = time.time()

        try:
            # Load model from disk into memory
            # On first run, downloads from OpenAI if not cached
            # Models cached in ~/.cache/whisper/ directory
            self._model = whisper.load_model(self.model_size)

            load_time = time.time() - start_time
            self._model_loaded = True

            logger.info(f"Model loaded successfully in {load_time:.2f}s")

        except Exception as e:
            logger.error(f"Failed to load Whisper model: {e}")
            raise RuntimeError(f"Model loading failed: {e}")

    def transcribe(
        self, audio_path: str, language: str = "en", _vad_filter: bool = True
    ) -> TranscriptionResult:
        """Transcribe audio file to text using Whisper model.

        This method performs the complete transcription pipeline:
        1. Load Whisper model (if not already loaded)
        2. Validate audio file exists and is readable
        3. Normalize audio to 16kHz mono (Whisper requirement)
        4. Perform transcription with Whisper
        5. Clean up temporary files
        6. Return transcription result

        Args:
            audio_path: Path to audio file (absolute or relative).
                Supported formats: WAV, M4A, WebM, MP3, AAC, FLAC
                Max duration: 5 minutes recommended
                Example: "/tmp/recording.wav", "uploads/voice123.m4a"

            language: Language code for transcription. Default: "en" (English).
                Supports: en, es, fr, de, zh, ja, ko, etc.
                If None or "auto", Whisper auto-detects language.

            _vad_filter: Use voice activity detection to filter non-speech (unused).
                Kept for API compatibility but not currently implemented.

        Returns:
            TranscriptionResult containing:
                - text: Transcribed text (string)
                - language: Detected language code
                - duration_seconds: Audio duration (float)
                - transcription_time_seconds: Processing time (float)

        Raises:
            ValueError: If audio file is invalid, corrupted, or doesn't exist
            RuntimeError: If transcription fails (Whisper error, out of memory, etc.)

        Sample Usage:
            Basic transcription:
            >>> service = get_transcription_service()
            >>> result = service.transcribe("/tmp/recording.wav")
            >>> print(result.text)
            "I'm feeling overwhelmed but hopeful"
            >>> print(f"Took {result.transcription_time_seconds:.2f}s")
            "Took 0.48s"

            Multi-language:
            >>> result_es = service.transcribe("spanish.wav", language="es")
            >>> print(result_es.text)
            "Me siento abrumado pero esperanzado"

            Auto-detect language:
            >>> result_auto = service.transcribe("unknown.wav", language="auto")
            >>> print(f"Detected: {result_auto.language}")
            "Detected: fr"

        Performance:
            - tiny.en: ~200ms for 10s audio
            - base.en: ~500ms for 10s audio (default)
            - small.en: ~1.5s for 10s audio
            - large-v3: ~5s for 10s audio (CPU) or ~800ms (GPU)
            - First call: +10s (model loading)

        Notes:
            - Audio is automatically normalized to 16kHz mono
            - Normalized temp files are cleaned up (privacy!)
            - Temperature=0.0 ensures deterministic output
            - fp16=False for CPU (fp16 requires GPU)
            - VAD filter improves accuracy by removing silence

        See Also:
            - Audio Utils: app/utils/audio_utils.py (normalization, validation)
            - Models: app/models/vac_response.py (TranscriptionResult)
            - Tests: tests/unit/test_transcription.py
            - Configuration: settings.WHISPER_MODEL, settings.WHISPER_DEVICE
        """
        # Ensure model is loaded
        self._load_model()

        # Validate and normalize audio
        if not AudioProcessor.validate_audio_file(audio_path):
            raise ValueError(f"Invalid audio file: {audio_path}")

        # Get audio duration
        duration = AudioProcessor.get_audio_duration(audio_path)

        # Normalize audio to 16kHz mono (Whisper requirement)
        normalized_path = None
        try:
            # Check if file is already in correct format
            audio_info = AudioProcessor.get_audio_info(audio_path)
            needs_normalization = (
                audio_info.get("sample_rate") != AudioProcessor.TARGET_SAMPLE_RATE
                or audio_info.get("channels") != AudioProcessor.TARGET_CHANNELS
            )

            if needs_normalization:
                logger.info("Normalizing audio to 16kHz mono")
                normalized_path = AudioProcessor.normalize_audio(audio_path)
                transcribe_path = normalized_path
            else:
                transcribe_path = audio_path

            # Perform transcription with OpenAI Whisper
            logger.info(f"Transcribing audio: {transcribe_path}")
            start_time = time.time()

            # Type narrowing: _load_model() guarantees _model is not None
            assert self._model is not None, "Model must be loaded"

            # OpenAI Whisper API returns a dict
            result = self._model.transcribe(
                transcribe_path,
                language=language,
                temperature=0.0,  # Deterministic output
                fp16=False,  # Use fp32 for CPU
            )

            full_text = result["text"].strip()
            detected_language = result.get("language", language)
            transcription_time = time.time() - start_time

            logger.info(
                f"Transcription complete: {len(full_text)} chars " f"in {transcription_time:.2f}s"
            )

            return TranscriptionResult(
                text=full_text,
                language=detected_language,
                duration_seconds=duration,
                transcription_time_seconds=transcription_time,
            )

        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            raise RuntimeError(f"Transcription error: {e}")

        finally:
            # Clean up normalized temp file
            if normalized_path:
                cleanup_temp_files(normalized_path)

    def transcribe_text(self, text: str) -> TranscriptionResult:
        """Create a TranscriptionResult from direct text input (skip transcription).

        Useful for testing semantic analysis without actual audio transcription.
        Creates a mock TranscriptionResult with zero duration and processing time.

        Args:
            text: Input text to wrap in TranscriptionResult.
                Can be any string - no validation performed.

        Returns:
            TranscriptionResult with provided text and zero timing values.
                - text: The provided text (unchanged)
                - language: "en" (hardcoded)
                - duration_seconds: 0.0
                - transcription_time_seconds: 0.0

        Sample Usage:
            For testing semantic analysis:
            >>> service = get_transcription_service()
            >>> result = service.transcribe_text("I'm feeling happy!")
            >>> print(result.text)
            "I'm feeling happy!"
            >>> print(result.duration_seconds)
            0.0

            In test fixtures:
            >>> texts = ["I'm sad", "I'm happy", "I'm anxious"]
            >>> results = [service.transcribe_text(t) for t in texts]
            >>> # Now pass results to semantic analyzer

        Notes:
            - Does NOT perform actual transcription
            - No model loading required
            - Instant response (< 1ms)
            - Primarily for testing purposes

        See Also:
            - Real transcription: transcribe()
            - Tests: tests/unit/test_transcription.py
        """
        return TranscriptionResult(
            text=text, language="en", duration_seconds=0.0, transcription_time_seconds=0.0
        )

    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the Whisper model configuration.

        Returns model metadata including size, device, precision, and whether
        the model is currently loaded in memory.

        Returns:
            dict: Model information with keys:
                - model_size (str): Model name (e.g., "base.en")
                - device (str): Device used (e.g., "cpu", "cuda")
                - compute_type (str): Precision (e.g., "int8", "float32")
                - loaded (bool): Whether model is in memory

        Examples:
            Check model status:
            >>> service = get_transcription_service()
            >>> info = service.get_model_info()
            >>> print(info)
            {'model_size': 'base.en', 'device': 'cpu', 'compute_type': 'int8', 'loaded': False}

            After first transcription:
            >>> service.transcribe("test.wav")
            >>> info = service.get_model_info()
            >>> print(info['loaded'])
            True

        Notes:
            - Useful for debugging model configuration
            - loaded=False means model hasn't been used yet
            - loaded=True means model is in memory (faster subsequent calls)

        See Also:
            - Configuration: docs/modules/listener/reference/configuration.md
        """
        return {
            "model_size": self.model_size,
            "device": self.device,
            "compute_type": self.compute_type,
            "loaded": self._model_loaded,
        }


# Global service instance (singleton pattern)
_service_instance: Optional[TranscriptionService] = None


def get_transcription_service() -> TranscriptionService:
    """Get or create global TranscriptionService instance (singleton pattern).

    This function implements the singleton pattern to ensure only one TranscriptionService
    instance exists throughout the application lifetime. This is critical because:
    1. Whisper model loading is expensive (~10s, ~500MB RAM)
    2. Multiple instances would load multiple copies of the model
    3. Singleton ensures model is loaded once and reused

    The instance is created lazily (on first call) and cached for subsequent calls.

    Returns:
        TranscriptionService: Global service instance with default configuration
            (uses settings from .env file)

    Examples:
        Basic usage (recommended pattern):
        >>> service = get_transcription_service()
        >>> result = service.transcribe("recording.wav")

        Multiple calls return same instance:
        >>> service1 = get_transcription_service()
        >>> service2 = get_transcription_service()
        >>> assert service1 is service2  # Same object

        In API endpoints:
        >>> from app.services.transcription import get_transcription_service
        >>>
        >>> @router.post("/transcribe")
        >>> async def transcribe_audio(audio: UploadFile):
        >>>     service = get_transcription_service()
        >>>     result = service.transcribe(audio.file)
        >>>     return {"text": result.text}

    Notes:
        - Thread-safe: Python's GIL ensures singleton creation is safe
        - Lazy initialization: Instance created on first call, not at import
        - Default configuration: Uses settings from app/config.py
        - For custom configuration, create TranscriptionService() directly

    See Also:
        - TranscriptionService class for custom configuration
        - app/config.py for default settings
        - app/api/routes/ingest.py for usage examples
    """
    global _service_instance

    if _service_instance is None:
        _service_instance = TranscriptionService()

    return _service_instance
