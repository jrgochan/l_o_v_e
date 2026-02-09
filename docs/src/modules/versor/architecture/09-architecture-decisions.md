# Architecture Decisions - Versor Module

This guide documents the key architectural decisions made in the Versor module, explaining the rationale behind each choice and the alternatives considered.

---

## Decision 1: Quaternions Over Euler Angles

### The Decision

**Chosen:** Quaternions for rotation representation
**Rejected:** Euler angles (pitch, yaw, roll)

### Rationale

**Euler angle problems:**

- ❌ **Gimbal lock** - Singularities at certain orientations
- ❌ **Discontinuities** - Jumps in representation
- ❌ **Hard to interpolate** - No natural smooth path
- ❌ **Order dependent** - XYZ vs ZYX gives different results

**Quaternion advantages:**

- ✅ **No singularities** - Works for all orientations
- ✅ **Smooth interpolation** - SLERP provides natural paths
- ✅ **Compact** - 4 numbers vs 3 (but no redundancy)
- ✅ **Efficient composition** - Simple multiplication

### Emotional Significance

**Gimbal lock as metaphor:**

- Represents emotional "stuckness"
- Trauma creates singularities in emotional space
- Quaternions allow representation of all emotional states without mathematical "blind spots"

**References:**

- Shoemake, K. (1985). "Animating Rotation with Quaternion Curves"
- `versor/docs/02-mathematical-foundation.md`

---

## Decision 2: Stateless Architecture

### The Decision

**Chosen:** Pure stateless microservice (no database)
**Rejected:** Stateful service with trajectory storage

### Rationale

**Stateless advantages:**

- ✅ **Horizontal scaling** - Trivial to add instances
- ✅ **Reliability** - No database to fail
- ✅ **Performance** - No I/O latency
- ✅ **Simplicity** - Easier to develop and deploy

**Stateful disadvantages:**

- ❌ **Complexity** - Database, migrations, backups
- ❌ **Performance** - 10-50ms DB latency per request
- ❌ **Scaling** - Database becomes bottleneck
- ❌ **State management** - Synchronization, consistency issues

### Trade-offs

**Consequence:** Observer must provide previous state in each request.

**Why this is acceptable:**

- Observer already stores trajectories
- Prevents duplication of responsibility
- Clear separation of concerns
- Versor = calculator, Observer = memory

### Alternative Considered

**Hybrid approach:** Cache recent states in Redis

```text
Request → Check Redis → Calculate → Update Redis → Response
```

**Why rejected:**

- Added complexity
- Marginal performance gain
- Redis failure affects Versor
- Violates stateless principle

---

## Decision 3: Scalar-First Convention

### The Decision

**Chosen:** `[w, x, y, z]` (scalar-first)
**Rejected:** `[x, y, z, w]` (scalar-last, like SciPy)

### Rationale

**Scalar-first advantages:**

- ✅ Matches mathematical literature
- ✅ Standard in game engines (Unity, Unreal)
- ✅ Physics textbook convention
- ✅ More intuitive (real part first)

**Trade-off:** Requires adapter for SciPy

**Why acceptable:**

- Adapter is simple (`scipy_adapter.py`)
- Only needed for SLERP
- Benefits outweigh 10 lines of conversion code

### Historical Context

**Hamilton's original notation (1843):**

```text
q = a + bi + cj + dk
```

Scalar (a) comes first in the definition.

**References:**

- Hamilton, W.R. (1843). "On Quaternions"
- Unity Documentation: Quaternion Structure

---

## Decision 4: Using SciPy for SLERP

### The Decision

**Chosen:** SciPy's `spatial.transform.Slerp`
**Rejected:** Custom pure-Python SLERP

### Rationale

**SciPy advantages:**

- ✅ **3-4x faster** (C implementation)
- ✅ **Numerically stable** - Handles edge cases
- ✅ **Well-tested** - Millions of users
- ✅ **Maintained** - Regular updates

