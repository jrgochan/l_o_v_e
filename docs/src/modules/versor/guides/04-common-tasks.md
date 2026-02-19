# Common Tasks - Versor Module

Now that you understand the concepts, let's learn how to actually work with the code. This guide covers practical tasks you'll perform regularly.

---

## Task 1: Calculate a Quaternion from VAC

### Goal

Convert an emotional state (VAC vector) to a quaternion.

### Steps

```python
from app.core.vac_model import VACVector

# Create a VAC vector
vac = VACVector(
    valence=0.8,    # Positive emotion
    arousal=0.6,    # Moderate energy
    connection=0.7  # Good connection
)

# Convert to quaternion
quaternion = vac.to_quaternion()

# Access components
print(f"w: {quaternion.w}")
print(f"x: {quaternion.x}")
print(f"y: {quaternion.y}")
print(f"z: {quaternion.z}")

# Check if it's normalized
print(f"Magnitude: {quaternion.magnitude()}")  # Should be ~1.0
```

### Common Issues

**Issue:** VAC values out of range

```python
# ❌ Wrong - values must be in [-1.0, 1.0]
vac = VACVector(valence=1.5, arousal=2.0, connection=0.5)
```

**Solution:** Clamp values

```python
# ✅ Correct
valence = max(-1.0, min(1.0, raw_valence))
vac = VACVector(valence=valence, arousal=arousal, connection=connection)
```

---

## Task 2: Calculate Transition Between States

### Goal

Compute the rotation needed to go from one emotional state to another.

### Steps

```python
from app.core.vac_model import VACVector
from app.core.transitions import calculate_transition, angular_distance

# Define two emotional states
state1 = VACVector(valence=0.7, arousal=0.5, connection=0.6)
state2 = VACVector(valence=-0.3, arousal=-0.2, connection=-0.4)

# Convert to quaternions
q1 = state1.to_quaternion()
q2 = state2.to_quaternion()

# Calculate transition
q_transition = calculate_transition(q1, q2)

# Measure angular distance
phi = angular_distance(q_transition)

print(f"Angular distance: {phi:.3f} radians")
print(f"Angular distance: {phi * 180 / 3.14159:.1f} degrees")
```

### Understanding the Output

- **Small φ (< π/4)**: Minor emotional shift
- **Medium φ (π/4 to π/2)**: Noticeable change
- **Large φ (> π/2)**: Major emotional shift

---

## Task 3: Detect Emotional Flooding

### Goal

Determine if someone's emotional state is changing too rapidly.

### Steps

```python
from app.core.transitions import (
    calculate_transition,
    angular_distance,
    calculate_elasticity,
    detect_flooding
)

# Previous and current states
prev_vac = VACVector(0.5, 0.3, 0.4)
curr_vac = VACVector(-0.6, -0.7, -0.5)

# Convert to quaternions
q_prev = prev_vac.to_quaternion()
q_curr = curr_vac.to_quaternion()

# Calculate transition
q_trans = calculate_transition(q_prev, q_curr)
phi = angular_distance(q_trans)

# Calculate elasticity (rate of change)
time_delta = 1.0  # seconds
elasticity = calculate_elasticity(phi, time_delta)

# Check for flooding
is_flooding = detect_flooding(elasticity, threshold=2.0)

print(f"Elasticity: {elasticity:.2f} rad/s")
print(f"Flooding: {is_flooding}")

if is_flooding:
    print("⚠️ Rapid emotional change detected!")
```

### Adjusting the Threshold

```python
# Conservative threshold (more sensitive)
is_flooding_sensitive = detect_flooding(elasticity, threshold=1.5)

# Permissive threshold (less sensitive)
is_flooding_permissive = detect_flooding(elasticity, threshold=2.5)
```

---

## Task 4: Identify Dominant Axis

### Goal

Determine which emotional dimension changed most.

### Steps

```python
from app.core.transitions import detect_dominant_axis

# Calculate transition (from previous task)
q_trans = calculate_transition(q_prev, q_curr)

# Detect dominant axis
axis = detect_dominant_axis(q_trans)

# axis will be one of:
# - "VALENCE_SHIFT"
# - "AROUSAL_SHIFT"
# - "CONNECTION_SHIFT"

print(f"Dominant axis: {axis}")

# Generate user-friendly message
messages = {
    "VALENCE_SHIFT": "Your mood changed (feeling better/worse)",
    "AROUSAL_SHIFT": "Your energy level shifted",
    "CONNECTION_SHIFT": "Your sense of connection changed"
}

print(messages[axis])
```

