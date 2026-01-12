# API Reference

**Audience:** Developers integrating with Observer  
**Base URL:** `http://localhost:8000` (development) or `https://api.love-platform.dev` (production)  
**Authentication:** JWT Bearer token (provided by Experience module)

---

## Overview

Observer provides a RESTful API with WebSocket support for real-time chat. All endpoints return JSON unless otherwise specified.

**Rate Limiting:** 60 requests/minute per user

---

## Atlas Endpoints

### GET /atlas/emotions

Get all emotions from the 87-emotion atlas.

**Query Parameters:**

- `category` (optional): Filter by category name

**Response:**

```json
{
  "total_count": 87,
  "emotions": [
    {
      "id": "uuid",
      "name": "Joy",
      "category": "When Life Is Good",
      "definition": "A feeling of great pleasure...",
      "vac": [0.8, 0.6, 0.7],
      "quaternion": [0.85, 0.30, 0.35, 0.25]
    }
  ]
}
```

**Example:**

```bash
curl http://localhost:8000/atlas/emotions

# Filter by category
curl "http://localhost:8000/atlas/emotions?category=When%20Life%20Is%20Good"
```

---

### GET /atlas/categories

Get all 13 emotion categories with counts.

**Response:**

```json
{
  "total_categories": 13,
  "categories": [
    {
      "name": "When Life Is Good",
      "emotion_count": 9
    }
  ]
}
```

---

### GET /atlas/emotions/{emotion_id}

Get a specific emotion by UUID.

**Path Parameters:**

- `emotion_id`: UUID of the emotion

**Response:**

```json
{
  "id": "uuid",
  "name": "Compassion",
  "category": "When We Go With Others",
  "definition": "Feeling with someone, shared humanity",
  "vac": [-0.2, 0.3, 0.7],
  "quaternion": [0.75, -0.15, 0.20, 0.60],
  "color_hint": "#4A90E2"
}
```

---

### GET /atlas/search

Search emotions by name or definition.

**Query Parameters:**

- `query` (required): Search term

**Response:**

```json
{
  "query": "anger",
  "result_count": 3,
  "emotions": [
    {"name": "Anger", "category": "...", "vac": [...]},
    {"name": "Outrage", "category": "...", "vac": [...]}
  ]
}
```

**Example:**

```bash
curl "http://localhost:8000/atlas/search?query=anger"
```

---

### POST /atlas/compute-all-paths

Start background job to pre-compute all 7,482 transition paths.

**Response:**

```json
{
  "job_id": "uuid",
  "status": "pending",
  "total_paths": 7482,
  "estimated_time": "8-10 minutes",
  "message": "Poll /atlas/computation-status/{job_id} for progress"
}
```

---

### GET /atlas/computation-status/{job_id}

Get status of path computation job.

**Response:**

```json
{
  "job_id": "uuid",
  "status": "in_progress",
  "completed_paths": 3500,
  "total_paths": 7482,
  "progress_percent": 46.8,
  "estimated_remaining": "4 minutes"
}
```

---

### GET /atlas/recommendations

Get intelligent emotion recommendations.

**Query Parameters:**

- `context`: `exploration`, `healing`, or `growth`
- `emotion_id` (optional): Current emotion for similarity
- `selected_ids` (optional): Comma-separated UUIDs
- `limit`: Max results per category (default: 5)

**Response:**

```json
{
  "context": "exploration",
  "recommendations": {
    "similar_emotions": [...],
    "curated_journeys": [...],
    "complementary_suggestions": [...]
  }
}
```

---

## State Endpoints

### POST /observer/state

Store a new emotional state.

**Request:**

```json
{
  "user_id": "user123",
  "session_id": "session456",
  "vac": [-0.3, 0.7, -0.2],
  "transcription": "I'm feeling overwhelmed",
  "metadata": {}
}
```

**Response:**

