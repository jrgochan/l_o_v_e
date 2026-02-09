# Observer Module - Quaternion Conversion

## Overview

The Observer is responsible for converting VAC scalars (3 floats) into quaternions (4 floats) that represent emotional orientation in 3D space. This conversion is the most critical data transformation in the L.O.V.E. system.

## Why Quaternions?

Quaternions provide:
- ✅ No gimbal lock (unlike Euler angles)
- ✅ Smooth interpolation (SLERP)
- ✅ Compact representation (4 values vs. 9 for rotation matrix)
- ✅ Metaphorical power (emotional "stuckness" = gimbal lock avoided)

## Mathematical Foundation

### Quaternion Definition

A quaternion `q` is defined as:

```
q = w + xi + yj + zk
```

Where:
- `w` = scalar (real) part
- `x, y, z` = vector (imaginary) parts
- `i, j, k` = imaginary units: i² = j² = k² = ijk = -1

### Unit Quaternions

For rotation, we use **unit quaternions**:

```
||q|| = √(w² + x² + y² + z²) = 1
```

## VAC to Quaternion Conversion Algorithm

### Step-by-Step Process

**Input**: VAC vector `v = [vₓ, vᵧ, vᵢ]` where each component ∈ [-1, 1]

**Output**: Unit quaternion `q = [w, x, y, z]`

#### Step 1: Calculate Magnitude

```python
magnitude = math.sqrt(v_x**2 + v_y**2 + v_z**2)
```

**Interpretation**: Total emotional intensity. Range: [0, √3] ≈ [0, 1.732]

#### Step 2: Handle Neutral State

```python
if magnitude < 0.001:
    # Perfect neutrality → Identity quaternion
    return [1.0, 0.0, 0.0, 0.0]
```

The identity quaternion represents "no rotation" from neutral.

#### Step 3: Normalize Axis

```python
axis = [v_x / magnitude, v_y / magnitude, v_z / magnitude]
```

This creates a **unit vector** pointing in the direction of the emotion.

#### Step 4: Calculate Rotation Angle

Map intensity [0, √3] to rotation angle [0, π]:

```python
max_magnitude = math.sqrt(3)  # Maximum distance in unit cube
angle = (magnitude / max_magnitude) * math.pi
```

**Interpretation**:
- Low intensity → Small rotation from neutral
- Maximum intensity → 180° rotation (opposite of neutral)

#### Step 5: Construct Quaternion

```python
half_angle = angle / 2
sin_half = math.sin(half_angle)
cos_half = math.cos(half_angle)

quaternion = [
    cos_half,              # w
    axis[0] * sin_half,    # x
    axis[1] * sin_half,    # y
    axis[2] * sin_half     # z
]
```

#### Step 6: Verify Unit Length

```python
length = math.sqrt(sum(q**2 for q in quaternion))
assert abs(length - 1.0) < 1e-6, "Quaternion must be unit length"
```

## Complete Implementation

```python
# app/services/quaternion_builder.py

import math
from typing import List
from app.utils.vector_ops import VACVector

class QuaternionBuilder:
    """Converts VAC scalars to unit quaternions"""

    def from_vac(self, vac: VACVector) -> List[float]:
        """
        Convert VAC vector to unit quaternion.

        Args:
            vac: [valence, arousal, connection] each ∈ [-1, 1]

        Returns:
            [w, x, y, z] unit quaternion
        """
        v_x, v_y, v_z = vac

        # Step 1: Calculate magnitude
        magnitude = math.sqrt(v_x**2 + v_y**2 + v_z**2)

        # Step 2: Handle neutral state
        if magnitude < 0.001:
            return [1.0, 0.0, 0.0, 0.0]

        # Step 3: Normalize axis
        axis = [v_x / magnitude, v_y / magnitude, v_z / magnitude]

        # Step 4: Calculate angle
        max_magnitude = math.sqrt(3)
        angle = (magnitude / max_magnitude) * math.pi

        # Step 5: Construct quaternion
        half_angle = angle / 2
        sin_half = math.sin(half_angle)
        cos_half = math.cos(half_angle)

        quaternion = [
            cos_half,
            axis[0] * sin_half,
            axis[1] * sin_half,
            axis[2] * sin_half
        ]

        # Step 6: Verify (optional in production, use in tests)
        if __debug__:
            self._validate_unit_quaternion(quaternion)

        return quaternion

    def _validate_unit_quaternion(self, q: List[float]) -> None:
        """Verify quaternion is unit length"""
        length = math.sqrt(sum(component**2 for component in q))

        if abs(length - 1.0) > 1e-6:
            raise ValueError(
                f"Quaternion not unit length: {length}. "
                f"Expected 1.0 ± 1e-6"
            )
```

## Worked Examples

### Example 1: Joy

**Input**: `vac = [0.9, 0.7, 0.8]`

**Calculation**:
```python
magnitude = √(0.9² + 0.7² + 0.8²) = √(0.81 + 0.49 + 0.64) = √1.94 ≈ 1.393

axis = [0.9/1.393, 0.7/1.393, 0.8/1.393]
     = [0.646, 0.502, 0.574]

angle = (1.393 / 1.732) × π = 0.804 × π ≈ 2.525 radians

half_angle = 1.263 radians
sin(half_angle) ≈ 0.952
cos(half_angle) ≈ 0.306

quaternion = [
    0.306,           # w
    0.646 × 0.952,  # x ≈ 0.615
    0.502 × 0.952,  # y ≈ 0.478
    0.574 × 0.952   # z ≈ 0.546
]
```

**Result**: `q ≈ [0.306, 0.615, 0.478, 0.546]`

**Verification**: `0.306² + 0.615² + 0.478² + 0.546² ≈ 1.0` ✓

### Example 2: Shame

