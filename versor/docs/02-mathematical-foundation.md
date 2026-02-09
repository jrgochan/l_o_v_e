# Versor Module - Mathematical Foundation

## Overview

This document provides the complete mathematical foundation for the Versor engine. It explains the theoretical basis for representing emotions as quaternion rotations in 3D space and details every calculation performed by the system.

## Prerequisites

- Linear algebra (vectors, matrices, dot products)
- Trigonometry (sin, cos, arccos)
- Basic quaternion algebra
- Euclidean geometry

## Quaternion Fundamentals

### What is a Quaternion?

A **quaternion** is a 4-dimensional hypercomplex number:

```
q = w + xi + yj + zk
```

Where:
- `w` = scalar (real) part
- `x, y, z` = vector (imaginary) parts
- `i, j, k` = imaginary units satisfying: **i² = j² = k² = ijk = -1**

### Component Notation

**Scalar-First (L.O.V.E. Convention)**:
```
q = [w, x, y, z]
```

**Scalar-Last (SciPy Convention)**:
```
q = [x, y, z, w]
```

⚠️ **Critical**: The Versor uses scalar-first internally and externally. SciPy adapter handles conversion.

### Unit Quaternions (Versors)

A **unit quaternion** has magnitude 1:

```
||q|| = √(w² + x² + y² + z²) = 1
```

**Why unit quaternions?**
- Represent pure rotations without scaling
- Avoid numerical drift during calculations
- Maintain geometric meaning

### Quaternion Operations

#### 1. Conjugate

```
q* = w - xi - yj - zk
```

**Geometric meaning**: Represents the inverse rotation

**Example**:
- q = [0.7071, 0.7071, 0, 0] (90° around X)
- q* = [0.7071, -0.7071, 0, 0] (-90° around X)

#### 2. Multiplication (Hamilton Product)

For q₁ = [w₁, x₁, y₁, z₁] and q₂ = [w₂, x₂, y₂, z₂]:

```
q₁ × q₂ = [
    w₁w₂ - x₁x₂ - y₁y₂ - z₁z₂,  # w
    w₁x₂ + x₁w₂ + y₁z₂ - z₁y₂,  # x
    w₁y₂ - x₁z₂ + y₁w₂ + z₁x₂,  # y
    w₁z₂ + x₁y₂ - y₁x₂ + z₁w₂   # z
]
```

⚠️ **Non-commutative**: q₁ × q₂ ≠ q₂ × q₁

#### 3. Dot Product

```
q₁ · q₂ = w₁w₂ + x₁x₂ + y₁y₂ + z₁z₂
```

**Geometric meaning**: Measures similarity between rotations

**Properties**:
- q · q = ||q||² (magnitude squared)
- Range for unit quaternions: [-1, 1]

## Axis-Angle Representation

### Concept

Any 3D rotation can be represented as:
- **Axis**: Unit vector û = [uₓ, uᵧ, uᵧ] where ||û|| = 1
- **Angle**: Rotation angle θ around that axis

### Conversion Formula

```
q = cos(θ/2) + sin(θ/2)(uₓi + uᵧj + uᵧk)
```

**In component form**:
```
q = [
    cos(θ/2),        # w
    uₓ × sin(θ/2),   # x
    uᵧ × sin(θ/2),   # y
    uᵧ × sin(θ/2)    # z
]
```

**Why half-angle?**
- Quaternions use **double-cover**: q and -q represent same rotation
- Using θ/2 allows full 360° range representation
- Ensures smooth interpolation

### Example: 90° Around X-Axis

**Input**:
- Axis: [1, 0, 0]
- Angle: π/2 (90°)

**Calculation**:
```
θ/2 = π/4
cos(π/4) = 0.7071
sin(π/4) = 0.7071

q = [0.7071, 1×0.7071, 0×0.7071, 0×0.7071]
  = [0.7071, 0.7071, 0, 0]
```

**Verification**: ||q|| = √(0.5 + 0.5) = 1.0 ✓

## The Identity Quaternion

**Definition**:
```
q_identity = [1, 0, 0, 0]
```

**Geometric meaning**: No rotation (0° around any axis)

**Properties**:
- q × q_identity = q (identity element)
- Represents "neutral" emotional state in L.O.V.E.

## Double-Cover Property

**Key Insight**: Quaternions q and -q represent the **same** 3D rotation.

**Example**:
- q₁ = [0.7071, 0.7071, 0, 0] (90° around X)
- q₂ = [-0.7071, -0.7071, 0, 0] (also 90° around X!)

**Implication for SLERP**: Must choose shortest path (see doc 05).

## Mathematical Properties

### Quaternion Identities

1. **Inverse**: q × q* = q* × q = 1 (for unit quaternions)
2. **Associativity**: (q₁ × q₂) × q₃ = q₁ × (q₂ × q₃)
3. **Non-commutativity**: q₁ × q₂ ≠ q₂ × q₁
4. **Conjugate of product**: (q₁ × q₂)* = q₂* × q₁*

### Geodesic Property

SLERP follows the **geodesic** (shortest path) on the 4D unit hypersphere:
- Just as great circles are shortest paths on Earth's surface
- SLERP finds shortest path on quaternion sphere
- Ensures constant angular velocity

## Numerical Stability

### Epsilon Threshold

```python
EPSILON = 1e-6
```

Used for:
- Zero vector detection
- Unit norm validation
- Equality comparisons

### Normalization

After any operation, verify unit norm:

```python
tolerance = abs(||q|| - 1.0) < 1e-6

if not tolerance:
    q_normalized = q / ||q||
```

## Next Steps

Now that you understand the mathematical foundation:
- **03-vac-to-quaternion.md** - The conversion algorithm
- **04-transition-calculations.md** - Computing emotional work
- **05-slerp-interpolation.md** - Smooth path generation