---

## Task 5: Generate SLERP Animation Path

### Goal

Create a smooth interpolation path for animating the Soul Sphere.

### Steps

```python
from app.core.interpolation import generate_slerp_path

# Start and end states
start_vac = VACVector(0.8, 0.6, 0.7)
end_vac = VACVector(-0.3, -0.2, -0.4)

q_start = start_vac.to_quaternion()
q_end = end_vac.to_quaternion()

# Generate 60-frame path
frames = generate_slerp_path(q_start, q_end, num_frames=60)

print(f"Generated {len(frames)} frames")

# Access individual frames
first_frame = frames[0]   # Should equal q_start
mid_frame = frames[30]    # Halfway point
last_frame = frames[59]   # Should equal q_end

# Verify endpoints
assert first_frame.w == q_start.w
assert last_frame.w == q_end.w
```

### Adjusting Frame Count

```python
# Fast animation (fewer frames)
fast_path = generate_slerp_path(q_start, q_end, num_frames=30)

# Slow animation (more frames)
slow_path = generate_slerp_path(q_start, q_end, num_frames=120)
```

---

## Task 6: Make an API Call

### Goal

Call the Versor API endpoint to calculate everything at once.

### Using `curl`

```bash
curl -X POST http://localhost:8001/versor/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "current_vac": {
      "valence": 0.8,
      "arousal": 0.6,
      "connection": 0.7
    },
    "previous_state": {
      "w": 0.5,
      "x": 0.5,
      "y": 0.5,
      "z": 0.5
    },
    "time_delta_seconds": 1.0
  }'
```

### Using Python `requests`

```python
import requests

# Prepare request
url = "http://localhost:8001/versor/calculate"
payload = {
    "current_vac": {
        "valence": 0.8,
        "arousal": 0.6,
        "connection": 0.7
    },
    "previous_state": {
        "w": 0.5,
        "x": 0.5,
        "y": 0.5,
        "z": 0.5
    },
    "time_delta_seconds": 1.0
}

# Make request
response = requests.post(url, json=payload)

# Parse response
if response.status_code == 200:
    data = response.json()

    print(f"Current state: {data['current_state']}")
    print(f"Angular distance: {data['angular_distance_radians']:.3f} rad")
    print(f"Elasticity: {data['elasticity_metric']:.3f} rad/s")
    print(f"Flooding: {data['is_flooding']}")
    print(f"Insight: {data['insight_code']}")
    print(f"Frames: {len(data['interpolation_path'])}")
else:
    print(f"Error: {response.status_code}")
    print(response.text)
```

---

## Task 7: Run the Test Suite

### Goal

Verify your changes didn't break anything.

### Run All Tests

```bash
# Run all tests with verbose output
pytest tests/ -v

# Expected output:
# tests/unit/test_quaternion.py::test_identity ... PASSED
# tests/unit/test_quaternion.py::test_normalize ... PASSED
# ...
# ============ 82 passed in 0.55s ==============
```

### Run Specific Test File

```bash
# Run only quaternion tests
pytest tests/unit/test_quaternion.py -v

# Run only VAC model tests
pytest tests/unit/test_vac_model.py -v
```

### Run Single Test

```bash
# Run specific test by name
pytest tests/unit/test_quaternion.py::test_identity -v
```

### Run with Coverage

```bash
# Generate coverage report
pytest tests/ --cov=app --cov-report=html

# View report
open htmlcov/index.html  # macOS
```

---

## Task 8: Add a New Test

### Goal

Write a test for new functionality.

### Test Template

