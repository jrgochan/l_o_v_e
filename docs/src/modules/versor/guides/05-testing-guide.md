# Testing Guide - Versor Module

The Versor module maintains 100% test coverage. This guide shows you how to run tests, write new ones, and understand the testing strategy.

---

## Overview

### Test Structure

```text
tests/
├── conftest.py        # Shared test fixtures
├── unit/              # Pure function tests (no dependencies)
│   ├── test_quaternion.py
│   ├── test_vac_model.py
│   ├── test_transitions.py
│   ├── test_interpolation.py
│   ├── test_factory.py
│   ├── test_config.py
│   ├── test_auth.py
│   └── test_main.py
├── integration/       # API endpoint tests
│   └── test_api.py
└── semantic/          # Semantic validation (placeholder)
```

### Test Philosophy

1. **Unit tests:** Test pure mathematical functions in isolation
2. **Integration tests:** Test API endpoints end-to-end
3. **Semantic tests:** Validate real-world behavior (e.g., Pity→Compassion)

---

## Running Tests

### Run All Tests

```bash
cd versor/
pytest tests/ -v
```

**Expected output:**

```text
tests/unit/test_quaternion.py::test_identity PASSED
tests/unit/test_quaternion.py::test_normalize PASSED
...
============ 82 passed in 0.55s ==============
```

### Run Specific Test File

```bash
# Only quaternion tests
pytest tests/unit/test_quaternion.py -v

# Only VAC model tests
pytest tests/unit/test_vac_model.py -v

# Only API tests
pytest tests/integration/test_api.py -v
```

### Run Single Test

```bash
pytest tests/unit/test_quaternion.py::test_identity -v
```

### Run by Marker

```bash
# Only unit tests
pytest -m unit -v

# Only integration tests
pytest -m integration -v

# Only semantic tests
pytest -m semantic -v
```

---

## Understanding Test Coverage

### Generate Coverage Report

```bash
pytest tests/ --cov=app --cov-report=html --cov-report=term-missing
```

**Output:**

```text
---------- coverage: platform darwin, python 3.11.5 -----------
Name                              Stmts   Miss  Cover   Missing
---------------------------------------------------------------
app/__init__.py                       0      0   100%
app/core/factory.py                  38      0   100%
app/core/quaternion.py               45      0   100%
app/core/vac_model.py                32      0   100%
app/core/transitions.py              28      0   100%
app/core/interpolation.py            24      0   100%
---------------------------------------------------------------
TOTAL                               167      0   100%
```

### View HTML Report

```bash
open htmlcov/index.html  # macOS
xdg-open htmlcov/index.html  # Linux
start htmlcov/index.html  # Windows
```

The HTML report shows:

- Which lines are covered (green)
- Which lines are not covered (red)
- Branch coverage
- Detailed file-by-file breakdown

---

## Writing Unit Tests

### Test Template

```python
import pytest
from app.core.quaternion import Quaternion

def test_function_name():
    """Test description explaining what this verifies."""
    # Arrange - Setup test data
    input_value = ...

    # Act - Call the function
    result = function_under_test(input_value)

    # Assert - Verify the result
    assert result == expected_value
```

### Example: Testing Quaternion Normalization

```python
def test_quaternion_normalize():
    """Test that normalize() produces a unit quaternion."""
    # Arrange
    q = Quaternion(1.0, 2.0, 3.0, 4.0)

    # Act
    q_norm = q.normalize()

    # Assert
    magnitude = q_norm.magnitude()
    assert abs(magnitude - 1.0) < 1e-6  # Check it's unit length
```

### Testing with Floating Point

Use `pytest.approx()` for floating-point comparisons:

```python
def test_angular_distance():
    """Test angular distance calculation."""
    q1 = Quaternion.identity()
    q2 = Quaternion(0.707, 0, 0.707, 0)  # 90° rotation

    q_trans = calculate_transition(q1, q2)
    phi = angular_distance(q_trans)

    # Use pytest.approx for float comparison
    assert phi == pytest.approx(1.5708, abs=1e-4)  # π/2
```

