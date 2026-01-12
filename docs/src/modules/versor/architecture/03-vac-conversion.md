# VAC to Quaternion Conversion - Deep Dive

This guide explains the algorithm that converts 3D emotional vectors (VAC) into 4D quaternion rotations.

---

## Overview

The conversion from VAC to quaternion is the **core transformation** that enables the L.O.V.E. platform to represent emotions as geometric rotations.

**Input:** `VAC[valence, arousal, connection]` - 3D emotional vector  
**Output:** `Quaternion[w, x, y, z]` - 4D unit quaternion

---

## The Algorithm

### Step-by-Step Process

```text
1. Validate and clamp VAC components to [-1.0, 1.0]
2. Calculate magnitude (emotional intensity)
3. Handle zero vector edge case
4. Normalize axis (emotional direction)
5. Calculate rotation angle
6. Apply axis-angle formula
7. Return unit quaternion
```

### Complete Implementation

```python
def to_quaternion(self) -> Quaternion:
    """
    Convert VAC vector to unit quaternion.
    
    Algorithm:
        1. Validate/clamp components
        2. magnitude = √(v² + a² + c²)
        3. If magnitude ≈ 0 → return identity
        4. axis = [v, a, c] / magnitude
        5. angle = π · (magnitude / √3)
        6. q = [cos(θ/2), sin(θ/2)·axis]
    
    Returns:
        Unit quaternion representing emotional state as rotation
    """
    # Step 1: Validate and clamp to valid range
    v = self._validate_and_clamp()  # Returns [valence, arousal, connection]
    
    # Step 2: Calculate magnitude (emotional intensity)
    magnitude = math.sqrt(v[0]**2 + v[1]**2 + v[2]**2)
    
    # Step 3: Handle zero vector (neutral/no emotion)
    if magnitude < EPSILON:
        return Quaternion.identity()  # [1, 0, 0, 0]
    
    # Step 4: Normalize axis (direction in VAC space)
    axis = [component / magnitude for component in v]
    
    # Step 5: Calculate rotation angle
    max_magnitude = math.sqrt(3)  # Maximum possible magnitude
    angle = math.pi * (magnitude / max_magnitude)
    
    # Step 6: Apply axis-angle formula
    half_angle = angle / 2
    sin_half = math.sin(half_angle)
    cos_half = math.cos(half_angle)
    
    quaternion = Quaternion(
        w=cos_half,
        x=axis[0] * sin_half,
        y=axis[1] * sin_half,
        z=axis[2] * sin_half
    )
    
    return quaternion
```

---

## Step 1: Validation and Clamping

### Why Validate?

VAC values from the Listener LLM may have floating-point drift:

```text
Expected: 1.0
Actual:   1.0000000000000002  # Floating point precision
```

### Implementation

```python
def _validate_and_clamp(self) -> List[float]:
    """
    Ensure all components are in valid range [-1.0, 1.0].
    
    Handles:
    - Floating-point precision issues
    - LLM outputs slightly out of range
    - Numerical drift
    
    Returns:
        Clamped [valence, arousal, connection]
    """
    return [
        max(-1.0, min(1.0, self.valence)),
        max(-1.0, min(1.0, self.arousal)),
        max(-1.0, min(1.0, self.connection)),
    ]
```

### Example

```python
# Input from LLM
vac = VACVector(
    valence=1.0000001,   # Slightly over
    arousal=0.5,
    connection=-1.0000002  # Slightly under
)

# After clamping
clamped = vac._validate_and_clamp()
# Result: [1.0, 0.5, -1.0]  ✓
```

---

## Step 2: Calculate Magnitude

### Mathematical Definition

```text
magnitude = ||VAC|| = √(v² + a² + c²)
```

### Interpretation

**Magnitude represents emotional intensity:**

- `magnitude ≈ 0`: Neutral, no strong emotion
- `magnitude ≈ 1`: Moderate emotional state
- `magnitude ≈ √3 ≈ 1.732`: Maximum intensity (all axes at ±1)

### Range Analysis

**Minimum:**

```text
VAC[0, 0, 0] → magnitude = 0
```

**Maximum:**

```text
VAC[±1, ±1, ±1] → magnitude = √(1² + 1² + 1²) = √3 ≈ 1.732
```

