# Versor Module - SciPy Integration

## Overview

The Versor uses SciPy for robust SLERP implementation, but there's a critical convention mismatch:
- **L.O.V.E. Convention**: Scalar-first `[w, x, y, z]`
- **SciPy Convention**: Scalar-last `[x, y, z, w]`

The **SciPy Adapter** handles this translation, ensuring internal consistency while leveraging SciPy's battle-tested algorithms.

## The Convention Problem

### Historical Context

Different quaternion libraries use different component ordering:

| Library | Convention | Example |
|---------|-----------|---------|
| Mathematical Literature | Scalar-first | [w, x, y, z] |
| L.O.V.E. Project | Scalar-first | [w, x, y, z] |
| SciPy | Scalar-last | [x, y, z, w] |
| Unity3D | Scalar-last | [x, y, z, w] |
| Unreal Engine | Scalar-last | [x, y, z, w] |

**Why SciPy Uses Scalar-Last**:
- Matches common 3D graphics libraries
- Vector components grouped together
- Historical convention in robotics

**Why L.O.V.E. Uses Scalar-First**:
- Matches mathematical notation (q = w + xi + yj + zk)
- Aligns with SRS specification
- Clearer conceptual separation (scalar vs. vector parts)

## Adapter Pattern

### Purpose

The adapter provides a **clean interface** between L.O.V.E.'s internal representation and SciPy's library functions.

### Implementation

```python
# app/utils/scipy_adapter.py

import numpy as np
from scipy.spatial.transform import Rotation as R
from app.core.quaternion import Quaternion

def love_to_scipy(q: Quaternion) -> np.ndarray:
    """
    Convert L.O.V.E. quaternion to SciPy format.
    
    L.O.V.E.: [w, x, y, z] (scalar-first)
    SciPy:    [x, y, z, w] (scalar-last)
    
    Args:
        q: Quaternion in L.O.V.E. format
    
    Returns:
        NumPy array in SciPy format
    """
    return np.array([q.x, q.y, q.z, q.w])

def scipy_to_love(q_array: np.ndarray) -> Quaternion:
    """
    Convert SciPy format to L.O.V.E. quaternion.
    
    SciPy:    [x, y, z, w] (scalar-last)
    L.O.V.E.: [w, x, y, z] (scalar-first)
    
    Args:
        q_array: NumPy array in SciPy format
    
    Returns:
        Quaternion in L.O.V.E. format
    """
    return Quaternion(
        w=float(q_array[3]),
        x=float(q_array[0]),
        y=float(q_array[1]),
        z=float(q_array[2])
    )

def create_rotation(q: Quaternion) -> R:
    """
    Create SciPy Rotation object from L.O.V.E. quaternion.
    
    Args:
        q: Quaternion in L.O.V.E. format
    
    Returns:
        SciPy Rotation object
    """
    q_scipy = love_to_scipy(q)
    return R.from_quat(q_scipy)

def rotation_to_love(rotation: R) -> Quaternion:
    """
    Extract quaternion from SciPy Rotation object.
    
    Args:
        rotation: SciPy Rotation object
    
    Returns:
        Quaternion in L.O.V.E. format
    """
    q_scipy = rotation.as_quat()  # Returns [x, y, z, w]
    return scipy_to_love(q_scipy)
```

## Usage Examples

### Example 1: Using SciPy SLERP

```python
from scipy.spatial.transform import Slerp
from app.utils.scipy_adapter import love_to_scipy, scipy_to_love

def generate_path_with_scipy(q_start: Quaternion, q_target: Quaternion, steps: int):
    """Generate SLERP path using SciPy"""
    
    # 1. Convert to SciPy format
    q_start_scipy = love_to_scipy(q_start)
    q_target_scipy = love_to_scipy(q_target)
    
    # 2. Create rotations
    rotations = R.from_quat([q_start_scipy, q_target_scipy])
    
    # 3. Create SLERP interpolator
    times = np.array([0.0, 1.0])
    slerp = Slerp(times, rotations)
    
    # 4. Interpolate
    t_values = np.linspace(0, 1, steps)
    interpolated = slerp(t_values)
    
    # 5. Convert back to L.O.V.E. format
    path = []
    for rotation in interpolated:
        q_love = rotation_to_love(rotation)
        path.append(q_love)
    
    return path
```

### Example 2: Quaternion Multiplication

SciPy doesn't directly support quaternion multiplication, so we use our own implementation:

```python
# Use L.O.V.E. Quaternion class (not SciPy)
q1 = Quaternion(w=0.7071, x=0.7071, y=0, z=0)
q2 = Quaternion(w=0.7071, x=0, y=0.7071, z=0)

q_result = q1.multiply(q2)  # Use our Hamilton product
```

## SciPy Version Compatibility

### Required Version

```
scipy >= 1.12.0
```

### Version-Specific Notes

| SciPy Version | Notes |
|---------------|-------|
| < 1.4.0 | Older quaternion API (avoid) |
| 1.4.0 - 1.11.x | Stable, but ensure scalar-last |
| **1.12.0+** | Recommended, improved performance |

### Checking Version

```python
import scipy
print(f"SciPy version: {scipy.__version__}")

# In tests
assert tuple(map(int, scipy.__version__.split('.')[:2])) >= (1, 12), \
    "SciPy 1.12.0+ required"
```

## Testing the Adapter

### Unit Tests

```python
import numpy as np
from app.utils.scipy_adapter import love_to_scipy, scipy_to_love

def test_round_trip_conversion():
    """Converting back and forth should preserve values"""
    q_love = Quaternion(w=0.7071, x=0.7071, y=0, z=0)
    
    # L.O.V.E. → SciPy → L.O.V.E.
    q_scipy = love_to_scipy(q_love)
    q_back = scipy_to_love(q_scipy)
    
    assert q_back.w == pytest.approx(q_love.w)
    assert q_back.x == pytest.approx(q_love.x)
    assert q_back.y == pytest.approx(q_love.y)
    assert q_back.z == pytest.approx(q_love.z)

def test_scipy_format_correct():
    """Verify SciPy array has correct order"""
    q_love = Quaternion(w=1, x=2, y=3, z=4)
    q_scipy = love_to_scipy(q_love)
    
    assert q_scipy[0] == 2  # x first
    assert q_scipy[1] == 3  # y second
    assert q_scipy[2] == 4  # z third
    assert q_scipy[3] == 1  # w last

def test_rotation_object_creation():
    """Verify SciPy Rotation object is created correctly"""
    q_love = Quaternion(w=0.7071, x=0.7071, y=0, z=0)
    rotation = create_rotation(q_love)
    
    # Extract back
    q_result = rotation_to_love(rotation)
    
    assert q_result.w == pytest.approx(q_love.w, abs=1e-5)
```

## Next Steps

Now that you understand SciPy integration:
- **08-metrics-and-insights.md** - Complete metrics system
- **09-setup-and-installation.md** - Development setup
- **10-deployment.md** - Production deployment
