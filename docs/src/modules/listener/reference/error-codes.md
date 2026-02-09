# Error Codes Reference

**Last Updated:** January 2, 2026
**Audience:** All developers
**Goal:** Understand and resolve Listener errors

---

## Error Response Format

All errors follow this structure:

```json
{
  "detail": "Error message explaining what went wrong",
  "code": "ERROR_CODE",
  "timestamp": "2026-01-02T19:00:00Z"
}
```

---

## Client Errors (4xx)

### 400 Bad Request

**Causes:**

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| `MISSING_TEXT` | "Text cannot be empty" | No text provided | Include text parameter |
| `TEXT_TOO_SHORT` | "Text must be at least 5 characters" | Input < 5 chars | Provide more text |
| `TEXT_TOO_LONG` | "Text exceeds 5000 character limit" | Input > 5000 chars | Shorten text or split |
| `MISSING_USER_ID` | "user_id is required" | No user_id | Include user_id parameter |
| `INVALID_UUID` | "user_id must be valid UUID" | Malformed UUID | Use valid UUID format |

**Example:**

```json
{
  "detail": "Text cannot be empty",
  "code": "MISSING_TEXT"
}
```

---

### 413 Payload Too Large

**Causes:**

| Code | Message | Limit | Solution |
|------|---------|-------|----------|
| `AUDIO_TOO_LARGE` | "Audio file exceeds 25MB limit" | 25MB | Compress or split audio |
| `AUDIO_TOO_LONG` | "Audio duration exceeds 5 minute limit" | 5 min | Split into shorter segments |

---

### 415 Unsupported Media Type

**Causes:**

| Code | Message | Solution |
|------|---------|----------|
| `INVALID_AUDIO_FORMAT` | "Audio format not supported" | Convert to WAV, M4A, or WebM |
| `CORRUPTED_AUDIO` | "Audio file appears corrupted" | Re-record or use different file |

---

### 422 Unprocessable Entity

**Causes:**

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| `VALIDATION_ERROR` | "Pydantic validation failed" | Invalid data structure | Check request format |
| `VAC_OUT_OF_RANGE` | "VAC values must be -1.0 to 1.0" | Internal error (should be clamped) | Report bug |

---

## Server Errors (5xx)

### 500 Internal Server Error

**Causes:**

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| `LLM_ERROR` | "LLM inference failed" | Ollama error | Check Ollama logs |
| `TRANSCRIPTION_ERROR` | "Audio transcription failed" | Whisper error | Check audio format |
| `PII_SCRUBBING_ERROR` | "PII scrubbing failed" | Spacy error | Check Spacy model installed |
| `PARSING_ERROR` | "Failed to parse LLM response" | Invalid JSON from LLM | Retry request |
| `VALIDATION_ERROR` | "Result validation failed" | Invalid VAC values | Report bug (should be clamped) |

**Example:**

```json
{
  "detail": "LLM inference failed: Connection refused",
  "code": "LLM_ERROR",
  "timestamp": "2026-01-02T19:00:00Z"
}
```

**Resolution:** Check if Ollama is running

---

### 503 Service Unavailable

**Causes:**

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| `OLLAMA_UNAVAILABLE` | "Ollama service is not available" | Ollama down | Start Ollama: `ollama serve` |
| `REDIS_UNAVAILABLE` | "Redis service is not available" | Redis down (async only) | Start Redis: `redis-server` |
| `SERVICE_STARTING` | "Service is starting up" | Initialization | Wait 10-30 seconds |
| `MAINTENANCE_MODE` | "Service in maintenance mode" | Manual maintenance | Wait for completion |

---

### 504 Gateway Timeout

**Causes:**

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| `LLM_TIMEOUT` | "LLM inference timed out" | Ollama overloaded | Use smaller model or add GPU |
| `TRANSCRIPTION_TIMEOUT` | "Transcription timed out" | Audio too long | Split audio into shorter segments |

---

## Semantic Analysis Errors

