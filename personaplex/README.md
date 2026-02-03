# PersonaPlex Voice Service

NVIDIA PersonaPlex integration for the L.O.V.E. stack, providing full-duplex speech-to-speech voice mode with persona-conditioned AI conversations.

## Overview

This service wraps [NVIDIA PersonaPlex](https://github.com/NVIDIA/personaplex) to enable voice mode in the L.O.V.E. stack. It provides:

- **Full-Duplex Voice Conversations**: Real-time, bidirectional speech-to-speech
- **Persona Mapping**: L.O.V.E. personas (Lumina, Logos, Metis) → PersonaPlex voices/prompts
- **WebSocket API**: Voice session management and audio streaming
- **GPU Acceleration**: Optimized for NVIDIA GPUs (CPU fallback available)

## Quick Start

### Prerequisites

- **Python 3.10+**
- **Git**
- **Opus Codec Library**:
  - macOS: `brew install opus`
  - Linux: `sudo apt install libopus-dev`
- **NVIDIA GPU** (recommended): RTX 4080+, A100, H100
  - Minimum 16GB VRAM
  - CUDA 12.1+ toolkit
- **HuggingFace Account**: [Create token](https://huggingface.co/settings/tokens)

### Setup

```bash
# From the root of the l_o_v_e repository
cd personaplex

# Run setup script (clones PersonaPlex, installs dependencies)
./scripts/setup.sh

# Configure HuggingFace token
# Edit .env and add: HF_TOKEN=hf_xxx...
cp .env.example .env
nano .env

# Download PersonaPlex models (~14GB)
./scripts/download_models.sh
```

### Running the Service

```bash
# Activate virtual environment
source .venv/bin/activate

# Start PersonaPlex service
uvicorn app.main:app --host 0.0.0.0 --port 8003 --reload

# Service will be available at:
# - API: http://localhost:8003
# - Docs: http://localhost:8003/docs
# - Health: http://localhost:8003/health
```

## API Endpoints

### Persona Configuration

**GET /personas** - List all available personas
**GET /personas/{persona_id}** - Get specific persona configuration
**GET /voices** - List all available PersonaPlex voices

Example:
```bash
curl http://localhost:8003/personas/lumina
```

Response:
```json
{
  "persona_id": "lumina",
  "voice_id": "NATF2.pt",
  "text_prompt": "You are Lumina, a warm and empathetic presence...",
  "description": "Warm, validation-focused, gentle (Caregiver archetype)",
  "color": "#F59E0B",
  "tone_preference": "warm",
  "deep_feeling_mode": false
}
```

### Health Checks

**GET /health** - Basic health check
**GET /health/ready** - Readiness probe (checks model loading)

## Persona Mapping

The service maps L.O.V.E.'s three core personas to PersonaPlex voice IDs and prompts:

| Persona | Voice | Archetype | Tone |
|---------|-------|-----------|------|
| **Lumina** | NATF2 (Natural Female) | Caregiver/Lover | Warm, empathetic, validating |
| **Logos** | NATM1 (Natural Male) | Sage/Creator | Clinical, analytical, objective |
| **Metis** | VARF3 (Varied Female) | Magician/Explorer | Deep, insightful, multi-dimensional |

## Architecture

```
L.O.V.E. Experience (Web/Native)
    ↓
PersonaPlex Service (FastAPI Wrapper) [Port 8003]
    ↓
NVIDIA PersonaPlex (Moshi Model)
    ↓
Audio Input/Output (WebRTC)
```

The service operates **independently** of the existing text-based chat flow:

- **Text Mode**: Experience → Observer WebSocket → Listener → Ollama
- **Voice Mode**: Experience → PersonaPlex Service → Moshi Model

## Configuration

Edit `.env` to configure the service:

```bash
# HuggingFace Token (required)
HF_TOKEN=hf_xxx...

# Service Configuration
ENVIRONMENT=development
LOG_LEVEL=INFO
PORT=8003

# Enable CPU fallback (slower, ~2-5s latency)
PERSONAPLEX_CPU_OFFLOAD=false

# GPU Selection (0 = first GPU)
CUDA_VISIBLE_DEVICES=0
```

## GPU Requirements

**Minimum Recommended**:
- NVIDIA RTX 4080 (16GB VRAM)
- CUDA 12.1+

**Optimal**:
- NVIDIA A100 / H100
- 40GB+ VRAM for multiple concurrent sessions

**CPU Fallback**:
Set `PERSONAPLEX_CPU_OFFLOAD=true` in `.env`. Note: Response latency will increase to 2-5 seconds.

## Development

### Running Tests

```bash
# TODO: Add tests
pytest tests/
```

### Testing Personas

```bash
# Test Lumina configuration
curl http://localhost:8003/personas/lumina

# Test health check
curl http://localhost:8003/health/ready

# View API docs
open http://localhost:8003/docs
```

## Integration with L.O.V.E. Stack

This service is automatically included when running the full L.O.V.E. stack:

```bash
# From root of l_o_v_e repository
./infra/bin/run-love-stack.sh
```

The orchestration script will:
- Check for `.setup_complete` marker
- Start PersonaPlex on port 8003 if configured
- Skip PersonaPlex if not set up (fallback to text mode only)

## Troubleshooting

### HuggingFace Authentication Error

```
Error: 401 Unauthorized
```

**Solution**:
1. Verify HF_TOKEN in `.env`
2. Accept model license: https://huggingface.co/nvidia/personaplex-7b-v1

### GPU Out of Memory

```
RuntimeError: CUDA out of memory
```

**Solution**:
1. Close other GPU-intensive applications
2. Enable CPU offload: `PERSONAPLEX_CPU_OFFLOAD=true`
3. Restart the service

### Opus Codec Not Found

```
ImportError: opus library not found
```

**Solution**:
```bash
# macOS
brew install opus

# Linux
sudo apt install libopus-dev
```

## Future Enhancements

- [ ] VAC analysis integration (parallel voice + emotion tracking)
- [ ] Voice session recording and transcription export
- [ ] Custom voice fine-tuning
- [ ] Mobile client support

## References

- [NVIDIA PersonaPlex Repository](https://github.com/NVIDIA/personaplex)
- [Moshi Architecture](https://arxiv.org/abs/2410.00037)
- [L.O.V.E. Stack Documentation](../README.md)

---

**Built with 🎙️ for natural, persona-conditioned voice conversations**
