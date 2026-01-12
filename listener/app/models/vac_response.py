"""Listener Module - VAC Response Models.

Pydantic models for type-safe VAC extraction output and validation.

This module defines the core data structures used throughout the Listener module.
These models provide:
- Type safety through Pydantic validation
- Automatic JSON serialization/deserialization
- OpenAPI schema generation for FastAPI
- Value range validation (VAC coordinates must be -1 to +1)

Key Models:
    VACVector: 3D emotional coordinate (valence, arousal, connection)
    EmotionalClassification: Complete analysis result (emotion + VAC + reasoning)
    TranscriptionResult: Audio transcription output
    ProcessingResult: Complete pipeline result (transcription + emotion + sanitized text)

Integration Points:
    - Used by: All services (semantic_analyzer, transcription, API routes)
    - Validation: Pydantic ensures data integrity
    - Serialization: Automatic JSON encoding/decoding

Examples:
    >>> from app.models.vac_response import VACVector, EmotionalClassification
    >>> vac = VACVector(valence=0.8, arousal=0.6, connection=0.9)
    >>> print(vac.valence)
    0.8

See Also:
    - VAC Model: docs/architecture/02-vac-model.md
    - Semantic Analyzer: app/services/semantic_analyzer.py (creates these)
    - Tests: tests/unit/test_vac_models.py
"""
from pydantic import BaseModel, Field, field_validator


class VACVector(BaseModel):
    """3-dimensional emotional state vector representing a point in VAC space.

    The VAC model is L.O.V.E.'s core innovation—a 3D coordinate system for emotions
    that extends standard 2D sentiment analysis (Valence-Arousal) with the Connection
    axis to capture relational alignment.

    The Three Dimensions:
        - Valence (X): Pleasure (+1) to Displeasure (-1)
        - Arousal (Y): High Energy (+1) to Low Energy (-1)
        - Connection (Z): Alignment (+1) to Separation (-1)

    Validation:
        All values are automatically clamped to [-1.0, 1.0] range through
        Pydantic validators to handle LLM outputs that may exceed bounds.

    Attributes:
        valence (float): Hedonic tone from displeasure (-1) to pleasure (+1)
        arousal (float): Energy level from calm (-1) to activated (+1)
        connection (float): Relational alignment from separated (-1) to connected (+1)

    Sample Usage:
        Create a VAC vector:
        >>> vac = VACVector(valence=0.8, arousal=0.6, connection=0.9)
        >>> print(f"Joy at ({vac.valence}, {vac.arousal}, {vac.connection})")

        Automatic clamping:
        >>> vac = VACVector(valence=1.5, arousal=0.0, connection=0.0)  # Out of range!
        >>> print(vac.valence)
        1.0  # Clamped to valid range

        JSON serialization:
        >>> vac = VACVector(valence=0.5, arousal=-0.3, connection=0.7)
        >>> print(vac.model_dump_json())
        '{"valence": 0.5, "arousal": -0.3, "connection": 0.7}'

    See Also:
        - VAC Model Docs: docs/architecture/02-vac-model.md
        - Key Concepts: docs/modules/listener/junior-developers/03-key-concepts.md
        - Tests: tests/unit/test_vac_models.py

    Notes:
        - Values are automatically clamped to [-1, 1] by validator
        - Immutable once created (Pydantic default)
        - JSON-serializable for API responses
        - Used by Versor module for quaternion conversion
    """

    valence: float = Field(ge=-1.0, le=1.0, description="Pleasure (+1) to Displeasure (-1)")
    arousal: float = Field(ge=-1.0, le=1.0, description="High Energy (+1) to Low Energy/Calm (-1)")
    connection: float = Field(
        ge=-1.0, le=1.0, description="Relational Alignment (+1) to Separation (-1)"
    )

    @field_validator("valence", "arousal", "connection")
    @classmethod
    def clamp_values(cls, v: float) -> float:
        """Ensure VAC values are strictly within [-1.0, 1.0] bounds.

        LLMs occasionally return values slightly outside the valid range (e.g., 1.2).
        This validator automatically clamps them to prevent validation errors.

        Args:
            v: Input value (may be out of range)

        Returns:
            float: Clamped value guaranteed to be in [-1.0, 1.0]

        Sample Usage:
            >>> vac = VACVector(valence=1.5, arousal=0, connection=0)
            >>> print(vac.valence)
            1.0  # Clamped
        """
        return max(-1.0, min(1.0, v))