**Input**: `vac = [-0.9, -0.1, -1.0]`

**Calculation**:
```python
magnitude = √(0.9² + 0.1² + 1.0²) = √(0.81 + 0.01 + 1.0) = √1.82 ≈ 1.349

axis = [-0.9/1.349, -0.1/1.349, -1.0/1.349]
     = [-0.667, -0.074, -0.741]

angle = (1.349 / 1.732) × π ≈ 2.446 radians

half_angle = 1.223 radians
sin(half_angle) ≈ 0.940
cos(half_angle) ≈ 0.342

quaternion = [
    0.342,
    -0.667 × 0.940 ≈ -0.627,
    -0.074 × 0.940 ≈ -0.070,
    -0.741 × 0.940 ≈ -0.697
]
```

**Result**: `q ≈ [0.342, -0.627, -0.070, -0.697]`

### Example 3: Neutral State

**Input**: `vac = [0.0, 0.0, 0.0]`

**Result**: `q = [1.0, 0.0, 0.0, 0.0]` (Identity quaternion)

**Interpretation**: No rotation from baseline.

## Using Quaternions in Database

### Storage

```python
from pgvector.sqlalchemy import Vector

class UserTrajectory(Base):
    quaternion_state = Column(Vector(4))  # [w, x, y, z]
```

### Insertion

```python
quaternion = quaternion_builder.from_vac([0.9, 0.7, 0.8])

new_state = UserTrajectory(
    quaternion_state=quaternion  # Automatically converted to pgvector
)
session.add(new_state)
await session.commit()
```

### Retrieval

```python
result = await session.execute(
    select(UserTrajectory).where(UserTrajectory.id == state_id)
)
state = result.scalar_one()

quaternion = state.quaternion_state  # Returns List[float]
w, x, y, z = quaternion
```

## Testing

### Unit Tests

```python
import pytest
import math
from app.services.quaternion_builder import QuaternionBuilder

def test_neutral_state_identity_quaternion():
    """Neutral VAC should produce identity quaternion"""
    builder = QuaternionBuilder()
    q = builder.from_vac([0.0, 0.0, 0.0])

    assert q == [1.0, 0.0, 0.0, 0.0]

def test_unit_length_property():
    """All quaternions must be unit length"""
    builder = QuaternionBuilder()

    test_cases = [
        [0.9, 0.7, 0.8],   # Joy
        [-0.9, -0.1, -1.0], # Shame
        [0.5, -0.7, 0.4],   # Calm
        [-0.5, 0.8, -0.2]   # Anger
    ]

    for vac in test_cases:
        q = builder.from_vac(vac)
        length = math.sqrt(sum(component**2 for component in q))
        assert abs(length - 1.0) < 1e-6, f"Failed for VAC {vac}"

def test_opposite_states_opposite_quaternions():
    """Opposite VAC vectors should produce opposite rotations"""
    builder = QuaternionBuilder()

    q1 = builder.from_vac([0.9, 0.7, 0.8])   # Joy
    q2 = builder.from_vac([-0.9, -0.7, -0.8]) # Opposite

    # Dot product should be negative (opposite orientations)
    dot = sum(a * b for a, b in zip(q1, q2))
    assert dot < 0, "Opposite VAC should produce opposite quaternions"

def test_compassion_pity_different_quaternions():
    """Compassion and Pity must have different quaternions"""
    builder = QuaternionBuilder()

    compassion = builder.from_vac([0.5, 0.2, 0.9])
    pity = builder.from_vac([-0.3, -0.1, -0.7])

    # Should be significantly different
    distance = sum((a - b)**2 for a, b in zip(compassion, pity))
    assert distance > 1.0, "Compassion and Pity too similar"
```

### Property-Based Tests

```python
from hypothesis import given, strategies as st

@given(
    valence=st.floats(min_value=-1.0, max_value=1.0),
    arousal=st.floats(min_value=-1.0, max_value=1.0),
    connection=st.floats(min_value=-1.0, max_value=1.0)
)
def test_all_vac_produce_unit_quaternions(valence, arousal, connection):
    """Property: ANY valid VAC must produce unit quaternion"""
    builder = QuaternionBuilder()
    q = builder.from_vac([valence, arousal, connection])

    length = math.sqrt(sum(c**2 for c in q))
    assert abs(length - 1.0) < 1e-5
```

## Advanced: Quaternion Operations

### Angular Distance

Calculate angle between two quaternions:

```python
def angular_distance(q1: List[float], q2: List[float]) -> float:
    """
    Calculate angular distance between two quaternions.

    Returns: Angle in radians [0, π]
    """
    dot = sum(a * b for a, b in zip(q1, q2))
    dot = max(-1.0, min(1.0, dot))  # Clamp for numerical stability

    return 2 * math.acos(abs(dot))
```

### Quaternion Averaging

For temporal aggregation (decimation):

```python
def average_quaternions(quaternions: List[List[float]]) -> List[float]:
    """
    Average multiple quaternions (weighted by time).

    Note: This is NOT a simple arithmetic mean!
    Uses eigenvalue decomposition for proper quaternion averaging.
    """
    import numpy as np

    # Convert to numpy array
    Q = np.array(quaternions)

    # Compute covariance matrix
    M = Q.T @ Q

    # Find eigenvector with largest eigenvalue
    eigenvalues, eigenvectors = np.linalg.eigh(M)
    avg_quat = eigenvectors[:, -1]

    # Ensure positive w
    if avg_quat[0] < 0:
        avg_quat = -avg_quat

    return avg_quat.tolist()
```

## Next Steps

Now that you understand quaternion conversion:
- **07-metrics-engine.md** - Calculate elasticity and rigidity
- **08-insight-generation.md** - Find similar past moments
- **09-setup-and-installation.md** - Set up development environment
