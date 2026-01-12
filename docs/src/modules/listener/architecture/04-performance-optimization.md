# Performance Optimization

**Reading Time:** ~30 minutes  
**Audience:** Senior developers, performance engineers  
**Prerequisites:** [Prompt Engineering](03-prompt-engineering.md)  
**Goal:** Optimize Listener performance for production scale

---

## Performance Baseline

### Current Metrics (M1 MacBook Pro, 2021)

| Component | Latency | Target | Status |
|-----------|---------|--------|--------|
| Transcription (10s audio) | ~480ms | < 500ms | ✅ |
| Semantic Analysis | ~1.5s | < 2s | ✅ |
| PII Scrubbing | ~45ms | < 100ms | ✅ |
| Observer Integration | ~50ms | < 100ms | ✅ |
| **Total Pipeline** | **~2.1s** | **< 3s** | ✅ |

**Throughput:** ~28 requests/minute (single instance)

---

## Bottleneck Analysis

### Profiling the Pipeline

```python
import time
from contextlib import contextmanager

@contextmanager
def timer(name: str):
    """Context manager for timing code blocks"""
    start = time.time()
    yield
    elapsed = time.time() - start
    logger.info(f"⏱️  {name}: {elapsed:.3f}s")

async def analyze_with_profiling(text: str):
    """Profile each step of the pipeline"""
    
    with timer("Total Pipeline"):
        with timer("Semantic Analysis"):
            emotion = await semantic_analyzer.analyze(text)
        
        with timer("PII Scrubbing"):
            sanitized = pii_scrubber.scrub(text)
        
        with timer("Observer Integration"):
            await observer_client.record_state(...)
    
    return emotion
```

**Output:**

```text
⏱️  Semantic Analysis: 1.523s    (72% of total)
⏱️  PII Scrubbing: 0.042s        (2% of total)
⏱️  Observer Integration: 0.053s (2.5% of total)
⏱️  Total Pipeline: 2.118s
```

**Conclusion:** LLM inference is the bottleneck (expected).

---

## Optimization Strategies

### 1. LLM Model Selection

**Trade-off:** Speed vs. Accuracy

| Model | Size | Latency | Accuracy | Connection MAE |
|-------|------|---------|----------|----------------|
| phi-3:mini | 2.7GB | ~600ms | 85% | 0.28 |
| llama3.1:8b-q4_0 | 4.7GB | ~1.5s | 91% | 0.18 |
| llama3.1:8b-q8_0 | 8.5GB | ~2.2s | 93% | 0.15 |
| llama3.1:70b | 40GB | ~8s | 96% | 0.12 |

**Recommendation:**

- **Development:** phi-3:mini (fast iterations)
- **Production:** llama3.1:8b-q4_0 (balanced)
- **Critical use:** llama3.1:70b (GPU required)

### 2. GPU Acceleration

**Impact:** 5-10x speedup on inference

```bash
# Install CUDA (if NVIDIA GPU available)
# Ollama automatically uses GPU if available

# Check GPU usage
nvidia-smi

# Expected: Ollama process using GPU memory
```

**Benchmark:**

| Hardware | Model | Latency |
|----------|-------|---------|
| M1 Mac (CPU) | llama3.1:8b | ~1.5s |
| RTX 4090 (GPU) | llama3.1:8b | ~200ms |
| A100 (GPU) | llama3.1:70b | ~800ms |

**ROI:** GPU instances cost more, but throughput increases dramatically.

---

### 3. Prompt Length Optimization

**Current prompt:** ~1000 tokens

```python
def optimize_prompt_length():
    """Reduce prompt size while maintaining accuracy"""
    
    # Strategy 1: Consolidate examples
    # From 6 examples → 4 examples (keep critical ones)
    essential_examples = [
        pity_example,        # Teaches separation
        compassion_example,  # Teaches connection
        grief_example,       # Edge case (neg + pos)
        loneliness_example   # Extreme disconnection
    ]
    
    # Strategy 2: Shorten explanations
    # From: "The Connection axis is CRITICAL and novel. It measures..."
    # To: "Connection (+1 to -1): Relational alignment vs. separation"
    
    # Strategy 3: Remove redundancy
    # Combine Role + Task into one section
```

