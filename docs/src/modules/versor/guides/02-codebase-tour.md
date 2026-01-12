# Codebase Tour - Versor Module

Now that you're set up, let's explore the Versor codebase in detail. This guide will help you understand where everything is and how the pieces fit together.

---

## Directory Structure

```text
versor/
├── app/                    # Main application code
│   ├── __init__.py
│   ├── main.py            # FastAPI application entry point
│   ├── config.py          # Settings and configuration
│   ├── core/              # Pure mathematical functions
│   │   ├── __init__.py
│   │   ├── quaternion.py      # Quaternion class & algebra
│   │   ├── vac_model.py       # VAC vector & conversion
│   │   ├── transitions.py     # Angular distance, elasticity
│   │   └── interpolation.py   # SLERP path generation
│   ├── api/               # REST API layer
│   │   ├── __init__.py
│   │   ├── models/            # Pydantic schemas
│   │   │   ├── __init__.py
│   │   │   ├── request.py     # API request models
│   │   │   └── response.py    # API response models
│   │   └── routes/            # API endpoints
│   │       ├── __init__.py
│   │       ├── calculate.py   # Main calculation endpoint
│   │       └── slerp.py       # SLERP endpoint (if exists)
│   └── utils/             # Helper utilities
│       ├── __init__.py
│       └── scipy_adapter.py   # Scalar convention adapter
├── tests/                 # Test suite (100% coverage)
│   ├── __init__.py
│   ├── unit/              # Unit tests (pure functions)
│   │   ├── __init__.py
│   │   ├── test_quaternion.py
│   │   ├── test_vac_model.py
│   │   ├── test_transitions.py
│   │   └── test_interpolation.py
│   ├── integration/       # API integration tests
│   │   └── test_api.py
│   └── semantic/          # Semantic validation tests
│       └── test_connection_axis.py  # Pity→Compassion
├── docs/                  # Technical documentation
│   ├── 00-overview.md
│   ├── 01-architecture.md
│   ├── 02-mathematical-foundation.md
│   ├── 03-vac-to-quaternion.md
│   ├── 04-transition-calculations.md
│   ├── 05-slerp-interpolation.md
│   ├── 06-api-specification.md
│   ├── 07-scipy-integration.md
│   ├── 08-metrics-and-insights.md
│   ├── 09-setup-and-installation.md
│   ├── 10-deployment.md
│   ├── 11-testing-strategy.md
│   ├── 12-performance-optimization.md
│   └── 13-edge-cases.md
├── .env.example           # Environment variables template
├── .flake8                # Linting configuration
├── .gitignore            # Git ignore rules
├── docker-compose.yml    # Container orchestration
├── pyproject.toml        # Python project config
├── pytest.ini            # Pytest configuration
├── README.md             # Module overview
└── requirements.txt      # Python dependencies
```

---

## Core Mathematics Layer (`app/core/`)

This is the **heart of Versor**—pure mathematical functions with no side effects.

### `quaternion.py` - Quaternion Algebra

**What it does:** Defines the `Quaternion` class and all operations.

**Key components:**

```python
class Quaternion:
    """4D number representing rotation: [w, x, y, z]"""
    
    def __init__(self, w: float, x: float, y: float, z: float)
    def normalize(self) -> "Quaternion"
    def conjugate(self) -> "Quaternion"
    def multiply(self, other: "Quaternion") -> "Quaternion"
    def dot(self, other: "Quaternion") -> float
    
    @classmethod
    def identity(cls) -> "Quaternion"
    
    @classmethod
    def from_axis_angle(cls, axis, angle) -> "Quaternion"
```

**When you'll use it:**

- Creating quaternions from scratch
- Performing quaternion multiplication
- Normalizing quaternions to unit length
- Computing dot products

**Example:**

