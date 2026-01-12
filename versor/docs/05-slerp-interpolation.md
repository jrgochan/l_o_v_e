# Versor Module - SLERP Interpolation

## Overview

**SLERP** (Spherical Linear Interpolation) generates smooth animation paths between emotional states. The Versor creates 60-120 intermediate quaternions that the Experience module uses to animate the Soul Sphere's rotation.

## Why SLERP?

### The Problem with LERP

**Linear Interpolation (LERP)**:
```
q(t) = (1-t)q₁ + tq₂
```

**Problems**:
- ❌ Cuts through the interior of the 4D hypersphere
- ❌ Results in non-unit quaternions: ||q(t)|| < 1 for t ∈ (0,1)
- ❌ Variable angular velocity (speeds up in middle, slows at ends)
- ❌ Not a valid rotation

**Visual**:
```
LERP: start --------→ end  (straight line, wrong!)
```

### SLERP: The Correct Solution

**Spherical Linear Interpolation**:
```
SLERP(q₁, q₂, t) = [sin((1-t)Ω) / sin(Ω)]q₁ + [sin(tΩ) / sin(Ω)]q₂
```

**Benefits**:
- ✅ Follows the surface of the 4D hypersphere (geodesic)
- ✅ Maintains unit length: ||SLERP(q₁, q₂, t)|| = 1
- ✅ Constant angular velocity
- ✅ Shortest path (with double-cover correction)

**Visual**:
```
SLERP: start ~~~⌒~~→ end  (arc on sphere, correct!)
```

## SLERP Formula

### Complete Formula

```
SLERP(q₁, q₂, t) = [sin((1-t)Ω) / sin(Ω)]q₁ + [sin(tΩ) / sin(Ω)]q₂
```

Where:
- `t` ∈ [0, 1] = interpolation parameter
- `Ω` = angle between quaternions
- `cos(Ω) = q₁ · q₂` (dot product)

### Properties

1. **Endpoints**:
   - SLERP(q₁, q₂, 0) = q₁
   - SLERP(q₁, q₂, 1) = q₂

2. **Midpoint**:
   - SLERP(q₁, q₂, 0.5) = geodesic midpoint

3. **Unit Norm**:
   - ||SLERP(q₁, q₂, t)|| = 1 for all t

4. **Constant Velocity**:
   - dφ/dt = constant

## Double-Cover Correction

### The Problem

Quaternions q and -q represent the same rotation, but:
- If q₁ · q₂ > 0: Short path (< 180°)
- If q₁ · q₂ < 0: Long path (> 180°)

### The Solution

```python
def ensure_shortest_path(q1: Quaternion, q2: Quaternion) -> Tuple[Quaternion, Quaternion]:
    """
    Ensure SLERP takes the shortest path.
    
    If dot product is negative, negate one quaternion.
    """
    dot = q1.dot(q2)
    
    if dot < 0:
        # Negate q2 to ensure short path
        q2 = Quaternion(w=-q2.w, x=-q2.x, y=-q2.y, z=-q2.z)
    
    return q1, q2
```

**Critical**: Without this, a 90° rotation might animate as 270°!

## Path Generation

### Algorithm

```python
# app/core/interpolation.py

import numpy as np
from scipy.spatial.transform import Rotation as R, Slerp
from typing import List
from app.utils.scipy_adapter import love_to_scipy, scipy_to_love

def generate_slerp_path(
    q_start: Quaternion,
    q_target: Quaternion,
    steps: int = 60
) -> List[Quaternion]:
    """
    Generate SLERP interpolation path.
    
    Args:
        q_start: Starting quaternion
        q_target: Target quaternion
        steps: Number of intermediate frames (default: 60 for 60fps)
    
    Returns:
        List of quaternions representing the path
    """
    # 1. Ensure shortest path (double-cover correction)
    q_start_corrected, q_target_corrected = ensure_shortest_path(q_start, q_target)
    
    # 2. Convert to SciPy format (scalar-last)
    q_start_scipy = love_to_scipy(q_start_corrected)
    q_target_scipy = love_to_scipy(q_target_corrected)
    
    # 3. Create Rotation objects
    rotations = R.from_quat([q_start_scipy, q_target_scipy])
    
    # 4. Create Slerp interpolator
    times = np.array([0.0, 1.0])
    slerp = Slerp(times, rotations)
    
    # 5. Generate interpolation points
    t_values = np.linspace(0, 1, steps)
    interpolated_rotations = slerp(t_values)
    
    # 6. Convert back to L.O.V.E. format
    path = []
    for rotation in interpolated_rotations:
        q_scipy = rotation.as_quat()  # Returns [x,y,z,w]
        q_love = scipy_to_love(q_scipy)
        path.append(q_love)
    
    return path
```

