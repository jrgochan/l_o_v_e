# Versor Module - Edge Cases and Numerical Stability

## Overview

The Versor must handle edge cases gracefully to ensure robustness in production. This document covers singularities, numerical instabilities, and mitigation strategies.

## Edge Case Catalog

### 1. Zero Vector (Neutral State)

**Condition**: VAC = [0.0, 0.0, 0.0] or ||v|| < ε

**Problem**: Cannot normalize (division by zero)

**Solution**: Return identity quaternion

```python
EPSILON = 1e-6

if magnitude < EPSILON:
    return Quaternion(w=1.0, x=0.0, y=0.0, z=0.0)
```

**Test**:
```python
def test_zero_vector_returns_identity():
    vac = VACVector(0.0, 0.0, 0.0)
    q = vac.to_quaternion()
    
    assert q == Quaternion.identity()
```

### 2. Nearly Zero Vector

**Condition**: 0 < ||v|| < 1e-3 (very small but not zero)

**Problem**: Numerical instability in normalization

**Solution**: Treat as zero if below threshold

```python
NEAR_ZERO_THRESHOLD = 1e-3

if magnitude < NEAR_ZERO_THRESHOLD:
    # Treat as neutral state
    return Quaternion.identity()
```

### 3. Out-of-Range VAC Values

**Condition**: Valence, Arousal, or Connection > 1.0 or < -1.0

**Cause**: LLM floating-point drift or hallucination

**Solution**: Clamp to valid range

```python
def clamp(value: float) -> float:
    return max(-1.0, min(1.0, value))

vac_clamped = [
    clamp(vac.valence),
    clamp(vac.arousal),
    clamp(vac.connection)
]
```

**Test**:
```python
def test_clamping_extreme_values():
    vac = VACVector(valence=5.0, arousal=-10.0, connection=0.5)
    q = vac.to_quaternion()
    
    # Should clamp to [1.0, -1.0, 0.5] and produce valid quaternion
    assert q.magnitude() == pytest.approx(1.0)
```

### 4. Identical Quaternions

**Condition**: q₁ = q₂ (no change)

**Problem**: SLERP with Ω = 0 causes division by zero

**Solution**: Detect and short-circuit

```python
def generate_slerp_path(q1, q2, steps):
    # Check if quaternions are identical
    dot = q1.dot(q2)
    if abs(abs(dot) - 1.0) < 1e-6:
        # No rotation needed - return constant path
        return [q1] * steps
    
    # Normal SLERP...
```

### 5. Opposite Quaternions (Double Cover)

**Condition**: q₁ · q₂ < 0 (long path without correction)

**Problem**: SLERP takes 270° path instead of 90°

**Solution**: Negate one quaternion

```python
if q1.dot(q2) < 0:
    q2 = Quaternion(w=-q2.w, x=-q2.x, y=-q2.y, z=-q2.z)
```

**Test**:
```python
def test_double_cover_shortest_path():
    """Ensure shortest path is taken"""
    q1 = Quaternion(1, 0, 0, 0)
    q2 = Quaternion(-0.7071, -0.7071, 0, 0)  # Opposite representation
    
    q1_corr, q2_corr = ensure_shortest_path(q1, q2)
    
    # After correction, dot should be positive
    assert q1_corr.dot(q2_corr) > 0
```

### 6. Floating-Point Accumulation

**Condition**: Repeated operations cause norm drift

**Problem**: ||q|| = 1.0001 after many operations

**Solution**: Renormalize periodically

```python
def safe_normalize(q: Quaternion, tolerance: float = 1e-6) -> Quaternion:
    """Normalize if needed"""
    norm = q.magnitude()
    
    if abs(norm - 1.0) > tolerance:
        return Quaternion(
            w=q.w / norm,
            x=q.x / norm,
            y=q.y / norm,
            z=q.z / norm
        )
    
    return q  # Already normalized
```

### 7. Arccos Domain Error

**Condition**: Dot product > 1.0 due to floating-point error

**Problem**: math.acos(1.0001) raises ValueError

**Solution**: Clamp to [-1, 1]

```python
def angular_distance(q_trans: Quaternion) -> float:
    w_clamped = max(-1.0, min(1.0, q_trans.w))
    phi = 2 * math.acos(abs(w_clamped))
    return phi
```

### 8. Time Delta = 0

**Condition**: Two states recorded at exact same timestamp

**Problem**: Division by zero in elasticity calculation

**Solution**: Return elasticity = 0

```python
def calculate_elasticity(phi: float, time_delta: float) -> float:
    if time_delta <= 0:
        return 0.0
    return phi / time_delta
```

### 9. NaN/Inf Propagation

**Condition**: Invalid math operation produces NaN or Inf

