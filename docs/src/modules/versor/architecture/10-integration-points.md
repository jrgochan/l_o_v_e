# Integration Points - Versor Module

This guide explains how the Versor module integrates with other L.O.V.E. platform components and external systems.

---

## L.O.V.E. Platform Integration

### Data Flow

```text
User Input
    ↓
LISTENER (port 8000)
    ↓ VAC vectors
OBSERVER (port 8002)
    ↓ VAC + previous quaternion
VERSOR (port 8001) ← YOU ARE HERE
    ↓ Quaternion + metrics + SLERP path
OBSERVER (stores)
    ↓ Quaternions for visualization
EXPERIENCE (port 3000)
    ↓ Displays animated Soul Sphere
User
```

---

## Integration 1: Observer → Versor

### API Contract

**Observer calls Versor's `/versor/calculate` endpoint.**

**Request:**

```json
POST http://versor:8001/versor/calculate
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

**Response:**

```json
{
  "current_state": {"w": 0.3, "x": 0.6, "y": 0.5, "z": 0.5},
  "angular_distance_radians": 2.5,
  "angular_distance_degrees": 143.2,
  "elasticity_metric": 2.5,
  "is_flooding": true,
  "insight_code": "AROUSAL_SHIFT",
  "interpolation_path": [ ... 60 frames ... ]
}
```

### When Observer Calls Versor

**Trigger:** New emotional state detected (from Listener)

**Frequency:**

- Real-time mode: Every 1-3 seconds
- Batch mode: Every 10-30 seconds
- Peak load: ~10 requests/second/user

**Retry logic:**

```python
# Observer implements retries
for attempt in range(3):
    try:
        response = await client.post("http://versor:8001/versor/calculate", ...)
        break
    except httpx.TimeoutError:
        if attempt == 2:
            raise
        await asyncio.sleep(0.1 * (attempt + 1))
```

---

## Integration 2: Versor → Experience

### Data Contract

**Versor provides:** SLERP interpolation path (60-120 frames)

**Experience consumes:** Quaternion array for animation

**Example:**

```typescript
// Experience receives
interface SlerpFrame {
  w: number;
  x: number;
  y: number;
  z: number;
}

const frames: SlerpFrame[] = response.interpolation_path;

// Animate Soul Sphere
frames.forEach((frame, index) => {
  setTimeout(() => {
    soulSphere.setRotation(frame);
    render();
  }, index * 16.67);  // 60 fps
});
```

### Frame Rate Coordination

**Versor default:** 60 frames/second
**Experience:** 60 fps display
**Result:** 1-second smooth animation

**Configurable:**

```text
Fast transition: 30 frames → 0.5 seconds
Slow transition: 120 frames → 2 seconds
```

---

## Integration 3: Internal Services

### No Internal Dependencies

**Versor has NO dependencies on:**

- ❌ Listener (doesn't call it)
- ❌ Observer (doesn't call it)
- ❌ Experience (doesn't call it)
- ❌ Database (stateless)
- ❌ Redis (no caching)
- ❌ Message queue (direct HTTP)

**This simplifies:**

- Deployment (fewer connections to configure)
- Testing (no mocks needed)
- Reliability (fewer failure points)

---

## Network Configuration

### Service Discovery

**Development:**

```text
http://localhost:8001
```

**Docker Compose:**

```yaml
services:
  versor:
    ports:
      - "8001:8001"
  observer:
    environment:
      - VERSOR_URL=http://versor:8001
```

**Kubernetes:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: versor
spec:
  selector:
    app: versor
  ports:
    - port: 8001
      targetPort: 8001

# Observer calls: http://versor.default.svc.cluster.local:8001
```

### CORS Configuration

**Allowed origins:**

```python
# app/config.py
CORS_ORIGINS = [
    "http://localhost:8002",     # Observer (dev)
    "http://localhost:3000",     # Experience (dev)
    "https://api.love.com",      # Observer (prod)
    "https://app.love.com"       # Experience (prod)
]
```

---

## API Versioning Strategy

### Current: No Versioning

**Rationale:**

- API is stable
- No breaking changes planned
- All modules updated together

### Future: Version in URL

**If breaking changes needed:**

```text
/versor/v1/calculate  (legacy)
/versor/v2/calculate  (new)
/versor/calculate     (latest)
```

**Migration period:** 6 months overlap

---

## Data Format Standards

### JSON Schema

**VAC Input:**

```json
{
  "type": "object",
  "properties": {
    "valence": {"type": "number", "minimum": -1.0, "maximum": 1.0},
    "arousal": {"type": "number", "minimum": -1.0, "maximum": 1.0},
    "connection": {"type": "number", "minimum": -1.0, "maximum": 1.0}
  },
  "required": ["valence", "arousal", "connection"]
}
```

**Quaternion Output:**

```json
{
  "type": "object",
  "properties": {
    "w": {"type": "number"},
    "x": {"type": "number"},
    "y": {"type": "number"},
    "z": {"type": "number"}
  }
}
```

### OpenAPI Specification