class EmotionalClassification(BaseModel):
    """Complete emotional analysis result from semantic analyzer.

    Contains the full output of VAC extraction including the detected emotion,
    VAC coordinates, confidence score, and the LLM's reasoning.

    This is the primary output model for the Listener module's semantic analysis.

    Attributes:
        primary_emotion (str): One of 87 Atlas of the Heart emotions
        category (str): One of 13 Atlas categories
        vac (VACVector): 3D emotional coordinates
        confidence (float): LLM's confidence (0.0 to 1.0)
        reasoning (str): Step-by-step analysis explaining VAC values

    Sample Usage:
        From semantic analysis:
        >>> result = EmotionalClassification(
        >>>     primary_emotion="Joy",
        >>>     category="Places We Go When Life Is Good",
        >>>     vac=VACVector(valence=0.9, arousal=0.7, connection=0.8),
        >>>     confidence=0.92,
        >>>     reasoning="High positive affect, energized, connected to life"
        >>> )

        Access fields:
        >>> print(result.primary_emotion)
        "Joy"
        >>> print(result.vac.connection)
        0.8

        JSON export:
        >>> json_str = result.model_dump_json()

    See Also:
        - Created by: app/services/semantic_analyzer.py::analyze()
        - Tests: tests/semantic/test_connection_axis.py
        - API Response: Used in all /listener/analyze* endpoints
    """

    primary_emotion: str = Field(description="One of the 87 Atlas of the Heart emotions")
    category: str = Field(description="One of the 13 Atlas categories")
    vac: VACVector = Field(description="3-dimensional VAC coordinates")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence in classification (0-1)")
    reasoning: str = Field(description="Step-by-step psychometric analysis")


class TranscriptionResult(BaseModel):
    """Audio transcription output from Whisper model.

    Contains the transcribed text along with metadata about the audio
    and transcription process.

    Attributes:
        text (str): Transcribed text from audio
        language (str): Detected language code (default: "en")
        duration_seconds (float): Original audio duration
        transcription_time_seconds (float): Time spent transcribing

    Sample Usage:
        >>> result = TranscriptionResult(
        >>>     text="I'm feeling overwhelmed",
        >>>     language="en",
        >>>     duration_seconds=3.5,
        >>>     transcription_time_seconds=0.48
        >>> )

    See Also:
        - Created by: app/services/transcription.py::transcribe()
    """

    text: str = Field(description="Transcribed text")
    language: str = Field(default="en", description="Detected language")
    duration_seconds: float = Field(description="Audio duration")
    transcription_time_seconds: float = Field(description="Processing time")


class ProcessingResult(BaseModel):
    """Complete pipeline result combining transcription and emotion analysis.

    Used for async job results that include both transcription and semantic analysis.

    Attributes:
        transcription (TranscriptionResult): Audio-to-text result
        emotion (EmotionalClassification): VAC analysis result
        sanitized_text (str): PII-scrubbed version of transcription
        processing_time_seconds (float): Total pipeline time

    Examples:
        >>> result = ProcessingResult(
        >>>     transcription=transcription_result,
        >>>     emotion=emotion_result,
        >>>     sanitized_text="I'm feeling overwhelmed",
        >>>     processing_time_seconds=2.3
        >>> )

    See Also:
        - Created by: app/workers/audio_processor.py::process_audio()
    """

    transcription: TranscriptionResult
    emotion: EmotionalClassification
    sanitized_text: str = Field(description="PII-scrubbed text")
    processing_time_seconds: float = Field(description="Total pipeline time")
