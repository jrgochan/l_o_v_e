# Observer Module - API Specification

## Overview

The Observer exposes a RESTful API for interaction with the Listener, Versor, and Experience modules. This document provides complete endpoint specifications with request/response schemas and implementation examples.

## Base URL

```
Development: http://localhost:8000
Production: https://api.love.app/v1/observer
```

## Authentication

All endpoints (except `/health`) require JWT authentication:

```http
Authorization: Bearer <JWT_TOKEN>
```

## API Endpoints

### 1. POST /observer/state

**Purpose**: Record a new emotional state from the Listener.

**Request**:
```json
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "session_id": "789e0123-e89b-12d3-a456-426614174001",
  "input_text": "I'm feeling amazing today, everything is clicking!",
  "vac_scalars": {
    "valence": 0.9,
    "arousal": 0.7,
    "connection": 0.8
  },
  "timestamp": "2025-12-02T19:45:00Z"
}
```

**Pydantic Schema**:
```python
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime

class VACVector(BaseModel):
    valence: float = Field(ge=-1.0, le=1.0)
    arousal: float = Field(ge=-1.0, le=1.0)
    connection: float = Field(ge=-1.0, le=1.0)

class StateInput(BaseModel):
    user_id: UUID
    session_id: UUID
    input_text: str = Field(max_length=5000)
    vac_scalars: VACVector
    timestamp: datetime = Field(default_factory=datetime.utcnow)
```

**Response** (200 OK):
```json
{
  "state_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "dominant_emotion": {
    "id": "emotion-uuid",
    "name": "Joy",
    "category": "Places We Go When Life Is Good",
    "vac": [0.9, 0.7, 0.8]
  },
  "quaternion": {
    "w": 0.68,
    "x": 0.50,
    "y": 0.39,
    "z": 0.45
  },
  "previous_quaternion": {
    "w": 0.85,
    "x": 0.30,
    "y": 0.20,
    "z": 0.35
  },
  "metrics": {
    "elasticity": 0.8,
    "rigidity": 0.2,
    "angular_distance": 45.3
  },
  "timestamp": "2025-12-02T19:45:00Z"
}
```

**Implementation**:
```python
# app/api/routes/state.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_db
from app.services.observer_service import ObserverService
from app.api.schemas.state import StateInput, StateResponse

router = APIRouter()

@router.post("/state", response_model=StateResponse)
async def record_state(
    input_data: StateInput,
    session: AsyncSession = Depends(get_db),
    observer_service: ObserverService = Depends()
):
    """
    Record a new emotional state.
    
    This is the primary ingestion endpoint called by the Listener
    after processing user input.
    """
    try:
        result = await observer_service.process_state(
            user_id=input_data.user_id,
            session_id=input_data.session_id,
            input_text=input_data.input_text,
            vac_scalars=[
                input_data.vac_scalars.valence,
                input_data.vac_scalars.arousal,
                input_data.vac_scalars.connection
            ],
            timestamp=input_data.timestamp
        )
        
        return StateResponse(**result.dict())
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

### 2. POST /observer/insight

**Purpose**: Retrieve similar past moments for insight generation.

**Request**:
```json
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "current_text": "I'm feeling stressed about work",
  "limit": 5
}
```

**Pydantic Schema**:
```python
class InsightRequest(BaseModel):
    user_id: UUID
    current_text: str
    limit: int = Field(default=5, ge=1, le=20)
```

**Response** (200 OK):
```json
{
  "similar_moments": [
    {
      "state_id": "uuid-1",
      "timestamp": "2025-11-15T14:30:00Z",
      "input_text": "Work deadline is making me anxious",
      "emotion": "Stress",
      "vac": [-0.4, 0.6, -0.2],
      "similarity_score": 0.92,
      "days_ago": 17
    },
    {
      "state_id": "uuid-2",
      "timestamp": "2025-10-03T09:15:00Z",
      "input_text": "Overwhelmed with project demands",
      "emotion": "Overwhelm",
      "vac": [-0.6, 0.9, -0.3],
      "similarity_score": 0.87,
      "days_ago": 60
    }
  ],
  "insight": "You've experienced similar work stress 3 times in the past 2 months."
}
```

**Implementation**:
```python
# app/api/routes/insight.py

