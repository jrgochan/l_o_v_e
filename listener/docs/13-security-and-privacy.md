# Listener Module - Security and Privacy

## Overview

The Listener processes the most sensitive data in the L.O.V.E. system—raw audio of emotional expression. This document ensures **Privacy by Design** and regulatory compliance (GDPR, HIPAA considerations).

## Data Lifecycle & Privacy

### Ephemeral Audio

**Core Principle**: Audio files are **never** stored permanently.

```
Audio captured
    ↓
Processed in memory
    ↓
Transcribed to text
    ↓
Audio deleted immediately
    ↓
Only sanitized text persists
```

**Implementation**:
```python
async def process_audio_task(ctx, audio_path, ...):
    try:
        # Process audio
        text = transcribe(audio_path)
        emotion = analyze(text)
        sanitized = scrub(text)
        
        # Store only sanitized data
        await observer.record_state(sanitized, emotion.vac)
        
    finally:
        # Always delete audio
        if os.path.exists(audio_path):
            os.remove(audio_path)
```

### PII Scrubbing

**Dual-Layer Protection**:

1. **Primary**: Listener scrubs before storage
2. **Secondary**: Observer validates on ingestion

```python
# Before any database write
if pii_scrubber.contains_pii(text):
    logger.warning("PII detected", extra={"user_id": user_id})
    text = pii_scrubber.scrub(text)
```

## GDPR Compliance

### Right to be Forgotten

```python
@router.delete("/listener/user/{user_id}/data")
async def delete_user_data(user_id: UUID):
    """
    Delete all Listener data for user (GDPR Article 17).
    
    Note: Most data is already ephemeral (audio deleted immediately).
    This endpoint clears any cached job results.
    """
    redis = await create_pool()
    
    # Clear job history
    keys = await redis.keys(f"arq:job:*:{user_id}:*")
    if keys:
        await redis.delete(*keys)
    
    return {"message": "Listener data deleted"}
```

### Data Minimization

**Only store what's necessary**:
- ✅ Sanitized text (for context)
- ✅ VAC scalars (for analysis)
- ✅ Emotion labels (for insights)
- ❌ Raw audio (deleted)
- ❌ Raw transcript (scrubbed)
- ❌ PII (removed)

## Security Best Practices

### API Security

```python
from fastapi import Security
from fastapi.security import HTTPBearer

security = HTTPBearer()

@router.post("/ingest")
async def ingest(
    credentials = Security(security)  # Require JWT
):
    # Validate token
    user = await validate_jwt(credentials.credentials)
    # ... process
```

### Rate Limiting

```python
from slowapi import Limiter

limiter = Limiter(key_func=get_remote_address)

@router.post("/ingest")
@limiter.limit("50/minute")  # Max 50 audio uploads per minute
async def ingest(...):
    pass
```

### Audio Size Limits

```python
MAX_AUDIO_SIZE = 10 * 1024 * 1024  # 10MB

@router.post("/ingest")
async def ingest(audio: UploadFile):
    # Check file size
    if audio.size > MAX_AUDIO_SIZE:
        raise HTTPException(413, "Audio file too large")
```

## Audit Logging

```python
logger.info("audio_ingested", extra={
    "user_id": str(user_id),
    "duration_seconds": audio_duration,
    "has_pii": pii_detected,
    "emotion": emotion_label
})
```

## Compliance Checklist

Before production:

- [ ] Audio deleted immediately after processing
- [ ] PII scrubbing active (Spacy NER)
- [ ] Secondary PII check in Observer
- [ ] GDPR delete endpoint implemented
- [ ] Audit logging for all processing
- [ ] JWT authentication enforced
- [ ] Rate limiting configured
- [ ] Audio size limits enforced
- [ ] TLS 1.3 for all API communication
- [ ] Data retention policy documented

---

**Congratulations!** You've completed all documentation for the entire L.O.V.E. Stack:

✅ **Experience** (14 files) - 3D visualization
✅ **Observer** (14 files) - State persistence  
✅ **Versor** (14 files) - Quaternion math
✅ **Listener** (14 files) - Audio/text ingestion

**Total: 56 comprehensive documentation files** ready for implementation!
