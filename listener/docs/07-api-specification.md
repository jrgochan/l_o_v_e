# Listener Module - API Specification

## Overview

The Listener exposes REST and WebSocket APIs for audio/text ingestion and real-time status updates.

## Base URL

```
Development: http://localhost:8002
Production: https://api.love.app/v1/listener
```

## Endpoints

### 1. POST /listener/ingest

**Purpose**: Primary ingestion endpoint for audio or text.

**Request** (multipart/form-data):
```
POST /listener/ingest
Content-Type: multipart/form-data
Authorization: Bearer <JWT>

Form Data:
- audio: (file, optional) Audio file (.m4a, .aac, .wav)
- text: (string, optional) Direct text input
- user_id: (UUID) User identifier
- session_id: (UUID) Session identifier
- timestamp: (ISO8601) Client timestamp
```

**Response** (202 Accepted):
```json
{
  "status": "queued",
  "job_id": "job_8f7d6a5e",
  "queue_position": 1,
  "estimated_wait_seconds": 2.5
}
```

**Implementation**:
```python
from fastapi import APIRouter, UploadFile, File, Form
from app.workers.audio_processor import process_audio
from arq import create_pool

router = APIRouter()

@router.post("/ingest")
async def ingest(
    audio: UploadFile = File(None),
    text: str = Form(None),
    user_id: str = Form(...),
    session_id: str = Form(...),
    timestamp: str = Form(...)
):
    """Ingest audio or text for processing"""

    if audio is None and text is None:
        raise HTTPException(400, "Either audio or text required")

    # Save audio temporarily
    if audio:
        audio_path = f"/tmp/{audio.filename}"
        with open(audio_path, "wb") as f:
            f.write(await audio.read())
    else:
        audio_path = None

    # Enqueue job
    redis = await create_pool()
    job = await redis.enqueue_job(
        "process_audio",
        audio_path=audio_path,
        text=text,
        user_id=user_id,
        session_id=session_id,
        timestamp=timestamp
    )

    return {
        "status": "queued",
        "job_id": job.job_id
    }
```

### 2. GET /listener/status/{job_id}

**Purpose**: Check processing status.

**Response**:
```json
{
  "job_id": "job_8f7d6a5e",
  "status": "complete",
  "result": {
    "transcription": "I'm feeling overwhelmed...",
    "emotion": {
      "primary_emotion": "Overwhelm",
      "vac": {"valence": -0.6, "arousal": 0.9, "connection": -0.3}
    }
  }
}
```

### 3. WebSocket /ws/listener/{client_id}

**Purpose**: Real-time status updates.

**Protocol**:
```json
// Client → Server
{"type": "subscribe", "user_id": "uuid"}

// Server → Client
{"type": "JOB_STARTED", "job_id": "uuid"}
{"type": "TRANSCRIPTION_COMPLETE", "text": "..."}
{"type": "ANALYSIS_COMPLETE", "emotion": {...}}
```

## Next Steps

- **08-async-queue.md** - Arq + Redis implementation
- **09-setup-and-installation.md** - Development setup
- **10-deployment.md** - Production deployment