@router.post("/insight", response_model=InsightResponse)
async def get_insight(
    request: InsightRequest,
    session: AsyncSession = Depends(get_db),
    observer_service: ObserverService = Depends()
):
    """
    Find similar past emotional moments.
    
    Uses semantic vector similarity to identify patterns
    in the user's emotional history.
    """
    
    result = await observer_service.find_similar_moments(
        user_id=request.user_id,
        current_text=request.current_text,
        limit=request.limit
    )
    
    return InsightResponse(**result)
```

---

### 3. GET /observer/history/{user_id}

**Purpose**: Retrieve user's emotional trajectory for visualization.

**Query Parameters**:
- `start_date` (optional): ISO 8601 datetime
- `end_date` (optional): ISO 8601 datetime
- `resolution` (optional): `minute` | `hour` | `day` | `week`
- `limit` (optional): Maximum number of points (default: 100)

**Example Request**:
```http
GET /observer/history/123e4567-e89b-12d3-a456-426614174000?start_date=2025-11-01T00:00:00Z&end_date=2025-12-01T00:00:00Z&resolution=hour&limit=100
```

**Response** (200 OK):
```json
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "start_date": "2025-11-01T00:00:00Z",
  "end_date": "2025-12-01T00:00:00Z",
  "resolution": "hour",
  "data_points": 720,
  "trajectory": [
    {
      "timestamp": "2025-11-01T00:00:00Z",
      "vac": [0.5, 0.3, 0.6],
      "quaternion": [0.85, 0.30, 0.20, 0.35],
      "emotion": "Calm",
      "elasticity": 0.1
    },
    {
      "timestamp": "2025-11-01T01:00:00Z",
      "vac": [0.6, 0.4, 0.7],
      "quaternion": [0.87, 0.32, 0.22, 0.38],
      "emotion": "Contentment",
      "elasticity": 0.05
    }
    // ... more data points
  ]
}
```

**Implementation**:
```python
# app/api/routes/history.py

from enum import Enum
from typing import Optional

class Resolution(str, Enum):
    minute = "minute"
    hour = "hour"
    day = "day"
    week = "week"

@router.get("/history/{user_id}", response_model=HistoryResponse)
async def get_history(
    user_id: UUID,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    resolution: Resolution = Resolution.hour,
    limit: int = 100,
    session: AsyncSession = Depends(get_db),
    observer_service: ObserverService = Depends()
):
    """
    Retrieve emotional trajectory for visualization.
    
    Returns time-series data with optional decimation based on resolution.
    """
    
    result = await observer_service.get_trajectory(
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
        resolution=resolution,
        limit=limit
    )
    
    return HistoryResponse(**result)
```

---

### 4. GET /observer/current/{user_id}

**Purpose**: Get the user's most recent emotional state.

**Response** (200 OK):
```json
{
  "state_id": "uuid",
  "timestamp": "2025-12-02T19:50:00Z",
  "vac": [0.7, 0.5, 0.8],
  "quaternion": [0.87, 0.40, 0.28, 0.45],
  "emotion": "Joy",
  "category": "Places We Go When Life Is Good",
  "elasticity": 0.3,
  "rigidity": 0.15,
  "time_in_state": "00:15:32"
}
```

**Implementation**:
```python
@router.get("/current/{user_id}", response_model=CurrentStateResponse)
async def get_current_state(
    user_id: UUID,
    session: AsyncSession = Depends(get_db)
):
    """Get most recent state for user"""
    
    stmt = (
        select(UserTrajectory)
        .where(UserTrajectory.user_id == user_id)
        .order_by(UserTrajectory.timestamp.desc())
        .limit(1)
    )
    
    result = await session.execute(stmt)
    state = result.scalar_one_or_none()
    
    if not state:
        raise HTTPException(status_code=404, detail="No states found for user")
    
    return CurrentStateResponse.from_orm(state)
