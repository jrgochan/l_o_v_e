# Error Codes Reference

**Audience:** Developers, DevOps  
**Goal:** Complete catalog of Observer error codes and resolution strategies

---

## Overview

Observer uses structured error responses with consistent error codes for programmatic handling.

**Error format:**

```json
{
  "error": "error_code",
  "message": "Human-readable description",
  "details": {
    "field": "additional context"
  }
}
```

---

## HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| **200** | OK | Successful GET request |
| **201** | Created | Successful POST (resource created) |
| **400** | Bad Request | Invalid input data |
| **404** | Not Found | Resource doesn't exist |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Internal Server Error | Unexpected server error |
| **503** | Service Unavailable | Observer unhealthy |

---

## Validation Errors (400)

### invalid_vac

**Cause:** VAC coordinates out of valid range [-1, 1]

**Response:**

```json
{
  "error": "invalid_vac",
  "message": "VAC value 1.5 out of range [-1.0, 1.0]",
  "details": {
    "vac": [1.5, 0.6, 0.3],
    "invalid_index": 0,
    "valid_range": [-1.0, 1.0]
  }
}
```

**Resolution:**

- Validate VAC values before sending
- Ensure all values are between -1.0 and 1.0

---

### invalid_vac_length

**Cause:** VAC array doesn't have exactly 3 elements

**Response:**

```json
{
  "error": "invalid_vac_length",
  "message": "VAC must have exactly 3 elements [valence, arousal, connection]",
  "details": {
    "provided_length": 2,
    "required_length": 3
  }
}
```

**Resolution:**

- Ensure VAC is 3-element array: `[valence, arousal, connection]`

---

### validation_error

**Cause:** Pydantic schema validation failed

**Response:**

```json
{
  "error": "validation_error",
  "message": "Request validation failed",
  "details": {
    "field": "user_id",
    "error": "field required"
  }
}
```

**Resolution:**

- Check request schema matches API documentation
- Ensure all required fields are provided

---

## Resource Errors (404)

### emotion_not_found

**Cause:** Emotion doesn't exist in atlas

**Response:**

```json
{
  "error": "emotion_not_found",
  "message": "Emotion 'Nonexistent' not found in atlas",
  "details": {
    "emotion_name": "Nonexistent",
    "available_emotions": 87
  }
}
```

**Resolution:**

- Check emotion name spelling
- Query `/atlas/emotions` for valid names
- Use `/atlas/search` to find similar emotions

---

### user_not_found

**Cause:** User ID has no trajectory data

**Response:**

```json
{
  "error": "user_not_found",
  "message": "No trajectory data for user 'user123'",
  "details": {
    "user_id": "user123"
  }
}
```

**Resolution:**

- Verify user_id is correct
- User must have at least one state stored

---

### session_not_found

**Cause:** Chat session doesn't exist

**Response:**

```json
{
  "error": "session_not_found",
  "message": "Chat session 'session456' not found",
  "details": {
    "session_id": "session456"
  }
}
```

**Resolution:**

- Create session first via WebSocket connection
- Verify session_id is correct

---

## Pathfinding Errors (400/500)

### path_not_found

**Cause:** No valid therapeutic path exists

**Response:**

```json
{
  "error": "path_not_found",
  "message": "No valid path from 'Despair' to 'Joy'",
  "details": {
    "from_emotion": "Despair",
    "to_emotion": "Joy",
    "reason": "No category transition allowed",
    "suggestion": "Try intermediate emotion or use fallback"
  }
}
```

**Resolution:**

- Try different target emotion
- Use `/atlas/recommendations` for suggestions
- Check category transition rules

---

### invalid_transition

**Cause:** Transition violates therapeutic constraints

**Response:**

```json
{
  "error": "invalid_transition",
  "message": "Transition from 'Shame' to 'Joy' not therapeutically valid",
  "details": {
    "from_emotion": "Shame",
    "to_emotion": "Joy",
    "vac_distance": 2.8,
    "max_allowed": 1.5
  }
}
```

**Resolution:**

- Use A* pathfinding instead of direct transition
- Respect intermediate waypoints

---

## Database Errors (500)

### database_error

**Cause:** Database operation failed

**Response:**

```json
{
  "error": "database_error",
  "message": "Database query failed",
  "details": {
    "operation": "insert_trajectory",
    "error_type": "IntegrityError"
  }
}
```

**Resolution:**

- Check database is running: `psql -c "SELECT 1"`
- Check connection pool not exhausted
- Review database logs

---

### connection_pool_exhausted

**Cause:** All database connections in use

**Response:**

```json
{
  "error": "connection_pool_exhausted",
  "message": "Database connection pool exhausted (20/20 in use)",
  "details": {
    "pool_size": 20,
    "checked_out": 20,
    "overflow": 10
  }
}
```

**Resolution:**

- Increase `DB_POOL_SIZE` in configuration
- Check for connection leaks (unclosed sessions)
- Kill stuck database connections

---

### migration_required

**Cause:** Database schema out of date

**Response:**

```json
{
  "error": "migration_required",
  "message": "Database migrations required",
  "details": {
    "current_revision": "abc123",
    "required_revision": "def456"
  }
}
```

**Resolution:**

```bash
alembic upgrade head
```

---

## Vector Search Errors (500)

### vector_index_missing

