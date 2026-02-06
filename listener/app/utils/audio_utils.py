"""Listener Module - Audio Processing Utilities.

Utilities for audio file handling, format conversion, and normalization.
"""

import logging
import os
from pathlib import Path
from typing import Any, Dict, Optional

# Optional import for ffmpeg (audio processing)
try:
    import ffmpeg

    FFMPEG_AVAILABLE = True
except ImportError:
    FFMPEG_AVAILABLE = False
    ffmpeg = None

logger = logging.getLogger(__name__)


class AudioProcessor:
    """Audio file processing and normalization."""

    # Supported input formats
    SUPPORTED_FORMATS = {".wav", ".m4a", ".aac", ".mp3", ".ogg", ".flac", ".webm"}

    # Target format for Whisper
    TARGET_SAMPLE_RATE = 16000
    TARGET_CHANNELS = 1  # Mono

    @classmethod
    def validate_audio_file(cls, file_path: str) -> bool:
        """Validate that file exists and is a supported audio format.

        Args:
            file_path: Path to audio file

        Returns:
            True if valid, False otherwise
        """
        path = Path(file_path)

        if not path.exists():
            logger.error("Audio file not found: %s", file_path)
            return False

        if path.suffix.lower() not in cls.SUPPORTED_FORMATS:
            logger.error("Unsupported format: %s", path.suffix)
            return False

        return True

    @classmethod
    def get_audio_duration(cls, file_path: str) -> float:
        """Get duration of audio file in seconds.

        Args:
            file_path: Path to audio file

        Returns:
            Duration in seconds
        """
        try:
            probe = ffmpeg.probe(file_path)
            duration = float(probe["format"]["duration"])
            return duration
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.error("Error getting audio duration: %s", e)
            return 0.0

    @classmethod
    def normalize_audio(cls, input_path: str, output_path: Optional[str] = None) -> str:
        """Normalize audio to 16kHz mono WAV for Whisper.

        Args:
            input_path: Path to input audio file
            output_path: Path for output file (if None, creates temp file)

        Returns:
            Path to normalized audio file

        Raises:
            RuntimeError: If normalization fails
        """
        if not cls.validate_audio_file(input_path):
            raise ValueError(f"Invalid audio file: {input_path}")

        # Create output path if not provided
        if output_path is None:
            input_file = Path(input_path)
            output_path = str(input_file.parent / f"{input_file.stem}_normalized.wav")

        try:
            logger.info("Normalizing audio: %s -> %s", input_path, output_path)

            # Use ffmpeg to convert to 16kHz mono WAV
            stream = ffmpeg.input(input_path)
            stream = ffmpeg.output(
                stream,
                output_path,
                acodec="pcm_s16le",  # PCM 16-bit
                ac=cls.TARGET_CHANNELS,  # Mono
                ar=cls.TARGET_SAMPLE_RATE,  # 16kHz
                loglevel="error",
            )

            # Overwrite output file if it exists
            stream = ffmpeg.overwrite_output(stream)

            # Run the conversion
            ffmpeg.run(stream, capture_stdout=True, capture_stderr=True)

            logger.info("Audio normalized successfully: %s", output_path)
            return output_path

        except ffmpeg.Error as e:
            stderr = e.stderr.decode() if e.stderr else "Unknown error"
            logger.error("ffmpeg error: %s", stderr)
            raise RuntimeError(f"Audio normalization failed: {stderr}") from e

    @classmethod
    def convert_to_wav(cls, input_path: str, output_path: Optional[str] = None) -> str:
        """Convert audio file to WAV format (without normalization).

        Args:
            input_path: Path to input audio file
            output_path: Path for output WAV file

        Returns:
            Path to WAV file
        """
        if output_path is None:
            input_file = Path(input_path)
            output_path = str(input_file.parent / f"{input_file.stem}.wav")

        try:
            stream = ffmpeg.input(input_path)
            stream = ffmpeg.output(stream, output_path, acodec="pcm_s16le")
            stream = ffmpeg.overwrite_output(stream)
            ffmpeg.run(stream, capture_stdout=True, capture_stderr=True)

            return output_path

        except ffmpeg.Error as e:
            stderr = e.stderr.decode() if e.stderr else "Unknown error"
            raise RuntimeError(f"WAV conversion failed: {stderr}") from e

    @classmethod
    def get_audio_info(cls, file_path: str) -> Dict[str, Any]:
        """Get detailed audio file information.

        Args:
            file_path: Path to audio file

        Returns:
            Dictionary with audio properties
        """
        try:
            probe = ffmpeg.probe(file_path)
            audio_stream = next((s for s in probe["streams"] if s["codec_type"] == "audio"), None)

            if not audio_stream:
                raise ValueError("No audio stream found")

            return {
                "duration": float(probe["format"]["duration"]),
                "sample_rate": int(audio_stream.get("sample_rate", 0)),
                "channels": int(audio_stream.get("channels", 0)),
                "codec": audio_stream.get("codec_name", "unknown"),
                "bit_rate": int(audio_stream.get("bit_rate", 0)),
            }

        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.error("Error getting audio info: %s", e)
            return {}


def cleanup_temp_files(*file_paths: str) -> None:
    """Delete temporary audio files.

    Args:
        *file_paths: Paths to files to delete
    """
    for file_path in file_paths:
        try:
            if file_path and os.path.exists(file_path):
                os.remove(file_path)
                logger.debug(f"Deleted temp file: {file_path}")
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.warning("Could not delete temp file %s: %s", file_path, e)