```

---

### 5. GET /health

**Purpose**: Health check for monitoring and load balancers.

**Response** (200 OK):
```json
{
  "status": "healthy",
  "database": "connected",
  "pgvector_version": "0.6.0",
  "atlas_emotions_count": 87,
  "timestamp": "2025-12-02T19:50:00Z"
}
```

**Implementation**:
```python
# app/api/routes/health.py

@router.get("/health")
async def health_check(session: AsyncSession = Depends(get_db)):
    """Health check endpoint"""
    
    try:
        # Test DB connection
        await session.execute(text("SELECT 1"))
        
        # Check pgvector
        result = await session.execute(
            text("SELECT extversion FROM pg_extension WHERE extname = 'vector'")
        )
        pgvector_version = result.scalar()
        
        # Count Atlas emotions
        result = await session.execute(
            select(func.count(AtlasDefinition.id))
        )
        emotion_count = result.scalar()
        
        return {
            "status": "healthy",
            "database": "connected",
            "pgvector_version": pgvector_version,
            "atlas_emotions_count": emotion_count,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Unhealthy: {str(e)}")
```

---

## Error Responses

### 400 Bad Request

Invalid input (validation failed):

```json
{
  "detail": [
    {
      "loc": ["body", "vac_scalars", "valence"],
      "msg": "ensure this value is less than or equal to 1.0",
      "type": "value_error.number.not_le"
    }
  ]
}
```

### 401 Unauthorized

Missing or invalid JWT:

```json
{
  "detail": "Not authenticated"
}
```

### 404 Not Found

Resource doesn't exist:

```json
{
  "detail": "No states found for user"
}
```

### 500 Internal Server Error

Server-side error:

```json
{
  "detail": "Database connection failed"
}
```

## Rate Limiting

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/state")
@limiter.limit("100/minute")  # Max 100 requests per minute
async def record_state(...):
    pass
```

## OpenAPI Documentation

FastAPI automatically generates interactive API docs:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI Schema**: `http://localhost:8000/openapi.json`

## Testing API Endpoints

### Using curl

```bash
# Record state
curl -X POST http://localhost:8000/observer/state \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "session_id": "789e0123-e89b-12d3-a456-426614174001",
    "input_text": "Feeling great!",
    "vac_scalars": {
      "valence": 0.8,
      "arousal": 0.6,
      "connection": 0.7
    }
  }'
```

### Using Python requests

```python
import requests

response = requests.post(
    "http://localhost:8000/observer/state",
    headers={"Authorization": f"Bearer {token}"},
    json={
        "user_id": str(user_id),
        "session_id": str(session_id),
        "input_text": "Feeling great!",
        "vac_scalars": {
            "valence": 0.8,
            "arousal": 0.6,
            "connection": 0.7
        }
    }
)

print(response.json())
```

### Integration Tests

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_record_state():
    response = client.post(
        "/observer/state",
        json={
            "user_id": "123e4567-e89b-12d3-a456-426614174000",
            "session_id": "789e0123-e89b-12d3-a456-426614174001",
            "input_text": "Test input",
            "vac_scalars": {
                "valence": 0.5,
                "arousal": 0.3,
                "connection": 0.6
            }
        },
        headers={"Authorization": f"Bearer {test_token}"}
    )
    
    assert response.status_code == 200
    assert "state_id" in response.json()
    assert response.json()["dominant_emotion"]["name"] in VALID_EMOTIONS
```

## Next Steps

Now that you understand the API:
- **06-quaternion-conversion.md** - VAC to quaternion mathematics
- **07-metrics-engine.md** - Elasticity and rigidity implementation
- **08-insight-generation.md** - Similar moments retrieval algorithm
