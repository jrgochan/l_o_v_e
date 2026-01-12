# Quaternion Mathematics - Deep Dive

This guide provides a comprehensive mathematical treatment of quaternions, their algebra, and their application to emotional state representation.

---

## Mathematical Foundation

### What are Quaternions?

Quaternions are an extension of complex numbers to four dimensions, discovered by William Rowan Hamilton in 1843.

**Definition:**

```text
q = w + xi + yj + zk

Where:
  w, x, y, z ∈ ℝ (real numbers)
  i² = j² = k² = ijk = -1
```

**Notation:**

```text
q = [w, x, y, z]  (scalar-first convention)
q = w + v          (scalar + vector form)
```

**Properties:**

- **w**: Scalar part (real component)
- **x, y, z**: Vector part (imaginary components)
- **Hypercomplex number**: Extension of complex numbers

---

## Quaternion Operations

### 1. Addition

**Definition:**

```text
q₁ + q₂ = [w₁ + w₂, x₁ + x₂, y₁ + y₂, z₁ + z₂]
```

**Properties:**

- ✅ Commutative: q₁ + q₂ = q₂ + q₁
- ✅ Associative: (q₁ + q₂) + q₃ = q₁ + (q₂ + q₃)
- ✅ Identity: q + [0, 0, 0, 0] = q

**Code:**

```python
def add(self, other: Quaternion) -> Quaternion:
    return Quaternion(
        self.w + other.w,
        self.x + other.x,
        self.y + other.y,
        self.z + other.z
    )
```

### 2. Multiplication (Hamilton Product)

**Definition:**

```text
q₁ * q₂ = [w₁w₂ - x₁x₂ - y₁y₂ - z₁z₂,
           w₁x₂ + x₁w₂ + y₁z₂ - z₁y₂,
           w₁y₂ - x₁z₂ + y₁w₂ + z₁x₂,
           w₁z₂ + x₁y₂ - y₁x₂ + z₁w₂]
```

**Properties:**

- ❌ **NOT commutative:** q₁ *q₂ ≠ q₂* q₁ (order matters!)
- ✅ Associative: (q₁ *q₂)* q₃ = q₁ *(q₂* q₃)
- ✅ Identity: q * [1, 0, 0, 0] = q

**Matrix form:**

```text
q₁ * q₂ = M(q₁) · q₂

Where M(q₁) is the 4×4 matrix:
┌                                          ┐
│  w₁  -x₁  -y₁  -z₁ │
│  x₁   w₁  -z₁   y₁ │
│  y₁   z₁   w₁  -x₁ │
│  z₁  -y₁   x₁   w₁ │
└                                          ┘
```

**Code:**

```python
def multiply(self, other: Quaternion) -> Quaternion:
    """Hamilton product (non-commutative!)"""
    return Quaternion(
        w = self.w * other.w - self.x * other.x - self.y * other.y - self.z * other.z,
        x = self.w * other.x + self.x * other.w + self.y * other.z - self.z * other.y,
        y = self.w * other.y - self.x * other.z + self.y * other.w + self.z * other.x,
        z = self.w * other.z + self.x * other.y - self.y * other.x + self.z * other.w
    )
```

**Why non-commutative matters:**
Rotating around X then Y ≠ rotating around Y then X.

**Example:**

```python
q_x = Quaternion.from_axis_angle([1,0,0], π/2)  # 90° around X
q_y = Quaternion.from_axis_angle([0,1,0], π/2)  # 90° around Y

q_xy = q_x.multiply(q_y)  # X then Y
q_yx = q_y.multiply(q_x)  # Y then X

assert q_xy != q_yx  # Different results!
```

### 3. Conjugate

**Definition:**

```text
q̅ = [w, -x, -y, -z]
```

**Properties:**

- (q̅)̅ = q
- (q₁ *q₂)̅ = q̅₂* q̅₁ (reverses order!)
- q * q̅ = [||q||², 0, 0, 0]

**Code:**

```python
def conjugate(self) -> Quaternion:
    """Reverse the rotation."""
    return Quaternion(self.w, -self.x, -self.y, -self.z)
```

