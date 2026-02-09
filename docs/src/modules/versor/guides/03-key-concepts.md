# Key Concepts - Versor Module

Understanding the Versor requires grasping several mathematical concepts. Don't worry—we'll explain everything clearly with visual examples and intuition.

---

## The Big Picture

The Versor translates **emotional states** (3D vectors) into **rotations** (quaternions), enabling smooth animation and accurate calculations.

**The Flow:**

```text
Emotion (VAC) → Rotation (Quaternion) → Animation (SLERP)
```

---

## 1. The VAC Model

### What is VAC?

**VAC** stands for **Valence-Arousal-Connection**—a 3D model for emotions.

| Axis | Range | Meaning | Examples |
|------|-------|---------|----------|
| **Valence (X)** | -1.0 to +1.0 | Pleasant (+) vs. Unpleasant (-) | Joy (+0.9), Grief (-0.8) |
| **Arousal (Y)** | -1.0 to +1.0 | Energized (+) vs. Calm (-) | Excitement (+0.8), Peace (-0.6) |
| **Connection (Z)** | -1.0 to +1.0 | Connected (+) vs. Disconnected (-) | Compassion (+0.8), Loneliness (-0.7) |

### The Innovation: Connection Axis

Traditional emotion models use **VAD** (Valence-Arousal-Dominance). We replace **Dominance** with **Connection** because it better captures relational emotions.

**Critical Distinction:**

```text
Pity:       VAC[-0.3, -0.2, -0.6]  # Feeling FOR someone (separation)
Compassion: VAC[-0.3, -0.2, +0.8]  # Feeling WITH someone (connection)
```

Same valence and arousal, but **opposite connection**. Traditional VAD models can't tell these apart!

### Visualizing VAC Space

Imagine a 3D coordinate system:

```text
              +Arousal (Excited)
                     |
                     |
   -Valence ---------|--------- +Valence
  (Negative)         |         (Positive)
                     |
              -Arousal (Calm)

                     ⊙ Connection axis
                   (out/in of page)
```

Every emotion is a point in this 3D space.

---

## 2. Quaternions

### What is a Quaternion?

A **quaternion** is a 4D number that represents a rotation in 3D space.

**Notation:** `q = [w, x, y, z]`

- **w**: Scalar part (real number)
- **x, y, z**: Vector part (3D imaginary components)

**Example:**

```python
q = Quaternion(w=0.707, x=0.0, y=0.707, z=0.0)
# Represents a 90° rotation around the Y-axis
```

### Why Not Euler Angles?

**Euler angles** (pitch, yaw, roll) seem simpler but have a fatal flaw: **gimbal lock**.

#### The Gimbal Lock Problem

Imagine three nested rings (gimbals):

1. Outer ring rotates around Z-axis
2. Middle ring rotates around X-axis
3. Inner ring rotates around Y-axis

**What happens:**

- Rotate middle ring 90°
- Now outer and inner rings are parallel!
- You've lost one degree of freedom
- Certain rotations become impossible

**Emotional Metaphor:**
Gimbal lock = being emotionally "stuck" with no perspective to pivot.

#### Quaternions Solve This

Quaternions:

- ✅ No gimbal lock (no singularities)
- ✅ Smooth interpolation (SLERP)
- ✅ Compact (4 numbers vs 9 for matrices)
- ✅ Efficient computation

**Trade-off:** Harder to visualize, but mathematically superior.

### Quaternion Properties

#### 1. Unit Quaternions

For rotation, quaternions must be **unit length**:

```text
||q|| = √(w² + x² + y² + z²) = 1.0
```

**Why:** Only unit quaternions represent pure rotation (no scaling).

#### 2. Quaternion Multiplication

Quaternions multiply in a special way (Hamilton product):

```python
q1 * q2 ≠ q2 * q1  # NOT commutative!
```

**Meaning:** Rotation order matters (rotate around X then Y ≠ Y then X).

#### 3. Identity Quaternion

The "no rotation" quaternion:

```python
q_identity = [1, 0, 0, 0]
```

#### 4. Inverse (Conjugate)

To reverse a rotation, use the conjugate:

```python
q_conjugate = [w, -x, -y, -z]
q * q_conjugate = identity
```

### Axis-Angle Representation

Quaternions are built from an **axis** (direction) and **angle** (amount):