```python
from app.core.quaternion import Quaternion

# Create identity quaternion (no rotation)
q1 = Quaternion.identity()  # [1, 0, 0, 0]

# Create from axis-angle
import numpy as np
axis = np.array([0, 1, 0])  # Y-axis
angle = np.pi / 2  # 90 degrees
q2 = Quaternion.from_axis_angle(axis, angle)

# Multiply quaternions
q3 = q1.multiply(q2)
```

---

### `vac_model.py` - VAC Vector and Conversion

**What it does:** Defines the `VACVector` class and converts VAC→Quaternion.

**Key components:**

```python
class VACVector:
    """3D emotional vector: [valence, arousal, connection]"""
    
    def __init__(self, valence: float, arousal: float, connection: float)
    def magnitude(self) -> float
    def is_zero(self, epsilon: float = 1e-6) -> bool
    def to_quaternion(self) -> Quaternion
```

**When you'll use it:**

- Receiving VAC vectors from Listener
- Converting emotions to quaternions
- Validating VAC ranges (-1.0 to +1.0)

**Example:**

```python
from app.core.vac_model import VACVector

# Create VAC vector
vac = VACVector(valence=0.8, arousal=0.6, connection=0.7)

# Get magnitude (intensity)
intensity = vac.magnitude()  # ~1.21

# Convert to quaternion
q = vac.to_quaternion()  # Quaternion[w, x, y, z]
```

---

### `transitions.py` - Transition Calculations

**What it does:** Computes angular distance, elasticity, and flooding detection.

**Key functions:**

```python
def calculate_transition(q_start, q_target) -> Quaternion
def angular_distance(q_transition) -> float
def calculate_elasticity(angular_distance, time_delta) -> float
def detect_flooding(elasticity, threshold=2.0) -> bool
def detect_dominant_axis(q_transition) -> str
```

**When you'll use it:**

- Calculating "emotional work" between states
- Detecting rapid emotional shifts (flooding)
- Identifying which axis changed most

**Example:**

```python
from app.core.transitions import (
    calculate_transition,
    angular_distance,
    calculate_elasticity,
    detect_flooding,
    detect_dominant_axis
)

# Calculate transition quaternion
q_start = vac1.to_quaternion()
q_target = vac2.to_quaternion()
q_transition = calculate_transition(q_start, q_target)

# Measure angular distance
phi = angular_distance(q_transition)  # radians

# Calculate elasticity (rate of change)
E = calculate_elasticity(phi, time_delta=1.0)  # rad/s

# Check for flooding
is_flooding = detect_flooding(E)  # True if E > 2.0

# Identify dominant axis
axis = detect_dominant_axis(q_transition)  
# Returns: "VALENCE_SHIFT", "AROUSAL_SHIFT", or "CONNECTION_SHIFT"
```

---

### `interpolation.py` - SLERP Path Generation

**What it does:** Generates smooth interpolation paths between quaternions.

**Key functions:**

```python
def ensure_shortest_path(q1, q2) -> Tuple[Quaternion, Quaternion]
def generate_slerp_path(q_start, q_end, num_frames=60) -> List[Quaternion]
def smooth_transition(q_prev, q_new, alpha=0.1) -> Quaternion
```

**When you'll use it:**

- Creating animation paths for Experience module
- Ensuring smooth, constant-velocity rotation
- Smoothing jittery inputs

**Example:**

```python
from app.core.interpolation import generate_slerp_path

# Generate 60-frame SLERP path
q_start = vac1.to_quaternion()
q_end = vac2.to_quaternion()
path = generate_slerp_path(q_start, q_end, num_frames=60)

# Path is a list of 60 quaternions
print(f"Generated {len(path)} frames")  # 60
print(f"First: {path[0]}")   # q_start
print(f"Last: {path[-1]}")   # q_end
```

---

## API Layer (`app/api/`)

This layer exposes the mathematical core as REST endpoints.

### `models/request.py` - Request Schemas

**What it does:** Defines Pydantic models for API requests.

**Key models:**