```python
# In tests/unit/test_quaternion.py

import pytest
from app.core.quaternion import Quaternion

def test_quaternion_multiplication():
    """Test that quaternion multiplication works correctly."""
    # Arrange
    q1 = Quaternion(1, 0, 0, 0)  # Identity
    q2 = Quaternion(0.707, 0, 0.707, 0)  # 90° around Y

    # Act
    result = q1.multiply(q2)

    # Assert
    assert result.w == pytest.approx(0.707, abs=1e-3)
    assert result.x == pytest.approx(0.0, abs=1e-6)
    assert result.y == pytest.approx(0.707, abs=1e-3)
    assert result.z == pytest.approx(0.0, abs=1e-6)

def test_quaternion_edge_case():
    """Test quaternion handles zero vector."""
    # Arrange
    q = Quaternion(0, 0, 0, 0)

    # Act
    normalized = q.normalize()

    # Assert
    assert normalized.w == 1.0  # Identity for zero
```

### Run Your New Test

```bash
pytest tests/unit/test_quaternion.py::test_quaternion_multiplication -v
```

---

## Task 9: Debug a Calculation

### Goal

Investigate why a calculation isn't working as expected.

### Add Debug Prints

```python
from app.core.vac_model import VACVector
from app.core.transitions import calculate_transition, angular_distance

# Create VAC vectors
vac1 = VACVector(0.8, 0.6, 0.7)
vac2 = VACVector(-0.3, -0.2, -0.4)

print(f"VAC 1: v={vac1.valence}, a={vac1.arousal}, c={vac1.connection}")
print(f"VAC 2: v={vac2.valence}, a={vac2.arousal}, c={vac2.connection}")

# Convert to quaternions
q1 = vac1.to_quaternion()
q2 = vac2.to_quaternion()

print(f"\nQuaternion 1: {q1}")
print(f"Magnitude: {q1.magnitude()}")
print(f"\nQuaternion 2: {q2}")
print(f"Magnitude: {q2.magnitude()}")

# Calculate transition
q_trans = calculate_transition(q1, q2)
print(f"\nTransition: {q_trans}")

# Angular distance
phi = angular_distance(q_trans)
print(f"Angular distance: {phi:.3f} rad = {phi * 180 / 3.14159:.1f}°")
```

### Use Python Debugger

```python
# Add breakpoint
import pdb; pdb.set_trace()

# Or use built-in breakpoint() (Python 3.7+)
breakpoint()

# Run with pytest -s to see debugger
pytest tests/unit/test_vac_model.py -s
```

---

## Task 10: Modify Configuration

### Goal

Change a configuration value like the flooding threshold.

### Edit `app/config.py`

```python
class Settings(BaseSettings):
    # Modify threshold
    FLOODING_THRESHOLD: float = 2.5  # Was 2.0

    # Or add new setting
    MAX_ANGULAR_DISTANCE: float = 3.14159  # π radians
```

### Use Environment Variables

Create `.env` file:

```bash
FLOODING_THRESHOLD=2.5
MAX_ANGULAR_DISTANCE=3.14159
```

Load in code:

```python
from app.config import Settings

settings = Settings()
print(f"Threshold: {settings.FLOODING_THRESHOLD}")
```

---

## Task 11: Add a New API Endpoint

### Goal

Create a new endpoint for a custom calculation.

### Step 1: Define Request/Response Models

```python
# In app/api/models/request.py
class CustomRequest(BaseModel):
    vac: VACInput
    multiplier: float = 1.0

# In app/api/models/response.py
class CustomResponse(BaseModel):
    result: float
    message: str
```

### Step 2: Create Route

```python
# In app/api/routes/custom.py
from fastapi import APIRouter
from ..models.request import CustomRequest
from ..models.response import CustomResponse

router = APIRouter()

@router.post("/custom", response_model=CustomResponse)
async def custom_calculation(request: CustomRequest):
    """Custom calculation endpoint."""
    # Your logic here
    vac = VACVector(
        request.vac.valence,
        request.vac.arousal,
        request.vac.connection
    )

    magnitude = vac.magnitude()
    result = magnitude * request.multiplier

    return CustomResponse(
        result=result,
        message=f"Calculated with multiplier {request.multiplier}"
    )
```

### Step 3: Register Router

```python
# In app/main.py
from app.api.routes import custom

app.include_router(
    custom.router,
    prefix="/versor",
    tags=["custom"]
)
```

### Step 4: Test

```bash
curl -X POST http://localhost:8001/versor/custom \
  -H "Content-Type: application/json" \
  -d '{
    "vac": {"valence": 0.8, "arousal": 0.6, "connection": 0.7},
    "multiplier": 2.0
  }'
```