```python
# Rotate 90° around Y-axis
axis = [0, 1, 0]  # Y-axis (up)
angle = π/2       # 90 degrees

# Convert to quaternion
q = [cos(angle/2), sin(angle/2)*axis_x, sin(angle/2)*axis_y, sin(angle/2)*axis_z]
```

**Key insight:** The `angle/2` in the formula is why quaternions use 4D—it's measuring the "half-angle".

---

## 3. VAC → Quaternion Conversion

### The Algorithm

**Steps:**

1. Calculate **magnitude** (intensity): `r = √(v² + a² + c²)`
2. Normalize **axis** (direction): `axis = [v, a, c] / r`
3. Calculate **angle** (rotation amount)
4. Apply axis-angle formula

**Code:**

```python
def vac_to_quaternion(valence, arousal, connection):
    # 1. Magnitude
    r = sqrt(valence**2 + arousal**2 + connection**2)

    if r < EPSILON:  # Zero vector
        return Quaternion(1, 0, 0, 0)  # Identity

    # 2. Normalized axis
    axis_x = valence / r
    axis_y = arousal / r
    axis_z = connection / r

    # 3. Angle (scaled by magnitude)
    angle = r * π  # Maps [-√3, √3] to [-π√3, π√3]

    # 4. Quaternion from axis-angle
    half_angle = angle / 2
    sin_half = sin(half_angle)

    w = cos(half_angle)
    x = sin_half * axis_x
    y = sin_half * axis_y
    z = sin_half * axis_z

    return Quaternion(w, x, y, z)
```

### Intuition

- **Direction of VAC vector** → Axis of rotation
- **Magnitude of VAC vector** → Amount of rotation
- **Zero vector** → No rotation (identity quaternion)

**Example:**

```python
# Pure positive valence (joy)
vac = VACVector(valence=1.0, arousal=0.0, connection=0.0)
q = vac.to_quaternion()
# Rotates around X-axis by π radians
```

---

## 4. Transitions and Angular Distance

### What is a Transition?

A **transition** is the rotation required to go from one emotional state to another.

**Formula:**

```text
q_transition = q_start^(-1) * q_target
```

This gives you the "delta rotation"—how much you need to rotate.

### Angular Distance

**Angular distance** (φ) measures how much rotation occurred.

**Formula:**

```text
φ = 2 * arccos(|w_transition|)
```

**Interpretation:**

- `φ = 0°`: No change
- `φ = 90°`: Moderate shift
- `φ = 180°`: Complete reversal

**Example:**

```python
# From happiness to sadness
happiness = VACVector(0.8, 0.5, 0.6)
sadness = VACVector(-0.7, -0.3, -0.5)

q1 = happiness.to_quaternion()
q2 = sadness.to_quaternion()

q_trans = calculate_transition(q1, q2)
phi = angular_distance(q_trans)

print(f"Angular distance: {phi:.2f} radians")  # ~2.5 rad ≈ 143°
```

---

## 5. Elasticity Metric

### What is Elasticity?

**Elasticity (E)** measures the **rate of emotional change**—how fast someone's state is shifting.

**Formula:**

```text
E = φ / Δt  (radians per second)
```

**Interpretation:**

- **E < 1.0 rad/s**: Gradual shift (stable)
- **E ≈ 1.5 rad/s**: Moderate change
- **E > 2.0 rad/s**: Rapid shift (flooding threshold)

### Flooding Detection

When elasticity exceeds the **flooding threshold** (2.0 rad/s), the person may be emotionally overwhelmed.

**Clinical Significance:**

- Trigger alerts for therapists
- Suggest grounding techniques
- Slow down interaction pace

**Example:**

```python
phi = 2.8  # radians
dt = 1.0   # seconds

E = phi / dt  # 2.8 rad/s

if E > 2.0:
    print("⚠️ Flooding detected - emotional overwhelm likely")
```

---

## 6. SLERP (Spherical Linear Interpolation)

### What is SLERP?

**SLERP** generates a smooth path between two quaternions, maintaining **constant angular velocity**.

**Why not linear interpolation?**

- Linear interpolation in 4D space doesn't stay on the unit sphere
- Results in variable speed rotation
- Looks jerky in animation

**SLERP guarantees:**

- ✅ Stays on unit sphere (valid rotations)
- ✅ Constant angular velocity (smooth)
- ✅ Shortest path (efficient)

### The SLERP Formula

```text
SLERP(q₁, q₂, t) = (q₁ * sin((1-t)Ω) + q₂ * sin(tΩ)) / sin(Ω)

Where:
  t ∈ [0, 1]  - Interpolation parameter
  Ω = arccos(q₁ · q₂)  - Angle between quaternions
```

