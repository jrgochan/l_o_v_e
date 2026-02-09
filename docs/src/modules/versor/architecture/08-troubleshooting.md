# Troubleshooting - Versor Module

This guide helps you diagnose and fix common issues in the Versor module.

---

## Common Issues

### Issue 1: Quaternion Not Unit Length

#### Symptom

```python
q = vac.to_quaternion()
print(q.magnitude())  # 1.0023 (should be 1.0)
```

#### Causes

1. Floating-point accumulation
2. Multiple operations without renormalization
3. Bug in conversion algorithm

#### Diagnosis

```python
# Check magnitude
mag = q.magnitude()
print(f"Magnitude: {mag}")
print(f"Deviation: {abs(mag - 1.0)}")

# Should be < 1e-6
assert abs(mag - 1.0) < EPSILON
```

#### Solutions

#### Solution 1: Renormalize

```python
q = q.normalize()
assert q.is_unit()
```

#### Solution 2: Check algorithm

```python
# VAC conversion should always produce unit quaternion
vac = VACVector(0.8, 0.6, 0.7)
q = vac.to_quaternion()

# Debug
print(f"VAC magnitude: {vac.magnitude()}")
print(f"Quaternion magnitude: {q.magnitude()}")

# If quaternion isn't unit, bug in to_quaternion()
```

#### Solution 3: Verify inputs

```python
# Check VAC is valid
assert -1.0 <= vac.valence <= 1.0
assert -1.0 <= vac.arousal <= 1.0
assert -1.0 <= vac.connection <= 1.0
```

---

### Issue 2: SLERP Takes Long Path

#### Symptom

Animation rotates 270° instead of 90°.

#### Cause

Forgot to call `ensure_shortest_path()`.

#### Diagnosis

```python
# Check dot product
dot = q1.dot(q2)
print(f"Dot product: {dot}")

if dot < 0:
    print("❌ Quaternions on opposite hemispheres - will take long path")
else:
    print("✓ Shortest path will be taken")
```

#### Solution

```python
# Always ensure shortest path before SLERP
q1, q2 = ensure_shortest_path(q1, q2)
path = generate_slerp_path(q1, q2, steps=60)
```

---

### Issue 3: Division by Zero

#### Symptom

```text
ZeroDivisionError: float division by zero
```

#### Causes

1. Zero magnitude VAC vector
2. Near-zero sin(Ω) in SLERP
3. Zero time delta

#### Diagnosis

```python
# Check VAC magnitude
mag = vac.magnitude()
if mag < EPSILON:
    print("❌ Zero vector - will cause division by zero")

# Check time delta
if time_delta <= 0:
    print("❌ Invalid time delta")
```

#### Solutions

#### For VAC

```python
# to_quaternion() already handles this
if magnitude < EPSILON:
    return Quaternion.identity()  # Safe default
```

#### For SLERP

```python
# Check sin(Ω)
if abs(sin_omega) < EPSILON:
    # Fall back to linear interpolation
    return normalize(lerp(q1, q2, t))
```

#### For time delta

```python
# Validate in Pydantic model
class StateRequest(BaseModel):
    time_delta_seconds: float = Field(..., gt=0.0)  # Must be > 0
```

---

### Issue 4: NaN in Quaternion

#### Symptom

```python
q = vac.to_quaternion()
print(q)  # Quaternion(w=nan, x=nan, y=nan, z=nan)
```

#### Causes

1. NaN in input VAC
2. Invalid math operation (sqrt of negative, etc.)
3. arccos of value > 1.0

#### Diagnosis

```python
import math

# Check for NaN in VAC
if math.isnan(vac.valence) or math.isnan(vac.arousal) or math.isnan(vac.connection):
    print("❌ NaN in VAC input")

# Check for NaN in quaternion
if any(math.isnan(x) for x in [q.w, q.x, q.y, q.z]):
    print("❌ NaN in quaternion")
```

#### Solutions

#### Validate inputs

```python
def validate_vac(vac: VACVector) -> bool:
    """Check VAC is valid."""
    values = [vac.valence, vac.arousal, vac.connection]

    # Check for NaN
    if any(math.isnan(v) for v in values):
        raise ValueError("VAC contains NaN")

    # Check for infinity
    if any(math.isinf(v) for v in values):
        raise ValueError("VAC contains infinity")

    # Check range
    if any(abs(v) > 1.0 for v in values):
        raise ValueError("VAC values must be in [-1, 1]")

    return True
```

#### Clamp before arccos

```python
# Prevent arccos domain error
dot = np.clip(q1.dot(q2), -1.0, 1.0)  # Clamp to [-1, 1]
angle = math.acos(dot)  # Safe
```

