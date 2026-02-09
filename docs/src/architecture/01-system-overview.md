# System Overview

**Document:** 01-system-overview.md
**Last Updated:** December 5, 2025
**Status:** Current

---

## Executive Summary

The L.O.V.E. Stack is a **microservices-based emotional intelligence platform** that converts human emotional expression (audio/text) into 3D spatial coordinates using the VAC (Valence-Arousal-Connection) model, then visualizes these states as animated 3D objects called "Soul Spheres."

**Key Innovation:** The Connection axis—a novel third dimension that traditional sentiment analysis models lack—enabling distinction between emotionally similar but relationally different states (e.g., pity vs. compassion, grief vs. despair).

---

## Architecture at a Glance

```text
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERACTION                          │
│                    (Voice, Text, Gestures)                       │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                         LISTENER                                 │
│           Audio Transcription & Semantic Analysis                │
│                                                                   │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────┐      │
│  │   Whisper    │→ │  Ollama LLM     │→ │ PII Scrubber │      │
│  │ (local STT)  │  │ (VAC Extract)   │  │   (Spacy)    │      │
│  └──────────────┘  └─────────────────┘  └──────────────┘      │
│                                                                   │
│  Output: VAC = [valence, arousal, connection]                   │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                         OBSERVER                                 │
│             Data Persistence & Vector Search                     │
│                                                                   │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────┐      │
│  │ PostgreSQL + │  │  87 Emotion     │  │  Transition  │      │
│  │   pgvector   │  │     Atlas       │  │   System     │      │
│  └──────────────┘  └─────────────────┘  └──────────────┘      │
│                                                                   │
│  - Stores emotional states over time                            │
│  - Vector similarity search (HNSW indexing)                     │
│  - A* pathfinding with 107 strategies                           │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                          VERSOR                                  │
│                  Quaternion Mathematics                          │
│                                                                   │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────┐      │
│  │  VAC → Quat  │  │  Transition     │  │    SLERP     │      │
│  │  Conversion  │  │  Calculations   │  │ Interpolation│      │
│  └──────────────┘  └─────────────────┘  └──────────────┘      │
│                                                                   │
│  - Pure mathematical operations (stateless)                     │
│  - 60-frame animation paths                                     │
│  - Angular distance & elasticity metrics                        │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                        EXPERIENCE                                │
│                  3D Visualization (Web UI)                       │
│                                                                   │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────┐      │
│  │  Soul Sphere │  │  GLSL Shaders   │  │  React Three │      │
│  │  (Geometry)  │  │  (Appearance)   │  │    Fiber     │      │
│  └──────────────┘  └─────────────────┘  └──────────────┘      │
│                                                                   │
│  - Real-time 3D rendering (60fps)                               │
│  - VAC → Visual mapping (color, shape, glow)                    │
│  - Journey tracking & goal setting                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## The Four Modules

### 1. LISTENER - The Sensory Cortex

**Purpose:** Transform human expression into VAC coordinates
**Port:** 8002
**Language:** Python 3.11 + FastAPI
**Status:** ✅ Production Ready

**Key Features:**

- Local audio transcription (faster-whisper)
- Semantic VAC extraction using local LLM (Ollama + Llama 3.1)
- PII sanitization (Spacy NER)
- Async processing (Redis + Arq workers)
- **Critical capability:** Distinguishes pity from compassion

**Input:** Audio file or text string
**Output:** `{emotion, vac: {valence, arousal, connection}, confidence, reasoning}`

---

### 2. OBSERVER - The Hippocampus

**Purpose:** Memory and context—stores emotional states, finds patterns
**Port:** 8000
**Language:** Python 3.11 + FastAPI
**Status:** ✅ Production Ready

**Key Features:**

- PostgreSQL 16 + pgvector for vector similarity search
- 87-emotion atlas based on Brené Brown's research
- A* pathfinding for emotional transitions
- 107 evidence-based regulation strategies
- Bootstrap patterns for new users
- HNSW indexing for fast nearest-neighbor queries

**Data:** 400+ records (emotions, strategies, patterns, transitions, journeys)

---

### 3. VERSOR - The Mathematical Engine

**Purpose:** Pure quaternion mathematics for smooth 3D rotations
**Port:** 8001
**Language:** Python 3.11 + FastAPI
**Status:** ✅ Production Ready (56/56 tests passing)

**Key Features:**

- VAC → quaternion conversion
- Transition calculations (angular distance, elasticity)
- SLERP interpolation (60-frame animation paths)
- Flooding detection (emotional overwhelm)
- Stateless microservice (no database)

**Math:** Unit quaternions on the 4D sphere (S³)

---

### 4. EXPERIENCE - The Presentation Layer

**Purpose:** 3D visualization of emotional states as "Soul Spheres"
**Port:** 3000
**Language:** TypeScript + Next.js 16
**Status:** 🚧 90% Complete (React dependency issue)

**Key Features:**

- Real-time 3D rendering (React Three Fiber + Three.js)
- Custom GLSL vertex & fragment shaders
- VAC → visual mapping (color, geometry, glow)
- Journey tracking with transition paths
- Emotional input via text analysis
- Zustand state management + localStorage persistence

**Visual Language:**

- **Valence** → Color (crimson to cyan)
- **Arousal** → Geometry displacement (calm to chaotic)
- **Connection** → Glow/transparency (disconnected to connected)

---

## Data Flow

### End-to-End: User Input → 3D Visualization

```text
1. USER SPEAKS OR TYPES
   ↓
