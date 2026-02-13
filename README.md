# L.O.V.E. Stack

**L**istener-**O**bserver-**V**ersor-**E**xperience: A multi-modal emotional intelligence platform using the VAC (Valence-Arousal-Connection) model with quaternion mathematics for 3D visualization.

## 🏗️ Architecture

This is a multi-repository monorepo structure where each module maintains its own git repository:

```
l_o_v_e/
├── listener/          # Audio transcription & semantic VAC analysis (Python 3.12/FastAPI)
├── observer/          # Data persistence & vector search (Python 3.12/FastAPI + PostgreSQL + pgvector)
├── versor/            # Quaternion mathematics engine (Python 3.12/FastAPI)
├── personaplex/       # Voice mode with persona-conditioned responses (Python 3.12/FastAPI + NVIDIA PersonaPlex)
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

We provide a robust, cross-platform setup script that handles dependencies (including Python 3.12 installation on compatible systems), virtual environments, and database initialization.

```bash
# Run the complete setup script
cd infra
./bin/setup-love-stack.sh
```

This will:
- [ ] **Install System Tools**: Checks for and installs GCC, OpenBLAS, Homebrew (macOS), and other build tools.
- [x] **Verify Python 3.12**: Installs or verifies the required Python version.
- [ ] **Create Environments**: Sets up isolated virtual environments for all modules.
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
- **PersonaPlex** (Voice Mode): http://localhost:8003/docs *(optional)*

## 📊 Project Status

**Release Readiness: stable-rc1**

| Module | Stack | Status | Test Coverage |
|--------|-------|--------|---------------|
| **Native App** | Swift 5.9 / SwiftUI / Metal | ✅ **Production Ready** | 100% Logic Coverage |
| **Listener** | Python 3.12 / FastAPI | ✅ Stable | High |
| **Observer** | Python 3.12 / Postgres | ✅ Stable | High |
| **Versor** | Python 3.12 / NumPy | ✅ Stable | High |
| **Experience** | React 19 / Three.js | ✅ Stable | High |

The Native Swift implementation ("Soul Stack") has achieved **100% Logic Coverage** and is the recommended client for macOS users.

## 📦 Modules

### Native macOS App ("Liquid Metal")
A fully native, privacy-first implementation of the L.O.V.E. protocol.
- **Architecture**: Modular "Soul Stack" (`SoulCore`, `SoulBrain`, `SoulBio`, `SoulVoice`, `SoulUI`, `SoulChat`).
- **Performance**: 120Hz ProMotion via logic-less Metal shaders.
- **Privacy**: Fully offline, on-device Speech Recognition and ML.
- **Integration**: Deep system integration (Haptics, Microphone).
- [→ Full Native Documentation](experience/desktop/native-swift/docs/README.md)

### Listener
Audio transcription and semantic analysis using local LLM (Ollama) to extract VAC coordinates.
- [→ Full Documentation](listener/README.md)

### Observer
Data persistence layer with PostgreSQL and pgvector for emotional state storage.
- [→ Full Documentation](observer/README.md)

### Versor
Quaternion mathematics engine providing the geometric foundation.
- [→ Full Documentation](versor/README.md)

### Experience (Web)
Next.js web application with 3D visualization.
- [→ Full Documentation](experience/README.md)

## 🔧 Infrastructure & Tooling

The `infra/` directory contains orchestration scripts and deployment configurations.

### Key Scripts (`infra/bin/`)
- `setup-love-stack.sh`: One-shot environment setup.
- `build-love-stack.sh`: **Builds the entire stack** (Native + Python + Web) for release.
- `run-love-stack.sh`: Starts all services locally.
- `test-love-stack.sh`: Runs full test suite and health checks.
- `lint-love-stack.sh`: Runs linters (ShellCheck, Flake8, ESLint) across the stack.

### Deployment
- **Ansible**: Production deployment via `./infra/deploy/deploy-ansible.sh` (see [Infrastructure Docs](docs/src/architecture/11-infrastructure.md))
- **Podman/Docker**: Containerized deployment via `podman-compose`

## 🧪 Quality Assurance

### Testing
Run the full test suite across all modules:
```bash
./infra/bin/test-love-stack.sh
```

### Building for Release
Compile all artifacts:
```bash
./infra/bin/build-love-stack.sh
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

## 🛡️ Intellectual Property
The VAC (Valence-Arousal-Connection) model and quaternion-based emotional mapping system are the subject of **U.S. Provisional Patent Application No. 63/962,600**.

---
**Built with ❤️ for understanding emotional intelligence through geometric transformation.**