**Impact:**

- Prompt: 1000 → 650 tokens (-35%)
- Latency: 1.5s → 1.1s (-27%)
- Accuracy: 91% → 89% (-2%)

**Decision:** Keep current prompt (accuracy worth the cost)

---

### 4. Result Caching

**Strategy:** Cache analyses for common inputs

```python
from functools import lru_cache
import hashlib

class CachedSemanticAnalyzer(SemanticAnalyzer):
    """Semantic analyzer with result caching"""
    
    def __init__(self, cache_size: int = 256):
        super().__init__()
        self.cache = {}
        self.cache_size = cache_size
        self.hits = 0
        self.misses = 0
    
    async def analyze(self, text: str) -> EmotionalClassification:
        # Generate cache key
        cache_key = hashlib.md5(text.encode()).hexdigest()
        
        # Check cache
        if cache_key in self.cache:
            self.hits += 1
            logger.debug(f"Cache hit! ({self.hits}/{self.hits + self.misses})")
            return self.cache[cache_key]
        
        # Cache miss - perform analysis
        self.misses += 1
        result = await super().analyze(text)
        
        # Store in cache (with size limit)
        if len(self.cache) >= self.cache_size:
            # Evict oldest entry (FIFO)
            oldest_key = next(iter(self.cache))
            del self.cache[oldest_key]
        
        self.cache[cache_key] = result
        
        return result
    
    def get_stats(self):
        """Get cache statistics"""
        total = self.hits + self.misses
        hit_rate = self.hits / total if total > 0 else 0
        return {
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate": hit_rate,
            "cache_size": len(self.cache)
        }
```

**When to use:**

- Demo environments (same phrases repeated)
- Testing (deterministic inputs)
- Common greetings/phrases

**When NOT to use:**

- Production (unique user inputs)
- Privacy-sensitive environments (caching personal data)

---

### 5. Batch Processing

**Strategy:** Process multiple texts concurrently

```python
async def analyze_batch(
    texts: List[str],
    max_concurrent: int = 5
) -> List[EmotionalClassification]:
    """
    Process multiple texts concurrently with controlled parallelism.
    
    Args:
        texts: List of texts to analyze
        max_concurrent: Max number of concurrent LLM calls
    
    Returns:
        List of EmotionalClassification results
    """
    semaphore = asyncio.Semaphore(max_concurrent)
    
    async def bounded_analyze(text: str):
        async with semaphore:
            return await analyzer.analyze(text)
    
    # Execute with bounded concurrency
    results = await asyncio.gather(*[
        bounded_analyze(text) for text in texts
    ])
    
    return results

# Usage
texts = ["I'm happy", "I'm sad", "I'm anxious", ...]
results = await analyze_batch(texts, max_concurrent=5)

# Throughput: 5 concurrent * (1 / 1.5s) = ~3.3 analyses/second
# vs Sequential: 1 / 1.5s = ~0.67 analyses/second
# Speedup: 5x
```

**Caveat:** Limited by Ollama's concurrent request handling.

---

### 6. Connection Pooling

**Strategy:** Reuse HTTP connections to Ollama

```python
import httpx

class OptimizedOllamaClient:
    """Ollama client with connection pooling"""
    
    def __init__(self):
        self.client = httpx.AsyncClient(
            base_url="http://localhost:11434",
            timeout=30.0,
            limits=httpx.Limits(
                max_keepalive_connections=10,
                max_connections=20,
                keepalive_expiry=30.0
            )
        )
    
    async def generate(self, prompt: str):
        response = await self.client.post(
            "/api/generate",
            json={"model": "llama3.1:8b", "prompt": prompt}
        )
        return response.json()
    
    async def close(self):
        await self.client.aclose()
```

**Impact:**

- Avoids TCP handshake overhead
- Reuses connections
- ~5-10% latency reduction

---