**Intuition:**

- Like moving along the arc of a circle
- Not the straight line (which would leave the sphere)

### Generating Animation Paths

**Purpose:** Create 60-120 frames for smooth Soul Sphere rotation in the Experience module.

**Example:**

```python
q_start = vac1.to_quaternion()
q_end = vac2.to_quaternion()

# Generate 60 frames
frames = generate_slerp_path(q_start, q_end, num_frames=60)

# frames[0] = q_start
# frames[30] = halfway rotation
# frames[59] = q_end
```

### The Double-Cover Problem

Quaternions have a quirk: `q` and `-q` represent the **same rotation**.

**Problem:** SLERP might take the long way (270° instead of 90°).

**Solution:** Check the dot product and negate if needed:

```python
if q1.dot(q2) < 0:
    q2 = -q2  # Negate to ensure shortest path
```

---

## 7. Dominant Axis Detection

### What is It?

Identifies which emotional dimension changed most in a transition.

**Returns:**

- `"VALENCE_SHIFT"` - Feeling better/worse
- `"AROUSAL_SHIFT"` - Energy level change
- `"CONNECTION_SHIFT"` - Moving toward/away from others

### Algorithm

1. Extract the vector part of transition quaternion: `[x, y, z]`
2. Find which component has largest absolute value
3. Map to axis name

**Code:**

```python
def detect_dominant_axis(q_transition):
    abs_x = abs(q_transition.x)
    abs_y = abs(q_transition.y)
    abs_z = abs(q_transition.z)

    max_val = max(abs_x, abs_y, abs_z)

    if abs_x == max_val:
        return "VALENCE_SHIFT"
    elif abs_y == max_val:
        return "AROUSAL_SHIFT"
    else:
        return "CONNECTION_SHIFT"
```

### Clinical Use

Helps therapists understand **what changed** in the person's emotional state:

- **VALENCE_SHIFT**: "You're feeling more positive/negative"
- **AROUSAL_SHIFT**: "Your energy level changed"
- **CONNECTION_SHIFT**: "Your sense of connection shifted"

---

## 8. The Pity→Compassion Test

### Why This Matters

This test **validates the entire VAC model**. It proves the Connection axis works as intended.

### The Test

```python
# Both emotions have:
# - Same valence (negative: sad for someone)
# - Same arousal (low energy)
# - DIFFERENT connection

pity = VACVector(
    valence=-0.3,
    arousal=-0.2,
    connection=-0.6   # Separated, feeling FOR them
)

compassion = VACVector(
    valence=-0.3,
    arousal=-0.2,
    connection=0.8    # Connected, feeling WITH them
)

# Convert and transition
q_pity = pity.to_quaternion()
q_compassion = compassion.to_quaternion()
q_trans = calculate_transition(q_pity, q_compassion)

# Check dominant axis
axis = detect_dominant_axis(q_trans)

assert axis == "CONNECTION_SHIFT"  # ✅ Must pass!
```

### What This Proves

Traditional VAD models would see pity and compassion as:

- Same valence: ✓
- Same arousal: ✓
- Same dominance: ? (ambiguous)

**Result:** Can't differentiate them!

The VAC model:

- Same valence: ✓
- Same arousal: ✓
- **Opposite connection**: ✓

**Result:** Clear differentiation! ✅

---

## 9. Stateless Architecture

### What Does "Stateless" Mean?

The Versor stores **no data**—it's a pure calculation engine.

**Every request is independent:**

```text
Request → Calculate → Response
(No database, no sessions, no memory)
```

### Benefits

1. **Scalability:** Easy to add more Versor instances
2. **Simplicity:** No state synchronization needed
3. **Reliability:** No database to fail
4. **Performance:** Fast (no disk I/O)

### Who Manages State?

- **Observer**: Stores quaternions in user trajectories
- **Versor**: Just does the math

**Analogy:** Versor is like a calculator—you give it numbers, it gives you results, but it doesn't remember what you calculated before.

---

## 10. Scalar-First vs Scalar-Last

### The Convention Problem

**L.O.V.E. uses:** Scalar-first `[w, x, y, z]`
**SciPy uses:** Scalar-last `[x, y, z, w]`

### Why This Matters

When calling SciPy functions (like SLERP), we must convert:

