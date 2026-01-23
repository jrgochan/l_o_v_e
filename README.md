# L.O.V.E. Stack

**L**istener-**O**bserver-**V**ersor-**E**xperience: A multi-modal emotional intelligence platform using the VAC (Valence-Arousal-Connection) model with quaternion mathematics for 3D visualization.

## 🏗️ Architecture

This is a multi-repository monorepo structure where each module maintains its own git repository:

```
l_o_v_e/
├── listener/          # Audio transcription & semantic VAC analysis (Python 3.14/FastAPI)
├── observer/          # Data persistence & vector search (Python 3.14/FastAPI + PostgreSQL + pgvector)
├── versor/            # Quaternion mathematics engine (Python 3.14/FastAPI)
├── experience/        # Next.js visualization (React 19, React Three Fiber/Three.js)
└── infra/             # Infrastructure orchestration, deployment & documentation
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.12+** (Required for all backend services)
- **Node.js 18+** (for Experience module)
- **PostgreSQL 14+** (PostgreSQL 18 recommended) with `pgvector` extension
- **Redis** (for task queuing)
- **Ollama** (for local LLM inference)

### Setup

We provide a robust, cross-platform setup script that handles dependencies (including Python 3.14 installation on compatible systems), virtual environments, and database initialization.

```bash
# Run the complete setup script
cd infra
./bin/setup-love-stack.sh
```

This will:
- ✅ **Install System Tools**: Checks for and installs GCC, OpenBLAS, Homebrew (macOS), and other build tools.
- ✅ **Verify Python 3.14**: Installs or verifies the required Python version.
- ✅ **Create Environments**: Sets up isolated virtual environments for all modules.
- ✅ **Seed Database**: Initializes PostgreSQL with 87+ Atlas emotions, strategies, and patterns.
- ✅ **Download Models**: Fetches required AI models (Ollama/Llama 3, BERT, etc.).

### Verify Setup

```bash
cd infra
./bin/test-love-stack.sh
```

### Start the Stack

**Option 1: Native (recommended for development)**
```bash
cd infra
./bin/run-love-stack.sh
```

**Option 2: Containerized (Podman/Docker)**
```bash
# Requires Podman or Docker Compose
cd infra
podman-compose up -d
```

### API Endpoints

Once running, access the interactive API documentation:

- **Versor** (Quaternion Math): http://localhost:8001/docs
- **Observer** (Data & Search): http://localhost:8000/docs
- **Listener** (Audio & VAC): http://localhost:8002/docs

## 📦 Modules

### Listener
Audio transcription and semantic analysis using local LLM (Ollama) to extract VAC coordinates from emotional expressions.
- **Features:** Edge transcription (Whisper), PII scrubbing, Semantic VAC analysis, Async Redis processing.
- [→ Full Documentation](listener/README.md)

### Observer
Data persistence layer with PostgreSQL and pgvector for emotional state storage and vector similarity search.
- **Features:** PostgreSQL + pgvector, HNSW indexing, Emotion atlas (135+ maps), Historical metrics.
- [→ Full Documentation](observer/README.md)

### Versor
Quaternion mathematics engine providing the geometric foundation for the 3D emotional space.
- **Features:** VAC-to-quaternion conversion, SLERP interpolation, Flooding detection, Pure math operations.
- [→ Full Documentation](versor/README.md)

### Experience
Next.js web application with 3D visualization of emotional states as animated spheres.

**Key Features:**
- Real-time 3D rendering (React Three Fiber/Three.js)
- Next.js Web Application (React 19)
- Custom GLSL shaders for visual effects
- Quaternion-based animations
- Observer API integration

[→ Full Documentation](experience/README.md)

## 🔧 Infrastructure & Tooling

The `infra/` directory contains orchestration scripts and deployment configurations.

### Key Scripts (`infra/bin/`)
- `setup-love-stack.sh`: One-shot environment setup.
- `run-love-stack.sh`: Starts all services locally.
- `test-love-stack.sh`: Runs full test suite and health checks.
- `lint-love-stack.sh`: Runs linters (ShellCheck, Flake8, ESLint) across the stack.

### Deployment
- **Red Hat OpenShift (RHOS)**: Full deployment manifests and scripts in `infra/deploy/rhos/`.
- **Google Cloud Platform (GCP)**: Deployment automation in `infra/deploy/gcp/`.

## 🧪 Quality Assurance

### Testing
Run the full test suite across all modules:
```bash
./infra/bin/test-love-stack.sh
```

### Linting
Check code quality:
```bash
# Check all modules
./infra/bin/lint-love-stack.sh

# Fix issues automatically where possible
./infra/bin/lint-love-stack.sh --fix
```

## 🎯 The VAC Model
The L.O.V.E. stack is built on the **VAC (Valence-Arousal-Connection) model**:
- **Valence (V)**: Positivity/Negativity [-1, 1]
- **Arousal (A)**: Energy Level [-1, 1]
- **Connection (C)**: Alignment [-1, 1] (Distinguishes Pity vs. Compassion)

VAC coordinates are converted to quaternions for smooth 3D interpolation and visualization.

## 🤝 Contributing
Each module is independently maintained. See module-specific `README.md` files for guidelines.

## 📄 License
See individual module LICENSE files.

---
**Built with ❤️ for understanding emotional intelligence through geometric transformation.**
