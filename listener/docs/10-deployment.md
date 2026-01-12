# Listener Module - Deployment

## Overview

The Listener requires deploying both **mobile edge components** and **cloud backend services**. This guide covers production deployment strategies.

## Mobile Edge Deployment

### iOS (TestFlight/App Store)

```bash
cd listener/mobile

# Build for iOS
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios
```

### Android (Google Play)

```bash
# Build for Android
eas build --platform android --profile production

# Submit to Google Play
eas submit --platform android
```

## Cloud Backend Deployment

### Docker Configuration

```dockerfile
# Dockerfile

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download Spacy model
RUN python -m spacy download en_core_web_sm

# Copy application
COPY ./app ./app

EXPOSE 8002

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  listener-api:
    build: .
    ports:
      - "8002:8002"
    environment:
      REDIS_HOST: redis
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      OBSERVER_URL: http://observer:8000
    depends_on:
      - redis
  
  listener-worker:
    build: .
    command: arq app.workers.audio_processor.WorkerSettings
    environment:
      REDIS_HOST: redis
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    depends_on:
      - redis
    deploy:
      replicas: 2
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: listener-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: listener-api
  template:
    spec:
      containers:
      - name: listener
        image: your-registry/listener:latest
        ports:
        - containerPort: 8002
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 4Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: listener-worker
spec:
  replicas: 3  # Scale workers for throughput
  selector:
    matchLabels:
      app: listener-worker
  template:
    spec:
      containers:
      - name: worker
        image: your-registry/listener:latest
        command: ["arq", "app.workers.audio_processor.WorkerSettings"]
        resources:
          requests:
            memory: 2Gi
            nvidia.com/gpu: 1  # GPU for faster-whisper
```

## Next Steps

- **11-testing-strategy.md** - Testing approach
- **12-performance-optimization.md** - Edge + cloud latency
- **13-security-and-privacy.md** - GDPR compliance