### Example: Generate 5-Frame Path

**Input**:
- Start: [1, 0, 0, 0] (identity)
- Target: [0.7071, 0.7071, 0, 0] (90° around X)
- Steps: 5

**Output**:
```
t=0.00: [1.0000, 0.0000, 0.0000, 0.0000] (0°)
t=0.25: [0.9808, 0.1951, 0.0000, 0.0000] (22.5°)
t=0.50: [0.9239, 0.3827, 0.0000, 0.0000] (45°)
t=0.75: [0.8315, 0.5556, 0.0000, 0.0000] (67.5°)
t=1.00: [0.7071, 0.7071, 0.0000, 0.0000] (90°)
```

**Verification**: All quaternions are unit length ✓

## Smoothing Filter (Optional)

### Purpose

Dampen high-frequency noise from LLM outputs.

### Low-Pass Filter

```python
def smooth_transition(
    q_prev: Quaternion,
    q_new: Quaternion,
    alpha: float = 0.1
) -> Quaternion:
    """
    Apply low-pass filter to reduce jitter.
    
    Args:
        q_prev: Previous quaternion (smoothed)
        q_new: New quaternion (raw from LLM)
        alpha: Smoothing factor [0, 1]
            - 0.0 = no change (use previous)
            - 1.0 = no smoothing (use new)
            - 0.1 = recommended (90% old, 10% new)
    
    Returns:
        Smoothed quaternion
    """
    # Use SLERP for smoothing
    path = generate_slerp_path(q_prev, q_new, steps=2)
    
    # Or directly:
    q_prev_corrected, q_new_corrected = ensure_shortest_path(q_prev, q_new)
    
    # Manual SLERP at t=alpha
    dot = q_prev_corrected.dot(q_new_corrected)
    omega = np.arccos(np.clip(dot, -1.0, 1.0))
    
    if abs(omega) < 1e-6:
        # Quaternions are nearly identical
        return q_prev
    
    sin_omega = np.sin(omega)
    w1 = np.sin((1 - alpha) * omega) / sin_omega
    w2 = np.sin(alpha * omega) / sin_omega
    
    return Quaternion(
        w=w1 * q_prev_corrected.w + w2 * q_new_corrected.w,
        x=w1 * q_prev_corrected.x + w2 * q_new_corrected.x,
        y=w1 * q_prev_corrected.y + w2 * q_new_corrected.y,
        z=w1 * q_prev_corrected.z + w2 * q_new_corrected.z
    )
```

## Testing

### Unit Tests

```python
def test_slerp_endpoints():
    """SLERP at t=0 and t=1 should match inputs"""
    q1 = Quaternion(1, 0, 0, 0)
    q2 = Quaternion(0.7071, 0.7071, 0, 0)
    
    path = generate_slerp_path(q1, q2, steps=10)
    
    # First frame = q1
    assert path[0].w == pytest.approx(q1.w, abs=1e-5)
    
    # Last frame = q2
    assert path[-1].w == pytest.approx(q2.w, abs=1e-5)

def test_all_path_quaternions_unit():
    """All quaternions in path must be unit length"""
    q1 = VACVector(0.5, 0.3, 0.6).to_quaternion()
    q2 = VACVector(-0.4, 0.7, -0.2).to_quaternion()
    
    path = generate_slerp_path(q1, q2, steps=100)
    
    for q in path:
        norm = math.sqrt(q.w**2 + q.x**2 + q.y**2 + q.z**2)
        assert abs(norm - 1.0) < 1e-5
```

## Next Steps

Now that you understand SLERP:
- **06-api-specification.md** - FastAPI endpoints
- **07-scipy-integration.md** - Scalar convention adapter
- **08-metrics-and-insights.md** - Complete metrics system
