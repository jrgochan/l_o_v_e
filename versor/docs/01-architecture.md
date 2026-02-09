# Versor Module - Architecture

## Overview

The Versor is architected as a **stateless microservice** following clean architecture principles and functional programming patterns. It serves as the pure mathematical engine within the L.O.V.E. Stack, with zero dependencies on databases, sessions, or external state.

## Design Philosophy

1. **Separation of Concerns**: Mathematics, API, and utilities strictly separated
2. **Statelessness**: No session management or persistent state
3. **Functional Purity**: Core mathematical operations are pure functions (no side effects)
4. **Type Safety**: Comprehensive type hints and Pydantic validation
5. **Performance First**: NumPy vectorization and sub-50ms latency targets

## System Context

```
┌─────────────────────────────────────────────────────────────┐
│                     L.O.V.E. Stack                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐    ┌──────────┐    ┌────────┐    ┌──────────┐│
│  │ Listener │───▶│ Observer │───▶│ Versor │───▶│Experience││
│  │          │    │          │    │        │    │          ││
│  │ Audio/   │    │ Context  │    │  Math  │    │   3D     ││
│  │ Text STT │    │ Storage  │    │ Engine │    │   UI     ││
│  └──────────┘    └──────────┘    └────────┘    └──────────┘│
│       │                │              │              │      │
│   Voice/Text      PostgreSQL      Quaternion    React 3D   │
│   Semantic VAC     + pgvector     Transforms    Rendering  │
└─────────────────────────────────────────────────────────────┘
```

### Versor's Role
- **Input**: VAC vectors from Observer
- **Processing**: Quaternion mathematics, transition calculations
- **Output**: Quaternion states, SLERP paths, insights for Experience
- **Storage**: None (stateless—Observer handles persistence)

## Internal Architecture

### Layer Diagram

```
┌──────────────────────────────────────────────────────────┐
│                     API Layer                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │ FastAPI Routes                                     │  │
│  │  - POST /versor/calculate                          │  │
│  │  - POST /versor/slerp                              │  │
│  │  - GET /health                                     │  │
│  └────────────────────────────────────────────────────┘  │
│                         │                                │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Pydantic Models (Data Validation)                  │  │
│  │  - VACVector, Quaternion, Request, Response        │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│                   Service Layer                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ VersorEngine (Main Orchestrator)                   │  │
│  │  - process_state()                                 │  │
│  │  - generate_path()                                 │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│                   Core Mathematics                       │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Pure Functions (No Side Effects)                   │  │
│  │  - vac_to_quaternion()                             │  │
│  │  - calculate_transition()                          │  │
│  │  - angular_distance()                              │  │
│  │  - slerp()                                          │  │
│  │  - detect_dominant_axis()                          │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│                Infrastructure Layer                      │
│  ┌────────────────────────────────────────────────────┐  │
│  │ SciPy Adapter (Library Interface)                  │  │
│  │  - Scalar-first ↔ Scalar-last conversion          │  │
│  │  - Rotation class wrapping                         │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ NumPy (Numerical Computing)                        │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## Directory Structure

```
versor/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app initialization
│   ├── config.py                  # Environment configuration
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── calculate.py      # POST /versor/calculate
│   │   │   ├── slerp.py          # POST /versor/slerp
│   │   │   └── health.py         # GET /health
│   │   └── models/
│   │       ├── __init__.py
│   │       ├── request.py        # Pydantic request models
│   │       └── response.py       # Pydantic response models
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── quaternion.py         # Quaternion class & operations
│   │   ├── vac_model.py          # VAC vector handling
│   │   ├── transitions.py        # Transition calculations
│   │   └── interpolation.py      # SLERP implementation
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   └── versor_engine.py      # Main orchestration service
│   │
│   └── utils/
│       ├── __init__.py
│       ├── scipy_adapter.py      # SciPy scalar conversion
│       └── validators.py         # Input validation helpers
│
├── tests/
│   ├── unit/
│   │   ├── test_quaternion.py
│   │   ├── test_vac_model.py
│   │   ├── test_transitions.py
│   │   └── test_interpolation.py
│   ├── integration/
│   │   └── test_versor_engine.py
│   └── semantic/
│       └── test_canonical_cases.py
│
├── Dockerfile
├── requirements.txt
├── pyproject.toml
└── .env.example
```

## Core Components

### 1. FastAPI Application (main.py)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import calculate, slerp, health
from app.config import settings

app = FastAPI(
    title="L.O.V.E. Versor Engine",
    description="Pure mathematical engine for quaternion-based emotional state processing",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

# Mount routers
app.include_router(health.router, tags=["Health"])
app.include_router(calculate.router, prefix="/versor", tags=["Calculation"])
app.include_router(slerp.router, prefix="/versor", tags=["Interpolation"])

@app.on_event("startup")
async def startup():
    """Initialize mathematical constants"""
    pass  # Stateless—nothing to initialize

@app.on_event("shutdown")
async def shutdown():
    """Cleanup"""
    pass  # Stateless—nothing to cleanup
```

### 2. VersorEngine (Service Orchestrator)

