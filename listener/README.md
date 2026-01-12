# Listener Module

**The Sensory Cortex of Project L.O.V.E.**

## Overview

The Listener Module is the first point of contact between human expression and the L.O.V.E. Stack's emotional intelligence system. It transforms voice and text into the three-dimensional VAC (Valence-Arousal-Connection) model using a fully **local-first architecture**.

## Key Features

- **🎤 Audio Transcription**: Local Whisper model (faster-whisper) - no API keys needed
- **🧠 Semantic VAC Extraction**: Local LLM (Ollama + Llama 3.1) - complete privacy
- **🔐 PII Sanitization**: Automatic removal of personal information (Spacy NER)
- **⚡ Async Processing**: Redis + Arq for non-blocking operations
- **🎯 Connection Axis**: Novel dimension not found in standard sentiment analysis

## The Connection Challenge

Standard sentiment models output Valence (positive/negative) and Arousal (energy), but miss the **Connection axis** - the most psychologically significant dimension:

- **Pity**: "I feel sorry for them" → Connection = -0.7 (separation)
- **Compassion**: "I feel with them" → Connection = +0.9 (alignment)

The Listener uses carefully crafted prompts to teach the LLM this distinction.

## Architecture

```
Audio/Text Input
      ↓
┌─────────────────────────┐
│  Transcription Service  │  faster-whisper (local)
│  ├─ base.en (74MB)      │
│  └─ <500ms latency      │
└──────────┬──────────────┘
           ↓
┌─────────────────────────┐
│  Semantic Analyzer      │  Ollama + Llama 3.1 (local)
│  ├─ VAC Extraction      │
│  ├─ Atlas Mapping       │
│  └─ ~1-2s latency       │
└──────────┬──────────────┘
           ↓
┌─────────────────────────┐
│  PII Scrubber           │  Spacy NER
│  └─ Privacy protection  │
└──────────┬──────────────┘
           ↓
┌─────────────────────────┐
│  Observer Integration   │  Store emotional state
│  └─ PostgreSQL + Vector │
└─────────────────────────┘
```

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Transcription** | faster-whisper | Local speech-to-text |
| **LLM** | Ollama (Llama 3.1 8B) | Local semantic analysis |
| **Task Queue** | Redis + Arq | Async job processing |
| **NER** | Spacy | PII detection |
| **API** | FastAPI | REST endpoints |
| **Validation** | Pydantic | Type-safe schemas |

## Quick Start

### Prerequisites

```bash
# Install system dependencies
brew install ollama redis ffmpeg  # macOS
# or
sudo apt install redis-server ffmpeg  # Linux

# Start services
ollama serve &
redis-server &

# Pull LLM model
ollama pull llama3.1:8b-instruct-q4_0
```

### Installation

```bash
cd listener
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

### Run

```bash
# Terminal 1: API Server
uvicorn app.main:app --reload --port 8002

# Terminal 2: Worker
arq app.workers.audio_processor.WorkerSettings
```

See **[SETUP.md](./SETUP.md)** for detailed installation instructions.

## API Endpoints

### POST /listener/ingest

Ingest audio or text for processing.

**Request**:
```bash
curl -X POST http://localhost:8002/listener/ingest \
  -F "audio=@recording.wav" \
  -F "user_id=uuid" \
  -F "session_id=uuid"
