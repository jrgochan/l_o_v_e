# Versor Module - Overview

## Executive Summary

The **Versor Module** is the mathematical heart of Project L.O.V.E. (Listener-Observer-Versor-Experience). While the Listener deals with the ambiguity of language, the Observer manages the persistence of history, and the Experience creates the visual output, the Versor deals in **absolute mathematical truths**.

The Versor is a **stateless microservice** dedicated to the geometric topology of emotion. It is responsible for:

- **Quaternion Construction**: Converting VAC scalars to 3D rotational orientations
- **Transition Calculations**: Computing the "work" required to shift between emotional states
- **Path Generation**: Creating smooth interpolation paths (SLERP) for animation
- **Insight Analysis**: Identifying dominant axes of change

## The Core Problem: Gimbal Lock

### Why Not Euler Angles?

Traditional 3D rotation uses **Euler angles** (pitch, yaw, roll), which suffer from a critical flaw: **Gimbal Lock**.

**What is Gimbal Lock?**
When two rotation axes align, you lose a degree of freedom. This creates a mathematical singularity where certain rotations become impossible to represent.

**Emotional Metaphor**: Gimbal Lock represents emotional "stuckness"—the state of trauma or flooding where a person loses the ability to pivot or gain perspective.

**Example**:
1. Rotate 90° around X-axis (pitch)
2. Y-axis and Z-axis are now parallel
3. You've lost the ability to distinguish between yaw and roll
4. Certain transitions require passing through undefined states

### Quaternions: The Solution

**Quaternions** avoid this singularity entirely. They:
- ✅ Have no gimbal lock
- ✅ Allow smooth interpolation (SLERP)
- ✅ Are computationally efficient
- ✅ Represent the full range of 3D rotations

**In emotional terms**: Quaternions allow the system to model ANY transition between states without mathematical "blind spots."

## The VAC Model

The Versor operates on the **Valence-Arousal-Connection (VAC)** model:

| Axis | Symbol | Range | Meaning |
|------|--------|-------|---------|
| **Valence** | X | -1.0 to +1.0 | Pleasantness (positive) vs. unpleasantness (negative) |
| **Arousal** | Y | -1.0 to +1.0 | Energy level (excited vs. calm) |
| **Connection** | Z | -1.0 to +1.0 | Relational alignment (connected vs. disconnected) |

This replaces the traditional VAD model's "Dominance" with "Connection," enabling critical distinctions like:

**Pity vs. Compassion**
- Pity: `[-0.3, -0.2, -0.6]` - Feeling FOR (separation)
- Compassion: `[-0.3, -0.2, +0.8]` - Feeling WITH (connection)
- **Difference**: Pure Z-axis rotation (connection shift)

## Core Responsibilities

### 1. VAC to Quaternion Conversion

Transform 3D emotional vectors into 4D rotational orientations:

```
Input:  VAC [valence, arousal, connection]
Output: Quaternion [w, x, y, z]
```

**Algorithm**:
1. Calculate magnitude (intensity)
2. Normalize axis (direction)
3. Calculate rotation angle
4. Construct quaternion using axis-angle formula

### 2. Transition Calculation

Compute the "work" required to shift between states:

```
Angular Distance: φ = 2 × arccos(|w_transition|)
Elasticity: E = φ / Δt
```

**Interpretation**:
- Small φ: User is stable, ruminating
- Large φ (>90°): Radical emotional shift
- High E (>2.0 rad/s): Flooding/overwhelm

### 3. SLERP Path Generation

Create smooth animation paths for the Experience module:

```
SLERP(q₁, q₂, t) = interpolation along 4D hypersphere
```

Generates 60-120 intermediate quaternions for fluid Soul Sphere rotation.

### 4. Insight Analysis

Identify which emotional dimension changed most:

- **VALENCE_SHIFT**: Feeling better/worse
- **AROUSAL_SHIFT**: Energy level change
- **CONNECTION_SHIFT**: Moving toward/away from others

## Architectural Position in L.O.V.E. Stack