```json
{
  "id": "trajectory-uuid",
  "user_id": "user123",
  "session_id": "session456",
  "timestamp": "2026-01-02T21:00:00Z",
  "vac": [-0.3, 0.7, -0.2],
  "emotion": {
    "id": "emotion-uuid",
    "name": "Overwhelm",
    "category": "When Things Are Uncertain or Too Much"
  },
  "quaternion": [0.7, -0.2, 0.5, -0.15],
  "metrics": {
    "elasticity": 1.4,
    "rigidity": 2.1
  }
}
```

**Status Codes:**

- `201`: State stored successfully
- `400`: Invalid VAC coordinates
- `404`: Emotion not found
- `500`: Server error

---

### GET /observer/current/{user_id}

Get user's most recent emotional state.

**Response:**

```json
{
  "user_id": "user123",
  "current_emotion": "Calm",
  "vac": [0.4, 0.1, 0.5],
  "quaternion": [0.9, 0.2, 0.1, 0.3],
  "timestamp": "2026-01-02T21:00:00Z",
  "elasticity": 0.8,
  "rigidity": 1.5
}
```

---

## History Endpoints

### GET /observer/history/{user_id}

Get user's emotional trajectory history.

**Query Parameters:**

- `limit`: Max results (default: 100)
- `since`: ISO timestamp (filter by date)
- `emotion`: Filter by emotion name

**Response:**

```json
{
  "user_id": "user123",
  "total_points": 247,
  "trajectory": [
    {
      "id": "uuid",
      "timestamp": "2026-01-02T09:00:00Z",
      "emotion": "Anxiety",
      "vac": [-0.4, 0.8, -0.3],
      "quaternion": [...],
      "transcription": "Worried about presentation"
    }
  ],
  "has_more": true
}
```

**Example:**

```bash
# Last 50 states
curl "http://localhost:8000/observer/history/user123?limit=50"

# Since specific date
curl "http://localhost:8000/observer/history/user123?since=2026-01-01T00:00:00Z"

# Filter by emotion
curl "http://localhost:8000/observer/history/user123?emotion=Anxiety"
```

---

## Transition Endpoints

### POST /transition-path

Find therapeutic path between two emotions using A*.

**Request:**

```json
{
  "from_emotion_id": "uuid-anger",
  "to_emotion_id": "uuid-calm",
  "user_id": "user123"
}
```

**Response:**

```json
{
  "waypoints": [
    {
      "emotion_id": "uuid-anger",
      "emotion_name": "Anger",
      "vac": [-0.6, 0.8, -0.4],
      "explanation": "Starting point: high arousal, negative valence"
    },
    {
      "emotion_name": "Frustration",
      "vac": [-0.5, 0.6, -0.2],
      "explanation": "Lower arousal, less intense"
    },
    {
      "emotion_name": "Calm",
      "vac": [0.4, 0.0, 0.5],
      "explanation": "Goal achieved"
    }
  ],
  "strategies": [
    {
      "from": "Anger",
      "to": "Frustration",
      "strategies": [
        {
          "name": "Deep Breathing",
          "category": "Somatic",
          "technique": "...",
          "effectiveness": 0.78
        }
      ]
    }
  ],
  "total_distance": 2.4,
  "difficulty": "moderate",
  "estimated_duration_days": 14
}
```

---

### POST /journey/start

Start a guided emotional journey.

**Request:**

```json
{
  "user_id": "user123",
  "from_emotion_id": "uuid-anxiety",
  "to_emotion_id": "uuid-calm",
  "session_id": "session456"
}
```

**Response:**

```json
{
  "journey_id": "journey-uuid",
  "user_id": "user123",
  "path": [...],
  "current_waypoint_index": 0,
  "status": "active",
  "started_at": "2026-01-02T21:00:00Z"
}
```

---

### POST /journey/{journey_id}/waypoint-reached

Mark a waypoint as reached.

**Request:**

