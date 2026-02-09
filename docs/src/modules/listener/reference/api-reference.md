# API Reference

**Last Updated:** January 2, 2026
**Audience:** All developers
**Goal:** Complete reference for all Listener API endpoints

---

## Base URL

```text
Development: http://localhost:8002
Production: https://api.love-platform.dev/listener
```

---

## Authentication

**Current:** No authentication (development)
**Future:** JWT tokens for production

---

## Endpoints Overview

| Endpoint | Method | Purpose | Latency |
|----------|--------|---------|---------|
| `/health` | GET | Liveness check | < 10ms |
| `/health/ready` | GET | Readiness check | < 100ms |
| `/listener/analyze` | POST | Analyze text (sync) | ~2s |
| `/listener/analyze-audio` | POST | Analyze audio (sync) | ~3s |
| `/listener/analyze-multi-emotion` | POST | Multi-emotion analysis | ~4s |
| `/listener/ingest` | POST | Queue audio (async) | < 100ms |
| `/listener/status/{job_id}` | GET | Check job status | < 50ms |
| `/listener/ai/models/local` | GET | List local models | < 100ms |

---

## Health Endpoints

### GET /health

**Purpose:** Liveness probe (is service running?)

**Request:**

```bash
curl http://localhost:8002/health
```

**Response:**

```json
{
  "status": "healthy",
  "service": "listener",
  "version": "0.1.0",
  "timestamp": "2026-01-02T19:00:00Z"
}
```

**Status Codes:**

- `200` - Service healthy
- `503` - Service unhealthy

---

### GET /health/ready

**Purpose:** Readiness probe (ready to handle traffic?)

**Request:**

```bash
curl http://localhost:8002/health/ready
```

**Response:**

```json
{
  "ready": true,
  "checks": {
    "ollama": true,
    "redis": true,
    "disk_space": true
  }
}
```

**Status Codes:**

- `200` - Ready
- `503` - Not ready (check `checks` object)

---

## Analysis Endpoints

### POST /listener/analyze

**Purpose:** Synchronous text analysis

**Request:**

```bash
curl -X POST http://localhost:8002/listener/analyze \
  -H "Content-Type: multipart/form-data" \
  -F "text=I'm feeling overwhelmed but hopeful" \
  -F "user_id=demo-user" \
  -F "session_id=demo-session"
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | Yes | Text to analyze (5-5000 chars) |
| `user_id` | string | Yes | User identifier (UUID recommended) |
| `session_id` | string | Yes | Session identifier (UUID recommended) |

**Response:**

```json
{
  "user_id": "demo-user",
  "session_id": "demo-session",
  "transcription": "I'm feeling overwhelmed but hopeful",
  "emotion": "Overwhelm",
  "category": "Places We Go When Things Are Uncertain",
  "vac": {
    "valence": -0.3,
    "arousal": 0.7,
    "connection": 0.4
  },
  "confidence": 0.88,
  "reasoning": "High arousal from overwhelm, slightly negative valence, but positive connection from hope.",
  "processing_time_ms": 1847
}
```

**Status Codes:**

- `200` - Success
- `400` - Invalid input (missing text, etc.)
- `500` - Analysis failed (check `detail`)

**Error Response:**

```json
{
  "detail": "Text cannot be empty"
}
```

---

### POST /listener/analyze-audio

**Purpose:** Synchronous audio analysis (transcription + emotion)

**Request:**

```bash
curl -X POST http://localhost:8002/listener/analyze-audio \
  -F "audio=@recording.wav" \
  -F "user_id=demo-user" \
  -F "session_id=demo-session"
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `audio` | file | Yes | Audio file (WAV, M4A, WebM, MP3) |
| `user_id` | string | Optional | User ID (default: "admin") |
| `session_id` | string | Optional | Session ID (default: "chat-session") |

**Supported Formats:**

- WAV (preferred)
- M4A
- WebM
- MP3
- AAC

**Max Size:** 25MB
**Max Duration:** 5 minutes

**Response:**

```json
{
  "status": "success",
  "transcription": "I'm feeling overwhelmed but hopeful",
  "emotion": "Overwhelm",
  "category": "Places We Go When Things Are Uncertain",
  "vac": {
    "valence": -0.3,
    "arousal": 0.7,
    "connection": 0.4
  },
  "confidence": 0.88,
  "reasoning": "...",
  "prosody": {
    "pitch_mean": 185.5,
    "pitch_std": 42.3,
    "energy": 0.65,
    "speech_rate": 3.2
  },
  "processing_time_seconds": 3.2
}
```

---

### POST /listener/analyze-multi-emotion

**Purpose:** Detect multiple concurrent emotions (Deep Feeling mode)

**Request:**

```bash
curl -X POST http://localhost:8002/listener/analyze-multi-emotion \
  -F "text=I'm hopeful but also anxious about the future" \
  -F "user_id=demo-user" \
  -F "session_id=demo-session"
```

**Response:**

