# PersonaPlex Module

**Voice Mode with Persona-Conditioned AI Conversations**

---

## Overview

The **PersonaPlex** module provides full-duplex, speech-to-speech voice mode for the L.O.V.E. stack. It wraps [NVIDIA PersonaPlex](https://github.com/NVIDIA/personaplex) to enable real-time voice conversations with persona-conditioned AI responses.

---

## Quick Facts

- **Status:** 🧪 Alpha / Experimental
- **Language:** Python 3.10+
- **Framework:** FastAPI
- **AI Model:** NVIDIA PersonaPlex (Moshi architecture)
- **Port:** 8003
- **GPU:** NVIDIA RTX 4080+ recommended (CPU fallback available)

---

## Key Features

### 🎙️ Full-Duplex Voice Conversations
Real-time, bidirectional speech-to-speech communication powered by the Moshi model.

### 🎭 Persona Mapping
Three distinct AI personas, each with a unique voice, archetype, and therapeutic style:

| Persona | Voice | Archetype | Tone |
|---------|-------|-----------|------|
| **Lumina** | Natural Female | Caregiver / Lover | Warm, empathetic, validating |
| **Logos** | Natural Male | Sage / Creator | Clinical, analytical, objective |
| **Metis** | Varied Female | Magician / Explorer | Deep, insightful, multi-dimensional |

### 🔌 WebSocket API
Voice session management and real-time audio streaming via WebSocket.

### ⚡ GPU Acceleration
Optimized for NVIDIA GPUs with CPU fallback for development environments.

---

## Architecture

```text
L.O.V.E. Experience (Web)
    ↓
PersonaPlex Service (FastAPI Wrapper) [Port 8003]
    ↓
NVIDIA PersonaPlex (Moshi Model)
    ↓
Audio Input/Output (WebRTC)
```

PersonaPlex operates **independently** of the text-based chat flow:

- **Text Mode**: Experience → Observer → Listener → Ollama
- **Voice Mode**: Experience → PersonaPlex → Moshi Model

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/personas` | GET | List all available personas |
| `/personas/{id}` | GET | Get specific persona config |
| `/voices` | GET | List PersonaPlex voices |
| `/health` | GET | Basic health check |
| `/health/ready` | GET | Readiness probe (model loading) |

---

## Quick Start

```bash
cd personaplex
./scripts/setup.sh
cp .env.example .env  # Add HF_TOKEN
./scripts/download_models.sh

source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8003 --reload
```

---

## Configuration

Key environment variables (`.env`):

| Variable | Purpose |
|----------|---------|
| `HF_TOKEN` | HuggingFace API token (required) |
| `PORT` | Service port (default: 8003) |
| `PERSONAPLEX_CPU_OFFLOAD` | Enable CPU fallback (default: false) |
| `CUDA_VISIBLE_DEVICES` | GPU selection (default: 0) |

---

## Future Enhancements

- VAC analysis integration (parallel voice + emotion tracking)
- Voice session recording and transcription export
- Custom voice fine-tuning
- Mobile client support

---

**Note:** PersonaPlex requires a HuggingFace account and model access approval. See the [PersonaPlex README](https://github.com/jrgochan/l_o_v_e/tree/main/personaplex) for detailed setup instructions.
