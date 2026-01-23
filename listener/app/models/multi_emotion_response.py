"""Multi-Emotion Analysis Response Models.

Pydantic models for Deep Feeling mode supporting detection of multiple concurrent emotions.

This module defines the data structures for multi-emotion analysis—L.O.V.E.'s advanced
feature that detects up to 3 emotions simultaneously along with their relationships.
Traditional sentiment analysis assumes single emotions, but humans often experience
complex emotional states (e.g., "hopeful but anxious").

Key Models:
    DetectedEmotionResponse: Individual emotion with VAC, confidence, and prominence
    EmotionRelationshipResponse: Relationship between two emotions (complementary, contradictory, etc.)
    MultiEmotionAnalysisResponse: Complete analysis with emotions, relationships, aggregate state

Features:
    - Detects 1-3 concurrent emotions
    - Identifies relationships (complementary, contradictory, masking, etc.)
    - Calculates aggregate VAC (weighted by prominence)
    - Measures complexity and emotional clarity
    - Identifies temporal patterns (concurrent, sequential, emerging)

Integration Points:
    - Created by: app/services/multi_emotion_analyzer.py
    - Used by: routes/ingest.py (analyze-multi-emotion endpoint)
    - Enables: Deep Feeling mode in Experience UI

Validation:
    - Pydantic ensures type safety
    - Custom validators enforce business rules:
      * Exactly 1 primary emotion
      * Prominence values: 'primary', 'secondary', 'underlying'
      * Relationship types: 'complementary', 'contradictory', 'masking', 'amplifying', 'sequential'
      * Temporal patterns: 'concurrent', 'sequential', 'emerging'

Sample Usage:
    >>> from app.models.multi_emotion_response import MultiEmotionAnalysisResponse
    >>> result = MultiEmotionAnalysisResponse(
    >>>     emotions=[anxiety_emotion, hope_emotion],
    >>>     relationships=[anxiety_hope_relationship],
    >>>     aggregate_vac=avg_vac,
    >>>     complexity_score=0.65,
    >>>     emotional_clarity=0.72,
    >>>     temporal_pattern="concurrent",
    >>>     reasoning="..."
    >>> )

See Also:
    - Multi-Emotion Analyzer: app/services/multi_emotion_analyzer.py
    - Deep Feeling Feature: docs/features/deep-feeling/OVERVIEW.md
    - API Endpoint: routes/ingest.py::analyze_multi_emotion()
    - Tests: tests/unit/test_multi_emotion.py
"""

from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from app.models.vac_response import VACVector


class DetectedEmotionResponse(BaseModel):
    """Individual emotion detected in multi-emotion analysis.

    Note: Mapping fields (original_name, match_method, match_confidence) are
    populated by Observer when saving to database, not by Listener.
    Listener returns what the LLM detected; Observer maps to Atlas.
    """

    emotion_name: str = Field(..., description="Name of the detected emotion")
    original_name: Optional[str] = Field(
        None, description="Original AI name if mapped (populated by Observer)"
    )
    match_method: Optional[str] = Field(
        None, description="Mapping method: exact|fuzzy|vac|none (populated by Observer)"
    )
    match_confidence: Optional[float] = Field(
        None, ge=0.0, le=1.0, description="Mapping confidence 0-1 (populated by Observer)"
    )
    category: str = Field(..., description="Category of the emotion")
    vac: VACVector = Field(..., description="VAC coordinates for this emotion")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Detection confidence (0-1)")
    prominence: str = Field(..., description="'primary', 'secondary', or 'underlying'")

    @field_validator("prominence")
    @classmethod
    def validate_prominence(cls, v: str) -> str:
        """Ensure prominence is valid."""
        valid = ["primary", "secondary", "underlying"]
        if v not in valid:
            raise ValueError(f"Prominence must be one of {valid}")
        return v

    class Config:
        """Pydantic configuration."""

        schema_extra = {
            "example": {
                "emotion_name": "Anxiety",
                "category": "Places We Go When Things Are Uncertain",
                "vac": {"valence": -0.4, "arousal": 0.7, "connection": 0.2},
                "confidence": 0.85,
                "prominence": "primary",
            }
        }


