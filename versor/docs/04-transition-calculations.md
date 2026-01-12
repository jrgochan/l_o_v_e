# Versor Module - Transition Calculations

## Overview

The Versor quantifies **Emotional Work**—the rotational effort required to shift from one emotional state to another. This is expressed as the angular distance φ between quaternions.

## Core Concept

**Emotional transitions are not linear paths—they are rotations** through conceptual space. Moving from Anger to Calm isn't a straight line; it's an arc involving changes in Valence, Arousal, and Connection simultaneously.

## Transition Quaternion

### Formula

The **transition quaternion** represents the rotation needed to move from state A to state B:

```
q_transition = q_target × q_start*
```

Where:
- `q_target` = Destination emotional state
- `q_start*` = Conjugate of starting state
- `×` = Quaternion multiplication (non-commutative!)

### Why the Conjugate?

**Geometric Interpretation**:
1. `q_start*` "undoes" the starting rotation (returns to identity)
2. `q_target` applies the target rotation
3. Net effect: Direct rotation from start to target

### Implementation

```python
# app/core/transitions.py

from app.core.quaternion import Quaternion

def calculate_transition(
    q_start: Quaternion,
    q_target: Quaternion
) -> Quaternion:
    """
    Calculate the transition quaternion.
    
    Args:
        q_start: Starting emotional state
        q_target: Target emotional state
    
    Returns:
        Transition quaternion representing the rotation between states
    """
    # Get conjugate of start
    q_start_conjugate = q_start.conjugate()
    
    # Multiply: q_target × q_start*
    q_transition = q_target.multiply(q_start_conjugate)
    
    return q_transition
```

### Worked Example

**Given**:
- Start: Anger = [0.0499, -0.5179, 0.8287, -0.2072]
- Target: Calm = [0.5878, 0.5635, -0.4932, 0.3252]

**Step 1**: Conjugate of start
```
q_anger* = [0.0499, 0.5179, -0.8287, 0.2072]
```

**Step 2**: Multiply (using Hamilton product)
```
q_trans = q_calm × q_anger*
        ≈ [0.7234, 0.3156, -0.5892, 0.1789]
```

**Verification**: ||q_trans|| ≈ 1.0 ✓

## Angular Distance

### Formula

The **angular distance** φ measures the "size" of the emotional shift:

```
φ = 2 × arccos(|w_transition|)
```

**Why absolute value?**
- Quaternions have double-cover: q and -q = same rotation
- We want the actual angle, not the representation
- Always choose 0° ≤ φ ≤ 180°

### Interpretation

| φ Range | Interpretation | Example Transition |
|---------|----------------|-------------------|
| 0° - 15° | Micro-adjustment (rumination) | Joy → Happiness |
| 15° - 45° | Subtle shift | Contentment → Interest |
| 45° - 90° | Noticeable change | Calm → Excitement |
| 90° - 135° | Major transition | Disappointment → Hope |
| 135° - 180° | Radical shift | Shame → Self-Compassion |

### Implementation

```python
import math

def angular_distance(q_transition: Quaternion) -> float:
    """
    Calculate angular distance from transition quaternion.
    
    Args:
        q_transition: Transition quaternion (q_target × q_start*)
    
    Returns:
        Angular distance in radians [0, π]
    """
    # Clamp w to [-1, 1] for numerical stability
    w_clamped = max(-1.0, min(1.0, q_transition.w))
    
    # Calculate angle
    phi = 2 * math.acos(abs(w_clamped))
    
    return phi
```

### Worked Example

Using q_trans from previous example:

```
w_trans = 0.7234
φ = 2 × arccos(|0.7234|)
  = 2 × arccos(0.7234)
  = 2 × 0.7592 rad
  ≈ 1.518 rad
  ≈ 87.0°
```

**Interpretation**: Moving from Anger to Calm requires a 87° rotation—significant emotional work.

## Elasticity Metric

### Formula

**Elasticity** measures the velocity of emotional change:

```
E = φ / Δt
```

Where:
- `E` = Elasticity (radians per second)
- `φ` = Angular distance (radians)
- `Δt` = Time elapsed since previous state (seconds)

### Interpretation

| E Range | State | Action |
|---------|-------|--------|
| < 0.5 rad/s | Stable | Normal processing |
| 0.5 - 2.0 rad/s | Transitioning | Moderate change |
| > 2.0 rad/s | **Flooding** | Throttle inputs, warn user |

### Implementation

```python
def calculate_elasticity(
    angular_distance: float,
    time_delta: float
) -> float:
    """
    Calculate elasticity (velocity of change).
    
    Args:
        angular_distance: φ in radians
        time_delta: Δt in seconds
    
    Returns:
        Elasticity in rad/s
    """
    if time_delta <= 0:
        return 0.0
    
    elasticity = angular_distance / time_delta
    
    return elasticity
```

### Flooding Detection

```python
FLOODING_THRESHOLD = 2.0  # rad/s (configurable)

def detect_flooding(elasticity: float) -> bool:
    """
    Detect if user is experiencing emotional flooding.
    
    Flooding = rapid state changes that overwhelm processing
    """
    return elasticity > FLOODING_THRESHOLD
```