---

## Task 12: Format and Lint Code

### Goal

Ensure code follows project standards.

### Format with Black

```bash
# Format all Python files
black app/ tests/

# Check what would change (dry run)
black app/ --check
```

### Sort Imports with isort

```bash
# Sort imports
isort app/ tests/

# Check only
isort app/ --check
```

### Lint with flake8

```bash
# Check for style issues
flake8 app/ tests/

# Common issues:
# - Line too long (E501)
# - Unused import (F401)
# - Undefined name (F821)
```

### Type Check with mypy

```bash
# Check type hints
mypy app/ --strict

# Fix type errors by adding annotations
```

### Run All Quality Checks

```bash
# If available, use DX scripts
../infra/scripts/check-python-quality.sh --module=versor --fix
```

---

## Task 13: Profile Performance

### Goal

Measure how long calculations take.

### Simple Timing

```python
import time
from app.core.vac_model import VACVector

# Time a single calculation
start = time.time()

vac = VACVector(0.8, 0.6, 0.7)
q = vac.to_quaternion()

end = time.time()
print(f"Calculation took {(end - start) * 1000:.3f} ms")
```

### Profile Multiple Calls

```python
import timeit

# Test code
setup = """
from app.core.vac_model import VACVector
vac = VACVector(0.8, 0.6, 0.7)
"""

code = "q = vac.to_quaternion()"

# Run 10,000 times
result = timeit.timeit(code, setup=setup, number=10000)
print(f"Average: {result / 10000 * 1000:.3f} ms per call")
```

### Use cProfile

```bash
# Profile a script
python -m cProfile -s cumulative your_script.py

# Or in code
import cProfile
cProfile.run('your_function()')
```

---

## Common Gotchas

### 1. Quaternion Not Normalized

**Problem:** Quaternion magnitude isn't 1.0

```python
q = Quaternion(1.0, 1.0, 1.0, 1.0)
print(q.magnitude())  # 2.0 - Not unit!
```

**Solution:** Always normalize

```python
q = q.normalize()
print(q.magnitude())  # 1.0 ✓
```

### 2. Opposite Quaternions

**Problem:** `q` and `-q` represent same rotation

```python
q1 = Quaternion(0.5, 0.5, 0.5, 0.5)
q2 = Quaternion(-0.5, -0.5, -0.5, -0.5)
# These are the same rotation!
```

**Solution:** Check dot product

```python
if q1.dot(q2) < 0:
    q2 = Quaternion(-q2.w, -q2.x, -q2.y, -q2.z)
```

### 3. Zero VAC Vector

**Problem:** Can't convert zero vector to rotation

```python
vac = VACVector(0.0, 0.0, 0.0)
q = vac.to_quaternion()  # Returns identity [1,0,0,0]
```

**Solution:** Check before converting

```python
if vac.is_zero():
    print("Zero vector - no emotional state")
else:
    q = vac.to_quaternion()
```

---

## Quick Reference

### Common Imports

```python
# Core
from app.core.quaternion import Quaternion
from app.core.vac_model import VACVector
from app.core.transitions import (
    calculate_transition,
    angular_distance,
    calculate_elasticity,
    detect_flooding,
    detect_dominant_axis
)
from app.core.interpolation import generate_slerp_path

# API
from app.api.models.request import CalculateRequest
from app.api.models.response import CalculateResponse

# Config
from app.config import Settings
```

### Common Commands

```bash
# Development
uvicorn app.main:app --reload --port 8001

# Testing
pytest tests/ -v
pytest tests/unit/test_quaternion.py -v --cov=app

# Quality
black app/ tests/
isort app/ tests/
flake8 app/ tests/
mypy app/ --strict

# Git
git checkout -b feature/your-feature
git add .
git commit -m "feat: your changes"
```

---

## Next Steps

Practice these tasks, then move on to:

1. **[Testing Guide](05-testing-guide.md)** - Master the test suite
2. **[First Contribution](06-first-contribution.md)** - Make your first PR
3. **[Senior Developer Guides](../architecture/01-deep-dive.md)** - Go deeper

---

**Previous:** [← Key Concepts](03-key-concepts.md)
**Next:** [Testing Guide →](05-testing-guide.md)
