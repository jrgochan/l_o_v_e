# Observer Module - L.O.V.E. Project

> **The Memory & Contextual Core** - Stores emotional trajectories and provides insights through vector similarity search.

## 🎯 Overview

The Observer module is the "hippocampus" of the L.O.V.E. stack:
- **Persists** emotional states over time (PostgreSQL + pgvector)
- **Finds patterns** through semantic similarity search
- **Calculates metrics** like elasticity (velocity) and rigidity (resistance to change)
- **Provides context** to other modules (Versor for math, Experience for visualization)

### Key Features

✅ **87 Emotions Digital Atlas** - From Brené Brown's "Atlas of the Heart"
✅ **VAC Model** - Valence, Arousal, **Connection** (replaces Dominance in traditional VAD)
✅ **Vector Search** - pgvector with HNSW indexing for fast similarity queries
✅ **Local Embeddings** - sentence-transformers (no API keys needed)
✅ **Versor Integration** - HTTP API calls for quaternion calculations
✅ **Async Architecture** - SQLAlchemy 2.0 with asyncpg for high performance

---

## 📋 Current Status

### ✅ Completed (Phase 1 & 2)

- [x] Complete project structure
- [x] Configuration management (Pydantic Settings)
- [x] Database models (AtlasDefinition, UserTrajectory)
- [x] Alembic migrations setup
- [x] Podman/Docker configuration
- [x] Development environment ready

### 🚧 In Progress (Next Steps)

- [ ] Embedding service (local + OpenAI)
- [ ] Core services (QuaternionBuilder, EmotionMapper, MetricsCalculator)
- [ ] FastAPI routes and schemas
- [ ] Atlas seeding script (87 emotions)
- [ ] Test data generation
- [ ] Unit and integration tests

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+** (REQUIRED - see `/PYTHON_VERSION` for project standard)
- Podman (or Docker)
- PostgreSQL 16 with pgvector (provided via container)

⚠️ **Important:** This project standardizes on Python 3.11. Using Python 3.9 or 3.10 will cause dependency incompatibilities (particularly with torch/sentence-transformers).

### 1. Clone and Setup

```bash
cd observer

# Copy environment config
cp .env.example .env

# Edit .env if needed (defaults work for development)
nano .env
```

### 2. Start with Podman

```bash
# Start PostgreSQL with pgvector
podman-compose up -d postgres

# Wait for database to be ready (health check)
podman-compose ps

# Create Python virtual environment
python3.11 -m venv venv
source venv/bin/activate  # On macOS/Linux

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Run Database Migrations

```bash
# Generate initial migration
alembic revision --autogenerate -m "Initial schema"

# Apply migrations
alembic upgrade head

# Verify tables created
podman exec -it observer_postgres psql -U love_user -d love_db -c "\dt"
```

### 4. Seed the Atlas (Coming Soon)

```bash
# This will populate the 87 emotions
python scripts/seed_atlas.py
```

### 5. Start the API

```bash
# Development server with hot-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or use Podman (builds container)
podman-compose up observer
```

### 6. Verify Installation

```bash
# Health check
curl http://localhost:8000/health

# Expected response:
# {
#   "status": "healthy",
#   "database": "connected",
#   "pgvector_version": "0.6.0",
#   "atlas_emotions_count": 87
# }
```

---

## 🏗️ Architecture

### Directory Structure

```
observer/
├── app/
│   ├── api/              # FastAPI routes and schemas
│   ├── models/           # SQLAlchemy ORM models
│   ├── repositories/     # Data access layer
│   ├── services/         # Business logic
│   ├── utils/            # Helper functions
│   ├── config.py         # Configuration management
│   └── database.py       # Database connection
├── migrations/           # Alembic database migrations
├── scripts/              # Utility scripts (seeding, testing)
├── tests/
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   └── semantic/        # Semantic validation tests
├── docker-compose.yml    # Podman/Docker orchestration
├── Containerfile         # Container image definition
└── requirements.txt      # Python dependencies
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **API Framework** | FastAPI | Async REST API with auto-docs |
| **Database** | PostgreSQL 16 | ACID compliance, JSON support |
| **Vector Search** | pgvector 0.6+ | HNSW indexing for similarity |
| **ORM** | SQLAlchemy 2.0 | Async database operations |
| **Migrations** | Alembic | Version-controlled schema |
| **Embeddings** | sentence-transformers | Local semantic embeddings |
| **Validation** | Pydantic | Schema enforcement |

---

## 🔗 Versor Integration

The Observer calls the Versor API for quaternion calculations:

### Option A: HTTP API (Current Default)

```python
# Observer calls Versor via HTTP
import httpx

async with httpx.AsyncClient() as client:
    response = await client.post(
        f"{settings.VERSOR_URL}/versor/calculate",
        json={
            "vac": {"valence": 0.9, "arousal": 0.7, "connection": 0.8}
        }
    )
    quaternion = response.json()["quaternion"]
```

**Prerequisites**:
- Versor must be running on `localhost:8001`
- Start Versor first: `cd ../versor && uvicorn app.main:app --port 8001`

### Option B: Python Import (Faster, Tightly Coupled)

```python
# Direct import (requires Versor in PYTHONPATH)
from versor.app.core.vac_model import VACVector

vac = VACVector(valence=0.9, arousal=0.7, connection=0.8)
quaternion = vac.to_quaternion()
```

**Trade-offs**:
- ✅ Faster (no network latency)
- ❌ Tightly coupled (Versor must be installed)
- ❌ Less flexible for microservices architecture