**Use case:** Inverse rotation

### 4. Magnitude (Norm)

**Definition:**

```text
||q|| = √(w² + x² + y² + z²)
```

**Properties:**

- ||q|| ≥ 0
- ||q|| = 0 ⟺ q = [0, 0, 0, 0]
- ||q₁ * q₂|| = ||q₁|| · ||q₂||

**Code:**

```python
def magnitude(self) -> float:
    """Euclidean norm in 4D space."""
    return math.sqrt(self.w**2 + self.x**2 + self.y**2 + self.z**2)
```

### 5. Normalization

**Definition:**

```text
q̂ = q / ||q|| = [w/||q||, x/||q||, y/||q||, z/||q||]
```

**Properties:**

- ||q̂|| = 1 (unit quaternion)
- Normalizing identity: q̂ = q if ||q|| = 1

**Code:**

```python
def normalize(self) -> Quaternion:
    """Normalize to unit length."""
    mag = self.magnitude()
    
    if mag < EPSILON:
        return Quaternion.identity()  # Zero → identity
    
    return Quaternion(
        self.w / mag,
        self.x / mag,
        self.y / mag,
        self.z / mag
    )
```

**Critical:** Only unit quaternions represent pure rotations!

### 6. Dot Product

**Definition:**

```text
q₁ · q₂ = w₁w₂ + x₁x₂ + y₁y₂ + z₁z₂
```

**Properties:**

- Commutative: q₁ · q₂ = q₂ · q₁
- q · q = ||q||²
- Measures "similarity" of rotations

**Code:**

```python
def dot(self, other: Quaternion) -> float:
    """Dot product (inner product)."""
    return (
        self.w * other.w +
        self.x * other.x +
        self.y * other.y +
        self.z * other.z
    )
```

**Use case:** Determine if quaternions represent similar rotations

### 7. Inverse

**Definition:**

```text
q⁻¹ = q̅ / ||q||²

For unit quaternions (||q|| = 1):
q⁻¹ = q̅
```

**Properties:**

- q * q⁻¹ = identity
- (q₁ *q₂)⁻¹ = q₂⁻¹* q₁⁻¹ (reverses order!)

**Code:**

```python
def inverse(self) -> Quaternion:
    """Multiplicative inverse."""
    mag_sq = self.magnitude() ** 2
    
    if mag_sq < EPSILON:
        raise ValueError("Cannot invert zero quaternion")
    
    conj = self.conjugate()
    return Quaternion(
        conj.w / mag_sq,
        conj.x / mag_sq,
        conj.y / mag_sq,
        conj.z / mag_sq
    )

# For unit quaternions (optimization)
def inverse_unit(self) -> Quaternion:
    """Inverse of unit quaternion (just conjugate)."""
    return self.conjugate()
```

---

## Unit Quaternions and Rotations

### The Unit Sphere

**Definition:** Unit quaternions lie on the 4D unit sphere:

```text
S³ = {q ∈ ℍ : ||q|| = 1}
```

**Key insight:** S³ (4D sphere) forms a **double cover** of SO(3) (3D rotations).

**What this means:**

- Every 3D rotation has **two** quaternion representations: q and -q
- Both represent the same rotation
- This is why we check dot products for SLERP shortest path

### Axis-Angle Representation

**Theorem:** Any unit quaternion can be written as:

```text
q = [cos(θ/2), sin(θ/2)·n̂]

Where:
  θ = rotation angle
  n̂ = unit axis vector [nx, ny, nz]
```

**Intuition:**

- Rotating by angle θ around axis n̂
- The θ/2 makes quaternions cover rotations twice (double cover)

**Code:**

```python
@classmethod
def from_axis_angle(cls, axis: np.ndarray, angle: float) -> "Quaternion":
    """
    Create quaternion from axis-angle representation.
    
    Args:
        axis: Unit vector [nx, ny, nz]
        angle: Rotation angle in radians
    
    Returns:
        Unit quaternion representing the rotation
    
    Mathematical formula:
        q = [cos(θ/2), sin(θ/2)·n̂x, sin(θ/2)·n̂y, sin(θ/2)·n̂z]
    """
    # Normalize axis
    axis = axis / np.linalg.norm(axis)
    
    half_angle = angle / 2.0
    sin_half = math.sin(half_angle)
    cos_half = math.cos(half_angle)
    
    return cls(
        w=cos_half,
        x=sin_half * axis[0],
        y=sin_half * axis[1],
        z=sin_half * axis[2]
    )
```

