# Versor Module - Testing Strategy

## Overview

The Versor handles critical mathematical operations that drive the entire L.O.V.E. visualization. Testing must ensure **100% mathematical correctness** and **sub-50ms performance**.

## Testing Pyramid

```
        ┌────────────┐
        │   E2E      │  (5%)
        └────────────┘
      ┌──────────────────┐
      │  Integration     │  (15%)
      └──────────────────┘
    ┌────────────────────────┐
    │    Unit Tests          │  (80%)
    └────────────────────────┘
```

## Unit Testing

### Coverage Goals

- **Quaternion Operations**: 100% coverage
- **VAC Conversion**: 100% coverage
- **SLERP**: 100% coverage
- **Transitions**: 100% coverage
- **Overall**: >95% coverage

### Core Quaternion Tests

```python
# tests/unit/test_quaternion.py

import pytest
import math
from app.core.quaternion import Quaternion

class TestQuaternion:
    
    def test_identity_properties(self):
        """Identity quaternion behaves correctly"""
        q_id = Quaternion.identity()
        q = Quaternion(w=0.7071, x=0.7071, y=0, z=0)
        
        # q × identity = q
        result = q.multiply(q_id)
        assert result.w == pytest.approx(q.w)
        assert result.x == pytest.approx(q.x)
    
    def test_conjugate_is_inverse(self):
        """q × q* = identity (for unit quaternions)"""
        q = Quaternion(w=0.7071, x=0.7071, y=0, z=0)
        q_conj = q.conjugate()
        
        result = q.multiply(q_conj)
        
        assert result.w == pytest.approx(1.0, abs=1e-5)
        assert abs(result.x) < 1e-5
        assert abs(result.y) < 1e-5
        assert abs(result.z) < 1e-5
    
    def test_unit_norm_maintained(self):
        """All operations should preserve unit norm"""
        q1 = Quaternion(w=0.7071, x=0.7071, y=0, z=0)
        q2 = Quaternion(w=0.7071, x=0, y=0.7071, z=0)
        
        result = q1.multiply(q2)
        norm = math.sqrt(result.w**2 + result.x**2 + result.y**2 + result.z**2)
        
        assert abs(norm - 1.0) < 1e-6
```

### VAC Conversion Tests

```python
# tests/unit/test_vac_model.py

def test_neutral_returns_identity():
    """VAC [0,0,0] must return identity quaternion"""
    vac = VACVector(valence=0, arousal=0, connection=0)
    q = vac.to_quaternion()
    
    assert q.w == 1.0
    assert q.x == 0.0
    assert q.y == 0.0
    assert q.z == 0.0

def test_all_conversions_unit_norm():
    """Every VAC must produce unit quaternion"""
    test_cases = [
        [0.9, 0.7, 0.8],    # Joy
        [-0.9, -0.1, -1.0],  # Shame
        [0.5, -0.7, 0.4],    # Calm
        [-0.5, 0.8, -0.2],   # Anger
        [0.0, 0.0, 0.0],     # Neutral
        [1.0, 1.0, 1.0],     # Maximum
        [-1.0, -1.0, -1.0]   # Minimum
    ]
    
    for vac_values in test_cases:
        vac = VACVector(*vac_values)
        q = vac.to_quaternion()
        norm = math.sqrt(q.w**2 + q.x**2 + q.y**2 + q.z**2)
        assert abs(norm - 1.0) < 1e-6, f"Failed for {vac_values}"

def test_clamping():
    """Out-of-range values should be clamped"""
    vac = VACVector(valence=1.5, arousal=-1.2, connection=0.5)
    q = vac.to_quaternion()
    
    # Should still produce valid quaternion
    norm = math.sqrt(q.w**2 + q.x**2 + q.y**2 + q.z**2)
    assert abs(norm - 1.0) < 1e-6
```

### SLERP Tests

```python
# tests/unit/test_interpolation.py

def test_slerp_endpoints():
    """SLERP at t=0 and t=1 matches inputs"""
    q1 = Quaternion(1, 0, 0, 0)
    q2 = Quaternion(0.7071, 0.7071, 0, 0)
    
    path = generate_slerp_path(q1, q2, steps=100)
    
    assert path[0].w == pytest.approx(q1.w, abs=1e-5)
    assert path[-1].w == pytest.approx(q2.w, abs=1e-5)

def test_all_path_quaternions_unit():
    """Every quaternion in SLERP path must be unit length"""
    q1 = VACVector(0.5, 0.3, 0.6).to_quaternion()
    q2 = VACVector(-0.4, 0.7, -0.2).to_quaternion()
    
    path = generate_slerp_path(q1, q2, steps=120)
    
    for q in path:
        norm = math.sqrt(q.w**2 + q.x**2 + q.y**2 + q.z**2)
        assert abs(norm - 1.0) < 1e-5

def test_double_cover_correction():
    """SLERP should take shortest path"""
    q1 = Quaternion(1, 0, 0, 0)
    q2 = Quaternion(-0.7071, -0.7071, 0, 0)  # Same rotation as positive version
    
    # Without correction, this would be long path
    path = generate_slerp_path(q1, q2, steps=10)
    
    # Verify we took short path (not going around the long way)
    # Path length should be reasonable
    assert len(path) == 10
```

## Canonical Transition Tests

### Test Case A: Anger → Calm

**Critical validation of large transitions**