```json
{
  "waypoint_index": 1,
  "strategy_used": "Deep Breathing",
  "effectiveness": 8,
  "notes": "Helped me calm down"
}
```

---

### GET /journey/{journey_id}

Get journey status.

**Response:**

```json
{
  "journey_id": "uuid",
  "status": "active",
  "current_waypoint": 2,
  "total_waypoints": 5,
  "progress_percent": 40.0,
  "started_at": "...",
  "last_updated": "..."
}
```

---

## Health Endpoint

### GET /health

Health check for load balancers.

**Response:**

```json
{
  "status": "healthy",
  "checks": {
    "database": "ok",
    "atlas": {"count": 87, "status": "ok"}
  },
  "version": "1.0.0",
  "uptime_seconds": 86400
}
```

**Status Codes:**

- `200`: Healthy
- `503`: Unhealthy (don't route traffic)

---

## Bootstrap Endpoints

### GET /strategy-effectiveness

Get effectiveness data for all strategies.

**Response:**

```json
{
  "strategies": [
    {
      "name": "Deep Breathing",
      "category": "Somatic",
      "avg_effectiveness": 0.78,
      "usage_count": 1247,
      "success_rate": 0.82
    }
  ]
}
```

---

### GET /path-templates

Get pre-defined therapeutic path templates.

**Response:**

```json
{
  "templates": [
    {
      "name": "anxiety_to_calm",
      "from_category": "When Things Are Uncertain",
      "to_category": "When Life Is Good",
      "waypoints": ["Anxiety", "Worry", "Curiosity", "Calm"],
      "typical_duration_days": 7
    }
  ]
}
```

---

## AI Settings Endpoints

### GET /assignments

Get current AI model assignments.

**Response:**

```json
{
  "assignments": {
    "emotion_analysis": "llama3.1:8b-instruct-q4_0",
    "insight_generation": "mistral:7b-instruct",
    "embedding": "all-MiniLM-L6-v2"
  }
}
```

---

### POST /assignments

Assign AI model to a function.

**Request:**

```json
{
  "function": "emotion_analysis",
  "ai_model_name": "llama3.1:8b-instruct-q4_0",
  "assigned_by": "admin"
}
```

---

## WebSocket Protocol

### WS /ws/{session_id}

Real-time chat WebSocket endpoint.

**Connect:**

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/session-123');
```

**Client → Server Messages:**

```typescript
// User message
{
  "type": "user_message",
  "content": "I'm feeling anxious",
  "vac": [-0.4, 0.7, -0.2]
}

// Request insight
{
  "type": "request_insight",
  "focus": "anxiety"
}

// Toggle deep feeling mode
{
  "type": "toggle_deep_feeling",
  "enabled": true
}

// Keep-alive
{
  "type": "ping"
}
```

**Server → Client Messages:**

```typescript
// Connected
{
  "type": "connected",
  "session_id": "session-123",
  "timestamp": "..."
}

// Analysis result
{
  "type": "analysis",
  "emotion": "Anxiety",
  "vac": [-0.4, 0.8, -0.3],
  "confidence": 0.92
}

// Insight
{
  "type": "insight",
  "content": "You're experiencing anxiety...",
  "suggestions": [...]
}

// Similar moment
{
  "type": "similar_moment",
  "past_transcription": "...",
  "similarity_score": 0.87,
  "timestamp": "..."
}

// Keep-alive response
{
  "type": "pong"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "error_code",
  "message": "Human-readable message",
  "details": {...}
}
```

**Common error codes:**

- `emotion_not_found`: Emotion doesn't exist in atlas
- `invalid_vac`: VAC coordinates out of range [-1, 1]
- `path_not_found`: No valid transition path exists
- `user_not_found`: User ID not found
- `database_error`: Database operation failed
- `validation_error`: Request validation failed

---

## Pagination

Endpoints that return lists support pagination:

**Query Parameters:**

- `limit`: Max results (default varies by endpoint)
- `offset`: Number of items to skip (default: 0)

**Response includes:**

```json
{
  "results": [...],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "total": 247,
    "has_more": true
  }
}
```

---

## Rate Limiting

**Limits:**

- 60 requests/minute per user
- 10 concurrent WebSocket connections per user

**Headers:**

```text
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1704234000
```

**When rate limited:**

```json
HTTP 429 Too Many Requests
{
  "error": "rate_limit_exceeded",
  "message": "Rate limit of 60 req/min exceeded",
  "retry_after": 30
}
```

---

## Example Workflows

### Workflow 1: Store and Analyze State

```python
import httpx