```
┌──────────────────────────────────────────────────────┐
│                    USER INPUT                        │
│             (Voice Note / Text)                      │
└─────────────────────┬────────────────────────────────┘
                      │
                      ↓
┌──────────────────────────────────────────────────────┐
│                   LISTENER                           │
│  Speech-to-Text → LLM Analysis → VAC Scalars        │
└─────────────────────┬────────────────────────────────┘
                      │
                      ↓
┌──────────────────────────────────────────────────────┐
│                   OBSERVER                           │
│  Persistence + Context + Previous State Retrieval   │
└─────────────────────┬────────────────────────────────┘
                      │
                      ↓
┌──────────────────────────────────────────────────────┐
│                   VERSOR  ⭐ YOU ARE HERE            │
│  ┌────────────────────────────────────────────────┐  │
│  │  1. Receive VAC vector + previous quaternion  │  │
│  │  2. Convert VAC → current quaternion          │  │
│  │  3. Calculate transition quaternion           │  │
│  │  4. Compute angular distance (φ)              │  │
│  │  5. Calculate elasticity (E = φ / Δt)         │  │
│  │  6. Detect flooding (E > threshold)           │  │
│  │  7. Generate SLERP path (60-120 frames)       │  │
│  │  8. Identify dominant axis                    │  │
│  │  9. Return trajectory response                │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  Pure Mathematical Engine (Stateless)                │
│  - No database                                       │
│  - No persistence                                    │
│  - No state management                               │
└─────────────────────┬────────────────────────────────┘
                      │
                      ↓
┌──────────────────────────────────────────────────────┐
│                   EXPERIENCE                         │
│  Receives quaternions → Animates Soul Sphere        │
└──────────────────────────────────────────────────────┘
```

## Technology Stack

| Component | Technology | Justification |
|-----------|------------|---------------|
| **Language** | Python 3.11+ | Scientific computing ecosystem |
| **Framework** | FastAPI | Async support, auto OpenAPI docs |
| **Math Library** | NumPy | Vector operations |
| **Rotation Library** | SciPy | Robust SLERP implementation |
| **Validation** | Pydantic | Type safety, schema enforcement |
| **Server** | Uvicorn | High-performance ASGI |

## Key Innovations

### 1. Scalar-First Convention

The Versor uses **scalar-first quaternion notation** `[w, x, y, z]`:
- Matches mathematical literature
- Aligns with SRS specification
- Requires adapter layer for SciPy (which uses scalar-last)

### 2. Double-Cover Correction

Ensures SLERP always takes the shortest path:

```python
if q₁ · q₂ < 0:
    q₂ = -q₂  # Negate to ensure short path
```

This prevents 270° rotations when 90° would suffice.

### 3. Flooding Detection

Automatically detects emotional overwhelm:

```
If E > 2.0 rad/s:
    is_flooding = True
    → Trigger Experience module warning
    → Suggest Listener throttle inputs
```

### 4. Stateless Design

The Versor maintains **no persistent state**:
- Enables horizontal scaling
- Simplifies deployment
- Eliminates consistency issues
- Observer provides all necessary context

## Success Criteria

The Versor succeeds when:

1. **Mathematical Correctness**: All quaternions are unit length (||q|| = 1.0 ± 1e-6)
2. **Performance**: P99 latency < 50ms on standard hardware
3. **Semantic Validity**: Pity → Compassion test shows CONNECTION_SHIFT
4. **Smooth Visualization**: SLERP produces constant angular velocity
5. **No Gimbal Lock**: All emotional transitions are representable

## What Makes This Different

Traditional emotion tracking:
- ❌ Maps emotions to 2D grids (flat)
- ❌ Uses Euler angles (gimbal lock risk)
- ❌ Linear interpolation (variable velocity)
- ❌ Treats emotions as static points

The Versor:
- ✅ Maps emotions as 3D orientations
- ✅ Uses quaternions (no singularities)
- ✅ Spherical interpolation (constant velocity)
- ✅ Treats emotions as dynamic rotations

## Next Steps

To implement the Versor module, proceed through the documentation in order:

1. **01-architecture.md** - Understand the microservice design
2. **02-mathematical-foundation.md** - Master the quaternion mathematics
3. **03-vac-to-quaternion.md** - Learn the conversion algorithm
4. **04-transition-calculations.md** - Calculate emotional work
5. Continue through remaining guides...

---

**Remember**: The Versor is not a calculator—it's a **translation engine** that converts the qualitative concepts of Atlas of the Heart into the precise, non-commutative algebra of quaternions, enabling visualization of the soul's trajectory through emotional space.
