# Deep Dive Architecture - Versor Module

This guide provides an in-depth look at the Versor module's architecture, design patterns, and implementation details.

---

## Architectural Overview

### Design Philosophy

The Versor is built on three core principles:

1. **Mathematical Purity** - No business logic, only pure functions
2. **Statelessness** - No database, no sessions, no side effects
3. **Performance First** - Sub-50ms P99 latency requirement

### System Architecture

```text
┌─────────────────────────────────────────────┐
│              FastAPI Application            │
│  ┌───────────────────────────────────────┐  │
│  │         Middleware Stack             │  │
│  │  • CORS                              │  │
│  │  • Logging                           │  │
│  │  • Error handling                    │  │
│  └───────────────┬───────────────────────┘  │
│                  │                          │
│  ┌───────────────▼───────────────────────┐  │
│  │         Router Layer                 │  │
│  │  • /versor/calculate                 │  │
│  │  • /versor/slerp                     │  │
│  │  • /health                           │  │
│  └───────────────┬───────────────────────┘  │
│                  │                          │
│  ┌───────────────▼───────────────────────┐  │
│  │      Pydantic Validation            │  │
│  │  • Request models                    │  │
│  │  • Response models                   │  │
│  │  • Type safety                       │  │
│  └───────────────┬───────────────────────┘  │
│                  │                          │
│  ┌───────────────▼───────────────────────┐  │
│  │         Core Mathematics             │  │
│  │  ┌─────────────────────────────────┐ │  │
│  │  │  Quaternion                     │ │  │
│  │  │  • Algebra operations           │ │  │
│  │  │  • Normalization                │ │  │
│  │  └─────────────┬───────────────────┘ │  │
│  │  ┌─────────────▼───────────────────┐ │  │
│  │  │  VACVector                      │ │  │
│  │  │  • VAC → Quaternion conversion  │ │  │
│  │  └─────────────┬───────────────────┘ │  │
│  │  ┌─────────────▼───────────────────┐ │  │
│  │  │  Transitions                    │ │  │
│  │  │  • Angular distance             │ │  │
│  │  │  • Elasticity calculation       │ │  │
│  │  └─────────────┬───────────────────┘ │  │
│  │  ┌─────────────▼───────────────────┐ │  │
│  │  │  Interpolation (SLERP)          │ │  │
│  │  │  • Path generation              │ │  │
│  │  │  • SciPy adapter                │ │  │
│  │  └─────────────────────────────────┘ │  │
│  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

## Application Initialization

### FastAPI App Setup

**File:** `app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

# Create FastAPI instance
app = FastAPI(
    title=settings.API_TITLE,
    description=settings.API_DESCRIPTION,
    version="1.0.0"
)

# Configure CORS for cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,  # Observer, Experience
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# Mount routers
app.include_router(calculate.router, prefix="/versor", tags=["Calculation"])
app.include_router(slerp.router, prefix="/versor", tags=["Interpolation"])
```

### Why FastAPI?

1. **Automatic API Documentation** - OpenAPI/Swagger out of the box
2. **Pydantic Integration** - Type safety and validation
3. **Async Support** - High concurrency (though not needed in stateless Versor)
4. **Performance** - Fast routing and serialization
5. **Developer Experience** - Excellent error messages

---

## Request/Response Flow

### Complete Data Flow

```text
1. HTTP POST to /versor/calculate
   ↓
2. FastAPI routes to calculate_state()
   ↓
3. Pydantic validates StateRequest
   ├─ current_vac: VACInput (valence, arousal, connection)
   ├─ previous_state: Optional[QuaternionModel]
   └─ time_delta_seconds: float
   ↓
4. Extract VAC components
   ↓
5. VACVector.to_quaternion()
   ├─ Calculate magnitude: √(v² + a² + c²)
   ├─ Normalize axis: [v, a, c] / magnitude
   ├─ Calculate angle: magnitude * π
   └─ Apply axis-angle formula
   ↓
6. Get previous quaternion (or identity)
   ↓
7. calculate_transition(q_prev, q_current)
   └─ q_trans = q_prev^(-1) * q_current
   ↓
8. angular_distance(q_trans)
   └─ φ = 2 * arccos(|w_trans|)
   ↓
9. calculate_elasticity(φ, Δt)
   └─ E = φ / Δt
   ↓
10. detect_flooding(E, threshold)
    └─ is_flooding = E > 2.0
   ↓
11. detect_dominant_axis(q_trans)
    └─ max(|x|, |y|, |z|) → axis name
   ↓
