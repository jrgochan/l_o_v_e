# Versor Module - Metrics and Insights

## Overview

The Versor calculates **temporal metrics** and generates **semantic insights** to help users understand their emotional transitions.

## Metrics

### 1. Angular Distance (φ)

**Definition**: The "size" of the emotional shift in radians.

**Formula**:
```
φ = 2 × arccos(|w_transition|)
```

**Range**: [0, π] radians (0° to 180°)

**Interpretation**:

| φ (radians) | φ (degrees) | Interpretation | Example |
|------------|-------------|----------------|---------|
| 0 - 0.26 | 0° - 15° | Micro-adjustment | Joy → Happiness |
| 0.26 - 0.79 | 15° - 45° | Subtle shift | Calm → Interest |
| 0.79 - 1.57 | 45° - 90° | Noticeable change | Boredom → Excitement |
| 1.57 - 2.36 | 90° - 135° | Major transition | Anger → Sadness |
| 2.36 - 3.14 | 135° - 180° | Radical shift | Shame → Self-Compassion |

### 2. Elasticity (E)

**Definition**: The velocity of emotional change.

**Formula**:
```
E = φ / Δt
```

**Units**: Radians per second (rad/s)

**Interpretation**:

| E (rad/s) | State | Meaning |
|-----------|-------|---------|
| < 0.5 | Stable | Ruminating, gradual change |
| 0.5 - 1.0 | Transitioning | Normal emotional dynamics |
| 1.0 - 2.0 | Shifting | Moderate-speed change |
| > 2.0 | **Flooding** | Overwhelming, rapid shifts |

**Implementation**:
```python
def calculate_elasticity(phi: float, time_delta: float) -> float:
    """Calculate elasticity (rad/s)"""
    if time_delta <= 0:
        return 0.0
    return phi / time_delta
```

### 3. Flooding Detection

**Threshold**: 2.0 rad/s (configurable)

**Logic**:
```python
FLOODING_THRESHOLD = 2.0

def detect_flooding(elasticity: float) -> bool:
    return elasticity > FLOODING_THRESHOLD
```

**Action When Flooding Detected**:
1. Set `is_flooding = True` in response
2. Experience module triggers chaos haptic pattern
3. Listener may throttle new inputs
4. UI may display "Slow down, take a breath" prompt

## Insights

### Dominant Axis Analysis

**Purpose**: Identify which emotional dimension changed most.

**Algorithm**:
```python
def detect_dominant_axis(q_trans: Quaternion) -> str:
    """
    Analyze transition quaternion to find dominant change.
    
    Returns:
        "VALENCE_SHIFT" | "AROUSAL_SHIFT" | "CONNECTION_SHIFT" | "NEUTRAL"
    """
    abs_x = abs(q_trans.x)
    abs_y = abs(q_trans.y)
    abs_z = abs(q_trans.z)
    
    max_component = max(abs_x, abs_y, abs_z)
    
    if max_component < 0.1:
        return "NEUTRAL"
    
    if abs_x == max_component:
        return "VALENCE_SHIFT"
    elif abs_y == max_component:
        return "AROUSAL_SHIFT"
    else:
        return "CONNECTION_SHIFT"
```

### Insight Messages

Map axis codes to user-friendly messages:

```python
INSIGHT_MESSAGES = {
    "VALENCE_SHIFT": {
        "positive": "You're feeling better. Your mood is improving.",
        "negative": "You're feeling worse. Be gentle with yourself.",
        "neutral": "Your emotional tone is shifting."
    },
    "AROUSAL_SHIFT": {
        "positive": "Your energy is increasing. Channel it wisely.",
        "negative": "You're calming down. Allow yourself to rest.",
        "neutral": "Your energy level is changing."
    },
    "CONNECTION_SHIFT": {
        "positive": "You're reconnecting with yourself or others.",
        "negative": "You're withdrawing. Connection is available when ready.",
        "neutral": "Your sense of connection is shifting."
    },
    "NEUTRAL": "You're maintaining a steady state."
}

def generate_insight(
    axis_code: str,
    current_vac: VACVector,
    previous_vac: VACVector
) -> str:
    """Generate contextual insight message"""
    
    if axis_code == "NEUTRAL":
        return INSIGHT_MESSAGES["NEUTRAL"]
    
    # Determine direction
    if axis_code == "VALENCE_SHIFT":
        delta = current_vac.valence - previous_vac.valence
    elif axis_code == "AROUSAL_SHIFT":
        delta = current_vac.arousal - previous_vac.arousal
    else:  # CONNECTION_SHIFT
        delta = current_vac.connection - previous_vac.connection
    
    direction = "positive" if delta > 0.1 else \
                "negative" if delta < -0.1 else \
                "neutral"
    
    return INSIGHT_MESSAGES[axis_code][direction]
```

## Complete Metrics Pipeline

```python
# app/services/versor_engine.py

class VersorEngine:
    def process_state(
        self,
        current_vac: VACVector,
        previous_quaternion: Optional[Quaternion],
        time_delta: float
    ):
        # ... (conversion, transition calculation)
        
        # Metrics
        phi = angular_distance(transition_quat)
        elasticity = calculate_elasticity(phi, time_delta)
        is_flooding = detect_flooding(elasticity)
        
        # Insights
        axis_code = detect_dominant_axis(transition_quat)
        insight_text = generate_insight(axis_code, current_vac, previous_vac)
        
        return TrajectoryResult(
            current_state=current_quat,
            transition_quaternion=transition_quat,
            angular_distance_radians=phi,
            angular_distance_degrees=math.degrees(phi),
            elasticity_metric=elasticity,
            is_flooding=is_flooding,
            insight_code=axis_code,
            insight_text=insight_text,
            interpolation_path=path
        )
```

## Testing

### Unit Tests

```python
def test_valence_shift_detected():
    """Pure valence change should detect VALENCE_SHIFT"""
    # Start: Sadness [-0.6, -0.4, 0.0]
    # Target: Joy [0.9, -0.4, 0.0]  (only valence changed)
    
    q_start = VACVector(-0.6, -0.4, 0.0).to_quaternion()
    q_target = VACVector(0.9, -0.4, 0.0).to_quaternion()
    
    q_trans = calculate_transition(q_start, q_target)
    axis = detect_dominant_axis(q_trans)
    
    assert axis == "VALENCE_SHIFT"

def test_connection_shift_pity_to_compassion():
    """Critical: Pity → Compassion must show CONNECTION_SHIFT"""
    q_pity = VACVector(-0.3, -0.2, -0.6).to_quaternion()
    q_compassion = VACVector(-0.3, -0.2, 0.8).to_quaternion()
    
    q_trans = calculate_transition(q_pity, q_compassion)
    axis = detect_dominant_axis(q_trans)
    
    assert axis == "CONNECTION_SHIFT", \
        "Pity→Compassion is a pure connection shift"
```

## Next Steps

Now that you understand metrics and insights:
- **09-setup-and-installation.md** - Development environment
- **10-deployment.md** - Production deployment  
- **11-testing-strategy.md** - Comprehensive testing