```python
class VACInput(BaseModel):
    """VAC vector input"""
    valence: float = Field(..., ge=-1.0, le=1.0)
    arousal: float = Field(..., ge=-1.0, le=1.0)
    connection: float = Field(..., ge=-1.0, le=1.0)

class QuaternionInput(BaseModel):
    """Quaternion input"""
    w: float
    x: float
    y: float
    z: float

class CalculateRequest(BaseModel):
    """Main calculation request"""
    current_vac: VACInput
    previous_state: Optional[QuaternionInput] = None
    time_delta_seconds: float = 1.0
```

**When you'll use it:**

- Understanding API request format
- Validating input ranges
- Adding new API endpoints

---

### `models/response.py` - Response Schemas

**What it does:** Defines Pydantic models for API responses.

**Key models:**

```python
class QuaternionOutput(BaseModel):
    """Quaternion in response"""
    w: float
    x: float
    y: float
    z: float

class CalculateResponse(BaseModel):
    """Full calculation response"""
    current_state: QuaternionOutput
    angular_distance_radians: float
    angular_distance_degrees: float
    elasticity_metric: float
    is_flooding: bool
    insight_code: str
    interpolation_path: List[QuaternionOutput]
```

**When you'll use it:**

- Understanding API response structure
- Parsing responses in client code
- Adding new fields to responses

---

### `routes/calculate.py` - Main Endpoint

**What it does:** Implements the `/versor/calculate` endpoint.

**Key endpoint:**

```python
@router.post("/calculate", response_model=CalculateResponse)
async def calculate_quaternion(request: CalculateRequest):
    """
    Convert VAC to quaternion and calculate transition metrics.
    
    This is the main Versor endpoint called by Observer.
    """
    # 1. Convert current VAC to quaternion
    # 2. Calculate transition if previous state exists
    # 3. Compute angular distance and elasticity
    # 4. Detect flooding
    # 5. Generate SLERP path
    # 6. Return comprehensive response
```

**When you'll use it:**

- Understanding request/response flow
- Adding new features to calculation
- Debugging API issues

---

## Utilities (`app/utils/`)

### `scipy_adapter.py` - Scalar Convention Adapter

**What it does:** Handles conversion between scalar-first and scalar-last conventions.

**Why it exists:**

- L.O.V.E. uses scalar-first: `[w, x, y, z]`
- SciPy uses scalar-last: `[x, y, z, w]`
- This adapter converts between them

**Key functions:**

```python
def to_scipy_format(q: Quaternion) -> np.ndarray:
    """Convert [w,x,y,z] to [x,y,z,w] for SciPy"""
    return np.array([q.x, q.y, q.z, q.w])

def from_scipy_format(arr: np.ndarray) -> Quaternion:
    """Convert [x,y,z,w] from SciPy to [w,x,y,z]"""
    return Quaternion(w=arr[3], x=arr[0], y=arr[1], z=arr[2])
```

**When you'll use it:**

- Calling SciPy's `Rotation` class
- Using SciPy's SLERP implementation
- Debugging rotation issues

---

## Configuration (`app/config.py`)

**What it does:** Manages application settings.

**Key settings:**

```python
class Settings(BaseSettings):
    """Application configuration"""
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    
    # Thresholds
    FLOODING_THRESHOLD: float = 2.0  # rad/s
    EPSILON: float = 1e-6            # Numerical tolerance
    
    # SLERP
    DEFAULT_NUM_FRAMES: int = 60
    MIN_NUM_FRAMES: int = 10
    MAX_NUM_FRAMES: int = 120
    
    class Config:
        env_file = ".env"
```

**When you'll use it:**

- Changing thresholds
- Adding new configuration options
- Environment-specific settings

---

## Application Entry (`app/main.py`)

**What it does:** Creates and configures the FastAPI application.

**Key components:**

