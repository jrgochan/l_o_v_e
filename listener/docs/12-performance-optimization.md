# Listener Module - Performance Optimization

## Overview

The Listener has dual performance requirements:
- **Edge**: < 200ms for immediate feedback
- **Cloud**: < 3s for complete processing

## Edge Optimization

### whisper.rn Performance

```typescript
// Optimize model selection
const model = Platform.select({
  ios: 'base.en',     // iPhone 11+ can handle base
  android: 'tiny.en'  // More conservative for Android
});

// Enable hardware acceleration
const whisper = await initWhisper({
  filePath: modelPath,
  enableCoreML: true,     // iOS Neural Engine (critical!)
  enableNNAPI: true,      // Android DSP
  speedUp: true           // Slight accuracy trade-off for speed
});
```

### Crude Sentiment Optimization

```typescript
// Use Set for O(1) lookups
const NEGATIVE_SET = new Set(['angry', 'sad', 'terrible', ...]);
const POSITIVE_SET = new Set(['happy', 'great', 'wonderful', ...]);

function fastSentiment(text: string): number {
  const words = text.toLowerCase().split(/\s+/);
  let score = 0;
  
  for (const word of words) {
    if (NEGATIVE_SET.has(word)) score -= 1;
    if (POSITIVE_SET.has(word)) score += 1;
  }
  
  return Math.max(-1, Math.min(1, score / 3));
}
```

## Cloud Optimization

### faster-whisper GPU Configuration

```python
# Use float16 for 2x speedup on modern GPUs
model = WhisperModel(
    "large-v3",
    device="cuda",
    compute_type="float16",  # vs float32
    num_workers=4            # Parallel processing
)
```

### LLM Caching

```python
from functools import lru_cache

@lru_cache(maxsize=1000)
def cached_emotion_analysis(text: str) -> EmotionalClassification:
    """Cache LLM responses for identical inputs"""
    return analyzer.analyze(text)
```

### Batch Processing

```python
async def process_batch(texts: List[str]):
    """Process multiple texts in one LLM call"""
    # Reduces API overhead
    results = await llm.abatch([
        prompt.format(text=t) for t in texts
    ])
    return results
```

## Worker Scaling

```bash
# Scale workers based on load
arq app.workers.audio_processor.WorkerSettings --workers 8

# Or use Kubernetes HPA
kubectl autoscale deployment listener-worker \
  --cpu-percent=70 \
  --min=2 \
  --max=10
```

## Next Steps

Final documentation:
- **13-security-and-privacy.md** - GDPR compliance and data protection