### 7. Model Quantization

**Strategy:** Use lower-precision models

| Quantization | Size | Speed | Accuracy |
|--------------|------|-------|----------|
| q4_0 | 4.7GB | 1.0x (baseline) | 91% |
| q5_0 | 5.5GB | 0.9x (10% slower) | 92% |
| q8_0 | 8.5GB | 0.7x (30% slower) | 93% |
| fp16 | 15GB | 0.5x (50% slower) | 95% |

**Current choice:** q4_0 (good balance)

**When to upgrade:**

- GPU available → use q8_0 or fp16
- Accuracy critical → use q8_0
- Speed critical → use q4_0 or lower

---

## Horizontal Scaling

### Load Balancer + Multiple Instances

```text
         Load Balancer
              |
    +---------+---------+
    |         |         |
Listener  Listener  Listener
(Instance (Instance (Instance
   1)        2)        3)
    |         |         |
    +---------+---------+
              |
          Redis Queue
              |
    +---------+---------+
    |         |         |
 Worker    Worker    Worker
    1         2         3
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: listener
spec:
  replicas: 3  # Scale to 3 instances
  template:
    spec:
      containers:
      - name: listener
        image: listener:latest
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
---
apiVersion: v1
kind: Service
metadata:
  name: listener-service
spec:
  selector:
    app: listener
  ports:
  - port: 8002
    targetPort: 8002
  type: LoadBalancer
```

**Throughput:**

- 1 instance: ~28 req/min
- 3 instances: ~84 req/min
- 10 instances: ~280 req/min

---

## Resource Optimization

### Memory Management

```python
import gc
import psutil

def check_memory_usage():
    """Monitor memory consumption"""
    process = psutil.Process()
    memory_mb = process.memory_info().rss / 1024 / 1024
    
    logger.info(f"Memory usage: {memory_mb:.1f} MB")
    
    if memory_mb > 4000:  # > 4GB
        logger.warning("High memory usage, triggering garbage collection")
        gc.collect()
```

### Model Loading

```python
class LazyTranscriptionService(TranscriptionService):
    """Load Whisper model only when needed"""
    
    def _load_model(self):
        if self._model_loaded:
            return
        
        logger.info("Loading Whisper model...")
        self._model = whisper.load_model(self.model_size)
        self._model_loaded = True
    
    def transcribe(self, audio_path: str):
        self._load_model()  # Lazy loading
        return super().transcribe(audio_path)
```

**Benefit:** Faster startup, lower idle memory

---

## Database Query Optimization

### Observer Integration

```python
# Current (synchronous)
await observer_client.record_state(...)  # Blocks

# Optimized (fire-and-forget)
asyncio.create_task(observer_client.record_state(...))
# Don't wait for response
```

**Impact:** -50ms per request

---

## Monitoring & Profiling

### Application Performance Monitoring (APM)

```python
from prometheus_client import Histogram, Counter

# Metrics
analysis_latency = Histogram(
    'listener_analysis_latency_seconds',
    'Semantic analysis latency',
    buckets=[0.5, 1.0, 1.5, 2.0, 3.0, 5.0]
)

llm_calls = Counter(
    'listener_llm_calls_total',
    'Total LLM inference calls',
    ['model', 'status']
)

# Usage
@analysis_latency.time()
async def analyze(self, text: str):
    try:
        result = await self._analyze(text)
        llm_calls.labels(model=self.model, status='success').inc()
        return result
    except Exception:
        llm_calls.labels(model=self.model, status='error').inc()
        raise
```

### Profiling with cProfile

```python
import cProfile
import pstats

def profile_analysis():
    """Profile semantic analysis"""
    profiler = cProfile.Profile()
    profiler.enable()
    
    # Run analysis
    analyzer = get_semantic_analyzer()
    result = analyzer.analyze_sync("I'm feeling happy!")
    
    profiler.disable()
    
    # Print stats
    stats = pstats.Stats(profiler)
    stats.sort_stats('cumulative')
    stats.print_stats(20)  # Top 20 functions
```