**Custom implementation disadvantages:**

- ❌ Slower (pure Python)
- ❌ More edge cases to handle
- ❌ Maintenance burden
- ❌ Reinventing the wheel

### Trade-off: External Dependency

**Concern:** SciPy adds ~50MB to deployment

**Mitigation:**

- Use Docker for consistent deployment
- SciPy provides other utilities (Rotation class)
- Industry-standard library (low risk)

**Verdict:** Performance and reliability justify dependency.

---

## Decision 5: FastAPI Over Flask

### The Decision

**Chosen:** FastAPI
**Rejected:** Flask, Django REST Framework

### Rationale

**FastAPI advantages:**

- ✅ **Auto API docs** - Swagger/ReDoc generation
- ✅ **Type safety** - Pydantic integration
- ✅ **Modern** - Async support, Python 3.11+
- ✅ **Performance** - Faster than Flask/Django
- ✅ **Developer experience** - Excellent error messages

**Flask disadvantages:**

- ❌ No automatic validation
- ❌ No auto-generated API docs
- ❌ Manual schema definition
- ❌ Less type-safe

**Django disadvantages:**

- ❌ Too heavy for microservice
- ❌ Assumes database usage
- ❌ Overkill for pure calculation engine

---

## Decision 6: Connection Axis Over Dominance

### The Decision

**Chosen:** VAC (Valence-Arousal-Connection)
**Rejected:** VAD (Valence-Arousal-Dominance)

### Rationale

**Connection axis advantages:**

- ✅ **Relational emotions** - Captures interpersonal dynamics
- ✅ **Differentiates pity/compassion** - Key use case
- ✅ **Therapeutic relevance** - Attachment, belonging
- ✅ **Brené Brown alignment** - Atlas of the Heart framework

**Dominance disadvantages:**

- ❌ **Hierarchical** - Power dynamics, less therapeutic
- ❌ **Conflates emotions** - Can't distinguish pity from compassion
- ❌ **Less clinically relevant** - Dominance isn't primary therapeutic concern

### Validation

**Pity→Compassion test proves this works:**

```python
pity = VAC[-0.3, -0.2, -0.6]        # Negative connection
compassion = VAC[-0.3, -0.2, 0.8]   # Positive connection

# Traditional VAD: Can't tell these apart
# VAC model: CONNECTION_SHIFT detected ✅
```

**References:**

- Russell, J.A. (1980). "A circumplex model of affect"
- Brown, B. (2021). "Atlas of the Heart"

---

## Decision 7: Linear Angle Mapping

### The Decision

**Chosen:** `angle = π · (magnitude / √3)`
**Rejected:** Non-linear mappings (quadratic, logarithmic)

### Rationale

**Linear mapping advantages:**

- ✅ **Intuitive** - Intensity directly maps to rotation
- ✅ **Predictable** - Easy to reason about
- ✅ **Reversible** - Can convert back easily
- ✅ **Fills space** - Uses full [0, π] range

**Alternatives considered:**

**Quadratic:**

```text
angle = π · (magnitude / √3)²
```

- Pros: More gradual at low intensities
- Cons: Compresses high intensities, less intuitive

**Logarithmic:**

```text
angle = π · log(1 + magnitude) / log(1 + √3)
```

- Pros: Spreads out low intensities
- Cons: Complex, non-linear, harder to interpret

**Verdict:** Linear is simplest and most intuitive.

---

## Decision 8: 100% Test Coverage Requirement

### The Decision

**Chosen:** Maintain 100% test coverage
**Rejected:** Lower thresholds (80%, 90%)

### Rationale

**100% coverage advantages:**

- ✅ **Confidence** - Every line tested
- ✅ **Refactoring safety** - Changes don't break untested code
- ✅ **Documentation** - Tests show how code works
- ✅ **Mathematical correctness** - Critical for quaternion math

**Cost:**

- More test writing time
- Occasional pragma exclusions needed

