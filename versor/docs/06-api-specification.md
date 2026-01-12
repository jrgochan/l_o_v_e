# Versor Module - API Specification

## Overview

The Versor exposes a simple REST API for quaternion calculations and SLERP path generation. All endpoints are stateless and designed for low-latency responses (< 50ms P99).

## Base URL

```
Development: http://localhost:8001
Production: https://api.love.app/v1/versor
```

## API Endpoints

### 1. POST /versor/calculate

**Purpose**: Main calculation endpoint. Converts VAC to quaternion and computes transition metrics.

**Request**:
```json
{
  "current_vac": {
    "valence": 0.9,
    "arousal": 0.7,
    "connection": 0.8
  },
  "previous_state": {
    "w": 1.0,
    "x": 0.0,
    "y": 0.0,
    "z": 0.0
  },
  "time_delta_seconds": 1.0
}
```

**Response** (200 OK):
```json
{
  "current_state": {
    "w": 0.306,
    "x": 0.615,
    "y": 0.478,
    "z": 0.546
  },
  "transition_quaternion": {
    "w": 0.306,
    "x": 0.615,
    "y": 0.478,
    "z": 0.546
  },
  "angular_distance_radians": 2.525,
  "angular_distance_degrees": 144.7,
  "elasticity_metric": 2.525,
  "is_flooding": true,
  "insight_code": "AROUSAL_SHIFT",
  "interpolation_path": [
    {"w": 1.0, "x": 0.0, "y": 0.0, "z": 0.0},
    {"w": 0.9808, "x": 0.1234, "y": 0.0956, "z": 0.1093},
    ...60 frames total
  ]
}
```

**Pydantic Schema**:
```python
from pydantic import BaseModel, Field
from typing import Optional, List

class VACVectorModel(BaseModel):
    valence: float = Field(ge=-1.0, le=1.0)
    arousal: float = Field(ge=-1.0, le=1.0)
    connection: float = Field(ge=-1.0, le=1.0)

class QuaternionModel(BaseModel):
    w: float
    x: float
    y: float
    z: float

class StateRequest(BaseModel):
    current_vac: VACVectorModel
    previous_state: Optional[QuaternionModel] = None
    time_delta_seconds: float = Field(default=1.0, gt=0.0)

class TrajectoryResponse(BaseModel):
    current_state: QuaternionModel
    transition_quaternion: QuaternionModel
    angular_distance_radians: float
    angular_distance_degrees: float
    elasticity_metric: float
    is_flooding: bool
    insight_code: str
    interpolation_path: List[QuaternionModel]
```

**Implementation**:
```python
# app/api/routes/calculate.py

from fastapi import APIRouter
from app.api.models.request import StateRequest
from app.api.models.response import TrajectoryResponse
from app.services.versor_engine import VersorEngine

router = APIRouter()

@router.post("/calculate", response_model=TrajectoryResponse)
async def calculate_state(request: StateRequest):
    """
    Main calculation endpoint.
    
    Converts VAC to quaternion and computes transition metrics.
    """
    engine = VersorEngine()
    
    result = engine.process_state(
        current_vac=request.current_vac,
        previous_quaternion=request.previous_state,
        time_delta=request.time_delta_seconds
    )
    
    return TrajectoryResponse(**result.dict())
```

---

### 2. POST /versor/slerp

**Purpose**: Generate SLERP path between two quaternions (standalone).

**Request**:
```json
{
  "start_quaternion": {
    "w": 1.0,
    "x": 0.0,
    "y": 0.0,
    "z": 0.0
  },
  "target_quaternion": {
    "w": 0.7071,
    "x": 0.7071,
    "y": 0.0,
    "z": 0.0
  },
  "steps": 60
}
```

**Response** (200 OK):
```json
{
  "path": [
    {"w": 1.0000, "x": 0.0000, "y": 0.0000, "z": 0.0000},
    {"w": 0.9808, "x": 0.1951, "y": 0.0000, "z": 0.0000},
    ...60 frames total
  ],
  "total_frames": 60,
  "angular_distance": 1.5708
}
```

**Implementation**:
```python
@router.post("/slerp", response_model=SLERPResponse)
async def generate_path(request: SLERPRequest):
    """Generate SLERP interpolation path"""
    
    path = generate_slerp_path(
        q_start=request.start_quaternion,
        q_target=request.target_quaternion,
        steps=request.steps
    )
    
    # Calculate angular distance
    q_trans = calculate_transition(
        request.start_quaternion,
        request.target_quaternion
    )
    phi = angular_distance(q_trans)
    
    return SLERPResponse(
        path=path,
        total_frames=len(path),
        angular_distance=phi
    )
```

---

### 3. GET /health

**Purpose**: Health check for monitoring.

**Response** (200 OK):
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "dependencies": {
    "numpy": "1.26.3",
    "scipy": "1.12.0"
  },
  "uptime_seconds": 3600
}
```

---

## Error Responses

### 400 Bad Request

Invalid VAC values:
```json
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
```

### 500 Internal Server Error

Computation error:
```json
{
  "error": {
    "type": "NumericInstabilityError",
    "message": "Quaternion norm verification failed"
  }
}
```

## Next Steps

Now that you understand the API:
- **07-scipy-integration.md** - Handle scalar convention differences
- **08-metrics-and-insights.md** - Complete metrics system
- **09-setup-and-installation.md** - Development environment
