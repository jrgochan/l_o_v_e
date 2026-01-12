# Observer Module - Metrics Engine

## Overview

The Observer calculates two critical **temporal metrics** that quantify the user's emotional dynamics:

1. **Elasticity (E)**: The velocity of emotional change (how fast they're transitioning)
2. **Rigidity (R)**: The resistance to change (how "stuck" they are)

These metrics drive important system behaviors:
- **High Elasticity** → Flooding detection → Throttle inputs
- **High Rigidity** → Shame spiral alert → Suggest interventions
- **Low Rigidity + Positive Valence** → Resilience indicator

## Elasticity: The Velocity of Change

### Definition

**Elasticity** measures the speed of emotional rotation:

```
E = θ / Δt
```

Where:
- `θ` = Angular distance between states (radians)
- `Δt` = Time elapsed (seconds)

**Units**: Radians per second

**Interpretation**:
- `E < 0.5`: Stable, slow change
- `E = 1.0 - 2.0`: Moderate transition
- `E > 3.0`: Rapid shift, potential flooding

### Angular Distance Calculation

```python
def angular_distance(q1: List[float], q2: List[float]) -> float:
    """
    Calculate angular distance between two unit quaternions.
    
    Formula: θ = 2 × arccos(|q1 · q2|)
    
    Returns: Angle in radians [0, π]
    """
    import math
    
    # Dot product
    dot = sum(a * b for a, b in zip(q1, q2))
    
    # Clamp to [-1, 1] for numerical stability
    dot = max(-1.0, min(1.0, dot))
    
    # Angular distance
    theta = 2 * math.acos(abs(dot))
    
    return theta
```

### Elasticity Calculation

```python
# app/services/metrics_calculator.py

import math
from typing import List, Optional
from datetime import datetime

class MetricsCalculator:
    """Calculates elasticity and rigidity metrics"""
    
    def calculate_elasticity(
        self,
        current_quat: List[float],
        previous_quat: List[float],
        delta_time: float
    ) -> float:
        """
        Calculate elasticity (velocity of change).
        
        Args:
            current_quat: Current quaternion [w, x, y, z]
            previous_quat: Previous quaternion [w, x, y, z]
            delta_time: Time elapsed in seconds
        
        Returns:
            Elasticity in radians/second
        """
        if delta_time == 0:
            return 0.0
        
        # Calculate angular distance
        theta = self._angular_distance(current_quat, previous_quat)
        
        # Elasticity = distance / time
        elasticity = theta / delta_time
        
        return elasticity
    
    def _angular_distance(self, q1: List[float], q2: List[float]) -> float:
        """Calculate angular distance between quaternions"""
        dot = sum(a * b for a, b in zip(q1, q2))
        dot = max(-1.0, min(1.0, dot))
        return 2 * math.acos(abs(dot))
```

### Flooding Detection

```python
ELASTICITY_THRESHOLD = 3.0  # rad/s

def detect_flooding(elasticity: float, arousal: float) -> bool:
    """
    Detect if user is in "flooding" state.
    
    Flooding = high elasticity + high arousal
    """
    return elasticity > ELASTICITY_THRESHOLD and arousal > 0.8

# Usage in ObserverService
if detect_flooding(elasticity, vac[1]):  # vac[1] = arousal
    logger.warning("Flooding detected", extra={
        "user_id": str(user_id),
        "elasticity": elasticity,
        "arousal": vac[1]
    })
    
    # Trigger alert to Listener: throttle inputs
    await event_publisher.publish_flooding_alert(user_id)
```

## Rigidity: The Resistance to Change

### Definition

**Rigidity** measures how "stuck" a user is in an emotional pattern:

```
R = 1 / Variance(q₁, q₂, ..., qₙ)
```

Where the variance is calculated over a rolling window of recent states.

**Interpretation**:
- `R < 0.2`: Flexible, adaptive
- `R = 0.5`: Moderate stability
- `R > 0.8`: Rigid, stuck (perfectionism, trauma)

### Quaternion Variance

```python
import numpy as np

def quaternion_variance(quaternions: List[List[float]]) -> float:
    """
    Calculate variance of a set of quaternions.
    
    Uses the standard deviation of angular distances from the mean.
    """
    if len(quaternions) < 2:
        return 0.0
    
    # Convert to numpy array
    Q = np.array(quaternions)
    
    # Calculate mean quaternion (eigenvector method)
    M = Q.T @ Q
    eigenvalues, eigenvectors = np.linalg.eigh(M)
    mean_quat = eigenvectors[:, -1]
    
    # Calculate angular distances from mean
    distances = []
    for q in quaternions:
        dot = np.dot(q, mean_quat)
        dot = np.clip(dot, -1.0, 1.0)
        angle = 2 * np.arccos(abs(dot))
        distances.append(angle)
    
    # Variance
    variance = np.var(distances)
    
    return float(variance)
```

### Rigidity Calculation

```python
async def calculate_rigidity(
    self,
    session: AsyncSession,
    user_id: UUID,
    window_size: int = 10
) -> float:
    """
    Calculate rigidity over a rolling window of recent states.
    
    Args:
        session: Database session
        user_id: User ID
        window_size: Number of recent states to analyze
    
    Returns:
        Rigidity score [0, ∞), typically [0, 2]
    """
    # Fetch last N quaternions
    stmt = (
        select(UserTrajectory.quaternion_state)
        .where(UserTrajectory.user_id == user_id)
        .order_by(UserTrajectory.timestamp.desc())
        .limit(window_size)
    )
    
    result = await session.execute(stmt)
    quaternions = [row[0] for row in result.all()]
    
    if len(quaternions) < 2:
        return 0.0
    
    # Calculate variance
    variance = quaternion_variance(quaternions)
    
    # Rigidity = inverse variance
    # Add small epsilon to prevent division by zero
    rigidity = 1.0 / (variance + 0.01)
    
    return rigidity
```

### Shame Spiral Detection

```python
def detect_shame_spiral(
    rigidity: float,
    valence: float,
    connection: float
) -> bool:
    """
    Detect if user is stuck in shame/negative pattern.
    
    Shame spiral = high rigidity + negative valence + negative connection
    """
    return (
        rigidity > 0.8 and
        valence < -0.5 and
        connection < -0.5
    )

# Usage
if detect_shame_spiral(rigidity, vac[0], vac[2]):
    logger.warning("Shame spiral detected", extra={
        "user_id": str(user_id),
        "rigidity": rigidity
    })
    
    # Suggest intervention (e.g., self-compassion prompt)
    await send_compassion_intervention(user_id)
```

## Efficiency Metric

### Definition

**Efficiency** differentiates Frustration from Resignation:

```
Efficiency = Δposition / Δenergy
```

- **High energy, low movement** → Frustration (spinning in place)
- **Low energy, low movement** → Resignation (given up)

### Implementation

```python
def calculate_efficiency(
    previous_vac: List[float],
    current_vac: List[float],
    delta_time: float
) -> float:
    """
    Calculate movement efficiency.
    
    Returns: Efficiency ratio [0, 1]
    """
    # Position change (Euclidean distance in VAC space)
    position_delta = math.sqrt(
        sum((c - p)**2 for c, p in zip(current_vac, previous_vac))
    )
    
    # Energy = arousal (absolute value)
    energy = abs(current_vac[1])
    
    if energy < 0.1:
        return 0.0  # No energy = no efficiency
    
    # Efficiency = movement / energy
    efficiency = position_delta / (energy * delta_time)
    
    return min(efficiency, 1.0)  # Cap at 1.0
```

### Frustration Detection

```python
def detect_frustration(
    efficiency: float,
    arousal: float,
    valence: float
) -> bool:
    """
    Frustration = high arousal + low efficiency + negative valence
    """
    return (
        efficiency < 0.2 and
        arousal > 0.7 and
        valence < -0.3
    )
```

## Integration with ObserverService

### Complete Metrics Pipeline

```python
class ObserverService:
    async def process_state(
        self,
        user_id: UUID,
        session_id: UUID,
        input_text: str,
        vac_scalars: List[float],
        timestamp: datetime
    ):
        # ... (embedding, emotion mapping, quaternion building)
        
        # Fetch previous state
        previous = await self._get_latest_state(user_id)
        
        if previous:
            delta_time = (timestamp - previous.timestamp).total_seconds()
            
            # Calculate elasticity
            elasticity = self.metrics_calculator.calculate_elasticity(
                current_quat=quaternion,
                previous_quat=previous.quaternion_state,
                delta_time=delta_time
            )
            
            # Calculate efficiency
            efficiency = self.metrics_calculator.calculate_efficiency(
                previous_vac=previous.vac_values,
                current_vac=vac_scalars,
                delta_time=delta_time
            )
            
            # Detect flooding
            if detect_flooding(elasticity, vac_scalars[1]):
                await self.event_publisher.publish_flooding_alert(user_id)
            
            # Detect frustration
            if detect_frustration(efficiency, vac_scalars[1], vac_scalars[0]):
                logger.info("Frustration detected", extra={"user_id": str(user_id)})
        else:
            elasticity = 0.0
            efficiency = 0.0
        
        # Calculate rigidity (rolling window)
        rigidity = await self.metrics_calculator.calculate_rigidity(
            session=self.session,
            user_id=user_id,
            window_size=10
        )
        
        # Detect shame spiral
        if detect_shame_spiral(rigidity, vac_scalars[0], vac_scalars[2]):
            await self.event_publisher.publish_shame_spiral_alert(user_id)
        
        # Store metrics
        new_state.elasticity_metric = elasticity
        new_state.rigidity_score = rigidity
        new_state.metadata['efficiency'] = efficiency
        
        # ... (persist and publish)
```

## Visualization of Metrics

### Time-Series Chart

For analytics dashboards:

```python
@router.get("/analytics/{user_id}/metrics")
async def get_metrics_over_time(
    user_id: UUID,
    start_date: datetime,
    end_date: datetime,
    session: AsyncSession = Depends(get_db)
):
    """Retrieve elasticity/rigidity time series"""
    
    stmt = (
        select(
            UserTrajectory.timestamp,
            UserTrajectory.elasticity_metric,
            UserTrajectory.rigidity_score
        )
        .where(
            UserTrajectory.user_id == user_id,
            UserTrajectory.timestamp.between(start_date, end_date)
        )
        .order_by(UserTrajectory.timestamp)
    )
    
    result = await session.execute(stmt)
    
    return {
        "metrics": [
            {
                "timestamp": row[0].isoformat(),
                "elasticity": row[1],
                "rigidity": row[2]
            }
            for row in result.all()
        ]
    }
```

## Testing Metrics

### Unit Tests

```python
def test_elasticity_zero_for_same_state():
    """Elasticity should be 0 if states are identical"""
    calc = MetricsCalculator()
    
    q = [1.0, 0.0, 0.0, 0.0]
    elasticity = calc.calculate_elasticity(q, q, delta_time=1.0)
    
    assert elasticity == 0.0

def test_high_elasticity_for_opposite_states():
    """Elasticity should be high for 180° rotations"""
    calc = MetricsCalculator()
    
    q1 = [1.0, 0.0, 0.0, 0.0]   # Identity
    q2 = [0.0, 1.0, 0.0, 0.0]   # 180° rotation
    
    elasticity = calc.calculate_elasticity(q1, q2, delta_time=1.0)
    
    # θ = π radians, Δt = 1s → E = π rad/s
    assert abs(elasticity - math.pi) < 0.01

def test_rigidity_high_for_constant_states():
    """Rigidity should be high if user stays in same state"""
    calc = MetricsCalculator()
    
    # 10 identical quaternions
    quaternions = [[0.8, 0.4, 0.3, 0.3]] * 10
    
    variance = quaternion_variance(quaternions)
    rigidity = 1.0 / (variance + 0.01)
    
    assert rigidity > 50.0  # Very high rigidity
```

## Next Steps

Now that you understand metrics:
- **08-insight-generation.md** - Similar moments retrieval
- **09-setup-and-installation.md** - Development environment setup
- **10-deployment.md** - Production deployment strategies