**Auto-generated:** <http://localhost:8001/openapi.json>

**Use for:**

- Client code generation
- API documentation
- Contract testing
- Integration validation

---

## Error Handling Contracts

### Error Response Format

**422 Validation Error:**

```json
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

**500 Internal Error:**

```json
{
  "detail": "Internal server error during quaternion calculation"
}
```

### Expected Error Rates

- **Normal:** < 0.01% (mostly client validation errors)
- **Warning:** 0.1-1% (investigate if sustained)
- **Critical:** > 1% (incident response needed)

---

## Monitoring Integration

### Health Check Integration

**Kubernetes liveness:**

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8001
  failureThreshold: 3
  periodSeconds: 10
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

### Metrics Export

**Prometheus (if configured):**

```text
GET /metrics

# HELP versor_requests_total Total requests
# TYPE versor_requests_total counter
versor_requests_total 15234

# HELP versor_request_duration_seconds Request duration
# TYPE versor_request_duration_seconds histogram
versor_request_duration_seconds_bucket{le="0.01"} 8542
versor_request_duration_seconds_bucket{le="0.05"} 15123
versor_request_duration_seconds_bucket{le="0.1"} 15230
```

---

## Deployment Dependencies

### Runtime Dependencies

**Required:**

- Python 3.12+
- NumPy 1.26.3+
- SciPy 1.12.0+
- FastAPI 0.109.0+

**Optional:**

- Prometheus client (metrics)
- Sentry (error tracking)

### Infrastructure Dependencies

**Minimal:**

- Container runtime (Docker/Podman)
- Network connectivity
- Health check endpoint access

**No dependencies on:**

- Database
- Message queue
- Cache (Redis)
- External APIs

---

## Testing Integration Points

### Contract Testing

```python
# tests/integration/test_contracts.py

def test_observer_contract():
    """Verify Observer can call Versor successfully."""
    # Simulate Observer's request format
    response = client.post("/versor/calculate", json={
        "current_vac": {"valence": 0.8, "arousal": 0.6, "connection": 0.7},
        "previous_state": {"w": 0.5, "x": 0.5, "y": 0.5, "z": 0.5},
        "time_delta_seconds": 1.0
    })

    # Verify response matches Observer's expectations
    assert response.status_code == 200
    data = response.json()
    assert "current_state" in data
    assert "interpolation_path" in data
    assert len(data["interpolation_path"]) > 0

def test_experience_contract():
    """Verify Experience can parse Versor's response."""
    response = client.post("/versor/calculate", json={...})
    data = response.json()

    # Verify format Experience expects
    for frame in data["interpolation_path"]:
        assert "w" in frame
        assert "x" in frame
        assert "y" in frame
        assert "z" in frame
```

---

## Change Management

### Breaking Changes

**If API must change:**

1. **Announce:** 3 months in advance
2. **Version:** Add /v2/ endpoint
3. **Maintain:** Keep /v1/ for 6 months
4. **Migrate:** Work with Observer/Experience teams
5. **Deprecate:** Remove /v1/ after migration complete

### Non-Breaking Changes

**Can add freely:**

- New optional fields in response
- New endpoints
- New query parameters (with defaults)
- Internal optimizations

**Example:**

```python
# Adding optional field (non-breaking)
class TrajectoryResponse(BaseModel):
    # Existing required fields...
    current_state: QuaternionModel

    # New optional field
    processing_time_ms: Optional[float] = None  # Clients can ignore
```

---

## Integration Testing

### End-to-End Tests

```python
# tests/e2e/test_platform_integration.py

async def test_full_platform_flow():
    """Test complete flow: Listener → Observer → Versor → Experience."""

    # 1. Listener produces VAC
    vac = {"valence": 0.8, "arousal": 0.6, "connection": 0.7}

    # 2. Observer calls Versor
    versor_response = await call_versor(vac, previous=None)

    # 3. Verify response structure
    assert "current_state" in versor_response
    assert "interpolation_path" in versor_response

    # 4. Verify Experience can use it
    frames = versor_response["interpolation_path"]
    assert len(frames) == 60
    for frame in frames:
        validate_quaternion(frame)
```

---

## Documentation for Integration

### API Documentation

**Auto-generated:** <http://versor:8001/docs>

**Download OpenAPI spec:**

```bash
curl http://localhost:8001/openapi.json > versor-api.json
```

**Use for:**

- Client SDK generation
- API testing tools (Postman)
- Contract validation

### Integration Examples

**Observer integration:** See `docs/modules/observer/architecture/10-integration-points.md`
**Experience integration:** See `docs/modules/experience/` (when available)

---

## Next Steps

- **[Monitoring & Operations](../operations/01-monitoring.md)** - Day-to-day operations
- **[Team Structure](../operations/02-team-structure.md)** - Roles and skills
- **[Incident Response](../operations/03-incident-response.md)** - Handling issues

---

**Previous:** [← Architecture Overview](00-high-level-overview.md)
**Next:** [Monitoring & Operations →](../operations/01-monitoring.md)
