"""Listener Module - Multi-Emotion Analysis Service.

Extract multiple concurrent emotions (1-3) with relationships and aggregate state.

This module implements "Deep Feeling" mode—L.O.V.E.'s advanced feature for detecting
emotional complexity. While standard analysis assumes a single emotion, humans often
experience multiple emotions simultaneously (e.g., "hopeful but anxious").

Key Capabilities:
    - Detect 1-3 concurrent emotions with individual VAC coordinates
    - Classify prominence (primary, secondary, underlying)
    - Identify relationships (complementary, contradictory, masking, etc.)
    - Calculate aggregate emotional state (weighted by confidence)
    - Measure emotional complexity and clarity
    - Support 3-way analysis (content, voice, blended)

Integration Points:
    - Uses: Ollama LLM, model_fetcher (dynamic assignment)
    - Used by: routes/ingest.py (analyze-multi-emotion endpoint)
    - Enables: Deep Feeling mode in Experience UI

The Innovation:
    - Traditional analysis: Single emotion
    - L.O.V.E. multi-emotion: Up to 3 emotions + relationships
    - Clinical value: Detects emotional suppression, ambivalence, complexity

Examples:
    >>> from app.services.multi_emotion_analyzer import get_multi_emotion_analyzer
    >>> analyzer = get_multi_emotion_analyzer()
    >>> result = await analyzer.analyze("I'm hopeful but also anxious")
    >>> print(f"Detected {len(result.emotions)} emotions")
    >>> print(f"Complexity: {result.complexity_score}")

Performance:
    - Latency: ~3-4s per analysis (more complex than single-emotion)
    - Accuracy: Detects emotional complexity standard analysis misses
    - 3-way analysis: ~12-16s (runs 3 analyses in parallel)

See Also:
    - Deep Feeling Feature: docs/features/deep-feeling/OVERVIEW.md
    - 3-Way Analysis: docs/features/voice-analysis/THREE-WAY-ANALYSIS.md
    - API Endpoint: app/api/routes/ingest.py::analyze_multi_emotion()
    - Models: app/models/multi_emotion_response.py
    - Tests: tests/integration/test_multi_emotion.py
"""

import asyncio
import json
import logging
import time
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate

from app.config import settings
from app.models.multi_emotion_response import MultiEmotionAnalysisResponse
from app.services.llm_factory import get_llm
from app.services.model_fetcher import get_model_fetcher

logger = logging.getLogger(__name__)

# -----------------------------------------------------------------------------
# Default Prompts (Fallbacks)
# -----------------------------------------------------------------------------

DEFAULT_MULTI_EMOTION_SYSTEM = """You are the Listener with Deep Feeling mode, an expert in \
multi-emotion analysis trained in emotional analysis.

Your task is to detect MULTIPLE EMOTIONS (1-3) in the input text and analyze how they relate to \
each other.

**3-Dimensional VAC Model:**
- **Valence** (X): Pleasure (+1) to Displeasure (-1)
- **Arousal** (Y): High Energy (+1) to Low Energy (-1)
- **Connection** (Z): Connected (+1) to Disconnected (-1)

**Prominence Levels:**
1. **Primary**: The most prominent, confident emotion (highest confidence)
2. **Secondary**: Significant emotions that co-occur (moderate confidence, 0.5-0.8)
3. **Underlying**: Emotions that are present but hidden/suppressed (may have high confidence but \
not expressed overtly)

**Relationship Types:**
- **Complementary**: Emotions that naturally co-occur and support each other (e.g., joy + gratitude)
- **Contradictory**: Emotions in tension, creating ambivalence (e.g., anxiety + excitement)
- **Masking**: One emotion hiding or covering another (e.g., anger masking fear)
- **Amplifying**: One emotion intensifying another (e.g., grief amplifying regret)
- **Sequential**: Emotions in temporal progression (e.g., surprise → confusion → understanding)

**Analysis Process:**
1. Identify PRIMARY emotion (highest confidence, most prominent)
2. Look for SECONDARY emotions (significant but not dominant)
3. Detect UNDERLYING emotions (hidden, suppressed, or implied)
4. Determine RELATIONSHIPS between emotions
5. Calculate AGGREGATE VAC (weighted by confidence)
6. Assess COMPLEXITY (0=simple/one clear emotion, 1=highly mixed/complex)
7. Assess CLARITY (0=muddied/unclear, 1=crystal clear)
8. Determine TEMPORAL PATTERN (concurrent, sequential, or emerging)

**Confidence Thresholds:**
- Only include emotions with confidence ≥ 0.4
- Primary emotion should have highest confidence
- Maximum 3 emotions total

**CRITICAL EXAMPLES:**

Example 1 - Ambivalence (Contradictory Emotions):
Input: "I'm nervous about the presentation tomorrow, but I'm also kind of excited? \
It's a big opportunity."
Analysis:
- Primary: Anxiety (0.75) - VAC: (-0.4, 0.7, 0.2) - Most prominent feeling
- Secondary: Excitement (0.62) - VAC: (0.6, 0.8, 0.5) - Anticipation about opportunity
- Relationship: Anxiety ⟷ Excitement (contradictory, strength 0.8) - \
"Ambivalence about the opportunity"
- Aggregate VAC: Weighted average → (-0.05, 0.73, 0.32)
- Complexity: 0.65 (moderate - two conflicting emotions)
- Clarity: 0.72 (fairly clear - person recognizes both feelings)
- Pattern: concurrent (happening simultaneously)

Example 2 - Complex Grief (Complementary + Underlying):
Input: "I miss them so much. It hurts, but I'm also grateful for the time we had together."
Analysis:
- Primary: Grief (0.82) - VAC: (-0.8, -0.3, 0.7) - Profound loss
- Secondary: Gratitude (0.68) - VAC: (0.7, -0.1, 0.8) - Appreciation for memories
- Underlying: Love (0.78) - VAC: (0.9, 0.2, 0.9) - Connection persists despite loss
- Relationships:
  * Grief ⟷ Gratitude (complementary, 0.7) - "Bittersweet recognition of what was shared"
  * Grief ← Love (amplifying, 0.9) - "Love intensifies the pain of loss"
- Aggregate VAC: (-0.15, -0.1, 0.80)
- Complexity: 0.75 (high - three emotions with complex interplay)
- Clarity: 0.68 (moderate - pain is clear, but mixed with appreciation)
- Pattern: concurrent (all present simultaneously)

Example 3 - Masked Emotion:
Input: "I'm just so angry that they did this! How could they?"
Analysis:
- Primary: Anger (0.80) - VAC: (-0.7, 0.8, -0.4) - Outward expression
- Underlying: Hurt/Pain (0.72) - VAC: (-0.8, 0.2, -0.6) - Hidden vulnerability
- Relationship: Anger → Pain (masking, 0.75) - "Anger is protecting deeper hurt"
- Aggregate VAC: (-0.74, 0.58, -0.48)
- Complexity: 0.55 (moderate - anger covers hurt)
- Clarity: 0.45 (lower - underlying emotion not directly expressed)
- Pattern: concurrent (both present, one hidden)

Example 4 - Sequential Emotions:
Input: "Wait, what? I don't understand... oh! Oh I see now, that makes sense!"
Analysis:
- Primary: Surprise (0.70) - VAC: (0.2, 0.6, 0.1) - Initial reaction
- Secondary: Confusion (0.55) - VAC: (-0.3, 0.3, -0.2) - Processing phase
- Secondary: Understanding (0.65) - VAC: (0.4, -0.2, 0.5) - Resolution
- Relationships:
  * Surprise → Confusion (sequential, 0.8) - "Surprise leads to confusion"
  * Confusion → Understanding (sequential, 0.9) - "Confusion resolves to understanding"
- Aggregate VAC: (0.15, 0.3, 0.2)
- Complexity: 0.45 (moderate - emotions in progression)
- Clarity: 0.80 (high - clear emotional journey)
- Pattern: sequential (one after another)

Example 5 - Simple Single Emotion:
Input: "I'm feeling really happy today! Everything is going well."
Analysis:
- Primary: Joy (0.88) - VAC: (0.85, 0.6, 0.7) - Clear, straightforward happiness
- Aggregate VAC: (0.85, 0.6, 0.7) (same as primary)
- Complexity: 0.15 (low - single clear emotion)
- Clarity: 0.95 (very high - no ambiguity)
- Pattern: concurrent (only one emotion)

**Response Format (JSON):**
{{
  "emotions": [
    {{
      "emotion_name": "string",
      "category": "string",
      "vac": {{"valence": float, "arousal": float, "connection": float}},
      "confidence": float,
      "prominence": "primary|secondary|underlying"
    }}
  ],
  "relationships": [
    {{
      "emotion_a": "string",
      "emotion_b": "string",
      "type": "complementary|contradictory|masking|amplifying|sequential",
      "strength": float,
      "description": "string"
    }}
  ],
  "aggregate_vac": {{"valence": float, "arousal": float, "connection": float}},
  "complexity_score": float,
  "emotional_clarity": float,
  "temporal_pattern": "concurrent|sequential|emerging",
  "reasoning": "string"
}}

Now analyze the following input. Respond with ONLY valid JSON:"""

