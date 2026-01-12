# SLERP Interpolation - Deep Dive

This guide provides a comprehensive treatment of Spherical Linear Interpolation (SLERP), the algorithm that generates smooth animation paths between emotional states.

---

## What is SLERP?

**SLERP** (Spherical Linear Interpolation) is the algorithm for interpolating between two unit quaternions while maintaining **constant angular velocity** and staying on the unit sphere.

**Inventor:** Ken Shoemake (1985)  
**Paper:** "Animating Rotation with Quaternion Curves"  
**Application:** Standard in computer graphics, robotics, and now emotional state visualization

---

## The Problem SLERP Solves

### Why Not Linear Interpolation?

**Linear interpolation (LERP):**

```text
LERP(q₁, q₂, t) = (1-t)·q₁ + t·q₂
```

#### Problem 1: Leaves the unit sphere

```python
q₁ = [1, 0, 0, 0]
q₂ = [0.707, 0.707, 0, 0]

q_mid = 0.5·q₁ + 0.5·q₂ = [0.8535, 0.3535, 0, 0]
||q_mid|| = 0.924 ≠ 1.0  # ❌ Not on unit sphere!
```

#### Problem 2: Variable angular velocity

- Moves faster in the middle
- Slower at the ends
- Animation looks unnatural

### SLERP Solution

**SLERP guarantees:**

- ✅ Stays on unit sphere (valid rotations)
- ✅ Constant angular velocity (smooth motion)
- ✅ Shortest path (efficient)
- ✅ Numerically stable

---

## The SLERP Formula

### Mathematical Definition

```text
SLERP(q₁, q₂, t) = (sin((1-t)Ω)/sin(Ω))·q₁ + (sin(tΩ)/sin(Ω))·q₂

Where:
  Ω = arccos(q₁ · q₂)  [angle between quaternions]
  t ∈ [0, 1]           [interpolation parameter]
```

### Alternative Forms

**Exponential form:**

```text
SLERP(q₁, q₂, t) = q₁ · (q₁⁻¹ · q₂)ᵗ
```

**Power form:**

```text
SLERP(q₁, q₂, t) = q₁ · exp(t · log(q₁⁻¹ · q₂))
```

All three are mathematically equivalent!

---

## Implementation

### Our Approach: Using SciPy

**Why SciPy?**

- Highly optimized C implementation
- Numerically stable
- Well-tested (millions of users)
- Handles edge cases automatically

**File:** `app/core/interpolation.py`

```python
from scipy.spatial.transform import Slerp, Rotation as R
from ..utils.scipy_adapter import love_to_scipy, scipy_to_love

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
        steps: Number of frames (default: 60 for 60fps @ 1 second)
    
    Returns:
        List of `steps` quaternions from q_start to q_target
    """
    # 1. Ensure shortest path (double-cover correction)
    q_start_corrected, q_target_corrected = ensure_shortest_path(q_start, q_target)
    
    # 2. Convert to SciPy format [x, y, z, w]
    q_start_scipy = love_to_scipy(q_start_corrected)
    q_target_scipy = love_to_scipy(q_target_corrected)
    
    # 3. Create SciPy Rotation objects
    rotations = R.from_quat([q_start_scipy, q_target_scipy])
    
    # 4. Create Slerp interpolator
    times = np.array([0.0, 1.0])
    slerp = Slerp(times, rotations)
    
    # 5. Generate interpolation points
    t_values = np.linspace(0, 1, steps)
    interpolated_rotations = slerp(t_values)
    
    # 6. Convert back to L.O.V.E. format [w, x, y, z]
    path = []
    for rotation in interpolated_rotations:
        q_scipy = rotation.as_quat()  # [x, y, z, w]
        q_love = scipy_to_love(q_scipy)  # [w, x, y, z]
        path.append(q_love)
    
    return path
```

---

## The Double-Cover Problem

### Understanding the Issue

**Key fact:** `q` and `-q` represent the **same rotation**.

**Implication:** Two paths between q₁ and q₂:

1. Short path (< 180°)
2. Long path (> 180°)

**Example:**

```python
q1 = [1, 0, 0, 0]       # Identity
q2 = [0, 1, 0, 0]       # 180° around X
-q2 = [0, -1, 0, 0]     # Same rotation as q2

# SLERP(q1, q2) might take 180° path
# SLERP(q1, -q2) takes 180° path in opposite direction
# Which is correct?
```

