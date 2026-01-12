# API Reference - Versor Module

Complete API documentation for all Versor endpoints with request/response schemas and examples.

---

## Base URL

**Development:** `http://localhost:8001`  
**Production:** `http://versor.love-platform.com`

**All endpoints prefixed with:** `/versor/`

---

## Authentication

**None required** - Versor is an internal service.

Accessed only by Observer module within private network.

---

## Endpoints

### GET /

Root endpoint providing service information.

**Request:**

```http
GET / HTTP/1.1
Host: localhost:8001
```

**Response:**

```json
{
  "service": "L.O.V.E. Versor Engine",
  "version": "1.0.0",
  "status": "operational",
  "endpoints": {
    "docs": "/docs",
    "health": "/health",
    "calculate": "/versor/calculate",
    "slerp": "/versor/slerp"
  }
}
```

---

### GET /health

Health check endpoint for monitoring.

**Request:**

```http
GET /health HTTP/1.1
Host: localhost:8001
```

**Response:**

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

**Status Codes:**

- `200 OK` - Service healthy
- `503 Service Unavailable` - Service unhealthy

---

### POST /versor/calculate

Main calculation endpoint - converts VAC to quaternion and computes transition metrics.

**Request Schema:**

```json
{
  "current_vac": {
    "valence": float,      // Range: [-1.0, 1.0]
    "arousal": float,      // Range: [-1.0, 1.0]
    "connection": float    // Range: [-1.0, 1.0]
  },
  "previous_state": {      // Optional
    "w": float,
    "x": float,
    "y": float,
    "z": float
  },
  "time_delta_seconds": float  // Default: 1.0, must be > 0
}
```

**Example Request:**

```http
POST /versor/calculate HTTP/1.1
Host: localhost:8001
Content-Type: application/json

{
  "current_vac": {
    "valence": 0.8,
    "arousal": 0.6,
    "connection": 0.7
  },
  "previous_state": {
    "w": 0.5,
    "x": 0.5,
    "y": 0.5,
    "z": 0.5
  },
  "time_delta_seconds": 1.0
}
```

**Response Schema:**

```json
{
  "current_state": {
    "w": float,
    "x": float,
    "y": float,
    "z": float
  },
  "transition_quaternion": {
    "w": float,
    "x": float,
    "y": float,
    "z": float
  },
  "angular_distance_radians": float,
  "angular_distance_degrees": float,
  "elasticity_metric": float,
  "is_flooding": boolean,
  "insight_code": string,  // "VALENCE_SHIFT" | "AROUSAL_SHIFT" | "CONNECTION_SHIFT"
  "interpolation_path": [
    {"w": float, "x": float, "y": float, "z": float},
    // ... 60 frames total
  ]
}
```

**Example Response:**

```json
{
  "current_state": {
    "w": 0.306,
    "x": 0.615,
    "y": 0.478,
    "z": 0.546
  },
  "transition_quaternion": {
    "w": 0.259,
    "x": 0.562,
    "y": 0.356,
    "z": 0.702
  },
  "angular_distance_radians": 2.525,
  "angular_distance_degrees": 144.7,
  "elasticity_metric": 2.525,
  "is_flooding": true,
  "insight_code": "AROUSAL_SHIFT",
  "interpolation_path": [
    {"w": 0.5, "x": 0.5, "y": 0.5, "z": 0.5},
    {"w": 0.49, "x": 0.51, "y": 0.50, "z": 0.51},
    ...
    {"w": 0.306, "x": 0.615, "y": 0.478, "z": 0.546}
  ]
}
```

**Status Codes:**

- `200 OK` - Success
- `422 Unprocessable Entity` - Validation error
- `500 Internal Server Error` - Calculation error

**Example (curl):**

```bash
curl -X POST http://localhost:8001/versor/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "current_vac": {"valence": 0.8, "arousal": 0.6, "connection": 0.7},
    "previous_state": null,
    "time_delta_seconds": 1.0
  }'
```

**Example (Python):**

```python
import httpx

async with httpx.AsyncClient() as client:
    response = await client.post(
        "http://localhost:8001/versor/calculate",
        json={
            "current_vac": {
                "valence": 0.8,
                "arousal": 0.6,
                "connection": 0.7
            },
            "previous_state": None,
            "time_delta_seconds": 1.0
        }
    )
    data = response.json()
    print(f"Quaternion: {data['current_state']}")
    print(f"Flooding: {data['is_flooding']}")
```

---

### POST /versor/slerp

Generate SLERP interpolation path between two quaternions.

**Request Schema:**

```json
{
  "start_quaternion": {
    "w": float,
    "x": float,
    "y": float,
    "z": float
  },
  "end_quaternion": {
    "w": float,
    "x": float,
    "y": float,
    "z": float
  },
  "steps": integer  // Default: 60, Range: [10, 120]
}
```

**Example Request:**