---

### Issue 5: Tests Failing

#### Symptom

```text
FAILED tests/unit/test_quaternion.py::test_normalize
```

**Common causes:**

#### Cause 1: Floating-point precision

```python
# ❌ Wrong - exact equality
assert result == 1.0

# ✅ Correct - epsilon tolerance
assert abs(result - 1.0) < EPSILON
# OR
assert result == pytest.approx(1.0, abs=1e-6)
```

#### Cause 2: Quaternion double-cover

```python
# q and -q are equivalent!
q1 = Quaternion(0.5, 0.5, 0.5, 0.5)
q2 = Quaternion(-0.5, -0.5, -0.5, -0.5)

# ❌ Wrong
assert q1 == q2  # Fails (different values)

# ✅ Correct
assert q1.represents_same_rotation(q2)  # Check equivalence
```

#### Cause 3: Import errors

```python
# ❌ Wrong
from quaternion import Quaternion

# ✅ Correct
from app.core.quaternion import Quaternion
```

#### Diagnosis

```bash
# Run single failing test with verbose output
pytest tests/unit/test_quaternion.py::test_normalize -vv

# Show print statements
pytest tests/unit/test_quaternion.py::test_normalize -s

# Drop into debugger on failure
pytest tests/unit/test_quaternion.py::test_normalize --pdb
```

---

### Issue 6: Performance Degradation

#### Symptom

P99 latency increased from 42ms to 85ms.

#### Diagnosis

#### Step 1: Profile

```bash
python -m cProfile -s cumulative -m pytest tests/integration/test_api.py > profile.txt
```

#### Step 2: Identify bottleneck

```text
   ncalls  tottime  percall  cumtime  percall filename:lineno(function)
       100    0.050    0.001    5.000    0.050 some_new_function
```

#### Step 3: Investigate

```python
import timeit

# Time the slow function
time_ms = timeit.timeit("slow_function()", setup="...", number=100) / 100 * 1000
print(f"Average: {time_ms:.2f} ms")
```

#### Solutions

#### 1. Optimize algorithm

```python
# Before: O(n²)
for i in range(n):
    for j in range(n):
        process(i, j)

# After: O(n)
for i in range(n):
    process(i)
```

#### 2. Cache expensive operations

```python
# Pre-compute constant
CONSTANT = expensive_calculation()  # Once at module load

def fast_function():
    return something * CONSTANT  # Reuse
```

#### 3. Use NumPy vectorization

```python
# Before: Python loop
results = [math.sin(x) for x in values]

# After: NumPy
results = np.sin(np.array(values))  # Much faster
```

---

### Issue 7: Import Circular Dependency

#### Symptom

```text
ImportError: cannot import name 'Quaternion' from partially initialized module
```

#### Cause

```python
# app/core/quaternion.py
from app.core.transitions import calculate_transition  # ❌

# app/core/transitions.py
from app.core.quaternion import Quaternion  # ❌

# Circular dependency!
```

#### Solution

#### Option 1: Reorganize imports

```python
# app/core/transitions.py
from app.core.quaternion import Quaternion  # ✓

# app/core/quaternion.py
# Don't import from transitions
```

#### Option 2: Import inside function

```python
# app/core/quaternion.py
def some_method(self):
    from app.core.transitions import calculate_transition  # Local import
    return calculate_transition(...)
```

#### Option 3: Extract to common module

```python
# app/core/common.py
# Shared code here

# quaternion.py and transitions.py both import from common
```

---

### Issue 8: API Returns 422 Error

#### Symptom

```json
{
  "detail": [
    {
      "loc": ["body", "current_vac", "valence"],
      "msg": "ensure this value is less than or equal to 1.0"
    }
  ]
}
```

#### Cause

Pydantic validation failed - input doesn't meet schema.

#### Diagnosis

```python
# Check your request
request_data = {
    "current_vac": {
        "valence": 1.5,  # ❌ Out of range!
        "arousal": 0.5,
        "connection": 0.3
    }
}
```

#### Solution

```python
# Ensure VAC values are in [-1, 1]
request_data = {
    "current_vac": {
        "valence": 0.9,  # ✓ Valid
        "arousal": 0.5,
        "connection": 0.3
    }
}
```

---

### Issue 9: SciPy SLERP Error

#### Symptom

```text
ValueError: Quaternions must have unit magnitude
```

#### Cause

Passing non-unit quaternion to SciPy.

#### Diagnosis

```python
q = Quaternion(1, 2, 3, 4)  # Not normalized!
print(f"Magnitude: {q.magnitude()}")  # 5.477

q_scipy = love_to_scipy(q)
# SciPy will reject this
```

#### Solution

