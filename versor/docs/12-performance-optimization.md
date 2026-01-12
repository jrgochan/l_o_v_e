# Versor Module - Performance Optimization

## Overview

The Versor must achieve **P99 latency < 50ms** to ensure real-time responsiveness. This document provides optimization strategies for mathematical operations and API throughput.

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| VAC → Quaternion | < 1ms | Single conversion |
| Transition Calculation | < 2ms | With angular distance |
| SLERP Generation (60 frames) | < 10ms | Path generation |
| Complete Pipeline | < 50ms | P99 (99th percentile) |
| Throughput | > 1000 req/s | On 2-core instance |

## NumPy Optimization

### 1. Vectorization

```python
# ❌ BAD: Python loops
def normalize_list(vectors: List[List[float]]):
    result = []
    for v in vectors:
        norm = math.sqrt(sum(x**2 for x in v))
        result.append([x/norm for x in v])
    return result

# ✅ GOOD: NumPy vectorization
def normalize_batch(vectors: np.ndarray):
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    return vectors / norms
```

**Speedup**: 10-100x faster for large batches

### 2. Pre-allocation

```python
# ❌ BAD: Growing arrays
path = []
for t in t_values:
    path.append(slerp(t))

# ✅ GOOD: Pre-allocate
path = np.empty((steps, 4), dtype=np.float64)
for i, t in enumerate(t_values):
    path[i] = slerp(t)
```

### 3. Avoid Copies

```python
# ❌ BAD: Creating copies
temp = array.copy()
temp /= norm

# ✅ GOOD: In-place operations
array /= norm  # Modifies in-place
```

## Mathematical Optimization

### 1. Caching Constants

```python
# Pre-compute at module level
SQRT_3 = math.sqrt(3)
PI_OVER_SQRT_3 = math.pi / SQRT_3

def calculate_angle_optimized(magnitude: float) -> float:
    """Use pre-computed constant"""
    return magnitude * PI_OVER_SQRT_3
```

### 2. Fast Trigonometry

```python
# For small angles, use Taylor series approximation
def fast_sin_small_angle(x: float) -> float:
    """Taylor: sin(x) ≈ x - x³/6 for small x"""
    if abs(x) < 0.1:
        return x - (x**3 / 6)
    return math.sin(x)
```

**Caution**: Only use for verified small angles. Accuracy degrades beyond ~0.5 radians.

### 3. Avoid Unnecessary Sqrt

```python
# ❌ BAD: Calculate norm multiple times
norm = math.sqrt(w**2 + x**2 + y**2 + z**2)
if norm != 1.0:
    q_normalized = q / norm

# ✅ GOOD: Calculate once, check squared norm first
norm_squared = w**2 + x**2 + y**2 + z**2
if abs(norm_squared - 1.0) > 1e-12:
    norm = math.sqrt(norm_squared)
    q_normalized = q / norm
```

## Memory Management

### 1. Object Pooling

For high-frequency operations:

```python
from queue import Queue

class QuaternionPool:
    """Reuse quaternion objects"""
    
    def __init__(self, size: int = 100):
        self.pool = Queue(maxsize=size)
        for _ in range(size):
            self.pool.put(Quaternion(1, 0, 0, 0))
    
    def acquire(self) -> Quaternion:
        if self.pool.empty():
            return Quaternion(1, 0, 0, 0)
        return self.pool.get()
    
    def release(self, q: Quaternion):
        if not self.pool.full():
            self.pool.put(q)
```

### 2. Avoid Allocations in Hot Paths

```python
# ❌ BAD: Creates new list every call
def process(vac):
    v = [vac.valence, vac.arousal, vac.connection]
    return calculate(v)

# ✅ GOOD: Reuse buffer
_buffer = np.empty(3, dtype=np.float64)

def process_optimized(vac):
    _buffer[0] = vac.valence
    _buffer[1] = vac.arousal
    _buffer[2] = vac.connection
    return calculate(_buffer)
```

## API-Level Optimization

### 1. Response Compression

```python
from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(GZipMiddleware, minimum_size=1000)
```

**Benefit**: Reduce bandwidth for large SLERP paths

### 2. Async Batching

```python
@router.post("/calculate/batch")
async def calculate_batch(requests: List[StateRequest]):
    """Process multiple requests in one call"""
    
    # Vectorized processing
    results = await asyncio.gather(*[
        engine.process_state_async(req)
        for req in requests
    ])
    
    return results
```

### 3. Response Streaming

For very large paths:

```python
from fastapi.responses import StreamingResponse

@router.post("/slerp/stream")
async def stream_path(request: SLERPRequest):
    """Stream SLERP frames instead of sending all at once"""
    
    async def generate():
        path = generate_slerp_path(...)
        for q in path:
            yield json.dumps(q.dict()) + "\n"
    
    return StreamingResponse(generate(), media_type="application/x-ndjson")
```

## Profiling

### cProfile

```python
import cProfile
import pstats

profiler = cProfile.Profile()
profiler.enable()

# Run operations
for _ in range(1000):
    engine.process_state(vac, None, 1.0)

profiler.disable()
stats = pstats.Stats(profiler)
stats.sort_stats('cumulative')
stats.print_stats(20)
```

### Line Profiler

```python
from line_profiler import LineProfiler

lp = LineProfiler()
lp.add_function(vac_to_quaternion)
lp.add_function(calculate_transition)

lp.enable()
engine.process_state(...)
lp.disable()
lp.print_stats()
```

## Benchmarking

### pytest-benchmark

```python
def test_benchmark_pipeline(benchmark):
    """Benchmark complete pipeline"""
    
    vac = VACVector(0.9, 0.7, 0.8)
    prev = Quaternion.identity()
    
    result = benchmark(
        lambda: VersorEngine().process_state(vac, prev, 1.0)
    )
    
    # Verify P99 < 50ms
    assert benchmark.stats['max'] < 0.05
```

## Performance Checklist

Before production:

- [ ] All quaternion operations use NumPy where possible
- [ ] No unnecessary square root calculations
- [ ] Constants pre-computed at module level
- [ ] SLERP uses SciPy (optimized C implementation)
- [ ] Response compression enabled
- [ ] Memory allocations minimized in hot paths
- [ ] Profiling shows no obvious bottlenecks
- [ ] Benchmark tests pass (< 50ms P99)
- [ ] Load testing shows > 1000 req/s capacity

## Next Steps

Final document:
- **13-edge-cases.md** - Handle zero vectors, singularities, numerical stability