**Typical:**

```text
VAC[0.8, 0.6, 0.7] → magnitude = √(0.64 + 0.36 + 0.49) = √1.49 ≈ 1.22
```

### Code

```python
def magnitude(self) -> float:
    """Calculate Euclidean norm of VAC vector."""
    v = self._validate_and_clamp()
    return math.sqrt(v[0]**2 + v[1]**2 + v[2]**2)
```

---

## Step 3: Zero Vector Handling

### The Edge Case

**Problem:** What if `VAC[0, 0, 0]`?

```text
magnitude = 0
axis = [0, 0, 0] / 0  # ❌ Division by zero!
```

### Solution: Return Identity

```python
if magnitude < EPSILON:
    return Quaternion.identity()  # [1, 0, 0, 0]
```

**Interpretation:**

- Zero vector = neutral state
- No rotation needed
- Identity quaternion represents "no change"

### Epsilon Tolerance

```python
EPSILON = 1e-6  # 0.000001
```

**Why not exactly 0?**

- Floating-point precision
- Numerical stability
- `magnitude < 1e-6` is effectively zero

---

## Step 4: Normalize Axis

### Mathematical Definition

```text
axis = VAC / ||VAC|| = [v, a, c] / magnitude
```

**Result:** Unit vector in the direction of the emotional state.

### Interpretation

The axis represents the **type** of emotion (direction in VAC space), independent of intensity.

**Examples:**

```python
# Pure joy (positive valence only)
VAC[0.9, 0.0, 0.0] → axis = [1, 0, 0]

# Pure excitement (positive arousal only)
VAC[0.0, 0.8, 0.0] → axis = [0, 1, 0]

# Pure connection (positive connection only)
VAC[0.0, 0.0, 0.7] → axis = [0, 0, 1]

# Mixed emotion (joy + connection)
VAC[0.8, 0.0, 0.6] → axis = [0.8, 0.0, 0.6] / 1.0 = [0.8, 0.0, 0.6]
```

### Code

```python
# Normalize to unit vector
axis = [component / magnitude for component in v]

# Verify it's unit length
assert abs(math.sqrt(sum(a**2 for a in axis)) - 1.0) < EPSILON
```

---

## Step 5: Calculate Rotation Angle

### The Mapping Function

```text
angle = π · (magnitude / max_magnitude)

Where:
  max_magnitude = √3 ≈ 1.732
```

### Why This Mapping?

**Goal:** Map magnitude range [0, √3] to angle range [0, π].

**Rationale:**

1. **Neutral state (magnitude = 0)** → **No rotation (angle = 0)**
2. **Maximum intensity (magnitude = √3)** → **Full rotation (angle = π)**

**Linear scaling:**

```text
angle = π · (magnitude / √3)

Examples:
  magnitude = 0    → angle = 0
  magnitude = √3/2 → angle = π/2 = 90°
  magnitude = √3   → angle = π = 180°
```

### Alternative Mappings Considered

#### Option 1: Direct proportionality

```python
angle = magnitude  # ❌ Range is [0, √3], not [0, π]
```

#### Option 2: Normalized

```python
angle = π · (magnitude / √3)  # ✅ Range is [0, π]
```

#### Option 3: Non-linear

```python
angle = arctan(magnitude)  # Could work, but less intuitive
```

**Choice:** Linear normalized mapping for simplicity and predictability.

---

## Step 6: Axis-Angle Formula

### From Axis-Angle to Quaternion

**Mathematical formula:**

```text
q = [cos(θ/2), sin(θ/2)·n̂x, sin(θ/2)·n̂y, sin(θ/2)·n̂z]

Where:
  θ = rotation angle
  n̂ = [n̂x, n̂y, n̂z] = unit axis vector
```

### Why Half-Angle?

Quaternions use the **half-angle** because of the double-cover property:

- Rotating by θ requires quaternion with θ/2
- This makes q and -q represent the same rotation
- It's a mathematical quirk of quaternions

### Implementation

```python
half_angle = angle / 2
sin_half = math.sin(half_angle)
cos_half = math.cos(half_angle)

quaternion = Quaternion(
    w=cos_half,              # Scalar part
    x=axis[0] * sin_half,    # X component
    y=axis[1] * sin_half,    # Y component
    z=axis[2] * sin_half     # Z component
)
```