**Example**:
```
Transition: Anger → Calm
Angular distance: 1.518 rad (87°)
Time elapsed: 0.5 seconds

E = 1.518 / 0.5 = 3.036 rad/s

3.036 > 2.0 → Flooding detected! ⚠️
```

## Dominant Axis Detection

### Purpose

Identify which emotional dimension changed most significantly.

### Algorithm

**Input**: Transition quaternion q_trans = [w, x, y, z]

**Steps**:
1. Extract vector components: [x, y, z]
2. Find maximum absolute value
3. Map to axis code

```python
def detect_dominant_axis(q_trans: Quaternion) -> str:
    """
    Identify dominant axis of change.
    
    Returns:
        "VALENCE_SHIFT" | "AROUSAL_SHIFT" | "CONNECTION_SHIFT" | "NEUTRAL"
    """
    abs_x = abs(q_trans.x)
    abs_y = abs(q_trans.y)
    abs_z = abs(q_trans.z)
    
    max_component = max(abs_x, abs_y, abs_z)
    
    # Threshold for significance
    if max_component < 0.1:
        return "NEUTRAL"
    
    # Find dominant
    if abs_x == max_component:
        return "VALENCE_SHIFT"
    elif abs_y == max_component:
        return "AROUSAL_SHIFT"
    else:
        return "CONNECTION_SHIFT"
```

### Insight Generation

Map axis codes to human-readable insights:

```python
INSIGHT_MESSAGES = {
    "VALENCE_SHIFT": "You're feeling better or worse, but your energy is constant.",
    "AROUSAL_SHIFT": "You're shifting energy levels. Try to ground yourself.",
    "CONNECTION_SHIFT": "You're moving toward or away from others.",
    "NEUTRAL": "You're maintaining a steady state."
}

def generate_insight(axis_code: str) -> str:
    return INSIGHT_MESSAGES.get(axis_code, "State change detected.")
```

## Complete Transition Pipeline

```python
# app/core/transitions.py

from typing import Tuple
import math

def process_transition(
    q_start: Quaternion,
    q_target: Quaternion,
    time_delta: float = 1.0,
    flooding_threshold: float = 2.0
) -> TransitionResult:
    """
    Complete transition analysis pipeline.
    
    Returns:
        TransitionResult with all metrics
    """
    # 1. Calculate transition quaternion
    q_trans = calculate_transition(q_start, q_target)
    
    # 2. Calculate angular distance
    phi = angular_distance(q_trans)
    
    # 3. Calculate elasticity
    elasticity = calculate_elasticity(phi, time_delta)
    
    # 4. Detect flooding
    is_flooding = elasticity > flooding_threshold
    
    # 5. Detect dominant axis
    axis_code = detect_dominant_axis(q_trans)
    
    # 6. Generate insight
    insight = generate_insight(axis_code)
    
    return TransitionResult(
        transition_quaternion=q_trans,
        angular_distance_radians=phi,
        angular_distance_degrees=math.degrees(phi),
        elasticity=elasticity,
        is_flooding=is_flooding,
        dominant_axis=axis_code,
        insight_text=insight
    )
```

## Testing

### Unit Tests

```python
def test_transition_from_identity():
    """Transition from neutral should equal target state"""
    q_identity = Quaternion.identity()
    q_joy = VACVector(0.9, 0.7, 0.8).to_quaternion()
    
    q_trans = calculate_transition(q_identity, q_joy)
    
    # Should be approximately equal to q_joy
    assert abs(q_trans.w - q_joy.w) < 1e-5
    assert abs(q_trans.x - q_joy.x) < 1e-5

def test_angular_distance_to_self():
    """Angular distance from state to itself should be zero"""
    q = VACVector(0.5, 0.3, 0.6).to_quaternion()
    q_trans = calculate_transition(q, q)
    phi = angular_distance(q_trans)
    
    assert phi < 1e-5  # Essentially zero

def test_flooding_detection():
    """High elasticity should trigger flooding"""
    phi = 3.0  # radians
    time_delta = 1.0  # second
    
    elasticity = calculate_elasticity(phi, time_delta)
    assert elasticity == 3.0
    
    is_flooding = detect_flooding(elasticity)
    assert is_flooding == True
```

### Canonical Tests

```python
def test_pity_to_compassion_connection_shift():
    """Critical: Pity → Compassion must show CONNECTION_SHIFT"""
    pity = VACVector(-0.3, -0.2, -0.6).to_quaternion()
    compassion = VACVector(-0.3, -0.2, 0.8).to_quaternion()
    
    q_trans = calculate_transition(pity, compassion)
    axis_code = detect_dominant_axis(q_trans)
    
    assert axis_code == "CONNECTION_SHIFT", \
        "Pity→Compassion MUST be a pure connection shift"
```

## Next Steps

Now that you understand transition calculations:
- **05-slerp-interpolation.md** - Generate smooth animation paths
- **06-api-specification.md** - FastAPI endpoint implementation
- **07-scipy-integration.md** - Handle library conventions