class EmotionRelationshipResponse(BaseModel):
    """Relationship between two detected emotions."""

    emotion_a: str = Field(..., description="First emotion name")
    emotion_b: str = Field(..., description="Second emotion name")
    type: str = Field(..., description="Relationship type")
    strength: float = Field(..., ge=0.0, le=1.0, description="Relationship strength (0-1)")
    description: str = Field(..., description="Human-readable explanation")

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        """Ensure relationship type is valid."""
        valid = ["complementary", "contradictory", "masking", "amplifying", "sequential"]
        if v not in valid:
            raise ValueError(f"Relationship type must be one of {valid}")
        return v

    class Config:
        """Pydantic configuration."""

        schema_extra = {
            "example": {
                "emotion_a": "Anxiety",
                "emotion_b": "Excitement",
                "type": "contradictory",
                "strength": 0.8,
                "description": "Ambivalence about the opportunity - nervous but also looking forward to it",
            }
        }


class MultiEmotionAnalysisResponse(BaseModel):
    """Complete multi-emotion analysis with emotions, relationships, and aggregate state."""

    emotions: List[DetectedEmotionResponse] = Field(..., description="Detected emotions (1-3)")
    relationships: List[EmotionRelationshipResponse] = Field(
        default_factory=list, description="Relationships between emotions"
    )
    aggregate_vac: VACVector = Field(..., description="Weighted average VAC from all emotions")
    complexity_score: float = Field(
        ..., ge=0.0, le=1.0, description="Emotional complexity (0=simple, 1=complex)"
    )
    emotional_clarity: float = Field(
        ..., ge=0.0, le=1.0, description="How clear vs muddied (0=muddied, 1=clear)"
    )
    temporal_pattern: str = Field(..., description="'concurrent', 'sequential', or 'emerging'")
    reasoning: str = Field(..., description="Step-by-step analysis explanation")

    @field_validator("temporal_pattern")
    @classmethod
    def validate_temporal_pattern(cls, v: str) -> str:
        """Ensure temporal pattern is valid."""
        valid = ["concurrent", "sequential", "emerging"]
        if v not in valid:
            raise ValueError(f"Temporal pattern must be one of {valid}")
        return v

    @field_validator("emotions")
    @classmethod
    def validate_one_primary(
        cls, v: List[DetectedEmotionResponse]
    ) -> List[DetectedEmotionResponse]:
        """Ensure exactly one primary emotion."""
        primary_count = sum(1 for e in v if e.prominence == "primary")
        if primary_count != 1:
            raise ValueError(f"Must have exactly 1 primary emotion, got {primary_count}")
        if not 1 <= len(v) <= 3:
            raise ValueError(f"Must have 1-3 emotions, got {len(v)}")
        return v

    class Config:
        """Pydantic configuration."""

        schema_extra = {
            "example": {
                "emotions": [
                    {
                        "emotion_name": "Anxiety",
                        "category": "Places We Go When Things Are Uncertain",
                        "vac": {"valence": -0.4, "arousal": 0.7, "connection": 0.2},
                        "confidence": 0.85,
                        "prominence": "primary",
                    },
                    {
                        "emotion_name": "Excitement",
                        "category": "Places We Go When Life Is Good",
                        "vac": {"valence": 0.6, "arousal": 0.8, "connection": 0.5},
                        "confidence": 0.62,
                        "prominence": "secondary",
                    },
                ],
                "relationships": [
                    {
                        "emotion_a": "Anxiety",
                        "emotion_b": "Excitement",
                        "type": "contradictory",
                        "strength": 0.8,
                        "description": "Ambivalence about upcoming opportunity",
                    }
                ],
                "aggregate_vac": {"valence": -0.05, "arousal": 0.73, "connection": 0.32},
                "complexity_score": 0.65,
                "emotional_clarity": 0.72,
                "temporal_pattern": "concurrent",
                "reasoning": "The speaker expresses both nervousness and anticipation about a future event...",
            }
        }
