# L.O.V.E. Stack

**L**istener-**O**bserver-**V**ersor-**E**xperience: A multi-modal emotional intelligence platform using the VAC (Valence-Arousal-Connection) model with quaternion mathematics for 3D visualization.

## 🏗️ Architecture

This is a multi-repository monorepo structure where each module maintains its own git repository:

```
l_o_v_e/
├── listener/          # Audio transcription & semantic VAC analysis (Python/FastAPI)
├── observer/          # Data persistence & vector search (Python/FastAPI + PostgreSQL + pgvector)
├── versor/            # Quaternion mathematics engine (Python/FastAPI)
├── experience/        # Mobile 3D visualization (React Native + Expo + Three.js)
└── infra/             # Infrastructure orchestration & documentation
```

Each module is an independent git repository with its own:
- Source code and tests
- Dependencies and configuration
- Documentation and setup guides
- CI/CD pipelines

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+** (for Listener, Observer, Versor)
- **Node.js 18+** (for Experience)
- **PostgreSQL 16** with pgvector extension
- **Redis** for task queuing
- **Ollama** for local LLM inference

### Setup

```bash
# Run the complete setup script
cd infra
./setup-love-stack.sh
```

This will:
- ✅ Verify Python 3.11+ installation
- ✅ Check system dependencies
- ✅ Create virtual environments for all Python modules
- ✅ Install dependencies
- ✅ Download the Ollama LLM model
- ✅ Set up configuration files

### Verify Setup

```bash
cd infra
./test-love-stack.sh
```

### Start the Stack

**Option 1: Native (recommended for development)**
```bash
cd infra
./run-love-stack.sh
```

**Option 2: Containerized with Podman**
```bash
cd infra
./run-love-stack-podman.sh
```

### API Endpoints

Once running, access the interactive API documentation:

- **Versor** (Quaternion Math): http://localhost:8001/docs
- **Observer** (Data & Search): http://localhost:8000/docs
- **Listener** (Audio & VAC): http://localhost:8002/docs

## 📦 Modules

### Listener
Audio transcription and semantic analysis using local LLM (Ollama) to extract VAC coordinates from emotional expressions.

**Key Features:**
- Edge transcription (Whisper - optional)
- Semantic VAC analysis using LLM
- PII scrubbing and sanitization
- Async processing with Redis
- Connection axis validation (pity vs. compassion)

[→ Full Documentation](listener/README.md)

### Observer
Data persistence layer with PostgreSQL and pgvector for emotional state storage and vector similarity search.

**Key Features:**
- PostgreSQL 16 + pgvector for vector search
- Emotion atlas with 135+ mapped emotions
- HNSW indexing for fast similarity search
- Quaternion conversion for 3D space
- Historical tracking and metrics

[→ Full Documentation](observer/README.md)

### Versor
Quaternion mathematics engine providing the geometric foundation for the 3D emotional space.

**Key Features:**
- VAC-to-quaternion conversion
- SLERP interpolation for smooth transitions
- Flooding detection (emotional overwhelm)
- High-precision calculations (configurable epsilon)
- Pure mathematical operations (no side effects)

[→ Full Documentation](versor/README.md)

### Experience
React Native mobile application with 3D visualization of emotional states as animated spheres.

**Key Features:**
- Real-time 3D soul sphere rendering
- Custom GLSL shaders for visual effects
- Quaternion-based animations
- Haptic feedback system
- Observer API integration

[→ Full Documentation](experience/README.md)

## 🔧 Infrastructure

The `infra/` directory contains all orchestration scripts, documentation, and configuration:

- **Scripts:**
  - `setup-love-stack.sh` - Initial environment setup
  - `test-love-stack.sh` - Health checks and test runner
  - `run-love-stack.sh` - Start all services natively
  - `run-love-stack-podman.sh` - Start containerized stack
  - `stop-love-stack.sh` - Stop running APIs
  
- **Container Orchestration:**
  - `podman-compose.yml` - Complete stack definition

- **Documentation:**
  - `STACK_SETUP.md` - Detailed setup guide
  - `CONTAINER_SETUP.md` - Container deployment guide
  - `MASTER_IMPLEMENTATION_ROADMAP.md` - Development roadmap
  - `PROGRESS.md` - Current implementation status