### Verification

The result should always be a unit quaternion:

```python
magnitude = math.sqrt(w² + x² + y² + z²)

# Verify it's unit
assert abs(magnitude - 1.0) < EPSILON
```

**Proof:**

```text
||q||² = cos²(θ/2) + sin²(θ/2)·(n̂x² + n̂y² + n̂z²)
       = cos²(θ/2) + sin²(θ/2)·||n̂||²
       = cos²(θ/2) + sin²(θ/2)·1  [axis is unit]
       = cos²(θ/2) + sin²(θ/2)
       = 1  [trigonometric identity]

Therefore: ||q|| = 1 ✓
```

---

## Complete Example

### From Joy to Quaternion

```python
# 1. Define VAC for joy
joy = VACVector(
    valence=0.9,    # Very positive
    arousal=0.7,    # High energy
    connection=0.8  # Connected to others
)

# 2. Validate/clamp (already in range)
v = [0.9, 0.7, 0.8]

# 3. Calculate magnitude
magnitude = sqrt(0.9² + 0.7² + 0.8²)
         = sqrt(0.81 + 0.49 + 0.64)
         = sqrt(1.94)
         ≈ 1.393

# 4. Normalize axis
axis = [0.9/1.393, 0.7/1.393, 0.8/1.393]
     = [0.646, 0.502, 0.574]

# 5. Calculate angle
max_mag = sqrt(3) ≈ 1.732
angle = π · (1.393 / 1.732)
      ≈ π · 0.804
      ≈ 2.526 radians
      ≈ 144.7°

# 6. Apply axis-angle formula
half_angle = 2.526 / 2 ≈ 1.263
sin_half = sin(1.263) ≈ 0.953
cos_half = cos(1.263) ≈ 0.303

q = Quaternion(
    w = 0.303,
    x = 0.646 · 0.953 = 0.616,
    y = 0.502 · 0.953 = 0.478,
    z = 0.574 · 0.953 = 0.547
)

# 7. Verify unit length
||q|| = sqrt(0.303² + 0.616² + 0.478² + 0.547²)
      = sqrt(0.092 + 0.379 + 0.229 + 0.299)
      = sqrt(0.999)
      ≈ 1.0 ✓
```

---

## Edge Cases

### Case 1: Zero Vector

```python
VAC[0, 0, 0] → Quaternion[1, 0, 0, 0]  # Identity
```

**Rationale:** Neutral state = no rotation

### Case 2: Maximum Intensity

```python
VAC[1, 1, 1] → magnitude = √3
             → angle = π
             → axis = [1/√3, 1/√3, 1/√3]
             → q ≈ [0, 0.577, 0.577, 0.577]
```

**Interpretation:** Extreme mixed emotion (180° rotation)

### Case 3: Pure Axis

```python
VAC[1, 0, 0] → magnitude = 1.0
             → angle = π/√3 ≈ 1.814 rad
             → axis = [1, 0, 0]
             → q = [cos(0.907), sin(0.907), 0, 0]
             → q ≈ [0.618, 0.786, 0, 0]
```

### Case 4: Negative Values

```python
VAC[-0.8, -0.6, -0.7] → magnitude ≈ 1.225
                      → axis = [-0.653, -0.490, -0.571]
                      → Valid quaternion (negative axis components OK)
```

---

## Mathematical Properties

### Property 1: Magnitude Preservation

**Theorem:** The magnitude of the VAC vector maps to the rotation angle.

```text
||VAC|| ↔ θ (rotation angle)
```

**Proof:**

```text
angle = π · (||VAC|| / √3)

Therefore:
  ||VAC|| = 0   ⟺ angle = 0    (no rotation)
  ||VAC|| = √3  ⟺ angle = π    (maximum rotation)
```

### Property 2: Direction Preservation

**Theorem:** The direction of the VAC vector becomes the rotation axis.

```text
VAC / ||VAC|| = rotation axis
```

**Example:**

```python
VAC[0.6, 0.8, 0] → axis = [0.6, 0.8, 0] / 1.0 = [0.6, 0.8, 0]
```