### Solution: Check Dot Product

```python
def ensure_shortest_path(q1: Quaternion, q2: Quaternion):
    """
    Ensure SLERP takes the shortest path.
    
    If q1 · q2 < 0, quaternions are on opposite hemispheres
    of the 4D unit sphere. Negate q2 to choose the shorter arc.
    
    Geometric intuition:
    - Dot product < 0 → angle > 90° → long way
    - Negate q2 → angle < 90° → short way
    """
    dot = q1.dot(q2)
    
    if dot < 0:
        # Negate q2 to take short path
        q2 = Quaternion(-q2.w, -q2.x, -q2.y, -q2.z)
    
    return q1, q2
```

**Visual:**

```text
        q₁ •───────────• q₂
           └─ Long path (>180°)
           
        q₁ •───• -q₂
           └─ Short path (<180°)
```

**Clinical significance:**

- Short path = gradual emotional transition
- Long path = sudden jarring shift (avoid!)

---

## Constant Angular Velocity

### Why It Matters

**LERP:** Variable speed (faster in middle)

```text
Frame:     0    10    20    30    40    50    60
Angle:     0°   5°   15°   30°   45°   55°   60°
Δ angle:   5°   10°   15°   15°   10°   5°
            ↑ Getting faster... then slower ↑
```

**SLERP:** Constant speed

```text
Frame:     0    10    20    30    40    50    60
Angle:     0°   10°   20°   30°   40°   50°   60°
Δ angle:   10°  10°   10°   10°   10°   10°
            ↑ Constant angular velocity ↑
```

**Emotional interpretation:**

- Steady, predictable emotional shift
- No sudden accelerations/decelerations
- Natural, organic feeling

### Mathematical Proof

**Theorem:** SLERP maintains constant angular velocity.

**Proof:**

```text
Let q(t) = SLERP(q₁, q₂, t)

Angular velocity = dθ/dt where θ(t) is angle rotated

From SLERP formula:
θ(t) = t · Ω  (where Ω = angle between q₁ and q₂)

Therefore:
dθ/dt = Ω = constant  ✓

SLERP produces constant angular velocity.
```

---

## SciPy Integration

### Why Use SciPy?

1. **Highly optimized** - C implementation
2. **Numerically stable** - Handles edge cases
3. **Well-tested** - Used by millions
4. **Maintained** - Regular updates and bug fixes

### The Scalar Convention Problem

**L.O.V.E. Convention:** Scalar-first `[w, x, y, z]`  
**SciPy Convention:** Scalar-last `[x, y, z, w]`

**Must convert before/after SciPy calls!**

### Adapter Functions

**File:** `app/utils/scipy_adapter.py`

```python
def love_to_scipy(q: Quaternion) -> np.ndarray:
    """
    Convert L.O.V.E. format to SciPy format.
    
    L.O.V.E.:  [w, x, y, z]  (scalar-first)
    SciPy:     [x, y, z, w]  (scalar-last)
    """
    return np.array([q.x, q.y, q.z, q.w])

def scipy_to_love(arr: np.ndarray) -> Quaternion:
    """
    Convert SciPy format to L.O.V.E. format.
    
    SciPy:     [x, y, z, w]  (scalar-last)
    L.O.V.E.:  [w, x, y, z]  (scalar-first)
    """
    return Quaternion(w=arr[3], x=arr[0], y=arr[1], z=arr[2])
```

**Usage:**

```python
# Before calling SciPy
q_scipy = love_to_scipy(q_love)

# Call SciPy
result_scipy = slerp_function(q_scipy)

# After SciPy returns
result_love = scipy_to_love(result_scipy)
```

---

## Generating Animation Paths

### Frame Count Selection

**Default:** 60 frames

**Rationale:**

- 60 fps is standard animation framerate
- 1-second transition = 60 frames
- Smooth visual experience

**Configurable:**

```python
# Fast transition (0.5 seconds @ 60fps)
path = generate_slerp_path(q1, q2, steps=30)

# Slow transition (2 seconds @ 60fps)
path = generate_slerp_path(q1, q2, steps=120)

# Ultra-smooth (120fps)
path = generate_slerp_path(q1, q2, steps=120)
```

### Path Properties

**Guaranteed:**

```python
path[0] == q_start      # Starts at beginning
path[-1] == q_target    # Ends at target
len(path) == steps      # Correct frame count
all(q.is_unit() for q in path)  # All unit quaternions
```

