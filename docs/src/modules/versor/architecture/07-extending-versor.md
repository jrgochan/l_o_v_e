# Extending Versor - Adding New Features

This guide shows you how to extend the Versor module with new calculations, endpoints, and functionality while maintaining the architectural principles.

---

## Extension Principles

### Maintain Core Values

When extending Versor, preserve:

1. ✅ **Statelessness** - No persistent storage
2. ✅ **Pure functions** - No side effects
3. ✅ **Type safety** - Full type hints
4. ✅ **100% coverage** - Test everything
5. ✅ **Performance** - Keep P99 < 50ms

---

## Adding a New Calculation

### Example: Quaternion Distance Metric

#### Goal Add a new metric measuring quaternion "distance."

#### Step 1: Implement core function

```python
# app/core/transitions.py

def quaternion_distance(q1: Quaternion, q2: Quaternion) -> float:
    """
    Calculate geodesic distance between quaternions on S³.

    This is different from angular_distance which measures rotation angle.
    Geodesic distance is the arc length on the 4D unit sphere.

    Args:
        q1: First unit quaternion
        q2: Second unit quaternion

    Returns:
        Geodesic distance in range [0, π]

    Formula:
        d = arccos(|q₁ · q₂|)

    Example:
        >>> q1 = Quaternion.identity()
        >>> q2 = Quaternion(0.707, 0.707, 0, 0)
        >>> d = quaternion_distance(q1, q2)
        >>> print(f"{d:.3f} radians")
        0.785

    References:
        - Huynh, D. Q. (2009). "Metrics for 3D Rotations"
    """
    # Calculate dot product
    dot = abs(q1.dot(q2))

    # Clamp to valid range (numerical stability)
    dot = min(1.0, max(-1.0, dot))

    # Geodesic distance
    return math.acos(dot)
```

#### Step 2: Add tests

```python
# tests/unit/test_transitions.py

def test_quaternion_distance_identity():
    """Test distance from identity to itself is zero."""
    q = Quaternion.identity()
    d = quaternion_distance(q, q)
    assert d == pytest.approx(0.0, abs=1e-6)

def test_quaternion_distance_opposite():
    """Test distance to opposite quaternion."""
    q1 = Quaternion(0.5, 0.5, 0.5, 0.5).normalize()
    q2 = Quaternion(-0.5, -0.5, -0.5, -0.5).normalize()

    d = quaternion_distance(q1, q2)
    assert d == pytest.approx(0.0, abs=1e-6)  # Same rotation!

def test_quaternion_distance_orthogonal():
    """Test distance between orthogonal quaternions."""
    q1 = Quaternion.identity()
    q2 = Quaternion(0.707, 0.707, 0, 0)

    d = quaternion_distance(q1, q2)
    assert d == pytest.approx(math.pi/4, abs=1e-3)
```

#### Step 3: Add to API response (optional)

```python
# app/api/models/response.py

class TrajectoryResponse(BaseModel):
    # Existing fields...
    angular_distance_radians: float

    # New field
    quaternion_distance: float = Field(
        description="Geodesic distance on 4D sphere"
    )
```

#### Step 4: Compute in endpoint

```python
# app/api/routes/calculate.py

@router.post("/calculate")
async def calculate_state(request: StateRequest):
    # ... existing calculations ...

    # Add new metric
    quat_distance = quaternion_distance(previous_quat, current_quat)

    return TrajectoryResponse(
        # ... existing fields ...
        quaternion_distance=quat_distance
    )
```

#### Step 5: Document

- Update this guide
- Add to [API Reference](../reference/api-reference.md)
- Update [Glossary](../reference/glossary.md)

---

## Adding a New Endpoint

### Example: Batch Calculate Endpoint

#### Goal Process multiple VAC vectors in one request

#### Step 1: Define request/response models

```python
# app/api/models/request.py

class BatchCalculateRequest(BaseModel):
    """Request for batch quaternion calculation."""

    vac_vectors: List[VACInput] = Field(
        ...,
        min_items=1,
        max_items=100,
        description="List of VAC vectors to process"
    )
    time_delta_seconds: float = Field(default=1.0, gt=0.0)


# app/api/models/response.py

class QuaternionResult(BaseModel):
    """Single quaternion calculation result."""
    index: int
    current_state: QuaternionModel
    magnitude: float

class BatchCalculateResponse(BaseModel):
    """Response for batch calculation."""
    results: List[QuaternionResult]
    count: int
    processing_time_ms: float
```