The quaternion rotates around this axis in VAC space.

### Property 3: Zero Vector Stability

**Theorem:** Zero VAC consistently produces identity quaternion.

```text
VAC[0, 0, 0] → Quaternion[1, 0, 0, 0]  (always)
```

**Importance:** Prevents division by zero, provides stable neutral state.

---

## Why This Specific Mapping?

### Design Decision: Linear Angle Mapping

```text
angle = π · (magnitude / √3)
```

**Alternatives considered:**

#### Option 1: Quadratic mapping

```python
angle = π · (magnitude / √3)²
```

- Pros: More gradual at low magnitudes
- Cons: Less intuitive, compresses high intensities

#### Option 2: Logarithmic mapping

```python
angle = π · log(1 + magnitude) / log(1 + √3)
```

- Pros: Spreads out low magnitudes
- Cons: Complex, non-linear

#### Option 3: Direct mapping

```python
angle = magnitude
```

- Pros: Simplest
- Cons: Doesn't fill the quaternion space (max angle = √3 < π)

**Choice:** Linear normalized mapping

- ✅ Intuitive: intensity → rotation amount
- ✅ Fills quaternion space [0, π]
- ✅ Predictable behavior
- ✅ Reversible

---

## Inverse Conversion: Quaternion → VAC

### Algorithm

```python
def quaternion_to_vac(q: Quaternion) -> VACVector:
    """
    Convert quaternion back to VAC (inverse operation).
    
    Algorithm:
        1. Extract axis and angle from quaternion
        2. Calculate magnitude from angle
        3. Scale axis by magnitude
        4. Return VAC vector
    """
    # Extract axis-angle representation
    axis, angle = q.to_axis_angle()
    
    # Calculate magnitude from angle
    max_magnitude = math.sqrt(3)
    magnitude = (angle / math.pi) * max_magnitude
    
    # Scale axis by magnitude
    vac_vector = axis * magnitude
    
    return VACVector(
        valence=vac_vector[0],
        arousal=vac_vector[1],
        connection=vac_vector[2]
    )
```

### Round-Trip Property

**Theorem:** Converting VAC → Quaternion → VAC preserves the original (within epsilon).

```python
vac_original = VACVector(0.8, 0.6, 0.7)
q = vac_original.to_quaternion()
vac_recovered = quaternion_to_vac(q)

assert abs(vac_original.valence - vac_recovered.valence) < EPSILON
assert abs(vac_original.arousal - vac_recovered.arousal) < EPSILON
assert abs(vac_original.connection - vac_recovered.connection) < EPSILON
```

---

## Numerical Stability

### Potential Issues

1. **Division by Zero**

   ```python
   if magnitude < EPSILON:
       return Quaternion.identity()  # Avoid division
   ```

2. **Loss of Precision**

   ```python
   # Use numpy for better precision
   import numpy as np
   magnitude = np.linalg.norm([v, a, c])
   ```

3. **Denormalization Drift**

   ```python
   # Renormalize after floating-point ops
   quaternion = quaternion.normalize()
   ```

### Testing Numerical Stability

```python
def test_vac_conversion_numerical_stability():
    """Test that conversion remains stable for extreme values."""
    
    # Maximum magnitude
    vac_max = VACVector(1.0, 1.0, 1.0)
    q_max = vac_max.to_quaternion()
    assert q_max.is_unit()
    
    # Near-zero magnitude
    vac_tiny = VACVector(1e-7, 1e-7, 1e-7)
    q_tiny = vac_tiny.to_quaternion()
    assert q_tiny == Quaternion.identity()
    
    # Large negative values
    vac_neg = VACVector(-0.999, -0.999, -0.999)
    q_neg = vac_neg.to_quaternion()
    assert q_neg.is_unit()
```

---

## Performance Optimization

### Current Performance

**Time complexity:** O(1) - constant time  
**Space complexity:** O(1) - fixed memory

**Timing:**

```python
import timeit

code = """
vac = VACVector(0.8, 0.6, 0.7)
q = vac.to_quaternion()
"""

time_per_call = timeit.timeit(code, number=10000) / 10000
print(f"Average: {time_per_call * 1000:.3f} ms")
# Result: ~0.05ms (extremely fast)
```