**Angular spacing:**

```python
# Constant angle between frames
Ω_total = angular_distance(calculate_transition(q_start, q_target))
Ω_per_frame = Ω_total / (steps - 1)

# Each frame rotates by same amount
for i in range(len(path) - 1):
    q_delta = calculate_transition(path[i], path[i+1])
    phi = angular_distance(q_delta)
    assert abs(phi - Ω_per_frame) < EPSILON  # Constant!
```

---

## Edge Cases

### Case 1: Identical Quaternions

**Input:**

```python
q1 = Quaternion(0.5, 0.5, 0.5, 0.5)
q2 = Quaternion(0.5, 0.5, 0.5, 0.5)  # Same as q1
```

**Result:**

```python
path = generate_slerp_path(q1, q2, steps=60)
# All 60 frames are identical to q1
# No interpolation needed
```

### Case 2: Opposite Quaternions

**Input:**

```python
q1 = Quaternion(0.5, 0.5, 0.5, 0.5)
q2 = Quaternion(-0.5, -0.5, -0.5, -0.5)  # -q1 (same rotation!)
```

**Behavior:**

- `ensure_shortest_path()` detects dot < 0
- Negates q2 back to q1
- No interpolation (already at target)

### Case 3: Nearly Parallel Quaternions

**Problem:** When Ω ≈ 0, `sin(Ω) ≈ 0`, causing division issues.

**Solution:** Fall back to LERP + normalize:

```python
if abs(sin_omega) < EPSILON:
    # Use normalized linear interpolation
    return Quaternion(
        (1-t)*q1.w + t*q2.w,
        (1-t)*q1.x + t*q2.x,
        (1-t)*q1.y + t*q2.y,
        (1-t)*q1.z + t*q2.z
    ).normalize()
```

---

## Low-Pass Filtering

### The `smooth_transition()` Function

**Purpose:** Dampen high-frequency noise from jittery LLM outputs.

**Algorithm:**

```python
def smooth_transition(q_prev, q_new, alpha=0.1):
    """
    Apply exponential moving average smoothing.
    
    Args:
        q_prev: Previously smoothed quaternion
        q_new: New raw quaternion
        alpha: Blend factor [0, 1]
            - 0.0 = ignore new (full damping)
            - 1.0 = use new (no smoothing)
            - 0.1 = recommended (90% old, 10% new)
    
    Returns:
        Smoothed quaternion
    """
    if alpha >= 1.0:
        return q_new  # No smoothing
    
    if alpha <= 0.0:
        return q_prev  # Full damping
    
    # Generate SLERP path
    steps = max(10, int(10 / alpha))
    path = generate_slerp_path(q_prev, q_new, steps=steps)
    
    # Pick frame at alpha position
    index = min(int(alpha * (steps - 1)), steps - 1)
    
    return path[index]
```

### Use Case

**Scenario:** LLM outputs jitter between similar VAC values.

```python
# Frame 1: VAC[0.80, 0.60, 0.70]
# Frame 2: VAC[0.82, 0.59, 0.71]  # Slight jitter
# Frame 3: VAC[0.79, 0.61, 0.69]  # More jitter
```

**Without smoothing:** Quaternions jump around  
**With smoothing:** Smooth, gradual changes

**Implementation:**

```python
q_smoothed = Quaternion.identity()

for vac in vac_stream:
    q_new = vac.to_quaternion()
    q_smoothed = smooth_transition(q_smoothed, q_new, alpha=0.1)
    # Use q_smoothed for visualization
```

---

## Performance Analysis

### Computational Complexity

**Time complexity:** O(n) where n = number of frames

**Breakdown:**

```text
1. ensure_shortest_path():   O(1) - Dot product
2. love_to_scipy() × 2:       O(1) - Array creation
3. R.from_quat():             O(1) - SciPy rotation object
4. Slerp initialization:      O(1) - Interpolator setup
5. Generate frames:           O(n) - n SLERP evaluations
6. scipy_to_love() × n:       O(n) - Convert each frame

Total: O(n)
```

**Space complexity:** O(n) for storing the path

### Timing Benchmarks