---

## 📊 Database Schema

### atlas_definitions

Stores the 87 canonical emotions:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `emotion_name` | VARCHAR(100) | "Joy", "Shame", "Compassion", etc. |
| `category` | VARCHAR(100) | One of 13 categories |
| `definition` | TEXT | Lexicographical definition |
| `vac_vector` | VECTOR(3) | [Valence, Arousal, Connection] |
| `q_constant` | VECTOR(4) | Pre-calculated quaternion [w,x,y,z] |
| `semantic_embedding` | VECTOR(384) | Embedding for similarity search |
| `haptic_pattern_id` | VARCHAR(50) | Reference to vibration pattern |

### user_trajectory

Logs user's emotional journey (high-volume):

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | User reference |
| `session_id` | UUID | Session grouping |
| `timestamp` | TIMESTAMPTZ | Moment of state |
| `input_transcription` | TEXT | Sanitized input text |
| `input_embedding` | VECTOR(384) | Semantic embedding |
| `vac_values` | VECTOR(3) | Computed VAC |
| `quaternion_state` | VECTOR(4) | Quaternion representation |
| `dominant_emotion_id` | UUID | FK to atlas_definitions |
| `elasticity_metric` | FLOAT | Speed of change (E = θ / Δt) |
| `rigidity_score` | FLOAT | Resistance to change |
| `metadata` | JSONB | Flexible context tags |

**Indexes**:
- B-tree: `user_id`, `timestamp`, `session_id`
- HNSW: `input_embedding` (vector similarity search)

---

## 🧪 Testing Strategy

### Unit Tests

```bash
# Run all unit tests
pytest tests/unit/ -v

# With coverage
pytest tests/unit/ --cov=app --cov-report=html
```

### Integration Tests

```bash
# Requires running database
pytest tests/integration/ -v
```

### Semantic Validation Tests

**The Critical Test**: Compassion vs. Pity

```python
# tests/semantic/test_compassion_pity.py

def test_compassion_pity_distinction():
    """
    Compassion and Pity must be distinguished by Connection axis.
    This is THE validation test for the Observer.
    """
    compassion_vac = [0.5, 0.2, 0.9]   # Positive Connection
    pity_vac = [-0.3, -0.1, -0.7]      # Negative Connection

    compassion_emotion = find_nearest_emotion(compassion_vac)
    pity_emotion = find_nearest_emotion(pity_vac)

    assert compassion_emotion.emotion_name == "Compassion"
    assert pity_emotion.emotion_name == "Pity"
```

---

## 📝 Configuration

All settings are managed via environment variables (`.env` file):

```bash
# Database
POSTGRES_USER=love_user
POSTGRES_PASSWORD=love_password
POSTGRES_DB=love_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Embedding Provider ("local" or "openai")
EMBEDDING_PROVIDER=local
EMBEDDING_MODEL=all-MiniLM-L6-v2

# External Services
VERSOR_URL=http://localhost:8001

# Performance
HNSW_EF_SEARCH=40
DB_POOL_SIZE=20

# Development
DEBUG=true
LOG_LEVEL=DEBUG
```

See `.env.example` for full configuration options.

---

## 🐛 Troubleshooting

### Issue: pgvector extension not found

```bash
# Verify pgvector in container
podman exec -it observer_postgres psql -U love_user -d love_db

# In psql:
CREATE EXTENSION IF NOT EXISTS vector;
\dx  # List extensions
```

### Issue: Alembic can't import app.models

```bash
# Ensure you're in the observer directory
cd /path/to/observer

# Ensure venv is activated
source venv/bin/activate

# Verify PYTHONPATH
python -c "from app.models import AtlasDefinition; print('OK')"
```

### Issue: Versor API connection refused

```bash
# Start Versor first
cd ../versor
source venv/bin/activate
uvicorn app.main:app --port 8001

# Verify it's running
curl http://localhost:8001/health
```

---

## 📚 Documentation

For detailed documentation, see the `docs/` directory:

- [00-overview.md](docs/00-overview.md) - High-level architecture
- [01-architecture.md](docs/01-architecture.md) - Service layer design
- [02-database-schema.md](docs/02-database-schema.md) - Complete schema details
- [03-vac-model-and-emotions.md](docs/03-vac-model-and-emotions.md) - The 87 emotions
- [04-vector-search.md](docs/04-vector-search.md) - pgvector and HNSW
- [05-api-specification.md](docs/05-api-specification.md) - REST API endpoints
- [09-setup-and-installation.md](docs/09-setup-and-installation.md) - Detailed setup guide

---

## 🎯 Next Steps

1. **Complete Service Layer**
   - Embedding service (local + OpenAI)
   - Quaternion builder (Versor integration)
   - Emotion mapper (weighted fusion)
   - Metrics calculator (elasticity/rigidity)

2. **Build API Layer**
   - Pydantic schemas
   - FastAPI routes
   - Dependency injection
   - Error handling

3. **Seed the Atlas**
   - 87 emotions data
   - Generate embeddings
   - Calculate quaternions
   - Bulk insert

4. **Testing**
   - Unit tests for services
   - Integration tests for API
   - Semantic validation tests
   - Performance benchmarks

---

## 🤝 Contributing

This is part of the L.O.V.E. project (Listener-Observer-Versor-Experience).

For questions or issues, refer to the project documentation or the main L.O.V.E. repository.

---

## 📄 License

Part of the L.O.V.E. Project.

---

**Built with ❤️ using FastAPI, PostgreSQL, and pgvector**