```python
# L.O.V.E. format
q_love = [0.707, 0.0, 0.707, 0.0]

# Convert to SciPy format
q_scipy = [0.0, 0.707, 0.0, 0.707]  # [x, y, z, w]

# Call SciPy
result_scipy = scipy.spatial.transform.Slerp(...)

# Convert back to L.O.V.E. format
result_love = [result_scipy[3], result_scipy[0], result_scipy[1], result_scipy[2]]
```

**The `scipy_adapter.py` module handles this automatically.**

### Why Scalar-First?

- Matches mathematical literature
- Used in game engines (Unity, Unreal)
- More intuitive notation (real part first)

---

## Key Concepts Summary

| Concept | What It Is | Why It Matters |
|---------|-----------|----------------|
| **VAC Model** | 3D emotion representation | Enables Connection axis differentiation |
| **Quaternion** | 4D rotation representation | No gimbal lock, smooth interpolation |
| **Transition** | Delta rotation between states | Measures "emotional work" |
| **Angular Distance** | Amount of rotation (φ) | Quantifies change magnitude |
| **Elasticity** | Rate of rotation (φ/Δt) | Detects emotional flooding |
| **SLERP** | Smooth interpolation | Creates animation paths |
| **Dominant Axis** | Which dimension changed most | Clinical insight generation |
| **Pity→Compassion** | Validation test | Proves Connection axis works |
| **Stateless** | No persistent storage | Enables scaling |
| **Scalar-First** | [w, x, y, z] notation | Mathematical standard |

---

## Visualizing the Concepts

### 1. VAC Space (3D)

```text
Every emotion is a point in 3D space.
Magnitude = intensity
Direction = type of emotion
```

### 2. Quaternion Sphere (4D projected to 3D)

```text
All valid quaternions lie on a 4D unit sphere.
SLERP follows the shortest arc on this sphere.
```

### 3. Transition Path

```text
Start State → [rotation sequence] → End State
          ↓
    SLERP generates smooth frames
```

---

## Common Misconceptions

### ❌ "Quaternions are just fancy vectors"

**❌ Wrong!** Quaternions have special multiplication rules and represent rotations, not positions.

### ❌ "SLERP is just averaging"

**❌ Wrong!** Linear averaging doesn't stay on the unit sphere. SLERP is spherical interpolation.

### ❌ "The Connection axis is just renamed Dominance"

**❌ Wrong!** Connection has different semantics—it's relational, not hierarchical.

### ❌ "Versor stores emotional history"

**❌ Wrong!** Versor is stateless. Observer stores history.

---

## Practice Exercises

Try these to test your understanding:

### Exercise 1: VAC Intuition

Classify these emotions by VAC:

- Joy: `VAC[?, ?, ?]`
- Sadness: `VAC[?, ?, ?]`
- Anxiety: `VAC[?, ?, ?]`
- Peace: `VAC[?, ?, ?]`

<details>
<summary>Solution</summary>

- Joy: `VAC[0.9, 0.7, 0.8]` - Positive, energized, connected
- Sadness: `VAC[-0.7, -0.5, -0.3]` - Negative, low energy, somewhat disconnected
- Anxiety: `VAC[-0.6, 0.8, -0.2]` - Negative, high energy, disconnected
- Peace: `VAC[0.6, -0.8, 0.7]` - Positive, calm, connected

</details>

### Exercise 2: Quaternion Basics

What is the quaternion for zero rotation?

<details>
<summary>Solution</summary>

`[1, 0, 0, 0]` - This is the identity quaternion.

</details>

### Exercise 3: Angular Distance

If φ = π radians, what does this mean emotionally?

<details>
<summary>Solution</summary>

φ = π ≈ 180° means a complete reversal—opposite emotional state.
Example: Happy → Sad, or Connected → Isolated

</details>

---

## Further Reading

- **Quaternions:** `versor/docs/02-mathematical-foundation.md`
- **VAC Model:** `docs/architecture/02-vac-model.md`
- **SLERP:** `versor/docs/05-slerp-interpolation.md`
- **Connection Axis:** Research papers on relational emotions

---

## Next Steps

Now that you understand the concepts:

1. **[Common Tasks](04-common-tasks.md)** - Apply these concepts practically
2. **[Testing Guide](05-testing-guide.md)** - Test your understanding
3. **[Senior Developer Guides](../architecture/01-deep-dive.md)** - Go deeper

---

**Previous:** [← Codebase Tour](02-codebase-tour.md)
**Next:** [Common Tasks →](04-common-tasks.md)