```python
import timeit

setup = """
from app.core.vac_model import VACVector
from app.core.interpolation import generate_slerp_path

vac1 = VACVector(0.8, 0.6, 0.7)
vac2 = VACVector(-0.3, -0.2, -0.4)
q1 = vac1.to_quaternion()
q2 = vac2.to_quaternion()
"""

code = "path = generate_slerp_path(q1, q2, steps=60)"

time_per_call = timeit.timeit(code, setup=setup, number=1000) / 1000
print(f"Average: {time_per_call * 1000:.2f} ms")
```

**Results:**

- 30 frames: ~3ms
- 60 frames: ~5-7ms ✅
- 120 frames: ~10-12ms

**Target met:** < 10ms for standard 60-frame path

### Optimization Opportunities

**1. Batch processing:**

```python
# Generate multiple paths at once
def batch_slerp(pairs: List[Tuple[Quaternion, Quaternion]], steps: int):
    # Vectorize with NumPy
    pass
```

**2. Caching:**

```python
# Cache common transitions
@lru_cache(maxsize=128)
def cached_slerp(q1_tuple, q2_tuple, steps):
    q1 = Quaternion(*q1_tuple)
    q2 = Quaternion(*q2_tuple)
    return generate_slerp_path(q1, q2, steps)
```

**Not implemented:** Current performance meets requirements.

---

## Numerical Stability

### Handling Near-Parallel Quaternions

**Problem:** When q₁ ≈ q₂, Ω ≈ 0, so `sin(Ω) ≈ 0`.

**SLERP formula becomes:**

```text
(sin((1-t)Ω) / 0) → division by zero!
```

**Solution:** Switch to NLERP when Ω < ε:

```python
omega = math.acos(dot)
sin_omega = math.sin(omega)

if abs(sin_omega) < EPSILON:
    # Use normalized linear interpolation
    q_interp = Quaternion(
        (1-t)*q1.w + t*q2.w,
        (1-t)*q1.x + t*q2.x,
        (1-t)*q1.y + t*q2.y,
        (1-t)*q1.z + t*q2.z
    ).normalize()
else:
    # Use standard SLERP
    a = math.sin((1-t) * omega) / sin_omega
    b = math.sin(t * omega) / sin_omega
    q_interp = Quaternion(
        a*q1.w + b*q2.w,
        a*q1.x + b*q2.x,
        a*q1.y + b*q2.y,
        a*q1.z + b*q2.z
    )
```

### Handling Opposite Quaternions

**Problem:** `q1 · q2 = -1` (exactly opposite).

**Behavior:**

- Ω = π (180°)
- Multiple shortest paths exist (ambiguous)

**SciPy handles this:** Picks one valid path arbitrarily.

---

## Testing SLERP

### Unit Tests

```python
def test_slerp_endpoints():
    """Test that SLERP starts and ends at correct quaternions."""
    q1 = Quaternion.identity()
    q2 = Quaternion(0.707, 0, 0.707, 0)
    
    path = generate_slerp_path(q1, q2, steps=60)
    
    assert path[0] == q1
    assert path[-1] == q2

def test_slerp_unit_quaternions():
    """Test that all SLERP frames are unit quaternions."""
    q1 = VACVector(0.8, 0.6, 0.7).to_quaternion()
    q2 = VACVector(-0.3, -0.2, -0.4).to_quaternion()
    
    path = generate_slerp_path(q1, q2, steps=60)
    
    for q in path:
        assert abs(q.magnitude() - 1.0) < EPSILON

def test_slerp_constant_angular_velocity():
    """Test that angular distance between frames is constant."""
    q1 = Quaternion.identity()
    q2 = Quaternion(0, 1, 0, 0)  # 180° rotation
    
    path = generate_slerp_path(q1, q2, steps=10)
    
    # Calculate angular distance between consecutive frames
    distances = []
    for i in range(len(path) - 1):
        q_trans = calculate_transition(path[i], path[i+1])
        phi = angular_distance(q_trans)
        distances.append(phi)
    
    # All distances should be equal
    avg_distance = sum(distances) / len(distances)
    for d in distances:
        assert abs(d - avg_distance) < 0.01  # Within 1%
```

---

## Integration with Experience Module

### What Experience Needs

**Input from Versor:**

```json
{
  "interpolation_path": [
    {"w": 1.0, "x": 0.0, "y": 0.0, "z": 0.0},
    {"w": 0.99, "x": 0.05, "y": 0.04, "z": 0.05},
    ...
    {"w": 0.31, "x": 0.62, "y": 0.48, "z": 0.55}
  ]
}
```