```json
{
  "user_id": "demo-user",
  "session_id": "demo-session",
  "transcription": "I'm hopeful but also anxious about the future",
  "emotions": [
    {
      "emotion_name": "Hope",
      "category": "Places We Go When Things Are Uncertain",
      "vac": {"valence": 0.5, "arousal": 0.3, "connection": 0.6},
      "confidence": 0.85,
      "prominence": 0.6
    },
    {
      "emotion_name": "Anxiety",
      "category": "Places We Go When Things Are Uncertain",
      "vac": {"valence": -0.4, "arousal": 0.6, "connection": -0.2},
      "confidence": 0.82,
      "prominence": 0.4
    }
  ],
  "relationships": [
    {
      "emotion_a": "Hope",
      "emotion_b": "Anxiety",
      "type": "tension",
      "strength": 0.7,
      "description": "Hope and anxiety create motivational tension"
    }
  ],
  "aggregate_vac": {
    "valence": 0.1,
    "arousal": 0.45,
    "connection": 0.2
  },
  "complexity_score": 0.65,
  "emotional_clarity": 0.72,
  "temporal_pattern": "concurrent",
  "processing_time_ms": 3847
}
```

---

### POST /listener/ingest

**Purpose:** Queue audio for asynchronous processing

**Request:**

```bash
curl -X POST http://localhost:8002/listener/ingest \
  -F "audio=@recording.wav" \
  -F "user_id=demo-user" \
  -F "session_id=demo-session"
```

**Response:**

```json
{
  "status": "queued",
  "job_id": "7f3a8c9d-1234-5678-9abc-def012345678",
  "user_id": "demo-user",
  "session_id": "demo-session",
  "message": "Processing started. Use job_id to check status."
}
```

---

### GET /listener/status/{job_id}

**Purpose:** Check async job status

**Request:**

```bash
curl http://localhost:8002/listener/status/7f3a8c9d-1234-5678-9abc-def012345678
```

**Response (In Progress):**

```json
{
  "job_id": "7f3a8c9d-1234-5678-9abc-def012345678",
  "status": "in_progress"
}
```

**Response (Complete):**

```json
{
  "job_id": "7f3a8c9d-1234-5678-9abc-def012345678",
  "status": "complete",
  "result": {
    "transcription": "...",
    "emotion": "...",
    "vac": {...}
  }
}
```

---

## AI Model Management

### GET /listener/ai/models/local

**Purpose:** List locally available Ollama models

**Request:**

```bash
curl http://localhost:8002/listener/ai/models/local
```

**Response:**

```json
{
  "models": [
    {
      "name": "llama3.1:8b-instruct-q4_0",
      "size": "4.7GB",
      "modified": "2025-12-15T10:30:00Z"
    },
    {
      "name": "phi-3:mini",
      "size": "2.3GB",
      "modified": "2025-12-10T14:20:00Z"
    }
  ]
}
```

---

## Error Codes

### Client Errors (4xx)

| Code | Error | Meaning |
|------|-------|---------|
| `400` | Bad Request | Missing or invalid parameters |
| `413` | Payload Too Large | Audio file > 25MB |
| `415` | Unsupported Media Type | Invalid audio format |
| `422` | Unprocessable Entity | Pydantic validation failed |

### Server Errors (5xx)

| Code | Error | Meaning |
|------|-------|---------|
| `500` | Internal Server Error | Analysis failed |
| `503` | Service Unavailable | Ollama/Redis down |
| `504` | Gateway Timeout | Analysis took > 30s |

---

## Rate Limiting

**Current:** No rate limiting (development)

**Future (Production):**

```text
Free tier: 100 requests/hour
Premium: 1000 requests/hour
Enterprise: Unlimited
```

---

## Webhooks (Future)

**Concept:** Get notified when async jobs complete

```python
# Register webhook
POST /listener/webhooks
{
  "url": "https://your-app.com/listener-callback",
  "events": ["job.complete", "job.failed"]
}

# Webhook payload
POST https://your-app.com/listener-callback
{
  "event": "job.complete",
  "job_id": "...",
  "result": {...}
}
```

---

## SDKs (Future)

### Python SDK

```python
from love_client import ListenerClient

client = ListenerClient(api_key="your-key")

result = await client.analyze(
    text="I'm feeling great!",
    user_id="user-123"
)

print(result.vac.connection)  # 0.8
```

### JavaScript/TypeScript SDK

```typescript
import { ListenerClient } from '@love/client';

const client = new ListenerClient({ apiKey: 'your-key' });

const result = await client.analyze({
  text: "I'm feeling great!",
  userId: "user-123"
});

console.log(result.vac.connection);  // 0.8
```

---

## OpenAPI Specification

**Interactive Docs:**

```text
http://localhost:8002/docs  # Swagger UI
http://localhost:8002/redoc  # ReDoc
```

**Download OpenAPI JSON:**

```text
http://localhost:8002/openapi.json
```

---

## Key Takeaways

✅ **5 main endpoints** for various use cases
✅ **Sync and async** options available
✅ **Well-documented** with examples
✅ **Error handling** with clear codes
✅ **Future-ready** with webhooks/SDKs planned

---

**Next:** [Configuration Reference →](configuration.md)