**Look for:**

- Functions taking > 100ms
- Unexpected bottlenecks
- Opportunities for caching

---

## Scaling Strategies

### Vertical Scaling (Bigger Machine)

**Current:** 8-core M1, 16GB RAM  
**Upgraded:** 16-core, 32GB RAM

**Expected improvement:** ~30-40% (diminishing returns)

### Horizontal Scaling (More Machines)

**Current:** 1 instance = ~28 req/min  
**Scaled:** 10 instances = ~280 req/min

**Linear scaling!** (stateless service)

### GPU Scaling

**Current:** CPU inference = ~1.5s  
**With GPU:** GPU inference = ~200ms

**7.5x speedup!** (significant)

---

## Cost Analysis

### Resource Requirements

| Configuration | CPU | RAM | GPU | $/month | Throughput |
|---------------|-----|-----|-----|---------|------------|
| **Basic** | 2 cores | 4GB | None | $20 | 28 req/min |
| **Standard** | 4 cores | 8GB | None | $40 | 56 req/min |
| **GPU** | 4 cores | 16GB | T4 | $150 | 300 req/min |
| **High-end** | 8 cores | 32GB | A100 | $500 | 1200 req/min |

### Cost Per Analysis

```python
# CPU-only (Standard config)
cost_per_month = $40
requests_per_month = 56 * 60 * 24 * 30 = 2,419,200
cost_per_request = $40 / 2,419,200 = $0.0000165

# GPU (T4 config)
cost_per_month = $150
requests_per_month = 300 * 60 * 24 * 30 = 12,960,000
cost_per_request = $150 / 12,960,000 = $0.0000116

# For comparison: OpenAI API
cost_per_request_gpt4 = $0.02  # ~1700x more expensive!
```

**Conclusion:** Local inference is dramatically cheaper at scale.

---

## Optimization Checklist

### Quick Wins (< 1 hour implementation)

- [ ] Enable connection pooling to Ollama
- [ ] Add result caching for demo/test environments
- [ ] Fire-and-forget Observer integration
- [ ] Use lazy loading for Whisper model
- [ ] Enable Ollama's GPU support (if available)

### Medium Effort (1-3 hours)

- [ ] Implement batch processing endpoint
- [ ] Add Prometheus metrics
- [ ] Set up profiling in production
- [ ] Optimize prompt length (remove redundancy)
- [ ] Implement request rate limiting

### Long-term (1-2 days)

- [ ] Multi-model ensemble with adaptive selection
- [ ] Implement streaming responses
- [ ] Add Redis caching layer
- [ ] Set up horizontal scaling with K8s
- [ ] Optimize Docker image size

---

## Performance Testing

### Load Testing with Locust

```python
# locustfile.py
from locust import HttpUser, task, between

class ListenerUser(HttpUser):
    wait_time = between(1, 3)
    
    @task(3)  # Weight: 3x more common
    def analyze_text(self):
        self.client.post(
            "/listener/analyze",
            data={
                "text": "I'm feeling overwhelmed but hopeful",
                "user_id": "test",
                "session_id": "test"
            }
        )
    
    @task(1)  # Weight: 1x
    def analyze_audio(self):
        with open("test_audio.wav", "rb") as f:
            self.client.post(
                "/listener/analyze-audio",
                files={"audio": f},
                data={"user_id": "test", "session_id": "test"}
            )
```

**Run load test:**

```bash
locust -f locustfile.py --host=http://localhost:8002

# Test with 100 concurrent users
# Measure: latency, throughput, error rate
```

---

## Key Takeaways

✅ **Bottleneck:** LLM inference (~72% of latency)  
✅ **Quick wins:** Connection pooling, caching, GPU  
✅ **Scaling:** Horizontal scaling is effective (stateless)  
✅ **Cost:** $0.000012 per analysis (vs. $0.02 for GPT-4)  
✅ **GPU impact:** 7.5x speedup  
✅ **Monitor:** Use Prometheus metrics in production  

---

**Next:** [Extending the Listener →](05-extending-listener.md)