**What Experience does:**

1. Parse quaternions
2. For each frame (60fps):
   - Apply quaternion rotation to Soul Sphere mesh
   - Render frame
   - Display for 1/60 second
3. Result: Smooth 1-second rotation animation

### TypeScript Integration

```typescript
interface Quaternion {
  w: number;
  x: number;
  y: number;
  z: number;
}

interface SlerpPath {
  frames: Quaternion[];
  duration: number;
}

function animateSoulSphere(path: Quaternion[]) {
  const frameDuration = 1000 / 60;  // ~16.67ms per frame
  
  path.forEach((quaternion, index) => {
    setTimeout(() => {
      // Apply quaternion to 3D mesh
      sphere.quaternion.set(
        quaternion.x,
        quaternion.y,
        quaternion.z,
        quaternion.w
      );
      
      // Render frame
      renderer.render(scene, camera);
    }, index * frameDuration);
  });
}
```

---

## Advanced: Custom SLERP Implementation

### If Not Using SciPy

Here's a pure Python SLERP implementation:

```python
def slerp_pure(q1: Quaternion, q2: Quaternion, t: float) -> Quaternion:
    """
    Pure Python SLERP implementation (educational).
    
    Use SciPy version in production for better performance.
    """
    # Ensure shortest path
    q1, q2 = ensure_shortest_path(q1, q2)
    
    # Calculate angle
    dot = np.clip(q1.dot(q2), -1.0, 1.0)
    omega = math.acos(dot)
    sin_omega = math.sin(omega)
    
    # Near-parallel case
    if abs(sin_omega) < EPSILON:
        return Quaternion(
            (1-t)*q1.w + t*q2.w,
            (1-t)*q1.x + t*q2.x,
            (1-t)*q1.y + t*q2.y,
            (1-t)*q1.z + t*q2.z
        ).normalize()
    
    # Standard SLERP
    a = math.sin((1-t) * omega) / sin_omega
    b = math.sin(t * omega) / sin_omega
    
    return Quaternion(
        a*q1.w + b*q2.w,
        a*q1.x + b*q2.x,
        a*q1.y + b*q2.y,
        a*q1.z + b*q2.z
    )
```

**Why we use SciPy instead:**

- Faster (C implementation)
- More robust error handling
- Better tested

---

## Common Issues

### Issue 1: Path Takes Long Way

**Symptom:** Animation rotates 270° instead of 90°.

**Cause:** Forgot to call `ensure_shortest_path()`.

**Fix:**

```python
# Before SLERP
q1, q2 = ensure_shortest_path(q1, q2)
path = generate_slerp_path(q1, q2, steps=60)
```

### Issue 2: Jerky Animation

**Symptom:** Animation isn't smooth.

**Causes:**

1. Too few frames
2. Variable frame timing in Experience
3. Not using SLERP (using LERP instead)

**Fix:**

```python
# More frames
path = generate_slerp_path(q1, q2, steps=120)

# Ensure constant timing in Experience
setInterval(() => applyFrame(), 16.67)  // Exactly 60fps
```

### Issue 3: SciPy Import Error

**Symptom:**

```text
ModuleNotFoundError: No module named 'scipy'
```

**Fix:**

```bash
pip install scipy==1.12.0
```

---

## References

### Academic Papers

1. **Shoemake, K. (1985)**
   - "Animating Rotation with Quaternion Curves"
   - SIGGRAPH 1985
   - Original SLERP algorithm

2. **Dam, E.B., Koch, M., Lillholm, M. (1998)**
   - "Quaternions, Interpolation and Animation"
   - Technical report, University of Copenhagen
   - Comprehensive quaternion reference

### Technical Documentation

- **SciPy Slerp:** <https://docs.scipy.org/doc/scipy/reference/generated/scipy.spatial.transform.Slerp.html>
- **Versor SLERP Spec:** `versor/docs/05-slerp-interpolation.md`

---

## Next Steps

- **[SciPy Integration](05-scipy-integration.md)** - Detailed SciPy usage
- **[Performance Optimization](06-performance-optimization.md)** - Making SLERP faster
- **[Extending Versor](07-extending-versor.md)** - Adding custom interpolation

---

**Previous:** [← VAC Conversion](03-vac-conversion.md)  
**Next:** [SciPy Integration →](05-scipy-integration.md)
