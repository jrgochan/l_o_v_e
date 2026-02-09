# Versor Module - VAC to Quaternion Conversion

## Overview

The VAC to Quaternion conversion is the **most critical transformation** in the Versor engine. It maps a 3-dimensional emotional vector into a 4-dimensional rotational orientation.

This conversion must be:
- ✅ Mathematically rigorous (unit quaternions always)
- ✅ Numerically stable (handle edge cases)
- ✅ Performant (part of < 50ms latency budget)
- ✅ Semantically meaningful (preserve emotional interpretation)

## Algorithm Overview

**Input**: VAC vector v = [vₓ, vᵧ, vᵧ] where each component ∈ [-1.0, 1.0]

**Output**: Unit quaternion q = [w, x, y, z]

**Steps**:
1. Validate and clamp input
2. Calculate magnitude (intensity)
3. Handle zero vector (special case)
4. Normalize axis (direction)
5. Calculate rotation angle
6. Construct quaternion
7. Verify unit length

## Step-by-Step Conversion

### Step 1: Input Validation

```python
def validate_vac(v: List[float]) -> List[float]:
    """Validate and clamp VAC components to [-1.0, 1.0]"""
    return [max(-1.0, min(1.0, component)) for component in v]
```

**Rationale**: LLM outputs may have slight floating-point drift (e.g., 1.0001).

### Step 2: Magnitude Calculation

```python
import math

def calculate_magnitude(v: List[float]) -> float:
    """Calculate Euclidean norm"""
    return math.sqrt(v[0]**2 + v[1]**2 + v[2]**2)
```

**Mathematical Formula**:
```
||v|| = √(vₓ² + vᵧ² + vᵧ²)
```

**Range**: [0, √3] ≈ [0, 1.732]

**Interpretation**: Total emotional intensity

### Step 3: Zero Vector Check

```python
EPSILON = 1e-6

if magnitude < EPSILON:
    return Quaternion(w=1.0, x=0.0, y=0.0, z=0.0)  # Identity
```

**Rationale**:
- Prevents division by zero in normalization
- Neutral emotional state = no rotation from baseline
- Identity quaternion represents 0° rotation

### Step 4: Axis Normalization

```python
def normalize_axis(v: List[float], magnitude: float) -> List[float]:
    """Create unit vector pointing in emotion's direction"""
    return [component / magnitude for component in v]
```

**Mathematical Formula**:
```
û = v / ||v|| = [vₓ/||v||, vᵧ/||v||, vᵧ/||v||]
```

**Property**: ||û|| = 1 (unit vector)

### Step 5: Angle Calculation

```python
def calculate_angle(magnitude: float) -> float:
    """Map magnitude [0, √3] to angle [0, π]"""
    max_magnitude = math.sqrt(3)
    return math.pi * (magnitude / max_magnitude)
```

**Mathematical Formula**:
```
θ = π × (||v|| / √3)
```

**Rationale**:
- Magnitude 0.0 → 0° (no rotation)
- Magnitude √3 ≈ 1.732 → 180° (maximum rotation)
- Linear mapping preserves intuitive intensity

### Step 6: Quaternion Construction

```python
def construct_quaternion(axis: List[float], angle: float) -> Quaternion:
    """Build quaternion from axis-angle representation"""
    half_angle = angle / 2
    sin_half = math.sin(half_angle)
    cos_half = math.cos(half_angle)

    return Quaternion(
        w=cos_half,
        x=axis[0] * sin_half,
        y=axis[1] * sin_half,
        z=axis[2] * sin_half
    )
```

**Mathematical Formula**:
```
q = [
    cos(θ/2),
    uₓ × sin(θ/2),
    uᵧ × sin(θ/2),
    uᵧ × sin(θ/2)
]
```

### Step 7: Verification

```python
def verify_unit_quaternion(q: Quaternion, tolerance: float = 1e-6) -> bool:
    """Verify quaternion is unit length"""
    norm = math.sqrt(q.w**2 + q.x**2 + q.y**2 + q.z**2)
    return abs(norm - 1.0) < tolerance
```

## Complete Implementation

```python
# app/core/vac_model.py

import math
from typing import List
from dataclasses import dataclass

EPSILON = 1e-6

@dataclass
class VACVector:
    """Valence-Arousal-Connection vector"""
    valence: float   # [-1.0, 1.0]
    arousal: float   # [-1.0, 1.0]
    connection: float  # [-1.0, 1.0]

    def to_quaternion(self) -> 'Quaternion':
        """
        Convert VAC vector to unit quaternion.

        Returns:
            Unit quaternion in scalar-first notation [w, x, y, z]
        """
        # Step 1: Validate and clamp
        v = self._validate_and_clamp()

        # Step 2: Calculate magnitude
        magnitude = math.sqrt(v[0]**2 + v[1]**2 + v[2]**2)

        # Step 3: Handle zero vector
        if magnitude < EPSILON:
            return Quaternion.identity()

        # Step 4: Normalize axis
        axis = [component / magnitude for component in v]

        # Step 5: Calculate angle
        max_magnitude = math.sqrt(3)
        angle = math.pi * (magnitude / max_magnitude)

        # Step 6: Construct quaternion
        half_angle = angle / 2
        sin_half = math.sin(half_angle)
        cos_half = math.cos(half_angle)

        q = Quaternion(
            w=cos_half,
            x=axis[0] * sin_half,
            y=axis[1] * sin_half,
            z=axis[2] * sin_half
        )

        # Step 7: Verify (in debug mode)
        if __debug__:
            assert self._verify_unit(q), "Quaternion not unit length"

        return q

    def _validate_and_clamp(self) -> List[float]:
        """Validate and clamp VAC components"""
        return [
            max(-1.0, min(1.0, self.valence)),
            max(-1.0, min(1.0, self.arousal)),
            max(-1.0, min(1.0, self.connection))
        ]

    def _verify_unit(self, q: 'Quaternion') -> bool:
        """Verify quaternion is unit length"""
        norm = math.sqrt(q.w**2 + q.x**2 + q.y**2 + q.z**2)
        return abs(norm - 1.0) < EPSILON
```

