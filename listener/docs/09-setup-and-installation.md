# Listener Module - Setup and Installation

## Overview

The Listener has two components: **Edge (mobile)** and **Cloud (backend)**. This guide covers both.

## Edge Component Setup (React Native)

### Prerequisites

- Node.js 18+
- React Native development environment
- Xcode (iOS) or Android Studio (Android)

### Installation

```bash
cd listener/mobile

# Install dependencies
npm install

# Install specific packages
npm install whisper.rn
npm install react-native-audio-recorder-player
npm install react-native-fs

# iOS: Install pods
cd ios && pod install && cd ..
```

### Model Download

```typescript
// Download Whisper model on first launch
import { downloadModel } from 'whisper.rn';

await downloadModel({
  model: 'base.en',
  onProgress: (progress) => console.log(`${progress}%`)
});
```

## Cloud Component Setup (Python)

### Prerequisites

- Python 3.11+
- Redis server
- ffmpeg (for audio normalization)
- CUDA (for GPU acceleration, optional)

### Installation

```bash
cd listener/backend

# Create venv
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

**requirements.txt**:
```text
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-multipart==0.0.6

# Transcription
faster-whisper==0.10.0
ffmpeg-python==0.2.0

# LLM
langchain==0.1.0
langchain-openai==0.0.5
openai==1.10.0

# Task Queue
arq==0.25.0
redis==5.0.1

# NLP
spacy==3.7.2
pydantic==2.5.3

# Testing
pytest==7.4.4
pytest-asyncio==0.23.3
```

### Install Spacy Model

```bash
python -m spacy download en_core_web_sm
```

### Install Redis

```bash
# macOS
brew install redis
brew services start redis

# Linux
sudo apt install redis-server
sudo systemctl start redis
```

### Install ffmpeg

```bash
# macOS
brew install ffmpeg

# Linux
sudo apt install ffmpeg
```

## Configuration

### Environment Variables

```bash
# .env

# OpenAI
OPENAI_API_KEY=sk-...

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Transcription
WHISPER_MODEL=large-v3
WHISPER_DEVICE=cuda  # or 'cpu'

# External Services
OBSERVER_URL=http://localhost:8000
VERSOR_URL=http://localhost:8001
```

## Running the System

### Start Backend API

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8002
```

### Start Workers

```bash
arq app.workers.audio_processor.WorkerSettings
```

### Start Mobile App

```bash
cd listener/mobile
npx expo start
```

## Next Steps

- **10-deployment.md** - Production deployment
- **11-testing-strategy.md** - Testing approach
- **12-performance-optimization.md** - Latency optimization