### Parametrized Tests

Test multiple inputs with one test function:

```python
@pytest.mark.parametrize("valence,arousal,connection,expected_magnitude", [
    (1.0, 0.0, 0.0, 1.0),
    (0.0, 1.0, 0.0, 1.0),
    (0.8, 0.6, 0.0, 1.0),
    (0.5, 0.5, 0.7, 0.866),
])
def test_vac_magnitude(valence, arousal, connection, expected_magnitude):
    """Test VAC magnitude calculation with various inputs."""
    vac = VACVector(valence, arousal, connection)
    magnitude = vac.magnitude()
    assert magnitude == pytest.approx(expected_magnitude, abs=1e-3)
```

### Testing Exceptions

```python
def test_invalid_vac_raises_error():
    """Test that out-of-range VAC values raise ValueError."""
    with pytest.raises(ValueError):
        VACVector(valence=2.0, arousal=0.5, connection=0.3)
```

---

## Writing Integration Tests

### Testing API Endpoints

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_calculate_endpoint():
    """Test /versor/calculate endpoint returns correct structure."""
    # Arrange
    payload = {
        "current_vac": {
            "valence": 0.8,
            "arousal": 0.6,
            "connection": 0.7
        },
        "previous_state": None,
        "time_delta_seconds": 1.0
    }

    # Act
    response = client.post("/versor/calculate", json=payload)

    # Assert
    assert response.status_code == 200
    data = response.json()

    # Check response structure
    assert "current_state" in data
    assert "angular_distance_radians" in data
    assert "elasticity_metric" in data
    assert "is_flooding" in data
    assert "insight_code" in data
    assert "interpolation_path" in data

    # Check types
    assert isinstance(data["current_state"], dict)
    assert isinstance(data["is_flooding"], bool)
    assert isinstance(data["interpolation_path"], list)
```

### Testing Error Cases

```python
def test_calculate_invalid_vac():
    """Test that invalid VAC values return 422 error."""
    payload = {
        "current_vac": {
            "valence": 2.0,  # Invalid: > 1.0
            "arousal": 0.6,
            "connection": 0.7
        }
    }

    response = client.post("/versor/calculate", json=payload)
    assert response.status_code == 422  # Validation error
```

---

## Semantic Tests: The Pity→Compassion Test

### Why This Test Matters

This is the **most important test** in the Versor module. It validates the entire VAC model.

### The Test

```python
import pytest
from app.core.vac_model import VACVector
from app.core.transitions import calculate_transition, detect_dominant_axis

@pytest.mark.semantic
def test_pity_to_compassion_is_connection_shift():
    """
    Validates that pity and compassion differ only on the Connection axis.

    This is the key test proving the VAC model's innovation over VAD.
    Pity and compassion have:
    - Same valence (both negative: sad for someone)
    - Same arousal (both low energy)
    - Different connection (pity is separated, compassion is connected)

    Traditional VAD models cannot differentiate these emotions.
    The VAC model with Connection axis can.
    """
    # Arrange
    pity = VACVector(
        valence=-0.3,
        arousal=-0.2,
        connection=-0.6  # Feeling FOR someone (separation)
    )

    compassion = VACVector(
        valence=-0.3,
        arousal=-0.2,
        connection=0.8   # Feeling WITH someone (connection)
    )

    # Act
    q_pity = pity.to_quaternion()
    q_compassion = compassion.to_quaternion()
    q_transition = calculate_transition(q_pity, q_compassion)
    dominant_axis = detect_dominant_axis(q_transition)

    # Assert
    assert dominant_axis == "CONNECTION_SHIFT", (
        "Pity→Compassion should show CONNECTION_SHIFT, "
        f"but got {dominant_axis}"
    )