12. generate_slerp_path(q_prev, q_current, steps)
    ├─ Ensure shortest path (dot product check)
    ├─ Use SciPy's Slerp implementation
    └─ Generate 60-120 frames
   ↓
13. Build TrajectoryResponse
    ├─ Convert Quaternions to QuaternionModels
    └─ Serialize to JSON
   ↓
14. Return HTTP 200 with JSON body
```

### Timing Breakdown

**Performance target:** < 50ms P99 latency

Typical breakdown:

- **Request parsing:** ~1ms (Pydantic validation)
- **VAC→Quaternion:** ~0.5ms (pure math)
- **Transition calc:** ~0.5ms (quaternion operations)
- **Angular distance:** ~0.2ms (single arccos)
- **Elasticity:** ~0.1ms (division)
- **Dominant axis:** ~0.1ms (comparison)
- **SLERP path (60 frames):** ~5-10ms (SciPy)
- **Response serialization:** ~2ms (Pydantic)

**Total:** ~10-15ms typical, <50ms P99 ✅

---

## Layered Architecture

### Layer 1: Core Mathematics (`app/core/`)

**Responsibilities:**

- Pure mathematical functions
- No side effects
- No I/O
- No dependencies on FastAPI

**Design Pattern:** Functional programming

**Key Characteristics:**

```python
# All functions are pure
def calculate_transition(q1: Quaternion, q2: Quaternion) -> Quaternion:
    # Same inputs → same outputs (deterministic)
    # No state modification
    # No side effects
    return q1.conjugate().multiply(q2)
```

**Benefits:**

- Easy to test
- Easy to reason about
- Parallelizable
- Cacheable (if needed)

### Layer 2: API Models (`app/api/models/`)

**Responsibilities:**

- Request/response schemas
- Validation rules
- Type safety
- Serialization

**Design Pattern:** Data Transfer Objects (DTOs)

**Key Characteristics:**

```python
class VACInput(BaseModel):
    """VAC vector with validation."""
    valence: float = Field(..., ge=-1.0, le=1.0)
    arousal: float = Field(..., ge=-1.0, le=1.0)
    connection: float = Field(..., ge=-1.0, le=1.0)
```

**Benefits:**

- Automatic validation
- Clear API contracts
- Type-safe
- Auto-generated documentation

### Layer 3: API Routes (`app/api/routes/`)

**Responsibilities:**

- HTTP endpoint implementation
- Request handling
- Error responses
- Orchestration of core functions

**Design Pattern:** Controller pattern

**Key Characteristics:**

```python
@router.post("/calculate", response_model=TrajectoryResponse)
async def calculate_state(request: StateRequest):
    # 1. Extract and validate input
    # 2. Call core functions
    # 3. Build response
    # 4. Return
```

**Benefits:**

- Separation of concerns
- Testable independently
- Clear responsibilities

---

## Stateless Design

### What "Stateless" Means

**The Versor has:**

- ❌ No database
- ❌ No session management
- ❌ No caching
- ❌ No file I/O
- ❌ No global state

**Every request:**

- Receives all data it needs
- Performs calculations
- Returns results
- Forgets everything

### Benefits

1. **Horizontal Scaling**

   ```text
   Load Balancer
        │
        ├─→ Versor Instance 1
        ├─→ Versor Instance 2
        └─→ Versor Instance N
   ```

   - Add more instances trivially
   - No state synchronization needed
   - No session affinity required

2. **Reliability**
   - No database to fail
   - No disk to fill up
   - No state corruption possible

3. **Performance**
   - No disk I/O latency
   - No database query time
   - Pure in-memory computation

4. **Simplicity**
   - Easy to deploy
   - Easy to test
   - Easy to reason about

### Trade-offs

**Advantage:** Extreme simplicity and scalability
**Trade-off:** Previous state must be provided by caller (Observer)

---

## Error Handling

### Error Hierarchy

```text
HTTP Status Codes:
├─ 200 OK - Successful calculation
├─ 422 Unprocessable Entity - Validation error
├─ 500 Internal Server Error - Unexpected error
└─ 503 Service Unavailable - Dependencies unavailable
```

### Validation Errors (422)

**Triggered by:**

- VAC values outside [-1.0, 1.0]
- Invalid quaternion (missing w, x, y, z)
- Negative time_delta
- Invalid num_frames

**Example:**

```python
# Request with invalid VAC
{
  "current_vac": {
    "valence": 2.0,  # ❌ Outside range
    "arousal": 0.5,
    "connection": 0.3
  }
}