**Example:**

```python
# 90° rotation around Y-axis
axis = np.array([0, 1, 0])
angle = math.pi / 2

q = Quaternion.from_axis_angle(axis, angle)
# Result: [0.707, 0, 0.707, 0]
```

### Extracting Axis-Angle

**Inverse operation:**

```python
def to_axis_angle(self) -> Tuple[np.ndarray, float]:
    """
    Extract axis and angle from quaternion.
    
    Returns:
        (axis, angle) where axis is unit vector, angle in radians
    
    Mathematical formulas:
        θ = 2 * arccos(w)
        n̂ = [x, y, z] / sin(θ/2)
    """
    # Handle identity case
    if abs(self.w) > 1.0 - EPSILON:
        return np.array([1, 0, 0]), 0.0  # Arbitrary axis, zero angle
    
    angle = 2.0 * math.acos(np.clip(self.w, -1.0, 1.0))
    sin_half = math.sin(angle / 2.0)
    
    if abs(sin_half) < EPSILON:
        return np.array([1, 0, 0]), 0.0
    
    axis = np.array([
        self.x / sin_half,
        self.y / sin_half,
        self.z / sin_half
    ])
    
    return axis, angle
```

---

## Rotation Representation

### Composing Rotations

**Problem:** Apply rotation q₁, then rotation q₂.

**Solution:** Multiply quaternions (right to left):

```text
q_total = q₂ * q₁
```

**Example:**

```python
# Rotate 90° around X, then 90° around Y
q_x = Quaternion.from_axis_angle([1,0,0], π/2)
q_y = Quaternion.from_axis_angle([0,1,0], π/2)

q_total = q_y.multiply(q_x)  # Y after X
```

### Rotating a Vector

**Problem:** Apply rotation q to vector v.

**Solution:** Sandwich product:

```text
v' = q * v * q̅

Where v is represented as quaternion [0, vx, vy, vz]
```

**Code:**

```python
def rotate_vector(self, v: np.ndarray) -> np.ndarray:
    """
    Rotate a 3D vector by this quaternion.
    
    Args:
        v: 3D vector [x, y, z]
    
    Returns:
        Rotated vector v'
    
    Formula:
        v' = q * [0, vx, vy, vz] * q̅
    """
    # Represent vector as quaternion
    v_quat = Quaternion(0, v[0], v[1], v[2])
    
    # Sandwich product
    result = self.multiply(v_quat).multiply(self.conjugate())
    
    return np.array([result.x, result.y, result.z])
```

**Example:**

```python
# Rotate [1, 0, 0] by 90° around Z-axis
q = Quaternion.from_axis_angle([0, 0, 1], π/2)
v = np.array([1, 0, 0])
v_rotated = q.rotate_vector(v)

# Result: [0, 1, 0] (X-axis → Y-axis)
```

---

## The Double Cover Property

### Key Theorem

```text
q and -q represent the SAME rotation
```

**Proof:**

```text
Axis-angle form: q = [cos(θ/2), sin(θ/2)·n̂]
Negated:        -q = [-cos(θ/2), -sin(θ/2)·n̂]
                   = [cos(θ/2 + π), sin(θ/2 + π)·n̂]
                   = rotation by (θ + 2π) around n̂
```

Since rotations are periodic with period 2π:

```text
rotate by θ = rotate by (θ + 2π)
```

### Implications for SLERP

When interpolating, we must choose the shorter path:

```python
def ensure_shortest_path(q1: Quaternion, q2: Quaternion):
    """
    Ensure SLERP takes shortest path by checking dot product.
    
    If q1 · q2 < 0, they're on opposite hemispheres of S³.
    Negate q2 to choose the shorter arc.
    """
    if q1.dot(q2) < 0:
        q2 = Quaternion(-q2.w, -q2.x, -q2.y, -q2.z)
    
    return q1, q2
```