**Why acceptable:**

- Versor is small (~10 core files)
- Pure functions are easy to test
- Mathematical correctness is critical

**Special case:**

```python
# Defensive code that should never execute
if something_impossible:
    raise AssertionError("This should never happen")  # pragma: no cover
```

---

## Decision 9: No Caching

### The Decision

**Chosen:** No caching layer
**Rejected:** Redis cache, LRU cache

### Rationale

**No caching advantages:**

- ✅ **Simplicity** - Fewer moving parts
- ✅ **Stateless** - Maintains architectural principle
- ✅ **No cache invalidation** - Avoid complexity
- ✅ **Performance sufficient** - <50ms without caching

**Caching disadvantages:**

- ❌ **Complexity** - Cache implementation, invalidation
- ❌ **Memory** - Cache storage
- ❌ **Failure mode** - Cache can fail
- ❌ **Marginal benefit** - 5-10ms savings not worth complexity

**When to reconsider:**

- If P99 latency exceeds 50ms
- If repeated identical requests are common
- If computational cost increases significantly

---

## Decision 10: Python Over C/C++/Rust

### The Decision

**Chosen:** Python 3.11+ with NumPy/SciPy
**Rejected:** C/C++/Rust implementation

### Rationale

**Python advantages:**

- ✅ **Development speed** - Faster iteration
- ✅ **Ecosystem** - NumPy, SciPy, FastAPI
- ✅ **Maintainability** - Easier to read/modify
- ✅ **Performance sufficient** - Meets requirements

**C/C++/Rust disadvantages:**

- ❌ **Development time** - 3-5x slower
- ❌ **Complexity** - Memory management, build system
- ❌ **Maintenance** - Fewer developers know these languages
- ❌ **Diminishing returns** - Python+NumPy is already fast

**Performance comparison:**

- Pure Python SLERP: ~20ms
- Python+SciPy SLERP: ~7ms
- Theoretical C implementation: ~3-5ms

**Verdict:** 7ms is fast enough. 3ms savings not worth complexity.

---

## Decision 11: Separate SLERP Endpoint

### The Decision

**Chosen:** Separate `/versor/slerp` endpoint
**Alternative:** Only `/versor/calculate` with all features

### Rationale

**Separation advantages:**

- ✅ **Single responsibility** - Each endpoint does one thing
- ✅ **Performance** - Can skip calculations if only SLERP needed
- ✅ **Flexibility** - Different parameters for each
- ✅ **Clarity** - API is easier to understand

**Example:**

```text
/versor/calculate → Full calculation (VAC, transitions, SLERP)
/versor/slerp → Just interpolation (quaternion to quaternion)
```

**Use case for separate SLERP:**

- Experience module has two quaternions
- Just needs smooth interpolation path
- Doesn't need VAC conversion or transition metrics

---

## Decision 12: P99 < 50ms Target

### The Decision

**Chosen:** P99 latency must be < 50ms
**Alternatives:** P95 < 100ms, P90 < 30ms

### Rationale

**Why P99:**

- Ensures 99% of users get fast response
- Accounts for occasional slowdowns
- Industry standard for user-facing APIs

**Why 50ms:**

- Human perception threshold: ~100ms feels instant
- Leaves budget for network latency (~20ms)
- 50ms allows for 60fps animation calculation
- Achievable with current architecture

**How we meet it:**

- Stateless (no DB latency)
- Optimized SLERP (SciPy)
- Pure in-memory computation
- Horizontal scaling available

---

## Decision 13: No WebSocket Support

### The Decision

**Chosen:** REST API only
**Rejected:** WebSocket for real-time updates

### Rationale

**REST advantages:**

- ✅ **Simpler** - Standard HTTP
- ✅ **Stateless** - Aligns with architecture
- ✅ **Sufficient** - Response time fast enough
- ✅ **Widely supported** - Every client can use it

**WebSocket disadvantages:**