```python
# Always normalize before SciPy
q = q.normalize()
q_scipy = love_to_scipy(q)
```

---

### Issue 10: Slow API Response

#### Symptom

Requests taking > 100ms (should be < 50ms).

#### Diagnosis

#### Step 1: Check frame count

```python
# Are you generating too many frames?
path = generate_slerp_path(q1, q2, steps=500)  # ❌ Too many!
```

#### Step 2: Profile request

```python
import time

start = time.time()
response = requests.post("http://localhost:8001/versor/calculate", json=...)
print(f"Total time: {(time.time() - start) * 1000:.2f} ms")
```

#### Step 3: Check server load

```bash
# CPU usage
top -p $(pgrep -f "uvicorn app.main:app")

# Memory
ps aux | grep uvicorn
```

#### Solutions

#### 1. Reduce frames

```python
# Default to fewer frames
path = generate_slerp_path(q1, q2, steps=30)
```

#### 2. Check network

```bash
# Is it network latency?
ping localhost  # Should be < 1ms
```

#### 3. Scale horizontally

```bash
# Add more instances
docker-compose up --scale versor=3
```

---

## Debugging Techniques

### Print Debugging

```python
# Add debug prints
def calculate_transition(q1, q2):
    print(f"Q1: {q1}")
    print(f"Q2: {q2}")

    q1_conj = q1.conjugate()
    print(f"Q1 conjugate: {q1_conj}")

    result = q1_conj.multiply(q2)
    print(f"Result: {result}")

    return result
```

### Using Python Debugger

```python
# Add breakpoint
def to_quaternion(self):
    magnitude = self.magnitude()

    breakpoint()  # Execution pauses here

    if magnitude < EPSILON:
        return Quaternion.identity()
```

#### Run with debugger

```bash
pytest tests/unit/test_vac_model.py -s  # -s shows debugger
```

#### Debugger commands

- `n` - Next line
- `s` - Step into function
- `c` - Continue
- `p variable` - Print variable
- `l` - List code
- `q` - Quit

### Logging

```python
import logging

logger = logging.getLogger(__name__)

def calculate_state(request):
    logger.debug(f"Request: {request}")

    vac = VACVector(...)
    logger.debug(f"VAC magnitude: {vac.magnitude()}")

    q = vac.to_quaternion()
    logger.debug(f"Quaternion: {q}, magnitude: {q.magnitude()}")

    return response
```

#### Enable debug logging

```python
# app/main.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

---

## Mathematical Errors

### arccos Domain Error

#### Symptom

```text
ValueError: math domain error
```

#### Cause

```python
dot = q1.dot(q2)  # Might be 1.0000001 due to floating point
angle = math.acos(dot)  # ❌ arccos requires [-1, 1]
```

#### Solution

```python
# Clamp to valid domain
dot = np.clip(q1.dot(q2), -1.0, 1.0)
angle = math.acos(dot)  # ✓ Safe
```

### sqrt of Negative Number

#### Symptom

```text
ValueError: math domain error (sqrt)
```

#### Cause

```python
# Negative due to floating-point error
value = 1.0 - some_squared_value
if value < 0:  # e.g., -1e-16
    result = math.sqrt(value)  # ❌ Error
```

#### Solution

```python
# Clamp to non-negative
value = max(0.0, 1.0 - some_squared_value)
result = math.sqrt(value)  # ✓ Safe
```

---

## API Debugging

### Enable FastAPI Debug Mode

```python
# app/main.py
app = FastAPI(
    title="Versor API",
    debug=True  # Enable debug mode
)
```

#### Features

- Detailed error messages
- Stack traces in responses
- Auto-reload on code changes

#### Warning

Never use `debug=True` in production!

### Test with Swagger UI

1. Navigate to <http://localhost:8001/docs>
2. Click endpoint to expand
3. Click "Try it out"
4. Fill in example request
5. Click "Execute"
6. See full request/response with timing

### Use curl with verbose

```bash
curl -v -X POST http://localhost:8001/versor/calculate \
  -H "Content-Type: application/json" \
  -d '{"current_vac": {"valence": 0.8, "arousal": 0.6, "connection": 0.7}}'
```

#### Shows

- Full HTTP headers
- Exact request sent
- Complete response
- Timing information

---

## Test Debugging

### Run Single Test

```bash
pytest tests/unit/test_quaternion.py::test_normalize -v
```

### Show Full Output

```bash
# Show print statements
pytest tests/ -s

# Show full tracebacks
pytest tests/ --tb=long

# Show local variables
pytest tests/ --tb=short -vv
```

### Stop on First Failure

```bash
pytest tests/ -x
```

### Drop into Debugger on Failure

```bash
pytest tests/ --pdb
```

### Re-run Failed Tests

```bash
# Run all tests
pytest tests/