```http
POST /versor/slerp HTTP/1.1
Host: localhost:8001
Content-Type: application/json

{
  "start_quaternion": {"w": 1.0, "x": 0.0, "y": 0.0, "z": 0.0},
  "end_quaternion": {"w": 0.707, "x": 0.0, "y": 0.707, "z": 0.0},
  "steps": 60
}
```

**Response Schema:**

```json
{
  "path": [
    {"w": float, "x": float, "y": float, "z": float},
    // ... `steps` frames total
  ],
  "steps": integer,
  "angular_distance_radians": float,
  "angular_distance_degrees": float
}
```

**Status Codes:**

- `200 OK` - Success
- `422 Unprocessable Entity` - Invalid quaternions or steps
- `500 Internal Server Error` - SLERP calculation error

---

## Error Responses

### 422 Validation Error

**Cause:** Request doesn't meet schema requirements.

**Example:**

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

**Common validation errors:**

- VAC values outside [-1.0, 1.0]
- Missing required fields
- Wrong data types (string instead of float)
- Negative time_delta
- Steps outside [10, 120]

### 500 Internal Server Error

**Cause:** Unexpected error during calculation.

**Example:**

```json
{
  "detail": "Internal server error during quaternion calculation"
}
```

**Rare - indicates bug in Versor code.**

---

## Data Models

### VACInput

```typescript
interface VACInput {
  valence: number;     // -1.0 to 1.0
  arousal: number;     // -1.0 to 1.0
  connection: number;  // -1.0 to 1.0
}
```

### QuaternionModel

```typescript
interface QuaternionModel {
  w: number;  // Scalar component
  x: number;  // X component
  y: number;  // Y component
  z: number;  // Z component
}
```

### InsightCode

```typescript
type InsightCode = 
  | "VALENCE_SHIFT"     // Feeling better/worse
  | "AROUSAL_SHIFT"     // Energy level changed
  | "CONNECTION_SHIFT"; // Connection to others changed
```

---

## Rate Limiting

**Currently:** No rate limiting

**Future:** If needed

- 1000 requests/minute per client
- Burst: 100 requests/second

---

## Versioning

**Current:** No API versioning  
**All endpoints:** Implicit v1

**Future (if breaking changes):**

- `/versor/v1/calculate` - Legacy
- `/versor/v2/calculate` - New
- `/versor/calculate` - Latest (redirects to v2)

---

## OpenAPI Specification

**Download:**

```bash
curl http://localhost:8001/openapi.json > versor-api.json
```

**Interactive docs:**

- **Swagger UI:** <http://localhost:8001/docs>
- **ReDoc:** <http://localhost:8001/redoc>

---

## Client Examples

### Python (httpx)

```python
import httpx

async def calculate_quaternion(vac: dict, previous: dict = None):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://versor:8001/versor/calculate",
            json={
                "current_vac": vac,
                "previous_state": previous,
                "time_delta_seconds": 1.0
            },
            timeout=5.0
        )
        response.raise_for_status()
        return response.json()
```

### TypeScript (fetch)

```typescript
async function calculateQuaternion(
  vac: VACInput,
  previous?: QuaternionModel
): Promise<TrajectoryResponse> {
  const response = await fetch('http://versor:8001/versor/calculate', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      current_vac: vac,
      previous_state: previous || null,
      time_delta_seconds: 1.0
    })
  });
  
  if (!response.ok) {
    throw new Error(`Versor API error: ${response.status}`);
  }
  
  return await response.json();
}
```

### JavaScript (axios)

```javascript
const axios = require('axios');

async function calculateQuaternion(vac, previous = null) {
  try {
    const response = await axios.post(
      'http://versor:8001/versor/calculate',
      {
        current_vac: vac,
        previous_state: previous,
        time_delta_seconds: 1.0
      }
    );
    return response.data;
  } catch (error) {
    console.error('Versor API error:', error.response.data);
    throw error;
  }
}
```

---

## Testing the API

### Using Swagger UI

1. Navigate to <http://localhost:8001/docs>
2. Expand `/versor/calculate`
3. Click "Try it out"
4. Fill in example values:

   ```json
   {
     "current_vac": {"valence": 0.8, "arousal": 0.6, "connection": 0.7}
   }
   ```

5. Click "Execute"
6. View response below

### Using Postman

**Import OpenAPI spec:**

1. File → Import
2. Link: `http://localhost:8001/openapi.json`
3. Generates collection with all endpoints

**Create request:**

- Method: POST
- URL: `http://localhost:8001/versor/calculate`
- Body: Raw JSON
- Send

---

## Performance Characteristics

**Typical latencies:**

- `/health`: < 5ms
- `/versor/calculate` (no previous): 8-12ms
- `/versor/calculate` (with previous): 12-18ms
- `/versor/slerp`: 5-10ms

**P99 latency:** < 50ms ✅

---

## Next Steps

- **[Configuration](configuration.md)** - Environment variables and settings
- **[Error Codes](error-codes.md)** - Complete error reference
- **[Glossary](glossary.md)** - Terminology reference

---

**Previous:** [← Roadmap](../overview/03-roadmap.md)  
**Next:** [Configuration →](configuration.md)