# Response
{
  "detail": [
    {
      "loc": ["body", "current_vac", "valence"],
      "msg": "ensure this value is less than or equal to 1.0",
      "type": "value_error.number.not_le"
    }
  ]
}
```

### Mathematical Errors (500)

**Triggered by:**

- Division by zero (shouldn't happen with proper validation)
- NaN propagation
- Numerical overflow

**Mitigation:**

- Epsilon checks for zero division
- Normalization to prevent overflow
- Comprehensive unit tests

---

## Dependency Management

### Required Libraries

```python
# Core scientific computing
numpy==1.26.3      # Vector operations, trigonometry
scipy==1.12.0      # SLERP implementation

# Web framework
fastapi==0.109.0   # REST API
uvicorn==0.27.0    # ASGI server
pydantic==2.5.3    # Validation

# Development
pytest==7.4.4      # Testing
mypy==1.8.0        # Type checking
black==24.1.1      # Formatting
```

### Why These Versions?

- **NumPy 1.26.3:** Stable, well-tested array operations
- **SciPy 1.12.0:** Latest SLERP implementation
- **FastAPI 0.109:** Pydantic v2 support
- **Python 3.12+:** Match keyword, performance improvements

---

## CORS Configuration

### Purpose

Allow cross-origin requests from:

- Observer API (port 8002)
- Experience web app (port 3000)

### Configuration

```python
# app/config.py
class Settings(BaseSettings):
    CORS_ORIGINS: List[str] = [
        "http://localhost:8000",  # Listener
        "http://localhost:8002",  # Observer
        "http://localhost:3000",  # Experience
        "http://localhost:3001",  # Experience dev
    ]
```

### Security Considerations

**Development:**

```python
allow_origins=["*"]  # Allow all (development only!)
```

**Production:**

```python
allow_origins=[
    "https://api.love-platform.com",
    "https://app.love-platform.com"
]  # Explicit whitelist
```

---

## Async vs Sync

### Current Implementation: Async Routes

```python
@router.post("/calculate")
async def calculate_state(request: StateRequest):
    # Even though we don't await anything...
    pass
```

### Why Async?

**Pros:**

- Consistent with FastAPI best practices
- Allows future async additions
- Better integration with async middleware

**Cons:**

- Unnecessary for pure computation
- Slight overhead (minimal)

### Could We Use Sync?

Yes! Since Versor is stateless with no I/O:

```python
@router.post("/calculate")
def calculate_state(request: StateRequest):  # No async
    # Synchronous is fine here
    pass
```

**Decision:** Keep async for future-proofing and consistency.

---

## Type Safety with Pydantic

### Request Validation

```python
class StateRequest(BaseModel):
    """Validated request model."""

    current_vac: VACInput  # Validates each field
    previous_state: Optional[QuaternionModel] = None
    time_delta_seconds: float = Field(default=1.0, gt=0.0)

    # Pydantic automatically:
    # 1. Checks types
    # 2. Validates constraints (ge, le, gt)
    # 3. Provides detailed error messages
    # 4. Supports optional fields with defaults
```

### Response Serialization

```python
class TrajectoryResponse(BaseModel):
    """Type-safe response model."""

    current_state: QuaternionModel
    angular_distance_radians: float
    # ... more fields

    class Config:
        json_schema_extra = {
            "example": {
                "current_state": {"w": 0.5, "x": 0.5, "y": 0.5, "z": 0.5},
                # ... example data
            }
        }
```

**Benefits:**

- Automatic JSON serialization
- OpenAPI schema generation
- Type hints for IDE
- Runtime validation

---

## Configuration Management

### Settings Class

```python
# app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application configuration with environment variable support."""

    # API metadata
    API_TITLE: str = "Versor API"
    API_DESCRIPTION: str = "Quaternion mathematics for emotional state"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8001

    # Thresholds
    FLOODING_THRESHOLD: float = 2.0  # rad/s
    EPSILON: float = 1e-6

    # SLERP
    DEFAULT_SLERP_STEPS: int = 60
    MIN_SLERP_STEPS: int = 10
    MAX_SLERP_STEPS: int = 120

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:8002"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

# Singleton instance
settings = Settings()
```

### Environment Variables

Create `.env` file:

```bash
# Override defaults
FLOODING_THRESHOLD=2.5
DEFAULT_SLERP_STEPS=120
CORS_ORIGINS=["http://localhost:3000","http://localhost:8002"]
```

### Accessing Settings

```python
from app.config import settings