```python
# app/services/versor_engine.py

from app.core.vac_model import VACVector
from app.core.quaternion import Quaternion
from app.core.transitions import calculate_transition, angular_distance
from app.core.interpolation import generate_slerp_path
from app.config import settings

class VersorEngine:
    """Main service orchestrator for Versor operations"""

    def __init__(self):
        self.flooding_threshold = settings.FLOODING_THRESHOLD
        self.default_steps = settings.DEFAULT_SLERP_STEPS

    def process_state(
        self,
        current_vac: VACVector,
        previous_quaternion: Optional[Quaternion] = None,
        time_delta: float = 1.0
    ) -> TrajectoryResult:
        """
        Main processing pipeline.

        Steps:
        1. Convert VAC to quaternion
        2. Calculate transition (if previous exists)
        3. Compute metrics (angular distance, elasticity)
        4. Generate SLERP path
        5. Detect dominant axis
        6. Return complete result
        """

        # 1. Convert VAC to quaternion
        current_quat = current_vac.to_quaternion()

        # 2. Use previous or identity
        if previous_quaternion is None:
            previous_quaternion = Quaternion.identity()

        # 3. Calculate transition
        transition_quat = calculate_transition(previous_quaternion, current_quat)

        # 4. Compute angular distance
        phi = angular_distance(transition_quat)

        # 5. Calculate elasticity
        elasticity = phi / time_delta

        # 6. Detect flooding
        is_flooding = elasticity > self.flooding_threshold

        # 7. Generate SLERP path
        path = generate_slerp_path(
            previous_quaternion,
            current_quat,
            steps=self.default_steps
        )

        # 8. Detect dominant axis
        insight_code = self._detect_dominant_axis(transition_quat)

        return TrajectoryResult(
            current_state=current_quat,
            transition_quaternion=transition_quat,
            angular_distance_radians=phi,
            elasticity_metric=elasticity,
            is_flooding=is_flooding,
            insight_code=insight_code,
            interpolation_path=path
        )

    def _detect_dominant_axis(self, q_trans: Quaternion) -> str:
        """Identify which axis changed most"""
        abs_x = abs(q_trans.x)
        abs_y = abs(q_trans.y)
        abs_z = abs(q_trans.z)

        max_component = max(abs_x, abs_y, abs_z)

        if max_component < 0.1:
            return "NEUTRAL"
        elif abs_x == max_component:
            return "VALENCE_SHIFT"
        elif abs_y == max_component:
            return "AROUSAL_SHIFT"
        else:
            return "CONNECTION_SHIFT"
```

## Design Patterns

### 1. Value Objects (Immutable)

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Quaternion:
    """Immutable quaternion value object"""
    w: float
    x: float
    y: float
    z: float

    def multiply(self, other: 'Quaternion') -> 'Quaternion':
        # Returns NEW quaternion, doesn't mutate
        return Quaternion(...)
```

**Benefits**: Thread-safe, predictable, easy to test

### 2. Adapter Pattern (SciPy Integration)

```python
# app/utils/scipy_adapter.py

def love_to_scipy(q: Quaternion) -> np.ndarray:
    """Convert L.O.V.E. [w,x,y,z] to SciPy [x,y,z,w]"""
    return np.array([q.x, q.y, q.z, q.w])

def scipy_to_love(q_array: np.ndarray) -> Quaternion:
    """Convert SciPy [x,y,z,w] to L.O.V.E. [w,x,y,z]"""
    return Quaternion(w=q_array[3], x=q_array[0],
                      y=q_array[1], z=q_array[2])
```

**Rationale**: Isolates external library conventions from internal API

## Data Flow

### Calculation Request Flow

```
1. HTTP POST /versor/calculate
   ↓
2. FastAPI Route Handler
   ↓
3. Pydantic Validation (VACVector, Quaternion models)
   ↓
4. VersorEngine.process_state()
   ├─▶ vac_to_quaternion()
   ├─▶ calculate_transition()
   ├─▶ angular_distance()
   ├─▶ calculate_elasticity()
   ├─▶ detect_flooding()
   ├─▶ generate_slerp_path()
   └─▶ detect_dominant_axis()
   ↓
5. TrajectoryResult (Pydantic model)
   ↓
6. JSON Response
```

## Error Handling

### Error Hierarchy

```
VersorError (Base)
├── ValidationError
│   ├── VACRangeError
│   ├── QuaternionNormError
│   └── TimeDeltaError
├── ComputationError
│   ├── SingularityError (zero vector)
│   └── NumericInstabilityError
└── ConfigurationError
    └── InvalidThresholdError
```

### Error Response Format

```json
{
  "error": {
    "type": "VACRangeError",
    "message": "Valence must be in [-1.0, 1.0], received 1.5",
    "field": "valence",
    "received_value": 1.5
  }
}
```

## Scalability

### Horizontal Scaling

✅ **Stateless design enables effortless horizontal scaling**:
- No session affinity required
- Any instance can handle any request
- Load balancer distributes freely
- Add/remove instances dynamically

### Resource Requirements

| Environment | CPU | Memory | Latency Target |
|-------------|-----|--------|----------------|
| Development | 1 core | 256MB | < 100ms |
| Production | 2 cores | 512MB | < 50ms (P99) |
| High-Load | 4 cores | 1GB | < 25ms (P99) |

## Next Steps

Now that you understand the architecture:
- **02-mathematical-foundation.md** - Deep dive into quaternion mathematics
- **03-vac-to-quaternion.md** - The conversion algorithm
- **04-transition-calculations.md** - Emotional work computation