**Without this check:**

- SLERP might take 270° path instead of 90°
- Animation looks wrong
- Emotionally: sudden jarring transition

---

## Quaternion Algebra Proofs

### Proof 1: q * q̅ = ||q||²

**Proof:**

```text
q * q̅ = [w, x, y, z] * [w, -x, -y, -z]

Using multiplication formula:
w_result = w·w - x·(-x) - y·(-y) - z·(-z)
         = w² + x² + y² + z²
         = ||q||²

x_result = w·(-x) + x·w + y·(-z) - z·(-y)
         = -wx + wx - yz + yz
         = 0

Similarly, y_result = 0, z_result = 0

Therefore: q * q̅ = [||q||², 0, 0, 0]
```

**For unit quaternions (||q|| = 1):**

```text
q * q̅ = [1, 0, 0, 0] = identity
```

**Corollary:** q̅ = q⁻¹ for unit quaternions

### Proof 2: ||q₁ * q₂|| = ||q₁|| · ||q₂||

**Proof:**

```text
||q₁ * q₂||² = (q₁ * q₂) · (q₁ * q₂)
             = (q₁ * q₂) * (q₁ * q₂)̅
             = (q₁ * q₂) * (q̅₂ * q̅₁)  [conjugate reverses order]
             = q₁ * (q₂ * q̅₂) * q̅₁
             = q₁ * [||q₂||², 0, 0, 0] * q̅₁
             = ||q₂||² · (q₁ * q̅₁)
             = ||q₂||² · ||q₁||²

Therefore: ||q₁ * q₂|| = ||q₁|| · ||q₂||
```

**Implication:** Product of unit quaternions is unit quaternion.

---

## Converting to/from Rotation Matrices

### Quaternion → Rotation Matrix

**Formula:**

```text
R = ┌                                                    ┐
    │ 1-2(y²+z²)   2(xy-wz)     2(xz+wy)   │
    │ 2(xy+wz)     1-2(x²+z²)   2(yz-wx)   │
    │ 2(xz-wy)     2(yz+wx)     1-2(x²+y²) │
    └                                                    ┘
```

**Code:**

```python
def to_rotation_matrix(self) -> np.ndarray:
    """Convert to 3×3 rotation matrix."""
    w, x, y, z = self.w, self.x, self.y, self.z
    
    return np.array([
        [1 - 2*(y**2 + z**2), 2*(x*y - w*z), 2*(x*z + w*y)],
        [2*(x*y + w*z), 1 - 2*(x**2 + z**2), 2*(y*z - w*x)],
        [2*(x*z - w*y), 2*(y*z + w*x), 1 - 2*(x**2 + y**2)]
    ])
```

### Rotation Matrix → Quaternion