- ❌ **Stateful** - Connection management
- ❌ **Complexity** - Connection lifecycle
- ❌ **Not needed** - Request/response is fast enough
- ❌ **Scaling complexity** - Sticky sessions required

**When to reconsider:**

- If Experience needs continuous quaternion stream
- If latency becomes critical (< 10ms required)
- If request rate exceeds 1000/second

---

## Decision 14: Google-Style Docstrings

### The Decision

**Chosen:** Google-style docstrings
**Rejected:** NumPy-style, reStructuredText

### Rationale

**Google style advantages:**

- ✅ **Readable** - Clear section headers
- ✅ **Concise** - Less verbose than NumPy
- ✅ **Supported** - pydocstyle, Sphinx
- ✅ **Consistent** - Used in Observer, Listener

**Example:**

```python
def calculate_transition(q1: Quaternion, q2: Quaternion) -> Quaternion:
    """
    Calculate transition quaternion between two states.

    Args:
        q1: Starting quaternion
        q2: Target quaternion

    Returns:
        Transition quaternion representing the rotation

    Example:
        >>> q1 = Quaternion.identity()
        >>> q2 = Quaternion(0.707, 0, 0.707, 0)
        >>> q_trans = calculate_transition(q1, q2)
    """
```

---

## Decision 15: No Quaternion Caching in Objects

### The Decision

**Chosen:** Recalculate quaternion each time from VAC
**Rejected:** Cache quaternion in VACVector object

### Rationale

**No caching advantages:**

- ✅ **Immutability** - VACVector can be @dataclass
- ✅ **Simplicity** - No cache invalidation
- ✅ **Memory** - No extra storage
- ✅ **Performance sufficient** - Conversion is 0.5ms

**Example of rejected approach:**

```python
# ❌ Rejected
class VACVector:
    def __init__(self, v, a, c):
        self.valence = v
        self.arousal = a
        self.connection = c
        self._cached_quaternion = None  # Cache

    def to_quaternion(self):
        if self._cached_quaternion is None:
            self._cached_quaternion = self._calculate_quaternion()
        return self._cached_quaternion
```

**Why rejected:**

- Adds state to data class
- Premature optimization
- Breaks immutability
- 0.5ms savings not worth complexity

---

## Decision 16: Single Process, Not Multiprocess

### The Decision

**Chosen:** Single-process Uvicorn server
**Rejected:** Gunicorn with multiple workers

### Rationale

**Single-process advantages:**

- ✅ **Simpler deployment** - One process to manage
- ✅ **Container-friendly** - Scale with container replication
- ✅ **No shared state** - Each instance independent
- ✅ **Cloud-native** - Kubernetes handles scaling

**Multi-worker pattern:**

```bash
# Not used
gunicorn app.main:app --workers 4
```

**Rejected because:**

- Horizontal scaling (more containers) is better
- Kubernetes/Docker orchestration handles this
- Single-process is simpler to debug
- No performance advantage with stateless design

**Deployment strategy:**

```text
Not: 1 server with 4 workers
Instead: 4 servers with 1 worker each
```

---

## Decision 17: No Request ID Tracking

### The Decision

**Chosen:** No request ID generation
**Rejected:** Generate and track request IDs

### Rationale

**No tracking advantages:**

- ✅ **Stateless** - Maintains principle
- ✅ **Simpler** - Less code
- ✅ **Performance** - Slightly faster

**Why acceptable:**

- Observer generates request IDs if needed
- Logs include timestamp for correlation
- Not needed for stateless calculations

**If implemented:**

```python
import uuid

@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response
```

**Not needed for current use case.**

---

## Decision 18: Minimal Logging

### The Decision

**Chosen:** Log only errors and warnings
**Rejected:** Verbose debug logging

### Rationale

**Minimal logging advantages:**

- ✅ **Performance** - Less I/O
- ✅ **Privacy** - Don't log VAC values
- ✅ **Signal-to-noise** - Easier to find problems
- ✅ **Disk usage** - Smaller log files