# Use anywhere
if elasticity > settings.FLOODING_THRESHOLD:
    is_flooding = True
```

---

## Router Organization

### Multiple Routers

```python
# app/api/routes/calculate.py
router = APIRouter()

@router.post("/calculate")
async def calculate_state(...):
    pass

# app/api/routes/slerp.py
router = APIRouter()

@router.post("/slerp")
async def interpolate(...):
    pass
```

### Mounting in main.py

```python
app.include_router(
    calculate.router,
    prefix="/versor",      # Adds /versor prefix
    tags=["Calculation"]   # Groups in OpenAPI docs
)
```

**Result:**

- `/versor/calculate` endpoint
- Organized in OpenAPI under "Calculation" tag

---

## Dependency Injection Pattern

### FastAPI's DI System

**Current:** Not used (stateless, no dependencies)

**If we needed it:**

```python
from fastapi import Depends

def get_settings():
    """Dependency provider."""
    return settings

@router.post("/calculate")
async def calculate_state(
    request: StateRequest,
    settings: Settings = Depends(get_settings)  # Injected
):
    threshold = settings.FLOODING_THRESHOLD
    # ...
```

**Benefits:**

- Testable (can inject mocks)
- Clean separation
- Explicit dependencies

**Why we don't use it:**

- Settings are global/constant
- No database/external services
- Simplicity preferred

---

## Error Response Format

### Standard Error Response

```python
# Validation error (422)
{
  "detail": [
    {
      "loc": ["body", "current_vac", "valence"],
      "msg": "ensure this value is less than or equal to 1.0",
      "type": "value_error.number.not_le",
      "ctx": {"limit_value": 1.0}
    }
  ]
}

# Internal error (500)
{
  "detail": "Internal server error during quaternion calculation"
}
```

### Custom Error Handling

```python
from fastapi import HTTPException

@router.post("/calculate")
async def calculate_state(request: StateRequest):
    try:
        # Calculations
        pass
    except ZeroDivisionError:
        raise HTTPException(
            status_code=500,
            detail="Zero division in quaternion calculation"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )
```

---

## Logging Strategy

### Current Logging

Minimal logging (stateless = less to log):

```python
import logging

logger = logging.getLogger(__name__)

@router.post("/calculate")
async def calculate_state(request: StateRequest):
    logger.info(f"Calculating state for VAC: {request.current_vac}")

    # Calculations...

    logger.info(f"Completed: φ={phi:.3f}, E={elasticity:.3f}")
    return response
```

### Log Levels

- **DEBUG:** Detailed calculation steps
- **INFO:** Request/response summaries
- **WARNING:** Unusual but valid inputs
- **ERROR:** Calculation failures

### What to Log

✅ **Do log:**

- Request received
- Calculation completed
- Unusual values (E > 5.0)
- Errors

❌ **Don't log:**

- Every quaternion value
- Intermediate calculations (too verbose)
- Sensitive data (VAC values may be personal)

---

## Performance Considerations

### Memory Usage

**Per request:**

- Request object: ~200 bytes
- VAC vector: 24 bytes (3 doubles)
- Quaternions: ~128 bytes (4 Quaternion objects)
- SLERP path (60 frames): ~2 KB
- Response object: ~3 KB

**Total:** ~5-6 KB per request

**Stateless advantage:** Memory freed immediately after response.

### CPU Usage

**Per request:**

- ~50-100 floating-point operations
- ~1-2 trigonometric functions (sin, cos, arccos)
- ~60 SLERP interpolations

**Optimization opportunities:**

- Vectorize SLERP (use NumPy arrays)
- Pre-compute constants
- Avoid repeated normalization

### Network I/O

**Inbound:** ~500 bytes (JSON request)
**Outbound:** ~5-10 KB (JSON response with 60-frame path)

**Optimization:**

- gzip compression
- Reduce frame count if not needed
- Use binary format (MessagePack) instead of JSON

---

## Scalability Architecture

### Horizontal Scaling

```text
          ┌────────────────┐
          │ Load Balancer  │
          └────────┬───────┘
                   │
       ┌───────────┼───────────┐
       │           │           │
  ┌────▼────┐ ┌───▼────┐ ┌───▼────┐
  │ Versor1 │ │ Versor2│ │ Versor3│
  └─────────┘ └────────┘ └────────┘
```

**No state synchronization needed!**

### Load Testing Results

**Methodology:** ApacheBench, 1000 requests, concurrency 10

```bash
ab -n 1000 -c 10 -p request.json -T application/json \
   http://localhost:8001/versor/calculate