#### Step 2: Implement endpoint

```python
# app/api/routes/batch.py

from fastapi import APIRouter
import time

router = APIRouter()

@router.post("/batch/calculate", response_model=BatchCalculateResponse)
async def batch_calculate(request: BatchCalculateRequest):
    """
    Batch process multiple VAC vectors.

    More efficient than individual requests for bulk analysis.
    """
    start = time.time()

    results = []
    for idx, vac_input in enumerate(request.vac_vectors):
        # Convert VAC to quaternion
        vac = VACVector(
            vac_input.valence,
            vac_input.arousal,
            vac_input.connection
        )
        quat = vac.to_quaternion()

        results.append(QuaternionResult(
            index=idx,
            current_state=QuaternionModel(
                w=quat.w, x=quat.x, y=quat.y, z=quat.z
            ),
            magnitude=vac.magnitude()
        ))

    processing_time = (time.time() - start) * 1000

    return BatchCalculateResponse(
        results=results,
        count=len(results),
        processing_time_ms=processing_time
    )
```

#### Step 3: Register router

```python
# app/main.py

from app.api.routes import batch

app.include_router(
    batch.router,
    prefix="/versor",
    tags=["Batch Operations"]
)
```

#### Step 4: Test

```python
# tests/integration/test_batch.py

def test_batch_calculate(client):
    """Test batch calculation endpoint."""
    response = client.post("/versor/batch/calculate", json={
        "vac_vectors": [
            {"valence": 0.8, "arousal": 0.6, "connection": 0.7},
            {"valence": -0.3, "arousal": -0.2, "connection": -0.4},
            {"valence": 0.0, "arousal": 0.9, "connection": 0.5}
        ],
        "time_delta_seconds": 1.0
    })

    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 3
    assert len(data["results"]) == 3
```

---

## Adding Custom Interpolation

### Example: Ease-In/Ease-Out SLERP

#### Goal Non-constant velocity for more natural feel

#### Step 1: Define easing function

```python
# app/core/interpolation.py

def ease_in_out(t: float) -> float:
    """
    Smooth step easing function.

    Starts slow, speeds up in middle, slows down at end.

    Args:
        t: Linear parameter [0, 1]

    Returns:
        Eased parameter [0, 1]

    Formula:
        f(t) = 3t² - 2t³  (smoothstep)
    """
    return 3 * t**2 - 2 * t**3

def generate_eased_slerp_path(
    q_start: Quaternion,
    q_target: Quaternion,
    steps: int = 60,
    easing_fn: Callable[[float], float] = ease_in_out
) -> List[Quaternion]:
    """
    Generate SLERP path with easing function.

    Args:
        q_start: Starting quaternion
        q_target: Target quaternion
        steps: Number of frames
        easing_fn: Easing function t → t'

    Returns:
        Eased interpolation path
    """
    path = []

    for i in range(steps):
        # Linear parameter
        t_linear = i / (steps - 1)

        # Apply easing
        t_eased = easing_fn(t_linear)

        # Generate single SLERP frame at eased position
        frame = slerp_single(q_start, q_target, t_eased)
        path.append(frame)

    return path
```

#### Step 2: Add tests

```python
def test_eased_slerp_starts_slow():
    """Test that eased SLERP starts with small angular steps."""
    q1 = Quaternion.identity()
    q2 = Quaternion(0, 1, 0, 0)

    path = generate_eased_slerp_path(q1, q2, steps=60)

    # Measure first few frame distances
    d1 = angular_distance(calculate_transition(path[0], path[1]))
    d2 = angular_distance(calculate_transition(path[1], path[2]))

    # Should start slow
    assert d1 < d2  # Accelerating
```

---

## Adding Configuration Options

### Example: Adjustable Flooding Threshold

#### Step 1: Add to settings