# Run only tests that failed last time
pytest --lf
```

---

## Performance Debugging

### Identify Slow Tests

```bash
# Show 10 slowest tests
pytest tests/ --durations=10
```

#### Output

```text
=========================== slowest 10 durations ============================
2.50s call     tests/integration/test_api.py::test_calculate_endpoint
0.80s call     tests/unit/test_interpolation.py::test_slerp_large_path
0.05s setup    tests/unit/test_quaternion.py::test_multiply
```

### Profile a Specific Test

```bash
python -m cProfile -o profile.stats -m pytest tests/unit/test_interpolation.py

# Analyze
python -c "import pstats; p=pstats.Stats('profile.stats'); p.sort_stats('cumulative'); p.print_stats(20)"
```

---

## Common Error Messages

### "Module not found: scipy"

#### Solution

```bash
pip install scipy==1.12.0
```

### "Import error: cannot import name 'Quaternion'"

#### Solution

```bash
# Install package in development mode
pip install -e .

# OR set PYTHONPATH
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
```

### "Pydantic validation error"

#### Check

1. Is request JSON valid?
2. Are types correct (float not string)?
3. Are constraints met (ge, le, gt)?

### "CORS error in browser"

#### Solution

```python
# app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add your origin
    allow_credentials=True,
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)
```

---

## Debugging Tools

### IPython for Interactive Testing

```bash
pip install ipython
ipython
```

```python
>>> from app.core.vac_model import VACVector
>>> vac = VACVector(0.8, 0.6, 0.7)
>>> q = vac.to_quaternion()
>>> q
Quaternion(w=0.303, x=0.616, y=0.478, z=0.547)
>>> q.magnitude()
1.0
```

### Pytest with pdbpp

```bash
pip install pdbpp  # Better debugger
pytest tests/unit/test_quaternion.py --pdb
```

#### Enhanced features

- Syntax highlighting
- Tab completion
- Better output formatting

---

## Production Debugging

### Health Check Endpoint

```bash
curl http://localhost:8001/health
```

#### Should return

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "dependencies": {
    "numpy": "1.26.3",
    "scipy": "1.12.0"
  }
}
```

### Check Logs

```bash
# Docker logs
docker logs versor-container

# Kubernetes logs
kubectl logs deployment/versor

# System logs
journalctl -u versor -f
```

### Monitor Metrics

#### If Prometheus configured

```bash
curl http://localhost:8001/metrics
```

#### Check

- Request rate
- Error rate
- Latency percentiles
- Memory usage

---

## Preventive Measures

### Pre-commit Hooks

```bash
# Install
pre-commit install

# Run manually
pre-commit run --all-files
```

#### Catches

- Formatting issues
- Linting errors
- Type errors
- Test failures

### Continuous Integration

#### Ensure CI runs

1. All tests
2. Coverage check (100%)
3. Linting
4. Type checking
5. Performance benchmarks

#### If CI fails, do not merge

---

## When to Ask for Help

### Escalate If

1. Issue persists after 30+ minutes
2. Tests mysteriously fail
3. Performance unexpectedly degrades
4. Mathematical results seem wrong
5. Production is affected

### How to Ask

#### Good question

> "The Pity→Compassion test is failing. I've verified the VAC values are correct, and the conversion produces unit quaternions, but detect_dominant_axis() returns 'VALENCE_SHIFT' instead of 'CONNECTION_SHIFT'. Here's the debug output: [paste]. Any ideas?"

#### Bad question

> "It's broken. Help!"

---

## Quick Reference

### Diagnostic Commands

```bash
# Test single file
pytest tests/unit/test_quaternion.py -v

# Debug failing test
pytest tests/unit/test_quaternion.py::test_normalize --pdb

# Profile code
python -m cProfile -s cumulative your_script.py

# Check imports
python -c "from app.core.quaternion import Quaternion; print('OK')"

# Test API
curl http://localhost:8001/health
```

### Common Fixes

```python
# Normalize quaternion
q = q.normalize()

# Clamp arccos input
dot = np.clip(dot, -1.0, 1.0)

# Ensure shortest path
q1, q2 = ensure_shortest_path(q1, q2)

# Validate VAC
assert -1.0 <= vac.valence <= 1.0
```

---

## Next Steps

- **[Architecture Decisions](09-architecture-decisions.md)** - Understand the why
- **[Manager Guides](../architecture/00-high-level-overview.md)** - Operational perspective

---

**Previous:** [← Extending Versor](07-extending-versor.md)
**Next:** [Architecture Decisions →](09-architecture-decisions.md)