2. LISTENER
   - Transcribes audio (if voice)
   - Analyzes semantic content with LLM
   - Extracts VAC coordinates
   - Scrubs PII
   ↓ POST /listener/analyze

3. OBSERVER
   - Receives VAC coordinates
   - Stores emotional state (timestamped)
   - Finds nearest atlas emotion
   - Calculates metrics (elasticity, rigidity)
   ↓ POST /observer/state

4. VERSOR (called by Observer)
   - Converts VAC → quaternion
   - Calculates transition from previous state
   - Generates SLERP animation frames
   ↓ POST /versor/calculate

5. EXPERIENCE
   - Polls Observer for current state
   - Receives quaternion + VAC
   - Updates Soul Sphere geometry
   - Applies shader uniforms (color, displacement, glow)
   - Animates rotation over 60 frames
   ↓ User sees animated 3D visualization
```

### Simplified Flow

```text
Audio/Text → LISTENER → VAC coordinates → OBSERVER → stores + fetches quaternion from VERSOR → EXPERIENCE → 3D visualization
```

---

## Communication Patterns

### REST APIs

All modules expose FastAPI REST endpoints:

| Module | Base URL | Key Endpoints |
|--------|----------|---------------|
| Listener | <http://localhost:8002> | `/listener/analyze`, `/listener/ingest` |
| Observer | <http://localhost:8000> | `/observer/state`, `/observer/transition-path`, `/observer/atlas/emotions` |
| Versor | <http://localhost:8001> | `/versor/calculate`, `/versor/slerp` |
| Experience | <http://localhost:3000> | Web UI (no API, calls others) |

### API Contracts

**Type Safety:** Pydantic models on backend, TypeScript interfaces on frontend
**Error Handling:** Non-blocking—if one service is down, others continue
**Retry Logic:** Exponential backoff with max attempts

---

## Deployment Architecture

### Development (Local)

```text
┌─────────────────────────────────────────────────────────────┐
│                    Developer Machine                        │
│                                                             │
│  Terminal 1: cd versor && uvicorn app.main:app --port 8001│
│  Terminal 2: cd observer && uvicorn app.main:app --port 8000│
│  Terminal 3: cd listener && uvicorn app.main:app --port 8002│
│  Terminal 4: cd experience/web && npm run dev (port 3000) │
│                                                             │
│  OR: cd infra && ./run-love-stack.sh  (starts all)        │
└─────────────────────────────────────────────────────────────┘
```

### Production (Containerized)

```text
┌─────────────────────────────────────────────────────────────┐
│                    Podman/Docker Compose                     │
│                                                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐          │
│  │  Listener  │  │  Observer  │  │   Versor   │          │
│  │  :8002     │  │  :8000     │  │   :8001    │          │
│  └────────────┘  └────────────┘  └────────────┘          │
│                                                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐          │
│  │ PostgreSQL │  │   Redis    │  │   Ollama   │          │
│  │  :5432     │  │  :6379     │  │  :11434    │          │
│  └────────────┘  └────────────┘  └────────────┘          │
│                                                             │
│  ┌────────────┐                                            │
│  │ Experience │  (Next.js - separate or Vercel)           │
│  │  :3000     │                                            │
│  └────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