**Cause:** HNSW index not found

**Response:**

```json
{
  "error": "vector_index_missing",
  "message": "Vector index not found on user_trajectory.embedding",
  "details": {
    "table": "user_trajectory",
    "column": "embedding"
  }
}
```

**Resolution:**

```sql
CREATE INDEX idx_trajectory_embedding ON user_trajectory 
USING hnsw (embedding vector_cosine_ops);
```

---

### vector_dimension_mismatch

**Cause:** Embedding dimension doesn't match table

**Response:**

```json
{
  "error": "vector_dimension_mismatch",
  "message": "Expected 384 dimensions, got 768",
  "details": {
    "expected": 384,
    "received": 768,
    "table": "atlas_definitions"
  }
}
```

**Resolution:**

- Verify `EMBEDDING_DIMENSION` matches model
- Regenerate embeddings with correct model

---

## Rate Limiting Errors (429)

### rate_limit_exceeded

**Cause:** User exceeded request rate limit

**Response:**

```json
{
  "error": "rate_limit_exceeded",
  "message": "Rate limit of 60 requests/minute exceeded",
  "details": {
    "limit": 60,
    "window": 60,
    "retry_after": 30
  }
}
```

**Headers:**

```text
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704234030
Retry-After: 30
```

**Resolution:**

- Wait `retry_after` seconds
- Implement exponential backoff
- Consider upgrading rate limit tier

---

### websocket_limit_exceeded

**Cause:** Too many WebSocket connections

**Response:**

```json
{
  "error": "websocket_limit_exceeded",
  "message": "Maximum 5 connections per session",
  "details": {
    "session_id": "session123",
    "current_connections": 5,
    "max_allowed": 5
  }
}
```

**Resolution:**

- Close unused connections
- Use single connection per device

---

## WebSocket Errors

### websocket_disconnect (1000)

**Cause:** Normal closure

**Code:** 1000  
**Reason:** "Normal closure"

---

### websocket_timeout (1000)

**Cause:** No messages for 5 minutes

**Code:** 1000  
**Reason:** "Timeout"

**Resolution:**

- Implement ping/pong heartbeat
- Reduce `WEBSOCKET_MESSAGE_TIMEOUT` if needed

---

### websocket_rate_limit (1008)

**Cause:** Message rate limit exceeded

**Code:** 1008  
**Reason:** "Policy violation - rate limit"

**Resolution:**

- Slow down message sending
- Maximum 60 messages/minute

---

## Business Logic Errors

### insufficient_history

**Cause:** Not enough data for metrics calculation

**Response:**

```json
{
  "error": "insufficient_history",
  "message": "Need at least 10 trajectory points to calculate rigidity",
  "details": {
    "user_id": "user123",
    "current_points": 3,
    "required_points": 10
  }
}
```

**Resolution:**

- User needs more emotional state entries
- Wait for more data to accumulate

---

### embedding_generation_failed

**Cause:** Failed to generate semantic embedding

**Response:**

```json
{
  "error": "embedding_generation_failed",
  "message": "Failed to generate embedding for text",
  "details": {
    "text_length": 5000,
    "max_length": 512,
    "provider": "local"
  }
}
```

**Resolution:**

- Truncate text to max length
- Check embedding service is running
- Verify model is loaded

---

## External Service Errors

### versor_unavailable

**Cause:** Versor module not responding

**Response:**

```json
{
  "error": "versor_unavailable",
  "message": "Versor service unavailable, using local computation",
  "details": {
    "versor_url": "http://versor:8001",
    "fallback": "local_computation",
    "impact": "Slightly less accurate quaternions"
  }
}
```

**Impact:** Gracefully degraded (uses local math)

**Resolution:**

- Check Versor is running: `curl http://versor:8001/health`
- Local fallback is acceptable for most uses

---

## Error Handling Best Practices

### Client-Side Retry Logic

```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type(ServerError)
)
async def call_observer_with_retry():
    response = await client.post("/observer/state", json=...)
    return response.json()
```

### Error Response Parsing

```python
try:
    response = await client.post(url, json=data)
    response.raise_for_status()
    return response.json()
except httpx.HTTPStatusError as e:
    error_data = e.response.json()
    
    if error_data["error"] == "emotion_not_found":
        # Handle missing emotion
        pass
    elif error_data["error"] == "rate_limit_exceeded":
        # Wait and retry
        await asyncio.sleep(error_data["details"]["retry_after"])
    else:
        # Generic error handling
        logger.error(f"Observer error: {error_data}")
        raise
```

---

## Debugging Errors

### Enable Detailed Logging

```bash
# In .env
LOG_LEVEL=DEBUG

# Restart Observer
systemctl restart observer

# Watch logs
tail -f /var/log/observer/app.log
```

### Check Database State

```sql
-- Verify atlas loaded
SELECT COUNT(*) FROM atlas_definitions;  -- Should be 87

-- Check indexes
\di+ *embedding*

-- Check recent errors
SELECT * FROM error_logs ORDER BY timestamp DESC LIMIT 10;
```

---

## Next Steps

**Related documentation:**

- [API Reference](api-reference.md) - Endpoint details
- [Configuration](configuration.md) - Settings reference
- [Senior Dev: Troubleshooting](../architecture/08-troubleshooting.md) - Detailed debugging