```

**Response**:
```json
{
  "status": "queued",
  "job_id": "job_abc123",
  "estimated_wait_seconds": 2.5
}
```

### GET /listener/status/{job_id}

Check processing status.

**Response**:
```json
{
  "status": "complete",
  "result": {
    "transcription": "I'm feeling overwhelmed by everything...",
    "emotion": {
      "primary_emotion": "Overwhelm",
      "category": "Places We Go When Things Are Uncertain",
      "vac": {
        "valence": -0.6,
        "arousal": 0.9,
        "connection": -0.3
      },
      "confidence": 0.92
    }
  }
}
```

## Testing

### Run All Tests

```bash
pytest tests/ -v
```

### The Critical Test

The most important test in the system validates the Connection axis:

```bash
pytest tests/semantic/test_connection_axis.py::test_pity_vs_compassion -v
```

**This test MUST pass** - it proves the system can distinguish:
- **Pity** (feeling FOR, separation) → Connection < 0
- **Compassion** (feeling WITH, alignment) → Connection > 0.5

### Test Categories

```bash
pytest -m unit          # Unit tests
pytest -m semantic      # Semantic validation (Connection axis)
pytest -m integration   # End-to-end pipeline
```

## Performance

### Expected Latencies (base.en model, M1 Mac)

| Component | Latency |
|-----------|---------|
| Transcription (10s audio) | ~500ms |
| Semantic Analysis | ~1-2s |
| PII Scrubbing | ~50ms |
| **Total Pipeline** | **~2-3s** ✅ |

Target: <3s for complete pipeline

## Project Structure

```
listener/
├── app/
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration management
│   ├── api/
│   │   └── routes/          # API endpoints
│   ├── services/
│   │   ├── transcription.py    # faster-whisper
│   │   ├── semantic_analyzer.py # Ollama + LangChain
│   │   ├── pii_scrubber.py     # Spacy NER
│   │   └── observer_client.py  # Observer API
│   ├── workers/
│   │   └── audio_processor.py  # Arq worker
│   ├── models/
│   │   └── vac_response.py     # Pydantic schemas
│   └── utils/
│       └── audio_utils.py      # Audio processing
├── tests/
│   ├── unit/
│   ├── semantic/          # THE CRITICAL TESTS
│   └── integration/
└── docs/                  # Detailed documentation
```

## Integration with L.O.V.E. Stack

```
User speaks/types
      ↓
┌─────────────┐
│  LISTENER   │  ← You are here
└──────┬──────┘
       ↓ (VAC scalars)
┌─────────────┐
│  OBSERVER   │  Store emotional state
└──────┬──────┘
       ↓ (Request quaternion)
┌─────────────┐
│  VERSOR     │  VAC → Quaternion
└──────┬──────┘
       ↓ (Animate rotation)
┌─────────────┐
│ EXPERIENCE  │  Soul Sphere visualization
└─────────────┘
```

## Development Status

- [x] Day 1: Project setup and structure
- [ ] Day 2: Transcription service
- [ ] Day 3: Semantic analysis with LLM
- [ ] Day 4: **Critical semantic testing** (Pity vs. Compassion)
- [ ] Day 5: Observer integration + PII sanitization
- [ ] Day 6: Redis + Arq async queue
- [ ] Day 7: FastAPI endpoints
- [ ] Day 8: Integration testing

## Key Concepts

### VAC Model

- **Valence**: Pleasure (+1) to Displeasure (-1)
- **Arousal**: High Energy (+1) to Low Energy/Calm (-1)
- **Connection**: Alignment (+1) to Separation (-1)

### Atlas of the Heart

87 emotions across 13 categories (Brené Brown's taxonomy):
- Places We Go When Life Is Good
- Places We Go When Things Are Uncertain
- Places We Go With Others
- ...and 10 more

### Connection Axis Examples

| Emotion | Valence | Arousal | Connection | Key Difference |
|---------|---------|---------|------------|----------------|
| Pity | -0.3 | -0.1 | **-0.7** | "FOR them" (separation) |
| Compassion | 0.5 | 0.2 | **+0.9** | "WITH them" (alignment) |
| Grief | -0.8 | -0.3 | **+0.7** | Love persists despite pain |
| Anguish | -0.9 | 0.8 | **-0.5** | Isolated suffering |

## Documentation

- **[SETUP.md](./SETUP.md)** - Installation and configuration
- **[docs/00-overview.md](./docs/00-overview.md)** - Architecture overview
- **[docs/04-semantic-analysis.md](./docs/04-semantic-analysis.md)** - LLM integration details
- **[docs/11-testing-strategy.md](./docs/11-testing-strategy.md)** - Testing approach

## Contributing

This module is part of the L.O.V.E. Stack. See the main project README for contribution guidelines.

## License

See LICENSE in the root project directory.

---

**Remember**: The Listener doesn't just transcribe—it **translates** the ineffable complexity of human feeling into the mathematical language that powers the Soul Sphere's dance through emotional space.