```

### If This Test Fails

**This is critical!** If this test fails, the VAC model is broken. Investigate immediately:

1. Check quaternion conversion in `vac_model.py`
2. Check transition calculation in `transitions.py`
3. Check axis detection in `transitions.py`
4. Verify the math hasn't been accidentally changed

---

## Test Fixtures

### Using Fixtures

Fixtures provide reusable test data:

```python
import pytest

@pytest.fixture
def identity_quaternion():
    """Provide identity quaternion for tests."""
    return Quaternion(1, 0, 0, 0)

@pytest.fixture
def sample_vac():
    """Provide sample VAC vector for tests."""
    return VACVector(valence=0.8, arousal=0.6, connection=0.7)

# Use fixtures in tests
def test_with_fixture(identity_quaternion, sample_vac):
    """Test using fixtures."""
    q = sample_vac.to_quaternion()
    result = identity_quaternion.multiply(q)
    assert result == q  # Identity multiplication
```

### Fixture Scopes

```python
@pytest.fixture(scope="module")
def expensive_setup():
    """Run once per test module (file)."""
    # Expensive setup
    return setup_data

@pytest.fixture(scope="function")  # Default
def per_test_setup():
    """Run once per test function."""
    return data
```

---

## Testing Best Practices

### 1. One Assertion Per Test (Generally)

```python
# ❌ Bad - Multiple unrelated assertions
def test_quaternion():
    q = Quaternion(1, 0, 0, 0)
    assert q.w == 1.0
    assert q.magnitude() == 1.0
    assert q.normalize() == q

# ✅ Good - Split into focused tests
def test_quaternion_identity_has_correct_w():
    q = Quaternion.identity()
    assert q.w == 1.0

def test_quaternion_identity_is_unit():
    q = Quaternion.identity()
    assert q.magnitude() == 1.0

def test_quaternion_identity_already_normalized():
    q = Quaternion.identity()
    assert q.normalize() == q
```

### 2. Test Edge Cases

```python
def test_zero_vac_vector():
    """Test that zero VAC converts to identity quaternion."""
    vac = VACVector(0, 0, 0)
    q = vac.to_quaternion()
    assert q == Quaternion.identity()

def test_maximum_vac_values():
    """Test VAC at maximum values."""
    vac = VACVector(1.0, 1.0, 1.0)
    q = vac.to_quaternion()
    assert q.is_unit()

def test_negative_vac_values():
    """Test VAC with all negative values."""
    vac = VACVector(-1.0, -1.0, -1.0)
    q = vac.to_quaternion()
    assert q.is_unit()
```

### 3. Test Invalid Inputs

```python
def test_vac_rejects_out_of_range():
    """Test that VAC rejects values outside [-1, 1]."""
    with pytest.raises(ValueError):
        VACVector(valence=1.5, arousal=0.5, connection=0.3)

    with pytest.raises(ValueError):
        VACVector(valence=0.5, arousal=-1.5, connection=0.3)
```

### 4. Use Descriptive Test Names

```python
# ❌ Bad
def test_q1():
    ...

# ✅ Good
def test_quaternion_multiplication_with_identity_returns_same_quaternion():
    ...
```

### 5. Add Docstrings

```python
def test_slerp_generates_correct_frame_count():
    """
    Test that generate_slerp_path() returns the requested number of frames.

    SLERP should generate exactly num_frames quaternions, with the first
    equal to q_start and the last equal to q_end.
    """
    q_start = Quaternion.identity()
    q_end = Quaternion(0.707, 0, 0.707, 0)

    frames = generate_slerp_path(q_start, q_end, num_frames=60)

    assert len(frames) == 60
    assert frames[0] == q_start
    assert frames[-1] == q_end
```

---

## Debugging Failed Tests

### View Full Output

```bash
# Show print statements
pytest tests/ -s