**Problem**: Corrupts entire calculation pipeline

**Solution**: Validate at every step

```python
def validate_finite(value: float, name: str) -> float:
    """Ensure value is finite (not NaN or Inf)"""
    if not math.isfinite(value):
        raise ValueError(f"{name} is not finite: {value}")
    return value

# Use throughout
magnitude = validate_finite(math.sqrt(...), "magnitude")
angle = validate_finite(math.pi * magnitude, "angle")
```

## Smoothing Filter Edge Cases

### Rapidly Oscillating Inputs

**Condition**: LLM outputs fluctuate wildly (noise)

**Problem**: Soul Sphere "jitters" visually

**Solution**: Low-pass filter

```python
def smooth_transition(
    q_prev: Quaternion,
    q_new: Quaternion,
    alpha: float = 0.1
) -> Quaternion:
    """
    Apply exponential smoothing.
    
    alpha = 0.1: 90% previous, 10% new (heavy smoothing)
    alpha = 0.5: 50/50 blend
    alpha = 1.0: No smoothing (use new)
    """
    return slerp(q_prev, q_new, t=alpha)
```

### Detecting Noise

```python
def is_noisy_input(history: List[float], window: int = 5) -> bool:
    """
    Detect if recent elasticity values indicate noise.
    
    High variance in elasticity = likely noise
    """
    if len(history) < window:
        return False
    
    recent = history[-window:]
    variance = np.var(recent)
    
    return variance > 2.0  # Threshold for "noisy"
```

## Error Handling

### Custom Exceptions

```python
class VersorError(Exception):
    """Base exception"""
    pass

class SingularityError(VersorError):
    """Raised when encountering mathematical singularity"""
    pass

class NumericInstabilityError(VersorError):
    """Raised when numerical operation is unstable"""
    pass

# Usage
try:
    q = vac.to_quaternion()
except SingularityError as e:
    # Log and return neutral state
    logger.warning(f"Singularity encountered: {e}")
    q = Quaternion.identity()
```

### Graceful Degradation

```python
def safe_process_state(vac, previous, time_delta):
    """Process with fallbacks"""
    
    try:
        return engine.process_state(vac, previous, time_delta)
    except SingularityError:
        # Return neutral state
        return neutral_response()
    except NumericInstabilityError:
        # Retry with clamped inputs
        vac_clamped = clamp_vac(vac)
        return engine.process_state(vac_clamped, previous, time_delta)
    except Exception as e:
        # Log and fail gracefully
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Calculation failed")
```

## Testing Edge Cases

### Comprehensive Edge Case Suite

```python
# tests/unit/test_edge_cases.py

def test_zero_magnitude():
    """Handle zero vector"""
    assert VACVector(0, 0, 0).to_quaternion() == Quaternion.identity()

def test_near_zero_magnitude():
    """Handle very small vectors"""
    vac = VACVector(1e-8, 1e-8, 1e-8)
    q = vac.to_quaternion()
    assert q == Quaternion.identity()

def test_max_magnitude():
    """Handle maximum possible magnitude"""
    vac = VACVector(1.0, 1.0, 1.0)
    q = vac.to_quaternion()
    assert q.magnitude() == pytest.approx(1.0)

def test_single_component_nonzero():
    """Handle vectors with only one non-zero component"""
    vac = VACVector(1.0, 0.0, 0.0)
    q = vac.to_quaternion()
    assert q.magnitude() == pytest.approx(1.0)

def test_out_of_range_clamping():
    """Handle values outside [-1, 1]"""
    vac = VACVector(10.0, -10.0, 0.5)
    q = vac.to_quaternion()
    assert q.magnitude() == pytest.approx(1.0)

def test_identical_quaternions_slerp():
    """SLERP with q₁ = q₂"""
    q = Quaternion(1, 0, 0, 0)
    path = generate_slerp_path(q, q, steps=10)
    assert all(p == q for p in path)

def test_opposite_quaternions_slerp():
    """SLERP with q₁ = -q₂ (double cover)"""
    q1 = Quaternion(1, 0, 0, 0)
    q2 = Quaternion(-1, 0, 0, 0)
    
    path = generate_slerp_path(q1, q2, steps=10)
    # Should take short path (both represent identity)
    assert len(path) == 10
```

---

**Congratulations!** You've completed all Versor documentation. The module is ready for implementation with:

✅ Mathematical rigor (quaternion correctness)
✅ Performance targets (< 50ms P99)
✅ Edge case handling (robustness)
✅ Comprehensive testing strategy
✅ Production deployment guides

**Next Steps**: 
1. Implement core math (docs 02-05)
2. Build API layer (docs 01, 06)
3. Write tests (doc 11)
4. Optimize (doc 12)
5. Deploy (doc 10)