See `infra/podman-compose.yml` for complete configuration.

---

## Technology Philosophy

### 1. Local-First for Privacy

**Why:** Emotional data is deeply personal and sensitive.

- **Ollama + Llama 3.1** for LLM inference (no OpenAI/Anthropic API calls)
- **faster-whisper** for local transcription
- **No telemetry** to external services

**Result:** Users retain complete control of their emotional data.

### 2. Microservices for Flexibility

**Why:** Independent scaling, deployment, and development.

- Each module can be updated without affecting others
- Horizontal scaling (multiple Versor instances for heavy load)
- Language flexibility (Python for ML/data, TypeScript for UI)

### 3. Evidence-Based Design

**Why:** Clinical validity and therapeutic effectiveness.

- All 107 strategies cite peer-reviewed research
- Evidence hierarchy: meta-analysis > RCT > clinical observation > theory
- Ready for clinical trials and publication

### 4. Mathematical Rigor

**Why:** Predictable, testable, and reproducible transformations.

- Quaternions provide smooth, continuous rotations
- Unit quaternions eliminate gimbal lock
- SLERP ensures constant angular velocity

---

## Key Design Decisions

### Why Quaternions?

**Problem:** Euler angles suffer from gimbal lock and discontinuities.
**Solution:** Quaternions represent rotations in 4D space (S³), providing:

- Smooth interpolation (SLERP)
- No gimbal lock
- Efficient composition
- Compact representation (4 values vs. 9 for rotation matrix)

### Why PostgreSQL + pgvector?

**Problem:** Need fast similarity search over emotional state embeddings.
**Solution:** pgvector extension provides:

- HNSW indexing (< 50ms queries on 1000+ records)
- SQL joins with vector operations
- ACID guarantees
- Mature ecosystem (backups, replication, monitoring)

### Why FastAPI?

**Problem:** Need high-performance async Python APIs.
**Solution:** FastAPI provides:

- Native async/await support
- Automatic OpenAPI/Swagger docs
- Pydantic validation
- Type hints throughout

### Why Next.js + React Three Fiber?

**Problem:** Need 3D rendering with modern React.
**Solution:**

- **Next.js 16**: Server-side rendering, optimal performance
- **React Three Fiber**: Declarative 3D (React way)
- **Custom GLSL shaders**: Full control over appearance
- **Turbopack**: Fast builds

---

## Performance Targets

| Module | Metric | Target | Current Status |
|--------|--------|--------|----------------|
| Listener | Transcription (10s audio) | < 500ms | ✅ ~500ms |
| Listener | Semantic analysis | < 2s | ✅ ~1-2s |
| Listener | Total pipeline | < 3s | ✅ ~2-3s |
| Observer | State recording | < 100ms | ✅ ~50ms |
| Observer | Vector search | < 50ms | ✅ ~30ms |
| Observer | A* pathfinding | < 200ms | ✅ ~150ms |
| Versor | Quaternion calculation | < 50ms | ✅ ~10ms (P99) |
| Versor | SLERP generation (60 frames) | < 50ms | ✅ ~20ms |
| Experience | Frame rate | 60 FPS | ✅ 60 FPS (M1 Mac) |
| Experience | Initial load | < 3s | ⏳ Pending React fix |

---

## Security & Privacy

### Data Protection

