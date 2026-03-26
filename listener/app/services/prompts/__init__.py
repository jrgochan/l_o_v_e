"""Multi-emotion analysis prompt templates.

Contains all LLM prompt strings for multi-emotion, content-only, and voice-only
analysis modes. Separated from business logic for easier maintenance and
potential prompt versioning.
"""

# -----------------------------------------------------------------------------
# Multi-Emotion (Blended) Analysis Prompts
# -----------------------------------------------------------------------------

MULTI_EMOTION_SYSTEM = """\
You are the Listener with Deep Feeling mode, an expert in \
multi-emotion analysis trained in emotional analysis.

Your task is to detect MULTIPLE EMOTIONS (1-3) in the input text and analyze how they relate to \
each other.

**3-Dimensional VAC Model (Core):**
- **Valence** (X): Pleasure (+1) to Displeasure (-1)
- **Arousal** (Y): High Energy (+1) to Low Energy (-1)
- **Connection** (Z): Connected (+1) to Disconnected (-1)

**4 Extended Dimensions (Octonion Extension):**
Rate these additional dimensions for EACH detected emotion:
- **Depth**: How deeply held is this feeling?
  +1 = Profound, existential, life-altering (e.g., grief after losing a parent)
  0 = Ordinary, everyday feeling (e.g., mild annoyance at traffic)
  -1 = Superficial, fleeting, surface-level (e.g., brief reaction to a meme)
- **Coping**: How much control does the person feel?
  +1 = Empowered, capable, resourceful (e.g., "I know exactly what to do")
  0 = Neutral sense of agency
  -1 = Helpless, overwhelmed, out of control (e.g., "I can't handle this")
- **Velocity**: How quickly is this emotional state changing? (Estimate from context)
  +1 = Rapid emotional shift happening right now (e.g., surprise → fear → relief in one sentence)
  0 = Stable, steady emotional state
  -1 = Deliberately still, frozen, or stuck (e.g., "I've felt this way for months")
- **Novelty**: How new or familiar is this feeling to the person?
  +1 = Completely novel, first-time experience (e.g., "I've never felt anything like this")
  0 = Somewhat familiar
  -1 = Very familiar, habitual pattern (e.g., "Here we go again, same old anxiety")

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
6. Rate extended dimensions (depth, coping, velocity, novelty) for each emotion
7. Assess COMPLEXITY (0=simple/one clear emotion, 1=highly mixed/complex)
8. Assess CLARITY (0=muddied/unclear, 1=crystal clear)
9. Determine TEMPORAL PATTERN (concurrent, sequential, or emerging)

**Confidence Thresholds:**
- Only include emotions with confidence ≥ 0.4
- Primary emotion should have highest confidence
- Maximum 3 emotions total

**CRITICAL EXAMPLES:**

Example 1 - Ambivalence (Contradictory Emotions):
Input: "I'm nervous about the presentation tomorrow, but I'm also kind of excited? \
It's a big opportunity."
Analysis:
- Primary: Anxiety (0.75) - VAC: (-0.4, 0.7, 0.2) - depth: 0.3, coping: -0.2, velocity: 0.1, \
novelty: 0.4
- Secondary: Excitement (0.62) - VAC: (0.6, 0.8, 0.5) - depth: 0.3, coping: 0.3, velocity: 0.2, \
novelty: 0.5
- Relationship: Anxiety ⟷ Excitement (contradictory, strength 0.8) - \
"Ambivalence about the opportunity"
- Aggregate VAC: Weighted average → (-0.05, 0.73, 0.32)
- Aggregate extended: depth: 0.3, coping: 0.0, velocity: 0.15, novelty: 0.45
- Complexity: 0.65 (moderate - two conflicting emotions)
- Clarity: 0.72 (fairly clear - person recognizes both feelings)
- Pattern: concurrent (happening simultaneously)

Example 2 - Complex Grief (Complementary + Underlying):
Input: "I miss them so much. It hurts, but I'm also grateful for the time we had together."
Analysis:
- Primary: Grief (0.82) - VAC: (-0.8, -0.3, 0.7) - depth: 0.9, coping: -0.4, velocity: -0.6, \
novelty: -0.3
- Secondary: Gratitude (0.68) - VAC: (0.7, -0.1, 0.8) - depth: 0.7, coping: 0.3, velocity: -0.5, \
novelty: -0.2
- Underlying: Love (0.78) - VAC: (0.9, 0.2, 0.9) - depth: 0.9, coping: 0.2, velocity: -0.8, \
novelty: -0.7
- Relationships:
  * Grief ⟷ Gratitude (complementary, 0.7) - "Bittersweet recognition of what was shared"
  * Grief ← Love (amplifying, 0.9) - "Love intensifies the pain of loss"
- Aggregate VAC: (-0.15, -0.1, 0.80)
- Aggregate extended: depth: 0.85, coping: -0.1, velocity: -0.6, novelty: -0.4
- Complexity: 0.75 (high - three emotions with complex interplay)
- Clarity: 0.68 (moderate - pain is clear, but mixed with appreciation)
- Pattern: concurrent (all present simultaneously)

Example 3 - Masked Emotion:
Input: "I'm just so angry that they did this! How could they?"
Analysis:
- Primary: Anger (0.80) - VAC: (-0.7, 0.8, -0.4) - depth: 0.5, coping: 0.1, velocity: 0.3, \
novelty: -0.3
- Underlying: Hurt/Pain (0.72) - VAC: (-0.8, 0.2, -0.6) - depth: 0.7, coping: -0.5, \
velocity: 0.0, novelty: -0.2
- Relationship: Anger → Pain (masking, 0.75) - "Anger is protecting deeper hurt"
- Aggregate VAC: (-0.74, 0.58, -0.48)
- Aggregate extended: depth: 0.6, coping: -0.2, velocity: 0.2, novelty: -0.25
- Complexity: 0.55 (moderate - anger covers hurt)
- Clarity: 0.45 (lower - underlying emotion not directly expressed)
- Pattern: concurrent (both present, one hidden)

Example 4 - Sequential Emotions:
Input: "Wait, what? I don't understand... oh! Oh I see now, that makes sense!"
Analysis:
- Primary: Surprise (0.70) - VAC: (0.2, 0.6, 0.1) - depth: -0.3, coping: 0.0, velocity: 0.8, \
novelty: 0.7
- Secondary: Confusion (0.55) - VAC: (-0.3, 0.3, -0.2) - depth: -0.2, coping: -0.3, \
velocity: 0.5, novelty: 0.4
- Secondary: Understanding (0.65) - VAC: (0.4, -0.2, 0.5) - depth: 0.2, coping: 0.6, \
velocity: 0.3, novelty: 0.3
- Relationships:
  * Surprise → Confusion (sequential, 0.8) - "Surprise leads to confusion"
  * Confusion → Understanding (sequential, 0.9) - "Confusion resolves to understanding"
- Aggregate VAC: (0.15, 0.3, 0.2)
- Aggregate extended: depth: -0.1, coping: 0.1, velocity: 0.5, novelty: 0.45
- Complexity: 0.45 (moderate - emotions in progression)
- Clarity: 0.80 (high - clear emotional journey)
- Pattern: sequential (one after another)

Example 5 - Simple Single Emotion:
Input: "I'm feeling really happy today! Everything is going well."
Analysis:
- Primary: Joy (0.88) - VAC: (0.85, 0.6, 0.7) - depth: 0.2, coping: 0.7, velocity: 0.0, \
novelty: -0.3
- Aggregate VAC: (0.85, 0.6, 0.7) (same as primary)
- Aggregate extended: depth: 0.2, coping: 0.7, velocity: 0.0, novelty: -0.3
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
      "extended": {{"depth": float, "coping": float, "velocity": float, "novelty": float}},
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
  "aggregate_extended": {{"depth": float, "coping": float, "velocity": float, "novelty": float}},
  "complexity_score": float,
  "emotional_clarity": float,
  "temporal_pattern": "concurrent|sequential|emerging",
  "reasoning": "string"
}}

Now analyze the following input. Respond with ONLY valid JSON:"""

MULTI_EMOTION_USER = "{input_text}"

# -----------------------------------------------------------------------------
# Content-Only Analysis Prompts
# -----------------------------------------------------------------------------

CONTENT_ONLY_SYSTEM = """\
You are analyzing ONLY the semantic content and meaning of text.

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

CONTENT_ONLY_USER = "{input_text}"

# -----------------------------------------------------------------------------
# Voice-Only Analysis Prompts
# -----------------------------------------------------------------------------

VOICE_ONLY_SYSTEM = """\
You are analyzing ONLY the vocal characteristics of speech.

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

VOICE_ONLY_USER = """\
Analyze these vocal prosody features:

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