- **Logs:**
  - Centralized logging in `infra/logs/`

[→ Infrastructure Documentation](infra/STACK_SETUP.md)

## 🧪 Testing

Each module has its own test suite:

```bash
# Run all tests
cd infra
./test-love-stack.sh

# Test individual modules
cd listener && source venv/bin/activate && pytest tests/
cd observer && source venv/bin/activate && pytest tests/
cd versor && source venv/bin/activate && pytest tests/
```

**Critical Test:** The Connection axis validation test proves the system can distinguish emotional states:
```bash
cd listener
source venv/bin/activate
pytest tests/semantic/test_connection_axis.py::TestConnectionAxis::test_pity_vs_compassion -v -s
```

## 🎯 The VAC Model

The L.O.V.E. stack is built on the **VAC (Valence-Arousal-Connection) model**, which represents emotional states in 3D space:

- **Valence (V)**: Emotional positivity/negativity [-1, 1]
- **Arousal (A)**: Activation/energy level [-1, 1]
- **Connection (C)**: Interpersonal alignment [-1, 1]

Key innovation: The **Connection axis** distinguishes between:
- **Feeling FOR** someone (pity, condescension) → C < 0
- **Feeling WITH** someone (compassion, empathy) → C > 0

VAC coordinates are converted to quaternions for:
- Smooth interpolation (SLERP)
- 3D visualization
- Geometric operations

## 📚 Documentation

- **Module-specific**: Each module has detailed docs in its `docs/` directory
- **API specs**: OpenAPI/Swagger at `/docs` endpoint of each service
- **Setup guides**: Module-level `README.md` and `SETUP.md` files
- **Architecture**: See `infra/MASTER_IMPLEMENTATION_ROADMAP.md`

## 🛠️ Development

### Module Structure

Each Python module follows this structure:
```
module/
├── app/
│   ├── api/           # API routes
│   ├── models/        # Data models
│   ├── services/      # Business logic
│   └── main.py        # Application entry
├── tests/
│   ├── unit/          # Unit tests
│   ├── integration/   # Integration tests
│   └── conftest.py    # Test fixtures
├── docs/              # Detailed documentation
├── requirements.txt   # Dependencies
└── README.md          # Module overview
```

### Adding Dependencies

```bash
# Activate module's virtual environment
cd <module>
source venv/bin/activate

# Install package
pip install <package>

# Update requirements
pip freeze > requirements.txt
```

## 🔐 Environment Configuration

Each module can be configured via environment variables. Copy `.env.example` to `.env`:

```bash
cp listener/.env.example listener/.env
cp observer/.env.example observer/.env
cp versor/.env.example versor/.env
```

## 🐳 Container Deployment

Full containerized deployment with Podman:

```bash
cd infra
./run-love-stack-podman.sh
```

This includes:
- PostgreSQL 16 with pgvector
- Redis for job queuing
- Ollama for LLM inference
- All three API services

[→ Container Setup Guide](infra/CONTAINER_SETUP.md)

## 📊 Project Status

- ✅ **Versor**: Complete - Quaternion mathematics engine
- ✅ **Observer**: Complete - Data persistence and vector search
- ✅ **Listener**: Complete (Days 1-4) - Basic transcription and VAC analysis
- 🚧 **Listener**: In Progress (Days 5-8) - Full pipeline integration
- ✅ **Experience**: Complete - 3D visualization and mobile app

## 🤝 Contributing

Each module is independently versioned and maintained. See module-specific contribution guidelines:

- [Listener Contributing](listener/README.md#contributing)
- [Observer Contributing](observer/README.md#contributing)
- [Versor Contributing](versor/README.md#contributing)
- [Experience Contributing](experience/README.md#contributing)

## 📄 License

See individual module LICENSE files.

## 🆘 Troubleshooting

**Services not starting?**
```bash
cd infra
./test-love-stack.sh  # Run diagnostics
```

**Import errors?**
```bash
# Ensure virtual environment is activated
source venv/bin/activate
python --version  # Should be 3.11+
```

**Database issues?**
```bash
# Check PostgreSQL
pg_isready

# Restart if needed
brew services restart postgresql@16
```

**More help:** See module-specific documentation or run `./test-love-stack.sh` for detailed diagnostics.

---

**Built with ❤️ for understanding emotional intelligence through geometric transformation.**