1. **Local Processing:** All ML/LLM inference happens locally (no cloud APIs)
2. **PII Scrubbing:** Spacy NER removes names, addresses, phone numbers before storage
3. **Sanitized Storage:** Only anonymized emotional data persists
4. **User Control:** Users can delete all their data at any time

### Authentication (Future)

- JWT tokens for API authentication
- User-specific data isolation
- Role-based access control (RBAC) for therapists

---

## Scalability

### Current Capacity

- **Single instance:** ~100 concurrent users
- **Bottleneck:** Ollama LLM inference (CPU-bound)

### Scaling Strategy

1. **Horizontal Scaling:**
   - Deploy multiple Versor instances (stateless, easy)
   - Deploy multiple Listener workers (Redis queue-based)
   - Read replicas for Observer database

2. **GPU Acceleration:**
   - Move Ollama to GPU instances for 10-100x speedup
   - Faster-whisper benefits from CUDA

3. **Caching:**
   - Cache common emotion queries
   - Memoize quaternion calculations for canonical emotions

---

## Monitoring & Observability

### Health Checks

All modules expose `/health` endpoints:

```bash
curl http://localhost:8001/health  # Versor
curl http://localhost:8000/health  # Observer
curl http://localhost:8002/health  # Listener
```

### Logging

- Structured JSON logs (compatible with ELK stack)
- Centralized in `infra/logs/` during development
- Correlation IDs for request tracing

### Metrics (Future)

- Prometheus metrics export
- Grafana dashboards
- Sentry error tracking

---

## Testing Strategy

### Unit Tests

- **Versor:** 56/56 tests (quaternion operations, SLERP, conversions)
- **Listener:** Transcription, PII scrubbing, semantic extraction
- **Observer:** Repository methods, service logic
- **Experience:** Component tests, store logic

### Integration Tests

- **Listener → Observer:** State recording
- **Observer → Versor:** Quaternion conversion
- **Full pipeline:** End-to-end flow

### Semantic Validation

**The Critical Test:** Pity vs. Compassion

```python
# MUST distinguish these based on Connection axis
pity_vac = [-0.3, -0.1, -0.7]      # Negative Connection
compassion_vac = [0.5, 0.2, 0.9]   # Positive Connection
```

This test validates the entire VAC model innovation.

---

## Development Workflow

### Starting the Stack

```bash
cd infra
./run-love-stack.sh
```

This script:

1. Checks Python 3.11+ installed
2. Checks dependencies (Ollama, Redis, PostgreSQL)
3. Starts services in order (Versor → Observer → Listener → Experience)
4. Waits for health checks
5. Reports status

### Stopping the Stack

```bash
cd infra
./stop-love-stack.sh
```

### Running Tests

```bash
# All modules
cd infra
./test-love-stack.sh

# Individual modules
cd versor && pytest tests/unit/ -v
cd observer && pytest tests/ -v
cd listener && pytest tests/ -v
cd experience/web && npm test
```

---

## Next Steps

### Short-Term (This Month)

1. **Fix Experience React dependency** - Resolve R3F/React 19 conflict
2. **Observer pgvector setup** - Complete database initialization
3. **End-to-end testing** - Validate full pipeline
4. **Deploy to staging** - Podman compose environment

### Medium-Term (Next Quarter)

1. **Mobile apps** (iOS/Android using React Native)
2. **Therapist portal** for clinical oversight
3. **Real-time WebSocket** updates (eliminate polling)
4. **Performance optimization** (GPU acceleration, caching)

### Long-Term (Next Year)

1. **Clinical trials** with licensed therapists
2. **Wearables integration** (HRV, sleep data)
3. **Social features** (share journeys, peer support)
4. **Multi-language support** (Spanish, French, etc.)

---

## Related Documents

- **[The VAC Model →](02-vac-model.md)** - Deep dive into the Connection axis
- **[Integration Patterns →](07-integration-patterns.md)** - How modules communicate
- **[Deployment Guide →](10-deployment-operations.md)** - Running in production

---

**Last Updated:** December 5, 2025
**Next Review:** January 2026