```python
# app/config.py

class Settings(BaseSettings):
    # Existing settings...
    FLOODING_THRESHOLD: float = 2.0

    # New settings
    FLOODING_THRESHOLD_CRITICAL: float = 3.0
    FLOODING_THRESHOLD_WARNING: float = 1.5

    # Per-user thresholds (future)
    ENABLE_ADAPTIVE_THRESHOLDS: bool = False
```

#### Step 2: Update detection logic

```python
# app/core/transitions.py

from dataclasses import dataclass
from enum import Enum

class FloodingLevel(Enum):
    NONE = "none"
    WARNING = "warning"
    MODERATE = "moderate"
    CRITICAL = "critical"

@dataclass
class FloodingAssessment:
    """Detailed flooding assessment."""
    level: FloodingLevel
    elasticity: float
    threshold_exceeded: bool
    severity: float  # How much over threshold

def detect_flooding_detailed(
    elasticity: float,
    threshold_warning: float = 1.5,
    threshold_moderate: float = 2.0,
    threshold_critical: float = 3.0
) -> FloodingAssessment:
    """
    Detect flooding with multiple severity levels.

    Returns detailed assessment instead of boolean.
    """
    if elasticity >= threshold_critical:
        level = FloodingLevel.CRITICAL
        severity = elasticity / threshold_critical
    elif elasticity >= threshold_moderate:
        level = FloodingLevel.MODERATE
        severity = elasticity / threshold_moderate
    elif elasticity >= threshold_warning:
        level = FloodingLevel.WARNING
        severity = elasticity / threshold_warning
    else:
        level = FloodingLevel.NONE
        severity = 0.0

    return FloodingAssessment(
        level=level,
        elasticity=elasticity,
        threshold_exceeded=level != FloodingLevel.NONE,
        severity=severity
    )
```

---

## Adding Validation Rules

### Example: VAC Range Enforcement

#### Step 1: Custom Pydantic validator

```python
# app/api/models/request.py

from pydantic import field_validator

class VACInput(BaseModel):
    valence: float
    arousal: float
    connection: float

    @field_validator('valence', 'arousal', 'connection')
    @classmethod
    def validate_range(cls, v: float, info: ValidationInfo) -> float:
        """Ensure VAC components are in [-1, 1]."""
        if not -1.0 <= v <= 1.0:
            raise ValueError(
                f"{info.field_name} must be in range [-1.0, 1.0], "
                f"got {v}"
            )
        return v

    @model_validator(mode='after')
    def validate_not_all_zero(self) -> 'VACInput':
        """Ensure at least one component is non-zero."""
        if abs(self.valence) < 1e-6 and \
           abs(self.arousal) < 1e-6 and \
           abs(self.connection) < 1e-6:
            raise ValueError("VAC cannot be zero vector")
        return self
```

---

## Adding Utility Functions

### Example: Quaternion Similarity Measure

```python
# app/core/quaternion.py

def similarity(self, other: "Quaternion") -> float:
    """
    Calculate similarity between quaternions.

    Returns value in [0, 1] where:
    - 1.0 = identical rotations
    - 0.0 = opposite rotations

    Formula:
        similarity = |q₁ · q₂|

    Example:
        >>> q1 = Quaternion.identity()
        >>> q2 = Quaternion.identity()
        >>> q1.similarity(q2)
        1.0
    """
    return abs(self.dot(other))
```

---

## Adding Middleware

### Example: Request Timing Middleware

```python
# app/middleware/timing.py

from fastapi import Request
import time

@app.middleware("http")
async def add_timing_header(request: Request, call_next):
    """Add processing time to response header."""
    start_time = time.time()

    response = await call_next(request)

    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)

    return response
```

**Register:**

```python
# app/main.py
from app.middleware.timing import add_timing_header

# Middleware is registered via decorator
```

---

## Adding Response Fields

### Example: Include Rotation Axis

#### Step 1: Extend response model

```python
# app/api/models/response.py

class AxisAngleModel(BaseModel):
    """Axis-angle representation."""
    axis_x: float
    axis_y: float
    axis_z: float
    angle_radians: float
    angle_degrees: float

class TrajectoryResponse(BaseModel):
    # Existing fields...
    current_state: QuaternionModel

    # New field
    axis_angle: Optional[AxisAngleModel] = None
```

#### Step 2: Compute in endpoint