async def store_emotional_state():
    async with httpx.AsyncClient() as client:
        # 1. Store state
        response = await client.post(
            "http://localhost:8000/observer/state",
            json={
                "user_id": "user123",
                "session_id": "session456",
                "vac": [-0.3, 0.7, -0.2],
                "transcription": "I'm overwhelmed"
            }
        )
        state = response.json()
        
        # 2. Get similar past moments
        history = await client.get(
            f"http://localhost:8000/observer/history/{state['user_id']}",
            params={"emotion": state["emotion"]["name"], "limit": 5}
        )
        similar = history.json()
        
        return state, similar
```

### Workflow 2: Find and Follow Path

```python
async def navigate_emotions():
    async with httpx.AsyncClient() as client:
        # 1. Find path
        path_response = await client.post(
            "http://localhost:8000/transition-path",
            json={
                "from_emotion_id": "uuid-anger",
                "to_emotion_id": "uuid-calm",
                "user_id": "user123"
            }
        )
        path = path_response.json()
        
        # 2. Start journey
        journey_response = await client.post(
            "http://localhost:8000/journey/start",
            json={
                "user_id": "user123",
                "from_emotion_id": "uuid-anger",
                "to_emotion_id": "uuid-calm",
                "session_id": "session789"
            }
        )
        journey = journey_response.json()
        
        # 3. Mark waypoint reached
        await client.post(
            f"http://localhost:8000/journey/{journey['journey_id']}/waypoint-reached",
            json={
                "waypoint_index": 1,
                "strategy_used": "Deep Breathing",
                "effectiveness": 8
            }
        )
```

---

## OpenAPI Documentation

Observer auto-generates OpenAPI (Swagger) documentation:

**Interactive docs:** `http://localhost:8000/docs`  
**ReDoc:** `http://localhost:8000/redoc`  
**OpenAPI JSON:** `http://localhost:8000/openapi.json`

---

## Client Libraries

### Python

```python
# Official Python client (coming soon)
from observer_client import ObserverClient

client = ObserverClient(
    base_url="http://localhost:8000",
    api_key="your-jwt-token"
)

# Store state
state = await client.store_state(
    user_id="user123",
    vac=[-0.3, 0.7, -0.2],
    transcription="I'm overwhelmed"
)

# Get history
history = await client.get_history("user123", limit=100)

# Find path
path = await client.find_path("Anger", "Calm", "user123")
```

### JavaScript/TypeScript

```typescript
// Official JS client (coming soon)
import { ObserverClient } from '@love/observer-client';

const client = new ObserverClient({
  baseURL: 'http://localhost:8000',
  apiKey: 'your-jwt-token'
});

// Store state
const state = await client.storeState({
  userId: 'user123',
  vac: [-0.3, 0.7, -0.2],
  transcription: 'I\'m overwhelmed'
});

// WebSocket
const ws = client.connect('session-123');
ws.on('insight', (data) => {
  console.log('Insight:', data.content);
});
```

---

## Next Steps

**Related documentation:**

- [Configuration](configuration.md) - Environment variables
- [Error Codes](error-codes.md) - Complete error catalog
- [Glossary](glossary.md) - API terminology

**Integration guides:**

- [Manager: Integration Points](../architecture/10-integration-points.md)