```python
app = FastAPI(
    title="Versor API",
    description="Quaternion mathematics for emotional state processing",
    version="1.0.0"
)

# Include routers
app.include_router(calculate_router, prefix="/versor", tags=["versor"])

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "versor"}

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Versor API - Quaternion Mathematics"}
```

**When you'll use it:**

- Adding new routers
- Configuring middleware
- Setting up CORS
- Adding startup/shutdown events

---

## Tests (`tests/`)

### Unit Tests (`tests/unit/`)

**Purpose:** Test pure functions in isolation.

**Structure:**

- `test_quaternion.py` - Quaternion algebra operations
- `test_vac_model.py` - VAC conversion and validation
- `test_transitions.py` - Angular distance and elasticity
- `test_interpolation.py` - SLERP path generation

**Example test:**

```python
def test_quaternion_normalization():
    """Test that normalize() produces unit quaternion"""
    q = Quaternion(1.0, 2.0, 3.0, 4.0)
    q_norm = q.normalize()
    
    # Check magnitude is 1.0
    assert abs(q_norm.magnitude() - 1.0) < 1e-6
```

### Integration Tests (`tests/integration/`)

**Purpose:** Test API endpoints end-to-end.

**Structure:**

- `test_api.py` - Full request/response cycle

**Example test:**

```python
def test_calculate_endpoint(client):
    """Test /versor/calculate endpoint"""
    response = client.post("/versor/calculate", json={
        "current_vac": {"valence": 0.8, "arousal": 0.6, "connection": 0.7},
        "previous_state": null,
        "time_delta_seconds": 1.0
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "current_state" in data
    assert "angular_distance_radians" in data
```

### Semantic Tests (`tests/semantic/`)

**Purpose:** Validate semantic correctness (e.g., Pity→Compassion).

**The critical test:**

```python
def test_pity_to_compassion_is_connection_shift():
    """
    Validates that the Connection axis differentiates
    pity from compassion—a key innovation of the VAC model.
    """
    pity = VACVector(valence=-0.3, arousal=-0.2, connection=-0.6)
    compassion = VACVector(valence=-0.3, arousal=-0.2, connection=0.8)
    
    q_pity = pity.to_quaternion()
    q_compassion = compassion.to_quaternion()
    q_transition = calculate_transition(q_pity, q_compassion)
    
    axis = detect_dominant_axis(q_transition)
    
    assert axis == "CONNECTION_SHIFT"  # ✅ This must pass!
```

---

## Technical Documentation (`docs/`)

The `docs/` directory contains 14 detailed technical documents:

1. **00-overview.md** - Executive summary
2. **01-architecture.md** - System design
3. **02-mathematical-foundation.md** - Quaternion math
4. **03-vac-to-quaternion.md** - Conversion algorithm
5. **04-transition-calculations.md** - Angular distance formulas
6. **05-slerp-interpolation.md** - SLERP algorithm
7. **06-api-specification.md** - API contracts
8. **07-scipy-integration.md** - SciPy usage
9. **08-metrics-and-insights.md** - Elasticity, flooding
10. **09-setup-and-installation.md** - Setup guide
11. **10-deployment.md** - Production deployment
12. **11-testing-strategy.md** - Testing approach
13. **12-performance-optimization.md** - Performance tuning
14. **13-edge-cases.md** - Edge case handling

**When to read these:**

- Deep dive into mathematical foundations
- Understanding design decisions
- Implementing new features
- Performance optimization

---

## Data Flow Through the Codebase

Here's how a typical request flows through Versor:

```text
1. API Request arrives at FastAPI
   ↓
2. `routes/calculate.py` receives request
   ↓
3. Pydantic validates against `models/request.py`
   ↓
4. Extract VAC vector from request
   ↓
5. `vac_model.py`: Convert VAC → Quaternion
   ↓
6. If previous state exists:
   `transitions.py`: Calculate transition quaternion
   `transitions.py`: Compute angular distance
   `transitions.py`: Calculate elasticity
   `transitions.py`: Detect flooding
   `transitions.py`: Identify dominant axis
   ↓
7. `interpolation.py`: Generate SLERP path (60 frames)
   ↓
8. Build response using `models/response.py`
   ↓
9. Pydantic serializes response
   ↓
10. Return JSON to client
```