```python
# app/api/routes/calculate.py

@router.post("/calculate")
async def calculate_state(request: StateRequest):
    # ... existing logic ...

    # Extract axis-angle
    axis, angle = current_quat.to_axis_angle()

    return TrajectoryResponse(
        # ... existing fields ...
        axis_angle=AxisAngleModel(
            axis_x=axis[0],
            axis_y=axis[1],
            axis_z=axis[2],
            angle_radians=angle,
            angle_degrees=math.degrees(angle)
        )
    )
```

---

## Adding Alternate Representations

### Example: Euler Angles Output

```python
# app/core/quaternion.py

def to_euler_angles(self, order: str = 'xyz') -> Tuple[float, float, float]:
    """
    Convert quaternion to Euler angles.

    Args:
        order: Rotation order (default: 'xyz')

    Returns:
        (roll, pitch, yaw) in radians

    Warning:
        Euler angles have gimbal lock! Use quaternions when possible.

    Example:
        >>> q = Quaternion(0.707, 0, 0.707, 0)
        >>> angles = q.to_euler_angles()
        >>> print(f"Roll: {angles[0]:.2f}, Pitch: {angles[1]:.2f}, Yaw: {angles[2]:.2f}")
    """
    from scipy.spatial.transform import Rotation as R
    from app.utils.scipy_adapter import love_to_scipy

    q_scipy = love_to_scipy(self)
    rotation = R.from_quat(q_scipy)
    return rotation.as_euler(order, degrees=False)
```

---

## Adding New Thresholds

### Example: Rigidity Metric

```python
# app/core/transitions.py

def calculate_rigidity(angular_distance: float, time_delta: float) -> float:
    """
    Calculate "rigidity" - inverse of elasticity.

    High rigidity = slow emotional change (stuck, rigid)
    Low rigidity = fast emotional change (flexible, fluid)

    Args:
        angular_distance: Angular distance in radians
        time_delta: Time elapsed in seconds

    Returns:
        Rigidity metric (seconds/radian)

    Formula:
        R = Δt / φ  (inverse of elasticity)

    Interpretation:
        - R > 2.0 s/rad: Very rigid (slow to change)
        - R ≈ 1.0 s/rad: Moderate
        - R < 0.5 s/rad: Fluid (rapid changes)
    """
    if angular_distance < EPSILON:
        return float('inf')  # No change = infinite rigidity

    return time_delta / angular_distance


def detect_rigidity(rigidity: float, threshold: float = 2.0) -> bool:
    """
    Detect if emotional state is too rigid (stuck).

    Complement to flooding detection.
    """
    return rigidity > threshold
```

---

## Extension Patterns

### Pattern 1: Pure Function Extension

#### When Adding new calculations

#### Template

```python
def new_calculation(input: Type) -> Type:
    """
    Brief description.

    Args:
        input: Description

    Returns:
        Description

    Formula:
        Mathematical formula

    Example:
        >>> example_usage()

    References:
        - Paper citation
    """
    # Implementation
    pass

# Always add tests!
def test_new_calculation():
    assert new_calculation(test_input) == expected_output
```

### Pattern 2: API Extension

#### When Adding new endpoints

#### Template

```python
# 1. Create router
router = APIRouter()

# 2. Define models
class NewRequest(BaseModel):
    ...

class NewResponse(BaseModel):
    ...

# 3. Implement endpoint
@router.post("/new-endpoint", response_model=NewResponse)
async def new_endpoint(request: NewRequest):
    ...

# 4. Register in main.py
app.include_router(router, prefix="/versor", tags=["New Feature"])

# 5. Test
def test_new_endpoint(client):
    response = client.post("/versor/new-endpoint", json={...})
    assert response.status_code == 200
```

### Pattern 3: Configuration Extension

#### When Adding new settings

#### Template

```python
# app/config.py
class Settings(BaseSettings):
    NEW_SETTING: type = default_value

    class Config:
        env_file = ".env"

# Usage
from app.config import settings
value = settings.NEW_SETTING
```

---

## Testing Extensions

### Test Checklist

For any new feature:

- [ ] Unit tests for core logic
- [ ] Integration tests for API endpoints
- [ ] Semantic tests if applicable
- [ ] Edge case tests
- [ ] Performance tests if relevant
- [ ] Documentation updated
- [ ] 100% coverage maintained