# Show full diff on assertion failures
pytest tests/ -vv
```

### Run Until First Failure

```bash
pytest tests/ -x
```

### Re-run Only Failed Tests

```bash
# Run tests, then re-run failures
pytest tests/
pytest --lf  # --last-failed
```

### Use Debugger

```python
def test_with_debugger():
    """Test with debugger breakpoint."""
    q = Quaternion(1, 2, 3, 4)

    breakpoint()  # Python 3.7+
    # OR
    import pdb; pdb.set_trace()

    result = q.normalize()
```

Run with `-s` to use debugger:

```bash
pytest tests/unit/test_quaternion.py::test_with_debugger -s
```

---

## Continuous Integration

### GitHub Actions / GitHub Actions

Tests run automatically on every commit:

```yaml
# .github/workflows/ci.yml
test:
  script:
    - cd versor/
    - pip install -r requirements.txt
    - pytest tests/ --cov=app --cov-fail-under=100
```

### Pre-commit Hooks

Tests run before each commit:

```yaml
# .pre-commit-config.yaml
- repo: local
  hooks:
    - id: pytest
      name: pytest
      entry: pytest
      language: system
      pass_filenames: false
      always_run: true
```

---

## Test Coverage Goals

### Current Status

```bash
pytest tests/ --cov=app --cov-report=term-missing
```

**Target:** 100% coverage
**Current:** 100% ✅

### What to Cover

1. **All functions:** Every function should have at least one test
2. **All branches:** If/else statements should test both paths
3. **Edge cases:** Test boundary conditions
4. **Error cases:** Test exception handling

### What Not to Test

- Third-party libraries (NumPy, SciPy)
- Configuration files
- `__init__.py` files (usually empty)

---

## Common Testing Patterns

### Testing Mathematical Equality

```python
def test_quaternion_conjugate_inverse():
    """Test that q * q̅ = identity."""
    q = Quaternion(0.5, 0.5, 0.5, 0.5)
    q_conj = q.conjugate()
    result = q.multiply(q_conj)

    assert result.w == pytest.approx(1.0, abs=1e-6)
    assert result.x == pytest.approx(0.0, abs=1e-6)
    assert result.y == pytest.approx(0.0, abs=1e-6)
    assert result.z == pytest.approx(0.0, abs=1e-6)
```

### Testing Idempotence

```python
def test_normalize_is_idempotent():
    """Test that normalizing twice gives same result."""
    q = Quaternion(1, 2, 3, 4)
    q_norm1 = q.normalize()
    q_norm2 = q_norm1.normalize()

    assert q_norm1 == q_norm2
```

### Testing Symmetry

```python
def test_dot_product_is_commutative():
    """Test that q1·q2 = q2·q1."""
    q1 = Quaternion(1, 2, 3, 4).normalize()
    q2 = Quaternion(4, 3, 2, 1).normalize()

    assert q1.dot(q2) == pytest.approx(q2.dot(q1))
```

---

## Quick Reference

### Running Tests

```bash
# All tests
pytest tests/ -v

# Specific file
pytest tests/unit/test_quaternion.py -v

# Specific test
pytest tests/unit/test_quaternion.py::test_identity -v

# With coverage
pytest tests/ --cov=app --cov-report=html

# Stop on first failure
pytest tests/ -x

# Show print statements
pytest tests/ -s

# Re-run failures
pytest --lf
```

### Writing Tests

```python
# Basic test
def test_something():
    assert actual == expected

# Float comparison
assert value == pytest.approx(expected, abs=1e-6)

# Exception testing
with pytest.raises(ValueError):
    function_that_should_raise()

# Parametrized test
@pytest.mark.parametrize("input,expected", [
    (1, 2),
    (2, 4),
])
def test_double(input, expected):
    assert double(input) == expected
```

---

## Next Steps

Now that you understand testing:

1. **[First Contribution](06-first-contribution.md)** - Make your first PR
2. **[Senior Developer Guides](../architecture/01-deep-dive.md)** - Deep dive into architecture

---

**Previous:** [← Common Tasks](04-common-tasks.md)
**Next:** [First Contribution →](06-first-contribution.md)