---

## File Naming Conventions

- **Modules:** `lowercase_with_underscores.py`
- **Classes:** `PascalCase` (e.g., `Quaternion`, `VACVector`)
- **Functions:** `snake_case` (e.g., `calculate_transition`)
- **Constants:** `UPPER_CASE` (e.g., `EPSILON`, `FLOODING_THRESHOLD`)
- **Private:** Prefix with `_` (e.g., `_validate_range`)
- **Tests:** `test_<module_name>.py`

---

## Import Patterns

**Absolute imports from `app/`:**

```python
from app.core.quaternion import Quaternion
from app.core.vac_model import VACVector
from app.core.transitions import calculate_transition
```

**Relative imports within a package:**

```python
# In app/api/routes/calculate.py
from ..models.request import CalculateRequest
from ..models.response import CalculateResponse
```

**Third-party imports:**

```python
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
```

---

## Where to Make Common Changes

### Add a new API endpoint

**File:** `app/api/routes/` (create new file or add to existing)
**Steps:**

1. Define request/response models in `api/models/`
2. Create route function
3. Register router in `main.py`

### Modify quaternion calculations

**File:** `app/core/quaternion.py`
**Also update:** `tests/unit/test_quaternion.py`

### Change flooding threshold

**File:** `app/config.py`
**Variable:** `FLOODING_THRESHOLD`

### Add new transition metric

**File:** `app/core/transitions.py`
**Also update:**

- `app/api/models/response.py` (add field)
- `app/api/routes/calculate.py` (compute and include)
- `tests/unit/test_transitions.py` (add tests)

### Modify SLERP frame count

**File:** `app/config.py`
**Variables:** `DEFAULT_NUM_FRAMES`, `MIN_NUM_FRAMES`, `MAX_NUM_FRAMES`

---

## Dependency Graph

```text
main.py
  ├─→ config.py
  ├─→ api/routes/calculate.py
  │     ├─→ api/models/request.py
  │     ├─→ api/models/response.py
  │     ├─→ core/vac_model.py
  │     │     └─→ core/quaternion.py
  │     ├─→ core/transitions.py
  │     │     └─→ core/quaternion.py
  │     └─→ core/interpolation.py
  │           ├─→ core/quaternion.py
  │           └─→ utils/scipy_adapter.py
  └─→ api/routes/health.py
```

**Key insight:** Everything depends on `core/quaternion.py`—it's the foundation.

---

## Next Steps

Now that you know where everything is:

1. **[Key Concepts](03-key-concepts.md)** - Understand the mathematical concepts
2. **[Common Tasks](04-common-tasks.md)** - Learn how to modify code
3. **[Testing Guide](05-testing-guide.md)** - Write and run tests

---

## Quick Reference

### Most Important Files (Read These First)

1. `app/core/quaternion.py` - Foundation
2. `app/core/vac_model.py` - VAC conversion
3. `app/api/routes/calculate.py` - Main endpoint
4. `tests/semantic/test_connection_axis.py` - Pity→Compassion test

### When Debugging

- **API errors:** Check `app/api/routes/calculate.py`
- **Math errors:** Check `app/core/` files
- **Validation errors:** Check `app/api/models/`
- **Test failures:** Check corresponding `tests/unit/test_*.py`

### Useful Commands

```bash
# Find where a function is defined
grep -r "def calculate_transition" app/

# Find where a class is used
grep -r "VACVector" app/

# List all test files
find tests/ -name "test_*.py"

# Count lines of code
find app/ -name "*.py" | xargs wc -l
```

---

**Previous:** [← Getting Started](01-getting-started.md)  
**Next:** [Key Concepts →](03-key-concepts.md)
