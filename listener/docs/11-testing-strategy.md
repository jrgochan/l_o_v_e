# Listener Module - Testing Strategy

## Overview

The Listener must be tested for both **technical accuracy** (transcription quality) and **semantic validity** (correct VAC extraction). This requires a multi-layered testing approach.

## Testing Pyramid

```
        ┌────────────┐
        │   E2E      │  (10%)
        └────────────┘
      ┌──────────────────┐
      │  Integration     │  (30%)
      └──────────────────┘
    ┌────────────────────────┐
    │    Unit Tests          │  (60%)
    └────────────────────────┘
```

## Semantic Validation Tests

### The Critical Test: Pity vs. Compassion

**THE most important test for the entire system**:

```python
# tests/semantic/test_connection_axis.py

import pytest
from app.services.semantic_analyzer import SemanticAnalyzer

@pytest.mark.asyncio
async def test_pity_vs_compassion():
    """
    CRITICAL TEST: System MUST distinguish Pity from Compassion.

    This validates the Connection axis extraction.
    If this fails, the VAC model is broken.
    """
    analyzer = SemanticAnalyzer()

    # Case A: Pity (feeling FOR, separation)
    pity_text = "I feel sorry for them. They're really struggling."
    result_pity = await analyzer.analyze(pity_text)

    assert result_pity.primary_emotion == "Pity", \
        f"Expected Pity, got {result_pity.primary_emotion}"
    assert result_pity.vac.connection < 0, \
        f"Pity must have negative Connection, got {result_pity.vac.connection}"

    # Case B: Compassion (feeling WITH, connection)
    compassion_text = "I understand their pain. I'm here with them."
    result_compassion = await analyzer.analyze(compassion_text)

    assert result_compassion.primary_emotion == "Compassion", \
        f"Expected Compassion, got {result_compassion.primary_emotion}"
    assert result_compassion.vac.connection > 0.5, \
        f"Compassion must have positive Connection, got {result_compassion.vac.connection}"
```

### Additional Semantic Tests

```python
@pytest.mark.asyncio
async def test_grief_has_positive_connection():
    """Grief should have negative Valence but positive Connection (love)"""
    text = "I miss them so much. The pain of losing them is overwhelming."
    result = await analyzer.analyze(text)

    assert result.vac.valence < -0.5, "Grief has negative Valence"
    assert result.vac.connection > 0.0, "Grief has positive Connection (love)"

@pytest.mark.asyncio
async def test_belonging_vs_fitting_in():
    """Belonging and Fitting In differ on Connection axis"""

    # Belonging
    belonging_text = "I can just be myself here. I'm accepted for who I am."
    result_belonging = await analyzer.analyze(belonging_text)
    assert result_belonging.vac.connection > 0.7

    # Fitting In
    fitting_text = "I have to pretend to be someone I'm not to fit in."
    result_fitting = await analyzer.analyze(fitting_text)
    assert result_fitting.vac.connection < 0
```

## Transcription Quality Tests

### Word Error Rate (WER)

```python
import jiwer

def test_transcription_accuracy():
    """Measure transcription quality"""

    reference = "I am feeling overwhelmed by work deadlines"
    hypothesis = transcription_service.transcribe(audio_path).text

    wer = jiwer.wer(reference, hypothesis)

    assert wer < 0.05, f"WER too high: {wer}"  # < 5% error
```

## Performance Tests

### Edge Latency

```python
def test_edge_transcription_latency():
    """Edge transcription must be < 200ms"""
    import time

    start = time.time()
    result = whisper_service.transcribe(short_audio_path)
    duration = time.time() - start

    assert duration < 0.2, f"Too slow: {duration}s"
```

### Cloud Processing Time

```python
def test_cloud_pipeline_latency():
    """Complete cloud pipeline must be < 3s"""

    duration = await measure_pipeline(audio_path)

    assert duration < 3.0, f"Pipeline too slow: {duration}s"
```

## Next Steps

- **12-performance-optimization.md** - Latency optimization
- **13-security-and-privacy.md** - GDPR compliance