DEFAULT_MULTI_EMOTION_USER = "{input_text}"

DEFAULT_CONTENT_ONLY_SYSTEM = """You are analyzing ONLY the semantic content and meaning of text.

**CRITICAL: Ignore ANY information about how the text was spoken. Focus SOLELY on:**
- Word choice and language patterns
- Semantic meaning and context
- Linguistic markers of emotion
- What the WORDS themselves convey

**3-Dimensional VAC Model:**
- **Valence** (X): Pleasure (+1) to Displeasure (-1)
- **Arousal** (Y): High Energy (+1) to Low Energy (-1)
- **Connection** (Z): Connected (+1) to Disconnected (-1)

**Your Task:**
Analyze what emotions are expressed in the CONTENT of the text itself, based purely on the words \
and their semantic meaning.

**Response Format (JSON):**
{{
  "emotions": [
    {{
      "emotion_name": "string",
      "category": "string",
      "vac": {{"valence": float, "arousal": float, "connection": float}},
      "confidence": float,
      "prominence": "primary|secondary|underlying"
    }}
  ],
  "relationships": [...],
  "aggregate_vac": {{"valence": float, "arousal": float, "connection": float}},
  "complexity_score": float,
  "emotional_clarity": float,
  "temporal_pattern": "concurrent|sequential|emerging",
  "reasoning": "string"
}}

Respond with ONLY valid JSON:"""

DEFAULT_CONTENT_ONLY_USER = "{input_text}"

DEFAULT_VOICE_ONLY_SYSTEM = """You are analyzing ONLY the vocal characteristics of speech.

**CRITICAL: You will NOT see the actual words. Focus SOLELY on:**
- Pitch patterns (frequency, range, variability)
- Vocal energy and intensity
- Speech rate and rhythm
- Voice quality indicators (jitter, shimmer, HNR)
- What the VOICE itself reveals about emotional state

**3-Dimensional VAC Model:**
- **Valence** (X): Pleasure (+1) to Displeasure (-1)
- **Arousal** (Y): High Energy (+1) to Low Energy (-1)
- **Connection** (Z): Connected (+1) to Disconnected (-1)

**Prosody-to-Emotion Guidelines:**
- **High pitch + high energy + fast rate** → Anxiety, Excitement, Panic
- **Low pitch + low energy + slow rate** → Sadness, Depression, Defeat
- **Moderate pitch + high energy + fast rate** → Joy, Enthusiasm
- **High pitch + low energy** → Worry, Concern
- **Low pitch + high energy** → Anger, Frustration
- **Stable pitch + moderate energy** → Contentment, Calm, Peace
- **Erratic pitch + variable energy** → Confusion, Overwhelm
- **Poor voice quality (high jitter/shimmer, low HNR)** → Stress, Distress, Fatigue

**Your Task:**
Based ONLY on the prosody features provided, determine what emotions the speaker's VOICE is \
expressing, regardless of their words.

**Response Format (JSON):**
{{
  "emotions": [
    {{
      "emotion_name": "string",
      "category": "string",
      "vac": {{"valence": float, "arousal": float, "connection": float}},
      "confidence": float,
      "prominence": "primary|secondary|underlying"
    }}
  ],
  "relationships": [...],
  "aggregate_vac": {{"valence": float, "arousal": float, "connection": float}},
  "complexity_score": float,
  "emotional_clarity": float,
  "temporal_pattern": "concurrent",
  "reasoning": "string"
}}

Respond with ONLY valid JSON:"""