### Optimization Opportunities

#### 1. Pre-compute constants

```python
# Module level
MAX_MAGNITUDE = math.sqrt(3.0)
PI_OVER_MAX_MAG = math.pi / MAX_MAGNITUDE

# In function
angle = PI_OVER_MAX_MAG * magnitude  # Slightly faster
```

#### 2. Vectorize with NumPy

```python
# Convert multiple VACs at once
def batch_to_quaternion(vacs: List[VACVector]) -> List[Quaternion]:
    # Use NumPy vectorization
    vac_array = np.array([[v.valence, v.arousal, v.connection] for v in vacs])
    magnitudes = np.linalg.norm(vac_array, axis=1)
    # ... vectorized operations
```

#### 3. Lookup Tables

```python
# For sin/cos of common angles
# Generally not worth it (trigonometry is fast enough)
```

---

## Relationship to VAC Model

### The VAC Space

```text
             +A (High arousal)
              │
              │
    -V ───────┼────── +V (Positive valence)
(Negative)    │
              │
             -A (Low arousal)
             
             ⊙ C (Connection)
           (in/out of page)
```

### Mapping to Quaternion Space

```text
VAC 3D cube [-1,1]³ → Quaternion 4D sphere S³
```

**Volume:**

- VAC space: 2³ = 8 (cube)
- Quaternion space: Surface of 4D unit sphere

**Key insight:** We're mapping a solid 3D cube to the surface of a 4D sphere.

---

## Clinical Implications

### Intensity vs Type

**Magnitude (intensity):**

- Low: 0.0-0.5 → Mild emotion
- Medium: 0.5-1.0 → Moderate emotion
- High: 1.0-1.5 → Strong emotion
- Very high: 1.5-√3 → Intense/mixed emotion

**Direction (type):**

- Near [1, 0, 0]: Valence-dominant (joy/sadness)
- Near [0, 1, 0]: Arousal-dominant (excitement/calm)
- Near [0, 0, 1]: Connection-dominant (belonging/isolation)

### Example: Differentiating Pity and Compassion

```python
pity = VACVector(-0.3, -0.2, -0.6)
# magnitude ≈ 0.700
# axis ≈ [-0.429, -0.286, -0.857]  # Connection-dominant

compassion = VACVector(-0.3, -0.2, 0.8)
# magnitude ≈ 0.877
# axis ≈ [-0.342, -0.228, 0.912]  # Connection-dominant (opposite sign)
```

**Key difference:** Connection component flips sign!

---

## Testing the Conversion

### Unit Tests

```python
def test_vac_to_quaternion_identity():
    """Zero VAC should produce identity quaternion."""
    vac = VACVector(0, 0, 0)
    q = vac.to_quaternion()
    assert q == Quaternion.identity()

def test_vac_to_quaternion_unit_length():
    """All conversions should produce unit quaternions."""
    vac = VACVector(0.8, 0.6, 0.7)
    q = vac.to_quaternion()
    assert abs(q.magnitude() - 1.0) < EPSILON

def test_vac_pure_valence():
    """Pure valence should rotate around X-axis."""
    vac = VACVector(1.0, 0.0, 0.0)
    q = vac.to_quaternion()
    
    # Extract axis
    axis, angle = q.to_axis_angle()
    
    # Should be X-axis
    assert abs(axis[0] - 1.0) < EPSILON
    assert abs(axis[1]) < EPSILON
    assert abs(axis[2]) < EPSILON
```

---

## References

- **VAC Model:** `docs/architecture/02-vac-model.md`
- **Axis-Angle Representation:** Shoemake (1985)
- **Quaternion Algebra:** Hamilton (1843)
- **Technical Specification:** `versor/docs/03-vac-to-quaternion.md`

---

## Next Steps

- **[SLERP Interpolation](04-slerp-interpolation.md)** - Generating smooth paths
- **[SciPy Integration](05-scipy-integration.md)** - Using SciPy for SLERP
- **[Performance Optimization](06-performance-optimization.md)** - Making it faster

---

**Previous:** [← Quaternion Mathematics](02-quaternion-mathematics.md)  
**Next:** [SLERP Interpolation →](04-slerp-interpolation.md)