### Example Test Suite

```python
# For new quaternion_distance function

class TestQuaternionDistance:
    """Comprehensive tests for quaternion_distance."""

    def test_identity_distance(self):
        """Test distance from identity to itself."""
        # ...

    def test_opposite_distance(self):
        """Test q and -q have zero distance."""
        # ...

    def test_orthogonal_distance(self):
        """Test perpendicular quaternions."""
        # ...

    def test_distance_symmetry(self):
        """Test distance(q1, q2) == distance(q2, q1)."""
        # ...

    def test_triangle_inequality(self):
        """Test distance(q1, q3) <= distance(q1, q2) + distance(q2, q3)."""
        # ...
```

---

## Documentation Requirements

### For New Features

1. **Docstring** in code
2. **API docs** in reference guide
3. **Example usage** in relevant guides
4. **Glossary entry** for new terms
5. **Architecture decision** document if significant

### Documentation Template

```python
def new_feature(param: Type) -> Type:
    """
    [One-line summary]

    [2-3 paragraph detailed explanation with context]

    [Mathematical background if applicable]

    Args:
        param: Description with constraints

    Returns:
        Description of return value

    Raises:
        ValueError: When and why

    Example:
        >>> code_example()
        expected_output

        >>> another_example()
        more_output

    Performance:
        Time complexity: O(n)
        Space complexity: O(1)
        Typical timing: ~5ms

    See Also:
        - related_function()
        - Other relevant docs

    References:
        - Paper (Year). "Title"
        - Documentation URL

    Notes:
        Additional information, caveats, future work
    """
    # Implementation
```

---

## Backward Compatibility

### API Versioning

#### If breaking API changes needed

```python
# app/api/routes/calculate_v2.py

@router.post("/v2/calculate", response_model=TrajectoryResponseV2)
async def calculate_state_v2(request: StateRequestV2):
    """Version 2 of calculate endpoint with breaking changes."""
    pass

# Keep v1 working
@router.post("/v1/calculate", response_model=TrajectoryResponse)
async def calculate_state_v1(request: StateRequest):
    """Legacy version 1 endpoint."""
    pass

# Default to latest
@router.post("/calculate", response_model=TrajectoryResponseV2)
async def calculate_state(request: StateRequestV2):
    """Current version (redirects to v2)."""
    return await calculate_state_v2(request)
```

### Deprecation Strategy

```python
import warnings

@router.post("/old-endpoint")
async def old_endpoint():
    """
    Deprecated: Use /new-endpoint instead.

    This endpoint will be removed in version 2.0.
    """
    warnings.warn(
        "old_endpoint is deprecated, use new_endpoint",
        DeprecationWarning
    )
    # ... implementation ...
```

---

## Quality Gates

### Pre-Merge Checklist

Before merging extensions:

- [ ] All tests pass (100% coverage)
- [ ] DX validation passes (`check-python-quality.sh`)
- [ ] Performance benchmarks pass
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] No breaking changes (or properly versioned)

### Validation Script

```bash
#!/bin/bash
# validate-extension.sh

echo "Running validation for Versor extension..."

# 1. Format check
black app/ tests/ --check || exit 1

# 2. Import sort
isort app/ tests/ --check || exit 1

# 3. Lint
flake8 app/ tests/ || exit 1

# 4. Type check
mypy app/ --strict || exit 1

# 5. Tests
pytest tests/ -v --cov=app --cov-fail-under=100 || exit 1

# 6. Performance
pytest tests/performance/ -v || exit 1

echo "✅ All validation passed!"
```

---

## References

- **FastAPI Advanced Features:** <https://fastapi.tiangolo.com/advanced/>
- **Pydantic Validators:** <https://docs.pydantic.dev/latest/concepts/validators/>
- **Extension Best Practices:** `versor/docs/06-api-specification.md`

---

## Next Steps

- **[Troubleshooting](08-troubleshooting.md)** - Debug common issues
- **[Architecture Decisions](09-architecture-decisions.md)** - Understanding the why

---

**Previous:** [← Performance Optimization](06-performance-optimization.md)
**Next:** [Troubleshooting →](08-troubleshooting.md)