**Algorithm:** (Shepperd's method for numerical stability)

```python
@classmethod
def from_rotation_matrix(cls, R: np.ndarray) -> "Quaternion":
    """
    Convert 3×3 rotation matrix to quaternion.
    
    Uses Shepperd's method for numerical stability.
    """
    trace = np.trace(R)
    
    if trace > 0:
        s = math.sqrt(trace + 1.0) * 2
        w = 0.25 * s
        x = (R[2,1] - R[1,2]) / s
        y = (R[0,2] - R[2,0]) / s
        z = (R[1,0] - R[0,1]) / s
    elif R[0,0] > R[1,1] and R[0,0] > R[2,2]:
        s = math.sqrt(1.0 + R[0,0] - R[1,1] - R[2,2]) * 2
        w = (R[2,1] - R[1,2]) / s
        x = 0.25 * s
        y = (R[0,1] + R[1,0]) / s
        z = (R[0,2] + R[2,0]) / s
    # ... more cases
    
    return cls(w, x, y, z)
```

---

## Quaternion Interpolation Theory

### Linear Interpolation (LERP)

**Definition:**

```text
LERP(q₁, q₂, t) = (1-t)·q₁ + t·q₂
```

**Problem:** Result is NOT on unit sphere!

```text
||LERP(q₁, q₂, t)|| ≠ 1 (in general)
```

**Solution:** Normalize after:

```text
NLERP(q₁, q₂, t) = normalize(LERP(q₁, q₂, t))
```

**Issue with NLERP:**

- ❌ Variable angular velocity
- ❌ Moves faster in middle, slower at ends
- ❌ Non-constant speed looks unnatural

### Spherical Linear Interpolation (SLERP)

**Definition:**

```text
SLERP(q₁, q₂, t) = q₁(q₁⁻¹q₂)ᵗ

Alternative formula:
SLERP(q₁, q₂, t) = (sin((1-t)Ω)/sin(Ω))·q₁ + (sin(tΩ)/sin(Ω))·q₂

Where:
  Ω = arccos(q₁ · q₂)  [angle between quaternions]
  t ∈ [0, 1]           [interpolation parameter]
```

**Properties:**

- ✅ Result is unit quaternion
- ✅ Constant angular velocity
- ✅ Shortest path on S³
- ✅ Smooth, natural motion

**Geometric interpretation:**

- Moves along great circle arc on 4D sphere
- Like moving along equator of Earth (shortest path)

**Code:**

```python
def slerp(q1: Quaternion, q2: Quaternion, t: float) -> Quaternion:
    """
    Spherical linear interpolation.
    
    Args:
        q1: Start quaternion
        q2: End quaternion
        t: Parameter in [0, 1]
    
    Returns:
        Interpolated quaternion at parameter t
    
    Formula:
        SLERP(q₁, q₂, t) = (sin((1-t)Ω)/sin(Ω))·q₁ + (sin(tΩ)/sin(Ω))·q₂
    """
    # Ensure shortest path
    dot = q1.dot(q2)
    if dot < 0:
        q2 = Quaternion(-q2.w, -q2.x, -q2.y, -q2.z)
        dot = -dot
    
    # Clamp dot product
    dot = np.clip(dot, -1.0, 1.0)
    
    # Calculate angle
    omega = math.acos(dot)
    sin_omega = math.sin(omega)
    
    # Handle near-parallel quaternions
    if abs(sin_omega) < EPSILON:
        # Use linear interpolation
        return Quaternion(
            (1-t)*q1.w + t*q2.w,
            (1-t)*q1.x + t*q2.x,
            (1-t)*q1.y + t*q2.y,
            (1-t)*q1.z + t*q2.z
        ).normalize()
    
    # Standard SLERP formula
    a = math.sin((1-t) * omega) / sin_omega
    b = math.sin(t * omega) / sin_omega
    
    return Quaternion(
        a*q1.w + b*q2.w,
        a*q1.x + b*q2.x,
        a*q1.y + b*q2.y,
        a*q1.z + b*q2.z
    )
```

---

## Numerical Stability

### Precision Issues

**Problem:** Floating-point errors accumulate.

**Solutions:**

1. **Epsilon Comparisons**

   ```python
   EPSILON = 1e-6
   
   if abs(magnitude - 1.0) < EPSILON:
       # Treat as unit
   ```

2. **Clipping**

   ```python
   # arccos requires input in [-1, 1]
   dot = np.clip(q1.dot(q2), -1.0, 1.0)
   angle = math.acos(dot)
   ```

3. **Normalization**

   ```python
   # Renormalize after operations
   q_result = q1.multiply(q2).normalize()
   ```

4. **Special Case Handling**

   ```python
   if abs(sin_half_angle) < EPSILON:
       # Use identity or alternative formula
   ```

### Catastrophic Cancellation

**Problem:** Subtracting nearly equal numbers loses precision.

**Example:**

```python
# Bad: loses precision if w ≈ 1
angle = 2 * arccos(w)

# Better: use alternative formula if w ≈ 1
if w > 0.9999:
    angle = 2 * arcsin(sqrt(x² + y² + z²))
```

---

## Quaternion vs Other Representations

### Euler Angles

**Pros:**

- Intuitive (pitch, yaw, roll)
- Only 3 numbers

**Cons:**

- ❌ Gimbal lock
- ❌ Discontinuities
- ❌ Hard to interpolate

### Rotation Matrices

**Pros:**

- Direct vector rotation
- No gimbal lock

**Cons:**

- 9 numbers (redundant)
- Orthonormality constraints
- Expensive to interpolate

### Axis-Angle

**Pros:**

- Geometric intuition
- 4 numbers (like quaternion)

**Cons:**

- Hard to compose rotations
- Hard to interpolate
- Discontinuity at θ = 0

### Quaternions

**Pros:**

- ✅ No gimbal lock
- ✅ Smooth interpolation (SLERP)
- ✅ Compact (4 numbers)
- ✅ Efficient composition
- ✅ Numerically stable

**Cons:**

- Less intuitive
- Requires normalization
- Double cover (q and -q)

**Verdict:** Best for animation and continuous rotations.

---

## Advanced Topics

### Quaternion Exponential

**Definition:**

```text
exp(q) = exp(w) · [cos(||v||), (v/||v||)·sin(||v||)]

Where v = [x, y, z] is the vector part
```

**Use case:** Quaternion differential equations

### Quaternion Logarithm

**Definition:**

```text
log(q) = [log(||q||), (v/||v||)·arccos(w/||q||)]
```

**Use case:** Extracting rotation velocity

### Quaternion Power

**Definition:**

```text
qᵗ = exp(t · log(q))

For unit quaternion with axis-angle [n̂, θ]:
qᵗ = [cos(tθ/2), sin(tθ/2)·n̂]
```

**Use case:** Scaling rotations

**Code:**

```python
def power(self, t: float) -> Quaternion:
    """
    Raise quaternion to power t.
    
    For unit quaternion representing rotation by θ:
    qᵗ represents rotation by t·θ
    """
    axis, angle = self.to_axis_angle()
    new_angle = t * angle
    return Quaternion.from_axis_angle(axis, new_angle)
```

**Example:**

```python
# Half rotation
q = Quaternion.from_axis_angle([0,1,0], π)  # 180° around Y
q_half = q.power(0.5)  # 90° around Y
```

---

## Applications to Emotional States

### Why Quaternions for Emotions?

1. **Continuous Representation**
   - Emotions exist in continuous space
   - Quaternions handle this naturally

2. **Smooth Transitions**
   - SLERP provides natural interpolation
   - Constant angular velocity = steady emotional change

3. **No Singularities**
   - No "stuck" states (unlike gimbal lock)
   - Can transition from any emotion to any other

4. **Composability**
   - Multiple emotional shifts compose naturally
   - q_total = q₃ *q₂* q₁

### VAC as Rotation Axis

**Interpretation:**

```text
VAC[v, a, c] → Rotation axis [v, a, c]
```

The direction in VAC space determines the **type** of emotional state.
The magnitude determines the **intensity**.

**Example:**

```text
Pure joy: [1, 0, 0] → Rotation around X-axis (valence)
Pure excitement: [0, 1, 0] → Rotation around Y-axis (arousal)
Pure connection: [0, 0, 1] → Rotation around Z-axis (connection)
```

---

## Mathematical References

### Seminal Papers

1. **Hamilton, W.R. (1843)** - "On Quaternions"
   - Original quaternion algebra

2. **Shoemake, K. (1985)** - "Animating Rotation with Quaternion Curves"
   - SLERP algorithm
   - Computer graphics standard

3. **Hanson, A.J. (2006)** - "Visualizing Quaternions"
   - Geometric interpretation
   - 4D sphere visualization

### Online Resources

- **3Blue1Brown:** Quaternion visualization videos
- **Wikipedia:** Comprehensive quaternion reference
- **Wolfram MathWorld:** Formal definitions and proofs

---

## Next Steps

- **[VAC Conversion](03-vac-conversion.md)** - How we convert VAC to quaternions
- **[SLERP Interpolation](04-slerp-interpolation.md)** - Deep dive into SLERP
- **[SciPy Integration](05-scipy-integration.md)** - Using SciPy's rotation tools

---

**Previous:** [← Deep Dive Architecture](01-deep-dive.md)  
**Next:** [VAC Conversion →](03-vac-conversion.md)