```

**Results:**

- Requests/second: ~500
- Mean latency: 18ms
- P99 latency: 42ms ✅
- No failures

**Bottleneck:** JSON serialization/deserialization (not math!)

---

## Deployment Architecture

### Container Structure

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app/ ./app/

# Non-root user
RUN useradd -m versor
USER versor

# Expose port
EXPOSE 8001

# Run
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Health Check

```yaml
# docker-compose.yml
services:
  versor:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## API Documentation

### OpenAPI/Swagger

**Access:** <http://localhost:8001/docs>

**Auto-generated from:**

- Route decorators (`@router.post(...)`)
- Pydantic models
- Docstrings
- Type hints

### ReDoc Alternative

**Access:** <http://localhost:8001/redoc>

**Better for:**

- Printing
- Sharing with stakeholders
- Three-panel layout

---

## Integration Points

### Called By: Observer

```python
# In Observer module
import httpx

async def calculate_quaternion(vac: VACVector, previous: Quaternion):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://versor:8001/versor/calculate",
            json={
                "current_vac": {
                    "valence": vac.valence,
                    "arousal": vac.arousal,
                    "connection": vac.connection
                },
                "previous_state": {
                    "w": previous.w,
                    "x": previous.x,
                    "y": previous.y,
                    "z": previous.z
                },
                "time_delta_seconds": 1.0
            }
        )
        return response.json()
```

### Consumed By: Experience

```typescript
// In Experience module
const response = await fetch('http://localhost:8001/versor/calculate', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    current_vac: {valence: 0.8, arousal: 0.6, connection: 0.7},
    previous_state: null,
    time_delta_seconds: 1.0
  })
});

const data = await response.json();
const slerpPath = data.interpolation_path;  // 60 frames for animation
```

---

## Testing Architecture

### Test Pyramid

```text
       ┌────────────┐
       │Integration │  Few (API tests)
       │   Tests    │
       └────────────┘
      ┌──────────────┐
      │  Semantic    │  Medium (Pity→Compassion)
      │   Tests      │
      └──────────────┘
    ┌──────────────────┐
    │   Unit Tests     │  Many (pure functions)
    └──────────────────┘
```

### Test Isolation

Each test is independent:

```python
def test_quaternion_normalize():
    # Create test data
    q = Quaternion(1, 2, 3, 4)

    # Execute
    result = q.normalize()

    # Verify
    assert result.magnitude() == pytest.approx(1.0)

    # No setup/teardown needed (stateless!)
```

---

## Future Considerations

### Potential Enhancements

1. **Caching Layer**
   - LRU cache for repeated calculations
   - Redis for distributed caching
   - Trade-off: Complexity vs marginal performance gain

2. **Batch Endpoints**
   - Calculate multiple transitions at once
   - Reduce HTTP overhead
   - Better for analytics workloads

3. **WebSocket Support**
   - Real-time quaternion stream
   - For Experience module
   - Reduces HTTP overhead

4. **Binary Protocol**
   - MessagePack instead of JSON
   - ~50% size reduction
   - Faster serialization

### Why Not Implemented?

- **Current performance meets requirements** (<50ms)
- **Premature optimization avoided**
- **Simplicity prioritized**
- **Can add later if needed**

---

## Architectural Invariants

### Must Always Be True

1. ✅ **All quaternions are unit length:** ||q|| = 1.0 ± ε
2. ✅ **Stateless:** No persistent storage
3. ✅ **Pure functions:** Same input → same output
4. ✅ **Scalar-first:** [w, x, y, z] convention
5. ✅ **100% test coverage:** Every function tested
6. ✅ **Sub-50ms latency:** P99 performance requirement

**If any of these are violated, the architecture is broken.**

---

## References

- **FastAPI Documentation:** <https://fastapi.tiangolo.com>
- **Pydantic V2 Guide:** <https://docs.pydantic.dev/latest/>
- **Uvicorn Configuration:** <https://www.uvicorn.org>
- **Versor Technical Docs:** `versor/docs/01-architecture.md`

---

## Next Steps

- **[Quaternion Mathematics](02-quaternion-mathematics.md)** - Deep dive into the math
- **[VAC Conversion](03-vac-conversion.md)** - Conversion algorithm details
- **[SLERP Interpolation](04-slerp-interpolation.md)** - Spherical interpolation

---

**Previous:** [← First Contribution](../guides/06-first-contribution.md)
**Next:** [Quaternion Mathematics →](02-quaternion-mathematics.md)