### Connection Axis Issues

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| `CONNECTION_INVALID` | "Connection value invalid" | Model error | Check model is correct |
| `SACRED_TEST_FAILED` | "Sacred test failing" | **CRITICAL** | Revert recent changes |

**If sacred test fails:**

```bash
# Run test
pytest tests/semantic/test_connection_axis.py -v

# Check recent changes
git log -p app/services/semantic_analyzer.py

# Revert if needed
git revert <commit>
```

---

## Observer Integration Errors

| Code | Message | Impact | Solution |
|------|---------|--------|----------|
| `OBSERVER_TIMEOUT` | "Observer request timed out" | ⚠️ Low (non-blocking) | Check Observer health |
| `OBSERVER_UNAVAILABLE` | "Observer service unavailable" | ⚠️ Low (non-blocking) | Observer optional |

**Note:** Observer errors are non-blocking—Listener continues to function.

---

## Debugging Error Responses

### Enable Debug Logging

```bash
# In .env
LOG_LEVEL=DEBUG

# Restart Listener
uvicorn app.main:app --reload --port 8002
```

### Check Logs

```bash
# Recent errors
grep ERROR logs/listener.log | tail -20

# Specific error code
grep "LLM_ERROR" logs/listener.log

# Around specific timestamp
grep "2026-01-02T19:" logs/listener.log
```

### Test Endpoint Directly

```bash
# Simple test
curl -X POST http://localhost:8002/listener/analyze \
  -F "text=test" \
  -F "user_id=test" \
  -F "session_id=test"

# Check response
# Look at "detail" field for error explanation
```

---

## Common Error Scenarios

### Scenario 1: "Connection refused to Ollama"

**Error:**

```json
{
  "detail": "LLM inference failed: [Errno 61] Connection refused",
  "code": "LLM_ERROR"
}
```

**Solution:**

```bash
# Start Ollama
ollama serve

# Verify it's running
curl http://localhost:11434/api/tags
```

---

### Scenario 2: "Model not found"

**Error:**

```json
{
  "detail": "Model 'llama3.1:8b-instruct-q4_0' not found",
  "code": "LLM_ERROR"
}
```

**Solution:**

```bash
# Download the model
ollama pull llama3.1:8b-instruct-q4_0

# Verify it's available
ollama list
```

---

### Scenario 3: "Spacy model not found"

**Error:**

```json
{
  "detail": "Can't find model 'en_core_web_sm'",
  "code": "PII_SCRUBBING_ERROR"
}
```

**Solution:**

```bash
# Download Spacy model
python -m spacy download en_core_web_sm
```

---

## Retry Logic

### Recommended Client-Side Retry

```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10)
)
async def analyze_with_retry(text: str):
    """Retry on transient errors"""
    response = await client.post("/listener/analyze", data={
        "text": text,
        "user_id": user_id,
        "session_id": session_id
    })

    if response.status_code == 503:
        raise Exception("Service unavailable")  # Will retry

    return response.json()
```

**Retry on:**

- 503 Service Unavailable (Ollama/Redis down)
- 504 Gateway Timeout (LLM timeout)
- Network errors

**Don't retry on:**

- 400 Bad Request (fix input instead)
- 422 Unprocessable Entity (validation error)

---

## Error Monitoring

### Track Error Rates

```python
from prometheus_client import Counter

errors_total = Counter(
    'listener_errors_total',
    'Total errors by type',
    ['code', 'endpoint']
)

# Log errors
errors_total.labels(code='LLM_ERROR', endpoint='/analyze').inc()
```

### Alert on Error Spikes

```yaml
- alert: HighErrorRate
  expr: rate(listener_errors_total[5m]) > 0.01
  for: 5m
  annotations:
    summary: "Error rate > 1%"
```

---

## Key Takeaways

✅ **Consistent format:** All errors follow same structure
✅ **Clear codes:** Specific codes for each error type
✅ **Actionable messages:** Tell user how to fix
✅ **Non-blocking:** Observer errors don't stop Listener
✅ **Retry logic:** Client can retry transient errors

---

**Next:** [Glossary →](glossary.md)