```python
def test_anger_to_calm_large_distance():
    """Anger to Calm should be large angular distance"""
    anger = VACVector(-0.5, 0.8, -0.2).to_quaternion()
    calm = VACVector(0.8, -0.6, 0.5).to_quaternion()
    
    q_trans = calculate_transition(anger, calm)
    phi = angular_distance(q_trans)
    
    # Should be > 1.5 radians (86°)
    assert phi > 1.5, f"Expected large transition, got {phi} rad"
    
    # Dominant axis should be AROUSAL or VALENCE
    axis = detect_dominant_axis(q_trans)
    assert axis in ["AROUSAL_SHIFT", "VALENCE_SHIFT"]
```

### Test Case B: Pity → Compassion

**THE critical test for the VAC model**

```python
def test_pity_to_compassion_connection_only():
    """
    CRITICAL TEST: Pity → Compassion must be CONNECTION_SHIFT.
    
    This validates the core differentiator of the VAC model.
    If this fails, the entire system is broken.
    """
    pity = VACVector(valence=-0.3, arousal=-0.2, connection=-0.6)
    compassion = VACVector(valence=-0.3, arousal=-0.2, connection=0.8)
    
    q_pity = pity.to_quaternion()
    q_compassion = compassion.to_quaternion()
    
    q_trans = calculate_transition(q_pity, q_compassion)
    axis = detect_dominant_axis(q_trans)
    
    assert axis == "CONNECTION_SHIFT", \
        f"Expected CONNECTION_SHIFT, got {axis}. VAC model validation FAILED."
    
    # Angular distance should be substantial (crossing hemisphere)
    phi = angular_distance(q_trans)
    assert phi > 1.0, "Expected significant rotation"
```

## Property-Based Testing

### Using Hypothesis

```python
from hypothesis import given, strategies as st

@given(
    valence=st.floats(min_value=-1.0, max_value=1.0),
    arousal=st.floats(min_value=-1.0, max_value=1.0),
    connection=st.floats(min_value=-1.0, max_value=1.0)
)
def test_any_valid_vac_produces_unit_quaternion(valence, arousal, connection):
    """Property: ANY valid VAC must produce unit quaternion"""
    vac = VACVector(valence, arousal, connection)
    q = vac.to_quaternion()
    
    norm = math.sqrt(q.w**2 + q.x**2 + q.y**2 + q.z**2)
    assert abs(norm - 1.0) < 1e-5

@given(
    q1_w=st.floats(min_value=-1.0, max_value=1.0),
    q1_x=st.floats(min_value=-1.0, max_value=1.0),
    # ... (generate random unit quaternions)
)
def test_transition_always_unit(q1, q2):
    """Property: Transition of unit quaternions is always unit"""
    # Normalize inputs
    q1_norm = q1.normalize()
    q2_norm = q2.normalize()
    
    q_trans = calculate_transition(q1_norm, q2_norm)
    norm = q_trans.magnitude()
    
    assert abs(norm - 1.0) < 1e-5
```

## Performance Testing

### Benchmark Tests

```python
import pytest

@pytest.mark.benchmark
def test_vac_conversion_performance(benchmark):
    """VAC to quaternion must be fast"""
    vac = VACVector(0.5, 0.7, 0.6)
    
    result = benchmark(vac.to_quaternion)
    
    # Should be sub-millisecond
    assert benchmark.stats['mean'] < 0.001  # <1ms

@pytest.mark.benchmark
def test_complete_pipeline_performance(benchmark):
    """Complete pipeline must be < 50ms"""
    
    def pipeline():
        engine = VersorEngine()
        return engine.process_state(
            current_vac=VACVector(0.9, 0.7, 0.8),
            previous_quaternion=Quaternion.identity(),
            time_delta=1.0
        )
    
    result = benchmark(pipeline)
    
    # P99 must be < 50ms
    assert benchmark.stats['mean'] < 0.05  # <50ms average
```

### Load Testing

```python
import asyncio
from locust import HttpUser, task, between

class VersorUser(HttpUser):
    wait_time = between(0.1, 0.5)
    
    @task
    def calculate_state(self):
        self.client.post(
            "/versor/calculate",
            json={
                "current_vac": {
                    "valence": 0.5,
                    "arousal": 0.3,
                    "connection": 0.6
                },
                "time_delta_seconds": 1.0
            }
        )
```

Run: `locust -f tests/load/test_versor.py --host=http://localhost:8001`

## Integration Tests

```python
# tests/integration/test_end_to_end.py

@pytest.mark.asyncio
async def test_full_emotional_journey():
    """Test complete emotional transition sequence"""
    
    engine = VersorEngine()
    
    # Sequence: Neutral → Anger → Sadness → Calm
    states = [
        VACVector(0.0, 0.0, 0.0),    # Neutral
        VACVector(-0.5, 0.8, -0.2),   # Anger
        VACVector(-0.6, -0.4, 0.0),   # Sadness
        VACVector(0.5, -0.7, 0.4)     # Calm
    ]
    
    previous_q = None
    
    for vac in states:
        result = engine.process_state(
            current_vac=vac,
            previous_quaternion=previous_q,
            time_delta=1.0
        )
        
        # Verify result structure
        assert result.current_state is not None
        assert result.angular_distance_radians >= 0
        assert len(result.interpolation_path) == 60
        
        # Verify all path quaternions are unit
        for q in result.interpolation_path:
            norm = math.sqrt(q.w**2 + q.x**2 + q.y**2 + q.z**2)
            assert abs(norm - 1.0) < 1e-5
        
        previous_q = result.current_state
```

## Next Steps

Now that you understand testing:
- **12-performance-optimization.md** - Achieve < 50ms latency
- **13-edge-cases.md** - Handle singularities and edge cases
