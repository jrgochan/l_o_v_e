# Error Codes Reference - Versor Module

Complete catalog of error codes, HTTP status codes, and troubleshooting guidance.

---

## HTTP Status Codes

### 200 OK

**Meaning:** Successful calculation

**Response contains:** Valid TrajectoryResponse or SlerpResponse

**Action:** None - process the result

---

### 422 Unprocessable Entity

**Meaning:** Request validation failed

**Common causes:**

#### Error: VAC Value Out of Range

**Message:**

```json
{
  "detail": [{
    "loc": ["body", "current_vac", "valence"],
    "msg": "ensure this value is less than or equal to 1.0",
    "type": "value_error.number.not_le"
  }]
}
```

**Cause:** VAC component outside [-1.0, 1.0]

**Fix:** Ensure valence, arousal, connection are all in valid range

**Example fix:**

```python
# Clamp to valid range
valence = max(-1.0, min(1.0, raw_valence))
```

#### Error: Missing Required Field

**Message:**

```json
{
  "detail": [{
    "loc": ["body", "current_vac"],
    "msg": "field required",
    "type": "value_error.missing"
  }]
}
```

**Cause:** Required field not provided in request

**Fix:** Include all required fields

#### Error: Wrong Data Type

**Message:**

```json
{
  "detail": [{
    "loc": ["body", "current_vac", "valence"],
    "msg": "value is not a valid float",
    "type": "type_error.float"
  }]
}
```

**Cause:** Sent string instead of number

**Fix:** Ensure proper JSON types

**Example fix:**

```json
{
  "valence": 0.8,     // ✅ Correct (number)
  "valence": "0.8"    // ❌ Wrong (string)
}
```

#### Error: Invalid Time Delta

**Message:**

```json
{
  "detail": [{
    "loc": ["body", "time_delta_seconds"],
    "msg": "ensure this value is greater than 0",
    "type": "value_error.number.not_gt"
  }]
}
```

**Cause:** time_delta_seconds ≤ 0

**Fix:** Use positive time value

#### Error: Steps Out of Range

**Message:**

```json
{
  "detail": [{
    "loc": ["body", "steps"],
    "msg": "ensure this value is greater than or equal to 10",
    "type": "value_error.number.not_ge"
  }]
}
```

**Cause:** steps < 10 or steps > 120

**Fix:** Use steps in range [10, 120]

---

### 500 Internal Server Error

**Meaning:** Unexpected error during calculation

**Common causes:**

#### Error: Division by Zero

**Internal:** Very rare (should be caught by validation)

**Cause:** Edge case in calculation

**Fix:** Report as bug, include:

- Request payload
- Expected behavior
- Actual error

#### Error: NaN in Calculation

**Cause:** Invalid math operation

**Example:** arccos of value > 1.0

**Prevention:** Input validation (already implemented)

#### Error: Import Error

**Message:**

```json
{
  "detail": "Module 'scipy' not found"
}
```

**Cause:** Missing dependency

**Fix:** Reinstall dependencies

```bash
pip install -r requirements.txt
```

---

### 503 Service Unavailable

**Meaning:** Service is unhealthy

**Causes:**

- All instances crashed
- Service starting up
- Maintenance mode

**Action:**

- Check health endpoint
- Wait for service to recover
- Contact DevOps if persists

---

## Error Scenarios

### Scenario 1: Invalid VAC from LLM

**Problem:** Listener LLM outputs VAC with value 1.5

**Error:**

```json
{
  "detail": [{
    "loc": ["body", "current_vac", "valence"],
    "msg": "ensure this value is less than or equal to 1.0"
  }]
}
```

**Resolution:**

```python
# In Observer, clamp before sending to Versor
def clamp_vac(vac):
    return {
        "valence": max(-1.0, min(1.0, vac["valence"])),
        "arousal": max(-1.0, min(1.0, vac["arousal"])),
        "connection": max(-1.0, min(1.0, vac["connection"]))
    }
```

### Scenario 2: Non-Unit Quaternion

**Problem:** Sending invalid previous_state

**Error:**

```json
{
  "detail": "Quaternion must be unit length"
}
```

**Resolution:**

```python
# Normalize before sending
import math

def normalize_quaternion(q):
    mag = math.sqrt(q["w"]**2 + q["x"]**2 + q["y"]**2 + q["z"]**2)
    return {
        "w": q["w"] / mag,
        "x": q["x"] / mag,
        "y": q["y"] / mag,
        "z": q["z"] / mag
    }
```

### Scenario 3: Connection Timeout

**Problem:** Request takes > 5 seconds

**Error:**

```text
httpx.TimeoutError: Request timeout after 5.0 seconds
```

**Cause:**

- Versor overloaded
- Network issues
- Too many SLERP frames requested

**Resolution:**

```python
# Implement retry with backoff
for attempt in range(3):
    try:
        response = await client.post(..., timeout=10.0)
        break
    except httpx.TimeoutError:
        if attempt == 2:
            raise
        await asyncio.sleep(2 ** attempt)  # Exponential backoff
```

---

## Debugging Errors

### Enable Debug Mode

```python
# app/main.py
app = FastAPI(
    debug=True  # Shows full stack traces
)
```

**Warning:** Only use in development!

### Check Logs

```bash
# Docker
docker logs versor-container

# Kubernetes
kubectl logs deployment/versor

# Local
# Check console output
```

### Validate Request

```bash
# Use curl with verbose output
curl -v -X POST http://localhost:8001/versor/calculate \
  -H "Content-Type: application/json" \
  -d '{"current_vac": {...}}'
```

---

## Error Prevention

### Client-Side Validation

**Before calling Versor:**

```python
def validate_vac(vac: dict) -> bool:
    """Validate VAC before sending to Versor."""
    # Check presence
    if not all(k in vac for k in ["valence", "arousal", "connection"]):
        raise ValueError("Missing VAC components")

    # Check types
    if not all(isinstance(vac[k], (int, float)) for k in vac):
        raise ValueError("VAC components must be numbers")

    # Check ranges
    for key, value in vac.items():
        if not -1.0 <= value <= 1.0:
            raise ValueError(f"{key} must be in [-1, 1], got {value}")

    return True
```

### Schema Validation

Use Pydantic in client code:

```python
from pydantic import BaseModel, Field

class VACInput(BaseModel):
    valence: float = Field(..., ge=-1.0, le=1.0)
    arousal: float = Field(..., ge=-1.0, le=1.0)
    connection: float = Field(..., ge=-1.0, le=1.0)

# Validate before sending
vac = VACInput(valence=0.8, arousal=0.6, connection=0.7)
```

---

## Error Code Quick Reference

| HTTP Code | Meaning | Common Cause | Fix |
|-----------|---------|--------------|-----|
| **200** | Success | N/A | Process result |
| **422** | Validation failed | Invalid VAC range | Clamp to [-1, 1] |
| **422** | Missing field | Incomplete request | Add required fields |
| **422** | Wrong type | String instead of float | Use numbers |
| **500** | Server error | Bug in Versor | Report to team |
| **503** | Service down | All instances crashed | Check health, wait |

---

## Next Steps

- **[Glossary](glossary.md)** - Terminology reference
- **[Troubleshooting](../architecture/08-troubleshooting.md)** - Detailed debugging

---

**Previous:** [← Configuration](configuration.md)
**Next:** [Glossary →](glossary.md)
