# Listener Module - Async Queue (Arq + Redis)

## Overview

Audio processing is CPU/GPU intensive and can take 2-5 seconds. The Listener uses **Arq** (Async Redis Queue) to handle long-running tasks asynchronously without blocking the API.

## Why Arq Over Celery?

| Feature | Arq | Celery |
|---------|-----|--------|
| Async Native | ✅ Yes | ❌ No (bolt-on) |
| Lightweight | ✅ Minimal | ❌ Heavy |
| Redis Integration | ✅ Native | Requires broker |
| FastAPI Compatible | ✅ Perfect | ⚠️ Workable |

**Decision**: Arq is purpose-built for async Python and integrates seamlessly with FastAPI.

## Setup

### Installation

```bash
pip install arq redis
```

### Redis Configuration

```python
# backend/app/config.py

class Settings(BaseSettings):
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None
```

## Worker Implementation

### Worker Definition

```python
# backend/app/workers/audio_processor.py

from arq import cron
from app.services.transcription import TranscriptionService
from app.services.semantic_analyzer import SemanticAnalyzer

async def process_audio_task(
    ctx: dict,
    audio_path: Optional[str],
    text: Optional[str],
    user_id: str,
    session_id: str,
    timestamp: str
) -> dict:
    """
    Main worker task for audio/text processing.

    This runs asynchronously in a worker process.
    """

    if audio_path:
        # Transcribe audio
        transcription_service = ctx.get('transcription_service')
        result = transcription_service.transcribe(audio_path)
        text = result.text

    # Semantic analysis
    analyzer = ctx.get('semantic_analyzer')
    emotion = await analyzer.analyze(text)

    # PII scrubbing
    scrubber = ctx.get('pii_scrubber')
    sanitized = scrubber.scrub(text)

    # Store in Observer
    observer = ctx.get('observer_client')
    await observer.record_state(user_id, session_id, sanitized, emotion.vac.dict())

    return {
        "status": "success",
        "emotion": emotion.dict()
    }

class WorkerSettings:
    """Arq worker configuration"""

    functions = [process_audio_task]
    redis_settings = RedisSettings(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        database=settings.REDIS_DB
    )

    async def on_startup(ctx):
        """Initialize services once per worker"""
        ctx['transcription_service'] = TranscriptionService()
        ctx['semantic_analyzer'] = SemanticAnalyzer()
        ctx['pii_scrubber'] = PIIScrubber()
        ctx['observer_client'] = ObserverClient()
```

### Running Workers

```bash
# Start worker process
arq app.workers.audio_processor.WorkerSettings

# Multiple workers for scaling
arq app.workers.audio_processor.WorkerSettings --workers 4
```

## Job Management

### Enqueuing Jobs

```python
from arq import create_pool
from arq.connections import RedisSettings

async def enqueue_audio_job(audio_path: str, user_id: str):
    """Enqueue job from API handler"""

    redis = await create_pool(
        RedisSettings(host=settings.REDIS_HOST)
    )

    job = await redis.enqueue_job(
        'process_audio_task',
        audio_path=audio_path,
        text=None,
        user_id=user_id,
        session_id=session_id,
        timestamp=timestamp
    )

    return job.job_id
```

### Checking Status

```python
async def get_job_status(job_id: str):
    """Check job status"""

    redis = await create_pool()
    job = await redis.get_job(job_id)

    if job is None:
        return {"status": "not_found"}

    return {
        "status": job.status,  # 'queued', 'in_progress', 'complete', 'failed'
        "result": job.result
    }
```

## Next Steps

- **09-setup-and-installation.md** - Development environment
- **10-deployment.md** - Production deployment
- **11-testing-strategy.md** - Testing approach