## Worked Examples

### Example 1: Joy

**Input**: VAC = [0.9, 0.7, 0.8]

**Step-by-step**:
```
1. Validate: [0.9, 0.7, 0.8] (already in range)

2. Magnitude:
   ||v|| = √(0.81 + 0.49 + 0.64) = √1.94 ≈ 1.393

3. Not zero vector (1.393 > 1e-6) → proceed

4. Normalize axis:
   û = [0.9/1.393, 0.7/1.393, 0.8/1.393]
     = [0.646, 0.502, 0.574]

5. Calculate angle:
   θ = π × (1.393 / 1.732) = 2.525 rad ≈ 144.7°

6. Construct quaternion:
   θ/2 = 1.263 rad
   cos(1.263) ≈ 0.306
   sin(1.263) ≈ 0.952

   q = [0.306, 0.646×0.952, 0.502×0.952, 0.574×0.952]
     = [0.306, 0.615, 0.478, 0.546]

7. Verify:
   ||q|| = √(0.094 + 0.378 + 0.229 + 0.298) = √0.999 ≈ 1.0 ✓
```

**Result**: `q_joy = [0.306, 0.615, 0.478, 0.546]`

### Example 2: Shame

**Input**: VAC = [-0.9, -0.1, -1.0]

```
1. Validate: [-0.9, -0.1, -1.0]

2. Magnitude:
   ||v|| = √(0.81 + 0.01 + 1.0) = √1.82 ≈ 1.349

3. Normalize:
   û = [-0.667, -0.074, -0.741]

4. Angle:
   θ = π × (1.349 / 1.732) ≈ 2.446 rad ≈ 140.1°

5. Quaternion:
   θ/2 ≈ 1.223 rad
   cos(1.223) ≈ 0.342
   sin(1.223) ≈ 0.940

   q = [0.342, -0.627, -0.070, -0.697]

6. Verify: ||q|| ≈ 1.0 ✓
```

**Result**: `q_shame = [0.342, -0.627, -0.070, -0.697]`

### Example 3: Neutral State

**Input**: VAC = [0.0, 0.0, 0.0]

```
1. Magnitude: ||v|| = 0

2. Zero vector check: 0 < 1e-6 → TRUE

3. Return identity: [1.0, 0.0, 0.0, 0.0]
```

**Result**: `q_neutral = [1.0, 0.0, 0.0, 0.0]`

## Testing

### Unit Tests

```python
import pytest
import math
from app.core.vac_model import VACVector

def test_neutral_state_identity():
    """Neutral VAC should produce identity quaternion"""
    vac = VACVector(valence=0.0, arousal=0.0, connection=0.0)
    q = vac.to_quaternion()

    assert q.w == 1.0
    assert q.x == 0.0
    assert q.y == 0.0
    assert q.z == 0.0

def test_all_quaternions_unit_length():
    """All conversions must produce unit quaternions"""
    test_cases = [
        [0.9, 0.7, 0.8],    # Joy
        [-0.9, -0.1, -1.0],  # Shame
        [0.5, -0.7, 0.4],    # Calm
        [-0.5, 0.8, -0.2]    # Anger
    ]

    for vac_values in test_cases:
        vac = VACVector(*vac_values)
        q = vac.to_quaternion()

        norm = math.sqrt(q.w**2 + q.x**2 + q.y**2 + q.z**2)
        assert abs(norm - 1.0) < 1e-6, f"Failed for {vac_values}"

def test_clamping_out_of_range():
    """Values > 1.0 should be clamped to 1.0"""
    vac = VACVector(valence=1.5, arousal=0.5, connection=0.5)
    q = vac.to_quaternion()

    # Should clamp to [1.0, 0.5, 0.5] internally
    # Verify result is still unit quaternion
    norm = math.sqrt(q.w**2 + q.x**2 + q.y**2 + q.z**2)
    assert abs(norm - 1.0) < 1e-6
```

## Next Steps

Now that you understand VAC to quaternion conversion:
- **04-transition-calculations.md** - Calculate emotional work
- **05-slerp-interpolation.md** - Generate animation paths
- **06-api-specification.md** - FastAPI endpoints