**What we log:**

- Errors and exceptions
- Unusual inputs (E > 5.0)
- Health check calls (INFO level)

**What we don't log:**

- Every request
- VAC values (may be sensitive)
- Intermediate calculations
- Normal responses

**Configuration:**

```python
# Default: WARNING level
logging.basicConfig(level=logging.WARNING)

# Production: ERROR only
logging.basicConfig(level=logging.ERROR)

# Development: DEBUG for troubleshooting
logging.basicConfig(level=logging.DEBUG)
```

---

## Decision 19: Environment-Based Configuration

### The Decision

**Chosen:** Pydantic Settings with .env file
**Rejected:** YAML/JSON config files

### Rationale

**Pydantic Settings advantages:**

- ✅ **Type-safe** - Validation at startup
- ✅ **Environment variables** - 12-factor app compliant
- ✅ **Defaults** - Sensible fallbacks
- ✅ **IDE support** - Autocomplete, type hints

**Example:**

```python
class Settings(BaseSettings):
    FLOODING_THRESHOLD: float = 2.0

    class Config:
        env_file = ".env"
```

**12-factor app compliance:**

```bash
# Can override via environment
export FLOODING_THRESHOLD=2.5
```

---

## Decision 20: No Authentication/Authorization

### The Decision

**Chosen:** No auth in Versor
**Rejected:** JWT tokens, API keys

### Rationale

**No auth advantages:**

- ✅ **Simplicity** - No user management
- ✅ **Performance** - No token validation
- ✅ **Separation of concerns** - Auth is Observer's job

**Security model:**

```text
User → Observer (authenticated) → Versor (trusted internal)
```

**Assumptions:**

- Versor runs in private network
- Only Observer can reach it
- Network-level security (VPC, firewall)

**If public-facing:**
Would add API key validation:

```python
from fastapi import Security, HTTPException
from fastapi.security import APIKeyHeader

api_key_header = APIKeyHeader(name="X-API-Key")

@router.post("/calculate")
async def calculate_state(
    request: StateRequest,
    api_key: str = Security(api_key_header)
):
    if api_key != settings.API_KEY:
        raise HTTPException(403, "Invalid API key")
    # ...
```

**Not needed for internal microservice.**

---

## Lessons Learned

### What Worked Well

1. **Stateless design** - Scaling is trivial
2. **Quaternions** - No gimbal lock issues encountered
3. **SciPy** - Fast and reliable SLERP
4. **100% coverage** - Caught many bugs early
5. **Type hints** - Prevented runtime errors

### What We'd Do Differently

1. **More performance tests earlier** - Found bottleneck late
2. **Document scalar convention sooner** - Caused confusion
3. **Batch endpoint from start** - Added later, should've been initial

### Future Decisions to Make

1. **WebSocket support?** - If Experience needs real-time
2. **GPU acceleration?** - If processing thousands simultaneously
3. **Caching layer?** - If latency requirements tighten
4. **Alternate representations?** - Euler angles for debugging

---

## References

### Architecture Documentation

- **System Overview:** `docs/architecture/01-system-overview.md`
- **VAC Model:** `docs/architecture/02-vac-model.md`
- **Versor Architecture:** `versor/docs/01-architecture.md`

### Research Papers

- **Quaternions:** Hamilton (1843)
- **SLERP:** Shoemake (1985)
- **VAC Extension:** Russell (1980), extended by L.O.V.E. team

---

## Next Steps

Now that you understand the architecture:

- **[Manager Overview](../architecture/00-high-level-overview.md)** - High-level perspective
- **[Executive Overview](../overview/01-executive-summary.md)** - Business context
- **[API Reference](../reference/api-reference.md)** - Complete API docs

---

**Previous:** [← Troubleshooting](08-troubleshooting.md)
**Next:** [Manager Architecture Overview →](../architecture/00-high-level-overview.md)