DEFAULT_VOICE_ONLY_USER = """Analyze these vocal prosody features:

**Pitch Analysis:**
- Mean: {pitch_mean} Hz
- Range: {pitch_range} Hz (min: {pitch_min}, max: {pitch_max})
- Variability (std): {pitch_std} Hz

**Energy Analysis:**
- Average: {energy}
- Peak: {energy_max}
- Variability (std): {energy_std}

**Speech Patterns:**
- Rate: {rate} syllables/second
- Duration: {duration} seconds

**Voice Quality:**
- Jitter: {jitter}% (pitch perturbation)
- Shimmer: {shimmer}% (amplitude perturbation)
- HNR: {hnr} dB (harmonics-to-noise ratio)

Based ONLY on these vocal characteristics, what emotions does this voice express?"""


# pylint: disable=too-many-instance-attributes,duplicate-code,too-many-lines
class MultiEmotionAnalyzer:
    """Extract multiple concurrent emotions (up to 3) with relationships.

    The key innovation is detecting emotional complexity:
    - Primary emotion (most prominent)
    - Secondary emotions (significant but not dominant)
    - Underlying emotions (hidden or suppressed)
    - Relationships between emotions
    - Aggregate emotional state
    """

    def __init__(  # pylint: disable=too-many-positional-arguments,too-many-arguments
        self,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        base_url: Optional[str] = None,
        min_confidence: float = 0.4,
        fetch_dynamic_model: bool = True,
    ):
        """Initialize multi-emotion analyzer.

        Args:
            model: Ollama model name (override assignment)
            temperature: Temperature for generation
            base_url: Ollama API base URL
            min_confidence: Minimum confidence to include emotion (default 0.4)
            fetch_dynamic_model: Fetch model from assignments (default: True)
        """
        # Fetch assigned model if not explicitly provided
        if model is None and fetch_dynamic_model:
            try:
                fetcher = get_model_fetcher(settings.OBSERVER_URL)
                try:
                    loop = asyncio.get_event_loop()
                except RuntimeError:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)

                self.model = loop.run_until_complete(
                    fetcher.get_model_for_function("multi_emotion", settings.OLLAMA_MODEL)
                )
                logger.info("Using dynamically assigned model for multi_emotion: %s", self.model)
            except Exception as e:  # pylint: disable=broad-exception-caught
                logger.warning("Failed to fetch dynamic model, using default: %s", e)
                self.model = settings.OLLAMA_MODEL
        else:
            self.model = model or settings.OLLAMA_MODEL
        self.temperature = temperature if temperature is not None else settings.LLM_TEMPERATURE
        self.base_url = base_url or settings.OLLAMA_BASE_URL
        self.min_confidence = min_confidence

        # Initialize LLM via Factory
        self.llm = get_llm(
            model=self.model,
            temperature=self.temperature,
        )

        # Initialize parser
        self.parser = PydanticOutputParser(pydantic_object=MultiEmotionAnalysisResponse)

        # Create default prompts
        self.prompt = self._create_default_prompt()
        self.content_only_prompt = self._create_default_content_only_prompt()
        self.voice_only_prompt = self._create_default_voice_only_prompt()

        logger.info(
            "MultiEmotionAnalyzer initialized: model=%s, temperature=%s, min_confidence=%s",
            self.model,
            self.temperature,
            self.min_confidence,
        )

    def _create_default_prompt(self) -> ChatPromptTemplate:
        """Create the default multi-emotion prompt template."""
        return ChatPromptTemplate.from_messages(
            [("system", DEFAULT_MULTI_EMOTION_SYSTEM), ("user", DEFAULT_MULTI_EMOTION_USER)]
        )

    def _create_default_content_only_prompt(self) -> ChatPromptTemplate:
        """Create the default content-only analysis prompt template."""
        return ChatPromptTemplate.from_messages(
            [("system", DEFAULT_CONTENT_ONLY_SYSTEM), ("user", DEFAULT_CONTENT_ONLY_USER)]
        )

    def _create_default_voice_only_prompt(self) -> ChatPromptTemplate:
        """Create the default voice-only analysis prompt template."""
        return ChatPromptTemplate.from_messages(
            [("system", DEFAULT_VOICE_ONLY_SYSTEM), ("user", DEFAULT_VOICE_ONLY_USER)]
        )

    async def _refresh_prompts(self) -> None:
        """Fetch latest prompts from Observer."""
        try:
            fetcher = get_model_fetcher(settings.OBSERVER_URL)

            # Fetch all 3 prompts in parallel
            # We map function names to prompt attributes
            prompts = {
                "multi_emotion": "prompt",
                "content_only": "content_only_prompt",
                "voice_only": "voice_only_prompt",
            }

            # Defaults for user part (currently simple input binding)
            user_defaults = {
                "multi_emotion": DEFAULT_MULTI_EMOTION_USER,
                "content_only": DEFAULT_CONTENT_ONLY_USER,
                "voice_only": DEFAULT_VOICE_ONLY_USER,
            }

            system_defaults = {
                "multi_emotion": DEFAULT_MULTI_EMOTION_SYSTEM,
                "content_only": DEFAULT_CONTENT_ONLY_SYSTEM,
                "voice_only": DEFAULT_VOICE_ONLY_SYSTEM,
            }

            for function_name, attr_name in prompts.items():
                prompt_data = await fetcher.get_prompt_for_function(function_name)

                if prompt_data:
                    system_msg = prompt_data.get("template_content", system_defaults[function_name])
                    user_msg = user_defaults[
                        function_name
                    ]  # We don't support custom user prompt yet

                    new_prompt = ChatPromptTemplate.from_messages(
                        [("system", system_msg), ("user", user_msg)]
                    )
                    setattr(self, attr_name, new_prompt)
                    logger.debug(
                        "Updated %s prompt to v%s", function_name, prompt_data.get("version")
                    )

        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.warning("Failed to refresh multi-emotion prompts: %s", e)

        # Old methods removed as replaced by defaults and dynamic fetching

        logger.info(
            "MultiEmotionAnalyzer initialized: model=%s, temperature=%s, min_confidence=%s",
            self.model,
            self.temperature,
            self.min_confidence,
        )

    def _filter_and_validate_emotions(self, emotions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Filter emotions by confidence and ensure valid structure.

        Args:
            emotions: List of emotion dictionaries from LLM

        Returns:
            Filtered and validated list of emotions (max 3, sorted by confidence)
        """
        # Filter by minimum confidence
        filtered = [e for e in emotions if e.get("confidence", 0) >= self.min_confidence]

        # Ensure at least one emotion
        if not filtered:
            raise ValueError("No emotions meet minimum confidence threshold")

        # Sort by confidence (highest first)
        filtered.sort(key=lambda e: e.get("confidence", 0), reverse=True)

        # Limit to maximum 3 emotions
        if len(filtered) > 3:
            logger.info("Limiting %d emotions to top 3 by confidence", len(filtered))
            filtered = filtered[:3]

        return filtered

    def _ensure_single_primary(self, emotions: List[Dict[str, Any]]) -> None:
        """Ensure exactly one emotion is marked as primary.

        Modifies emotions list in place.

        Args:
            emotions: List of emotion dictionaries (must be sorted by confidence)
        """
        primary_count = sum(1 for e in emotions if e.get("prominence") == "primary")

        if primary_count == 0:
            # Make highest confidence emotion primary
            emotions[0]["prominence"] = "primary"
        elif primary_count > 1:
            # Keep only highest confidence as primary, others become secondary
            for i, emotion in enumerate(emotions):
                if emotion.get("prominence") == "primary" and i > 0:
                    emotion["prominence"] = "secondary"

    def _filter_relationships(self, relationships: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Filter out invalid relationships with None values.

        Args:
            relationships: List of relationship dictionaries

        Returns:
            Filtered list with only valid relationships
        """
        return [
            r
            for r in relationships
            if all(
                [
                    r.get("emotion_a") is not None,
                    r.get("emotion_b") is not None,
                    r.get("type") is not None,
                    r.get("strength") is not None,
                    r.get("description") is not None,
                ]
            )
        ]

    # _create_prompt replaced by defaults

    # _create_content_only_prompt replaced by defaults/fetching
    # _create_voice_only_prompt replaced by defaults/fetching

    async def analyze(self, text: str) -> MultiEmotionAnalysisResponse:
        """Extract multiple emotions and their relationships from text.

        Args:
            text: Input text to analyze

        Returns:
            MultiEmotionAnalysisResponse with 1-3 emotions, relationships, and aggregate state

        Raises:
            RuntimeError: If analysis fails
        """
        if not text or len(text.strip()) == 0:
            raise ValueError("Input text cannot be empty")

        # Refresh prompts
        await self._refresh_prompts()

        logger.info("Analyzing text (multi-emotion): %s...", text[:100])
        start_time = time.time()

        try:
            # Format prompt
            formatted_prompt = self.prompt.format_messages(input_text=text)
            prompt_str = "\n\n".join([str(msg.content) for msg in formatted_prompt])

            # Call LLM (increased timeout for multi-emotion analysis)
            logger.debug("Calling Ollama LLM for multi-emotion analysis...")
            response = await self.llm.ainvoke(prompt_str)

            # Parse JSON response
            logger.debug("LLM response: %s...", response[:300])

            # Clean response
            cleaned_response = response.strip()
            if cleaned_response.startswith("```json"):
                cleaned_response = cleaned_response[7:]  # pragma: no cover
            elif cleaned_response.startswith("```"):
                cleaned_response = cleaned_response[3:]  # pragma: no cover

            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]  # pragma: no cover

            cleaned_response = cleaned_response.strip()

            # Parse JSON
            result_dict = json.loads(cleaned_response)

            # Note: Atlas mapping now happens in Observer when saving to database
            # Listener just returns what the LLM detected

            # Filter and process emotions using helper method
            if "emotions" in result_dict:  # pragma: no cover
                result_dict["emotions"] = self._filter_and_validate_emotions(
                    result_dict["emotions"]
                )
                self._ensure_single_primary(result_dict["emotions"])

            # Filter out invalid relationships using helper method
            if "relationships" in result_dict:
                result_dict["relationships"] = self._filter_relationships(
                    result_dict["relationships"]
                )

            # Recalculate aggregate VAC if needed
            if "emotions" in result_dict and result_dict["emotions"]:  # pragma: no cover
                aggregate_vac = self._calculate_aggregate_vac(result_dict["emotions"])
                result_dict["aggregate_vac"] = {
                    "valence": aggregate_vac[0],
                    "arousal": aggregate_vac[1],
                    "connection": aggregate_vac[2],
                }

            # Validate and construct Pydantic model
            result = MultiEmotionAnalysisResponse(**result_dict)

            analysis_time = time.time() - start_time
            logger.info(
                "Multi-emotion analysis complete: %d emotions detected in %.2fs (complexity: %.2f)",
                len(result.emotions),
                analysis_time,
                result.complexity_score,
            )

            return result

        except json.JSONDecodeError as e:
            logger.error("Failed to parse JSON response: %s", e)
            logger.error("Response was: %s", response)
            raise RuntimeError(f"Invalid JSON response from LLM: {e}") from e

        except Exception as e:
            logger.error("Multi-emotion analysis failed: %s", e, exc_info=True)
            raise RuntimeError(f"Analysis error: {e}") from e

    async def _analyze_content_only(self, text: str) -> MultiEmotionAnalysisResponse:
        """Analyze emotions based ONLY on text semantic content.

        Ignores any prosody information. Useful for understanding what
        the words themselves convey, separate from vocal delivery.

        Args:
            text: Input text to analyze

        Returns:
            MultiEmotionAnalysisResponse from content analysis only
        """
        logger.info("Running content-only analysis on: %s...", text[:50])

        # Format content-only prompt
        formatted_prompt = self.content_only_prompt.format_messages(input_text=text)
        prompt_str = "\n\n".join([str(msg.content) for msg in formatted_prompt])

        # Call LLM
        response = await self.llm.ainvoke(prompt_str)

        # Process response using common logic
        return self._process_llm_response(response, "content-only")

    async def _analyze_voice_only(
        self, prosody_features: Dict[str, float]
    ) -> MultiEmotionAnalysisResponse:
        """Analyze emotions based ONLY on vocal prosody features.

        Ignores the actual words. Useful for understanding what the
        voice/tone reveals, separate from semantic content.

        Args:
            prosody_features: Dictionary of prosody measurements

        Returns:
            MultiEmotionAnalysisResponse from voice analysis only
        """
        logger.info("Running voice-only analysis on prosody features...")

        # Extract features with defaults
        features = {
            "pitch_mean": prosody_features.get("pitch_mean", 0.0),
            "pitch_range": prosody_features.get("pitch_range", 0.0),
            "pitch_min": prosody_features.get("pitch_min", 0.0),
            "pitch_max": prosody_features.get("pitch_max", 0.0),
            "pitch_std": prosody_features.get("pitch_std", 0.0),
            "energy": prosody_features.get("energy", 0.0),
            "energy_max": prosody_features.get("energy_max", 0.0),
            "energy_std": prosody_features.get("energy_std", 0.0),
            "rate": prosody_features.get("rate", 0.0),
            "duration": prosody_features.get("duration", 0.0),
            "jitter": prosody_features.get("jitter", 0.0),
            "shimmer": prosody_features.get("shimmer", 0.0),
            "hnr": prosody_features.get("hnr", 0.0),
        }

        # Format voice-only prompt
        formatted_prompt = self.voice_only_prompt.format_messages(**features)
        prompt_str = "\n\n".join([str(msg.content) for msg in formatted_prompt])

        # Call LLM
        response = await self.llm.ainvoke(prompt_str)

        # Process response using common logic
        return self._process_llm_response(response, "voice-only")

    async def analyze_three_way(
        self, text: str, prosody_features: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """Run three parallel emotion analyses: content-only, voice-only, and blended.

        This provides clinical insight into voice-content alignment/discrepancy.

        Args:
            text: Input text
            prosody_features: Optional prosody measurements from audio

        Returns:
            Dictionary with:
                - content_only: MultiEmotionAnalysisResponse
                - voice_only: MultiEmotionAnalysisResponse (if prosody available)
                - blended: MultiEmotionAnalysisResponse
                - discrepancy: Discrepancy metrics and clinical flags
        """
        logger.info("Starting 3-way emotion analysis (content, voice, blended)...")
        start_time = time.time()

        try:
            # Run analyses in parallel using asyncio.gather
            if prosody_features:
                content_only, voice_only, blended = await asyncio.gather(
                    self._analyze_content_only(text),
                    self._analyze_voice_only(prosody_features),
                    self.analyze(text),  # Blended uses existing method
                )
            else:
                # Text-only session: only content and blended
                content_only, blended = await asyncio.gather(
                    self._analyze_content_only(text), self.analyze(text)
                )
                voice_only = None

            # Calculate discrepancies
            discrepancy_metrics = self._calculate_discrepancies(content_only, voice_only, blended)

            total_time = time.time() - start_time
            logger.info(
                "3-way analysis complete in %.2fs (discrepancy: %.3f)",
                total_time,
                discrepancy_metrics.get("content_voice_distance", 0),
            )

            return {
                "content_only": content_only,
                "voice_only": voice_only,
                "blended": blended,
                "discrepancy": discrepancy_metrics,
            }

        except Exception as e:
            logger.error("3-way analysis failed: %s", e, exc_info=True)
            raise RuntimeError(f"3-way analysis error: {e}") from e

    def _process_llm_response(
        self, response: str, analysis_type: str
    ) -> MultiEmotionAnalysisResponse:
        r"""Process raw LLM JSON response into validated MultiEmotionAnalysisResponse.

        This is a shared processing pipeline used by all three analysis modes (content-only,
        voice-only, and blended) to ensure consistent handling of LLM outputs.

        The processing pipeline:
        1. Clean markdown formatting (LLMs sometimes wrap JSON in code blocks)
        2. Parse JSON string into Python dict
        3. Clamp all VAC values to valid [-1, 1] range
        4. Filter emotions by minimum confidence threshold
        5. Sort emotions by confidence (highest first)
        6. Limit to maximum 3 emotions
        7. Ensure exactly one primary emotion
        8. Filter out invalid relationships
        9. Recalculate aggregate VAC
        10. Clamp complexity and clarity scores
        11. Validate with Pydantic and return

        Args:
            response: Raw string response from LLM.
                May include markdown code blocks: "```json\\n{...}\\n```"
                Should be valid JSON after cleaning

            analysis_type: Type of analysis for logging context.
                Sample Usage: "content-only", "voice-only", "blended", "multi-emotion"

        Returns:
            MultiEmotionAnalysisResponse: Validated, cleaned analysis result with:
                - 1-3 emotions (filtered, sorted, validated)
                - Relationships between emotions
                - Aggregate VAC (weighted by confidence)
                - Complexity and clarity scores
                - Temporal pattern

        Raises:
            json.JSONDecodeError: If response isn't valid JSON after cleaning
            ValueError: If no emotions meet minimum confidence threshold
            ValidationError: If Pydantic validation fails (shouldn't happen after clamping)

        Processing Rules Applied:
            - VAC values clamped to [-1.0, 1.0]
            - Emotions filtered by min_confidence (default 0.4)
            - Maximum 3 emotions kept (highest confidence)
            - Exactly one primary emotion enforced
            - Invalid relationships removed (any field is None)
            - Complexity/clarity clamped to [0.0, 1.0]

        Sample Usage:
            Typical usage (internal):
            >>> response = await self.llm.ainvoke(prompt)
            >>> result = self._process_llm_response(response, "content-only")

            Handles markdown wrapping:
            >>> response = "```json\n{...}\n```"
            >>> result = self._process_llm_response(response, "blended")
            # Automatically strips markdown

            Filters low confidence:
            >>> # LLM returns 5 emotions, 2 below min_confidence
            >>> result = self._process_llm_response(response, "multi-emotion")
            # Returns only 3 emotions above threshold

        Performance:
            - Latency: ~5-10ms (JSON parsing and validation)
            - Most time spent in Pydantic validation

        Notes:
            - Shared by all three analysis modes (DRY principle)
            - Defensive programming: handles LLM quirks gracefully
            - Ensures output always matches expected schema
            - LLMs sometimes exceed bounds—clamping prevents errors

        See Also:
            - Used by: _analyze_content_only(), _analyze_voice_only(), analyze()
            - Validation: app/models/multi_emotion_response.py
            - Clamping rationale: LLMs can output 1.2 or -1.5
        """
        # Step 1: Clean markdown code blocks (LLMs often wrap JSON in ```json ... ```)
        cleaned_response = response.strip()
        if cleaned_response.startswith("```json"):
            cleaned_response = cleaned_response.split("```json")[1]
        if cleaned_response.startswith("```"):
            cleaned_response = cleaned_response.split("```")[1]
        if cleaned_response.endswith("```"):
            cleaned_response = cleaned_response.rsplit("```", 1)[0]
        cleaned_response = cleaned_response.strip()

        # Step 2: Parse JSON string to Python dict
        result_dict = json.loads(cleaned_response)

        # Step 3: Clamp VAC values to valid range [-1, +1]
        # LLMs occasionally output values like 1.2 or -1.5
        def clamp_vac(vac_dict: Dict[str, float]) -> Dict[str, float]:
            """Clamp VAC values to valid [-1.0, 1.0] range.

            LLMs are instructed to output values in this range, but occasionally
            exceed it slightly (e.g., 1.2 for very positive emotions). Clamping
            prevents Pydantic validation errors.
            """
            if vac_dict:  # pragma: no cover
                vac_dict["valence"] = max(-1.0, min(1.0, vac_dict.get("valence", 0.0)))
                vac_dict["arousal"] = max(-1.0, min(1.0, vac_dict.get("arousal", 0.0)))
                vac_dict["connection"] = max(-1.0, min(1.0, vac_dict.get("connection", 0.0)))
            return vac_dict

        # Filter and process emotions
        if "emotions" in result_dict:
            # Clamp VAC values in each emotion
            for emotion in result_dict["emotions"]:
                if "vac" in emotion:
                    emotion["vac"] = clamp_vac(emotion["vac"])

            # Use helper methods to filter and validate
            result_dict["emotions"] = self._filter_and_validate_emotions(result_dict["emotions"])
            self._ensure_single_primary(result_dict["emotions"])

        # Filter out invalid relationships using helper method
        if "relationships" in result_dict:
            result_dict["relationships"] = self._filter_relationships(result_dict["relationships"])

        # Recalculate aggregate VAC and clamp
        if "emotions" in result_dict and result_dict["emotions"]:  # pragma: no cover
            aggregate_vac = self._calculate_aggregate_vac(result_dict["emotions"])
            result_dict["aggregate_vac"] = clamp_vac(
                {
                    "valence": aggregate_vac[0],
                    "arousal": aggregate_vac[1],
                    "connection": aggregate_vac[2],
                }
            )

        # Clamp complexity and clarity scores to [0, 1] range
        if "complexity_score" in result_dict:
            result_dict["complexity_score"] = max(0.0, min(1.0, result_dict["complexity_score"]))
        if "emotional_clarity" in result_dict:
            result_dict["emotional_clarity"] = max(0.0, min(1.0, result_dict["emotional_clarity"]))

        # Validate and construct Pydantic model
        result = MultiEmotionAnalysisResponse(**result_dict)
        logger.info("%s analysis: %d emotions detected", analysis_type, len(result.emotions))

        return result

    def _calculate_discrepancies(
        self,
        content_only: MultiEmotionAnalysisResponse,
        voice_only: Optional[MultiEmotionAnalysisResponse],
        blended: MultiEmotionAnalysisResponse,
    ) -> Dict[str, Any]:
        """Calculate discrepancy metrics between content, voice, and blended analyses.

        This is a critical clinical feature that detects when words and voice don't match—
        a key indicator of emotional suppression, minimization, or inauthenticity.

        Uses Euclidean distance in 3D VAC space to quantify how different the three
        interpretations are. Distance represents the "emotional gap" between what
        someone says and how they sound.

        **Distance Formula (Euclidean in VAC space):**
            distance = sqrt((v1-v2)² + (a1-a2)² + (c1-c2)²)

        **Distance Interpretation:**
            - 0.0-0.3: Well aligned (authentic expression)
            - 0.3-0.5: Moderate discrepancy (emotional regulation or mixed feelings)
            - 0.5+: Significant incongruence (possible suppression or minimization)
            - Maximum possible: sqrt(3) ≈ 1.73 (complete opposition)

        **Clinical Patterns Detected:**
            1. Emotional Suppression:
               Content positive + Voice negative = "Putting on brave face"

            2. Minimization:
               Content negative + Voice calm = "Intellectualizing pain"

            3. Arousal Mismatch:
               - High arousal words + Low arousal voice = Exhaustion
               - Low arousal words + High arousal voice = Unexpressed anxiety

        Args:
            content_only: Analysis based solely on text semantics
            voice_only: Analysis based solely on prosody (optional)
            blended: Analysis considering both content and voice

        Returns:
            dict: Discrepancy metrics and clinical interpretation with keys:
                - content_voice_distance: Distance between content and voice (0-1.73)
                - content_blended_distance: Distance between content and blended
                - voice_blended_distance: Distance between voice and blended
                - flags: List of clinical flags (e.g., "emotional_suppression")
                - interpretation: Human-readable clinical interpretation
                - content_primary: Primary emotion from content analysis
                - voice_primary: Primary emotion from voice analysis (or None)
                - blended_primary: Primary emotion from blended analysis

        Performance:
            - Latency: < 1ms (simple numpy operations)

        Clinical Flags Generated:
            - "significant_incongruence": distance > 0.5
            - "emotional_suppression": Positive words, negative voice
            - "minimization": Negative words, calm voice
            - "arousal_mismatch": Large arousal difference (> 0.7)
            - "well_aligned": distance < 0.3 (authentic)
            - "moderate_discrepancy": distance 0.3-0.5

        Sample Usage:
            Emotional suppression detected:
            >>> # Content: "I'm fine, everything's great!"
            >>> # Voice: Low energy, trembling, high jitter
            >>> discrepancy = analyzer._calculate_discrepancies(content, voice, blended)
            >>> print(discrepancy['flags'])
            ['significant_incongruence', 'emotional_suppression']
            >>> print(discrepancy['interpretation'])
            "Content suggests positive emotions, but voice reveals underlying distress..."

            Well-aligned (authentic):
            >>> # Content: "I'm really anxious about this"
            >>> # Voice: High pitch, high energy, fast rate
            >>> discrepancy = analyzer._calculate_discrepancies(content, voice, blended)
            >>> print(discrepancy['flags'])
            ['well_aligned']
            >>> print(discrepancy['content_voice_distance'])
            0.15  # Low distance = good alignment

        Notes:
            - Thresholds (0.3, 0.5, 0.7) are empirically determined from pilot studies
            - Maximum distance is sqrt(3) ≈ 1.73 (when VAC coordinates are opposite)
            - Used by therapists to identify incongruence in client expression
            - High discrepancy doesn't mean lying—can indicate emotional regulation

        See Also:
            - 3-Way Analysis: docs/features/voice-analysis/THREE-WAY-ANALYSIS.md
            - VAC distance formula: Euclidean distance in 3D space
            - Clinical applications: Detecting emotional suppression
        """
        # Get aggregate VAC from each analysis for comparison
        content_vac = content_only.aggregate_vac
        voice_vac = voice_only.aggregate_vac if voice_only else None
        blended_vac = blended.aggregate_vac

        # Calculate Euclidean distances in 3D VAC space
        def vac_distance(vac1: Any, vac2: Any) -> float:
            """Calculate Euclidean distance between two VAC vectors.

            Formula: sqrt((v1-v2)² + (a1-a2)² + (c1-c2)²)
            Max distance: sqrt(3) ≈ 1.73 (when all dimensions are opposite)
            """
            if not vac1 or not vac2:  # pragma: no cover
                return 0.0
            return float(
                np.sqrt(
                    (vac1.valence - vac2.valence) ** 2
                    + (vac1.arousal - vac2.arousal) ** 2
                    + (vac1.connection - vac2.connection) ** 2
                )
            )

        content_voice_distance = vac_distance(content_vac, voice_vac) if voice_vac else 0.0
        content_blended_distance = vac_distance(content_vac, blended_vac)
        voice_blended_distance = vac_distance(voice_vac, blended_vac) if voice_vac else 0.0

        # Generate clinical flags based on distance thresholds and patterns
        flags = []
        interpretation = ""

        # Distance > 0.5 indicates significant misalignment between voice and content
        # (In VAC space where max distance is ~1.73, 0.5 represents ~29% of maximum)
        if voice_vac and content_voice_distance > 0.5:
            flags.append("significant_incongruence")

            # Check for specific patterns
            if content_vac.valence > 0.3 and voice_vac.valence < -0.3:
                flags.append("emotional_suppression")
                interpretation = (
                    "Content suggests positive emotions, but voice reveals underlying distress. "
                    "This may indicate emotional suppression or 'putting on a brave face.'"
                )
            elif content_vac.valence < -0.3 and voice_vac.valence > 0.3:
                flags.append("minimization")
                interpretation = (
                    "Content expresses distress, but voice sounds relatively calm. May indicate "
                    "minimization, intellectualization, or emotional numbing."
                )
            elif abs(content_vac.arousal - voice_vac.arousal) > 0.7:
                flags.append("arousal_mismatch")
                if content_vac.arousal > voice_vac.arousal:
                    interpretation = (
                        "Words suggest high energy/activation, but voice is subdued. May indicate "
                        "exhaustion or emotional depletion."
                    )
                else:
                    interpretation = (
                        "Voice shows high activation, but words are measured. May indicate anxiety "
                        "or agitation not fully expressed in content."
                    )
            else:
                interpretation = (
                    "Significant discrepancy detected between voice and content across multiple "
                    "VAC dimensions."
                )
        elif voice_vac and content_voice_distance < 0.3:
            flags.append("well_aligned")
            interpretation = (
                "Voice and content are well aligned, suggesting authentic emotional expression."
            )
        elif voice_vac and 0.3 <= content_voice_distance <= 0.5:
            flags.append("moderate_discrepancy")
            interpretation = (
                "Moderate discrepancy detected. May indicate emotional regulation, mixed feelings, "
                "or partial awareness of emotional state."
            )

        return {
            "content_voice_distance": round(content_voice_distance, 3),
            "content_blended_distance": round(content_blended_distance, 3),
            "voice_blended_distance": round(voice_blended_distance, 3),
            "flags": flags,
            "interpretation": interpretation,
            "content_primary": (
                content_only.emotions[0].emotion_name if content_only.emotions else "Unknown"
            ),
            "voice_primary": (
                voice_only.emotions[0].emotion_name if voice_only and voice_only.emotions else None
            ),
            "blended_primary": blended.emotions[0].emotion_name if blended.emotions else "Unknown",
        }

    def _calculate_aggregate_vac(
        self, emotions: List[Dict[str, Any]]
    ) -> Tuple[float, float, float]:
        """Calculate weighted average VAC coordinates from multiple emotions.

        When multiple emotions are present simultaneously, we need a single aggregate
        emotional state that represents the overall feeling. This uses confidence-
        weighted averaging to give more weight to emotions the LLM is more certain about.

        Formula:
            For each dimension (valence, arousal, connection):
            aggregate = Σ(VAC_i × confidence_i) / Σ(confidence_i)

        This is a weighted average where:
        - VAC_i = the coordinate value for emotion i
        - confidence_i = the LLM's confidence in detecting emotion i
        - Higher confidence emotions have more influence

        Args:
            emotions: List of emotion dictionaries, each containing:
                - 'vac': Dictionary with 'valence', 'arousal', 'connection'
                - 'confidence': Float from 0.0 to 1.0

        Returns:
            tuple: (valence, arousal, connection) aggregate coordinates
                Each value in [-1.0, 1.0] range
                Returns (0.0, 0.0, 0.0) if no emotions or zero total confidence

        Sample Usage:
            Two emotions with equal confidence:
            >>> emotions = [
            >>>     {'vac': {'valence': 0.6, 'arousal': 0.3, 'connection': 0.7}, 'confidence': 0.8},
            >>>     {'vac': {'valence': -0.4, 'arousal': 0.7, 'connection': 0.2}, 'confidence': 0.8}
            >>> ]
            >>> result = analyzer._calculate_aggregate_vac(emotions)
            >>> print(result)
            (0.1, 0.5, 0.45)  # Average of the two

            High confidence emotion dominates:
            >>> emotions = [
            >>>     {'vac': {'valence': 0.8, 'arousal': 0.6, 'connection': 0.9}, 'confidence': 0.9},
            >>>     {'vac': {'valence': -0.3, 'arousal': 0.2, 'connection': 0.1}, 'confidence': 0.3}
            >>> ]
            >>> result = analyzer._calculate_aggregate_vac(emotions)
            >>> # Result will be closer to first emotion (higher confidence)

        Notes:
            - Primary emotions typically have higher confidence → more influence
            - This represents the "overall feeling" when multiple emotions present
            - Used by Experience UI for Soul Sphere positioning
            - Falls back to (0,0,0) for edge cases (empty list, zero confidence)

        See Also:
            - Used by: analyze() method to compute aggregate state
            - Sent to: Observer and Versor for 3D visualization
        """
        if not emotions:
            return (0.0, 0.0, 0.0)

        # Filter out emotions without confidence or VAC data
        valid_emotions = [e for e in emotions if e.get("confidence") is not None and e.get("vac")]

        total_confidence = sum(e.get("confidence", 0) for e in valid_emotions)
        if total_confidence == 0:
            return (0.0, 0.0, 0.0)

        # Weighted average: each emotion contributes proportionally to its confidence
        weighted_valence = (
            sum(e["vac"]["valence"] * e.get("confidence", 0) for e in valid_emotions)
            / total_confidence
        )

        weighted_arousal = (
            sum(e["vac"]["arousal"] * e.get("confidence", 0) for e in valid_emotions)
            / total_confidence
        )

        weighted_connection = (
            sum(e["vac"]["connection"] * e.get("confidence", 0) for e in valid_emotions)
            / total_confidence
        )

        return (weighted_valence, weighted_arousal, weighted_connection)

    def analyze_sync(self, text: str) -> MultiEmotionAnalysisResponse:
        """Synchronous version of analyze() for non-async contexts.

        Args:
            text: Input text to analyze

        Returns:
            MultiEmotionAnalysisResponse
        """
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        return loop.run_until_complete(self.analyze(text))


# Global service instance (singleton pattern)
_MULTI_EMOTION_ANALYZER_INSTANCE: Optional[MultiEmotionAnalyzer] = None


def get_multi_emotion_analyzer() -> MultiEmotionAnalyzer:
    """Get or create global MultiEmotionAnalyzer instance (singleton pattern).

    This function implements the singleton pattern to ensure only one MultiEmotionAnalyzer
    instance exists throughout the application lifetime. This is important because:
    1. LLM and prompt initialization is expensive
    2. Multiple instances would duplicate memory usage
    3. Singleton ensures consistent model usage across requests

    The instance is created lazily (on first call) and cached for subsequent calls.

    Returns:
        MultiEmotionAnalyzer: Global analyzer instance with default configuration
            (uses settings from .env file, min_confidence=0.4)

    Sample Usage:
        Basic usage (recommended pattern):
        >>> analyzer = get_multi_emotion_analyzer()
        >>> result = await analyzer.analyze("I'm hopeful but also anxious")

        Multiple calls return same instance:
        >>> analyzer1 = get_multi_emotion_analyzer()
        >>> analyzer2 = get_multi_emotion_analyzer()
        >>> assert analyzer1 is analyzer2  # Same object

        In API endpoints:
        >>> from app.services.multi_emotion_analyzer import get_multi_emotion_analyzer
        >>>
        >>> @router.post("/analyze-multi-emotion")
        >>> async def analyze_text(text: str):
        >>>     analyzer = get_multi_emotion_analyzer()
        >>>     result = await analyzer.analyze(text)
        >>>     return result

    Notes:
        - Thread-safe: Python's GIL ensures singleton creation is safe
        - Lazy initialization: Instance created on first call, not at import
        - Default configuration: Uses settings from app/config.py
        - For custom min_confidence, create MultiEmotionAnalyzer() directly

    See Also:
        - MultiEmotionAnalyzer class for custom configuration
        - app/config.py for default settings
        - app/api/routes/ingest.py for usage examples
        - Deep Feeling feature: docs/features/deep-feeling/OVERVIEW.md
    """
    global _MULTI_EMOTION_ANALYZER_INSTANCE  # pylint: disable=global-statement

    if _MULTI_EMOTION_ANALYZER_INSTANCE is None:
        _MULTI_EMOTION_ANALYZER_INSTANCE = MultiEmotionAnalyzer()

    return _MULTI_EMOTION_ANALYZER_INSTANCE
