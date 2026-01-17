# L.O.V.E. Stack Infrastructure

This directory contains all orchestration scripts, configuration, and documentation for managing the L.O.V.E. stack as a unified system.

## 📂 Contents

### 🚀 Setup & Management Scripts

- **`clone-love-repos.sh`** - Clone all L.O.V.E. repositories from GitLab
  - POSIX-compliant script for any Unix-like system
  - Clones all seven repositories (archive, docs, infra, listener, observer, versor, experience)
  - Supports both SSH (default) and HTTPS protocols
  - Can be curled and piped for remote setup
  - Flexible options for shallow cloning, specific repos, updates
  - Intelligent pre-flight checks and error handling

- **`setup-love-stack.sh`** - Initial environment setup
  - Verifies Python 3.14+ installation
  - Checks system dependencies (PostgreSQL, Redis, Ollama, ffmpeg)
  - Creates virtual environments for all modules
  - Installs Python dependencies
  - Downloads Ollama LLM model
  - Sets up configuration files

- **`test-love-stack.sh`** - Health checks and test runner
  - Verifies Python environments
  - Checks service status (PostgreSQL, Redis, Ollama)
  - Tests API endpoints
  - Runs module test suites
  - Validates critical semantic tests
  - Generates status summary

- **`run-love-stack.sh`** - Start all services natively
  - Starts system services (PostgreSQL, Redis, Ollama)
  - Launches all three API services
  - Runs in foreground with Ctrl+C to stop
  - Logs to `logs/` directory

- **`stop-love-stack.sh`** - Stop running APIs
  - Stops all API processes
  - Leaves system services running
  - Cleans up PID files

- **`run-love-stack-podman.sh`** - Containerized deployment
  - Builds and starts all services with Podman Compose
  - Pulls Ollama model
  - Runs database migrations
  - Seeds emotion atlas

### 🐳 Container Orchestration

- **`podman-compose.yml`** - Complete stack definition
  - PostgreSQL 16 with pgvector
  - Redis for job queuing
  - Ollama for LLM inference
  - Versor, Observer, and Listener APIs
  - Network and volume configuration

### 📚 Documentation

- **`STACK_SETUP.md`** - Comprehensive setup guide
  - Prerequisites and dependencies
  - Step-by-step installation
  - Module-specific setup
  - Troubleshooting guide

- **`CONTAINER_SETUP.md`** - Container deployment guide
  - Podman installation and configuration
  - Container architecture
  - Volume management
  - Production considerations

- **`MASTER_IMPLEMENTATION_ROADMAP.md`** - Development roadmap
  - Project phases and milestones
  - Module implementation status
  - Future enhancements

- **`PROGRESS.md`** - Current implementation status
  - Completed features
  - In-progress work
  - Known issues

### 📝 Session Summaries

Documentation of development sessions:
- `LISTENER_SESSION_SUMMARY.md`
- `OBSERVER_SESSION_SUMMARY.md`
- `VERSOR_SESSION_SUMMARY.md`
- `EXPERIENCE_SESSION_SUMMARY.md`

### 📄 Other Files

- **`L.O.V.E. Project Software Requirements.pdf`** - Project requirements
- **`PYTHON_VERSION`** - Python version tracking
- **`.python_cmd`** - Detected Python command (auto-generated)
- **`.vscode/`** - VS Code workspace settings
- **`prompts/`** - Prompt templates for AI assistance

### 📊 Logs

- **`logs/`** - Centralized logging directory
  - `Versor.log` - Versor API logs
  - `Observer.log` - Observer API logs
  - `Listener.log` - Listener API logs
  - `.love-stack.pids` - Process ID tracking (auto-generated)

## 🚀 Quick Start

### First Time Setup (Clone Repositories)

If you haven't cloned all repositories yet:

```bash
# From an existing repo (e.g., infra)
cd infra
./clone-love-repos.sh

# Or remotely (future use)
# curl -fsSL https://gitlab.com/l_o_v_e/infra/-/raw/main/clone-love-repos.sh | sh
```

### Setup Development Environment

**macOS / Linux:**

```bash
cd infra
./setup-love-stack.sh
```

### Windows

```powershell
cd infra
.\Setup-LoveStack.ps1
```

### Verify Installation

```bash
./test-love-stack.sh
```

### Start the Stack

**macOS / Linux:**
```bash
./run-love-stack.sh
```

**Windows:**
```powershell
.\Run-LoveStack.ps1
```

### Stop the Stack

**macOS / Linux:**
```bash
./stop-love-stack.sh
```

**Windows:**
```powershell
.\Stop-LoveStack.ps1
```

Or if using Podman:
```bash
podman-compose down
```

## 📖 Usage Guide

### Development Workflow

1. **Initial Setup** (once):
   ```bash
   ./setup-love-stack.sh
   ```

2. **Start Services** (each session):
   ```bash
   ./run-love-stack.sh
   ```

3. **Develop & Test**:
   - Access APIs at http://localhost:8000, 8001, 8002
   - View logs: `tail -f logs/*.log`
   - Run tests: `./test-love-stack.sh`

4. **Stop Services** (end of session):
   ```bash
   ./stop-love-stack.sh
   ```

### Container Workflow

1. **Build & Start**:
   ```bash
   ./run-love-stack-podman.sh
   ```

2. **View Logs**:
   ```bash
   podman-compose logs -f
   # Or specific service:
   podman-compose logs -f listener
   ```

3. **Check Status**:
   ```bash
   podman-compose ps
   ```

4. **Stop**:
   ```bash
   podman-compose down
   ```

### Running Tests

```bash
# All tests with health checks
./test-love-stack.sh

# Critical semantic test only
cd ../listener
source venv/bin/activate
pytest tests/semantic/test_connection_axis.py::TestConnectionAxis::test_pity_vs_compassion -v -s
```

## 📥 Cloning Repositories

### Using the Clone Script

The `clone-love-repos.sh` script makes it easy to clone all seven L.O.V.E. repositories:

```bash
# Clone with SSH (default)
./clone-love-repos.sh

# Clone with HTTPS
./clone-love-repos.sh --https

# Clone to specific directory
./clone-love-repos.sh --target-dir ~/projects

# Quick shallow clone
./clone-love-repos.sh --shallow --yes

# Clone only specific repos
./clone-love-repos.sh --only listener,observer,versor

# Update existing repos
./clone-love-repos.sh --update

# Dry run (see what would happen)
./clone-love-repos.sh --dry-run
```

### Repository Structure

All repositories are cloned into the same parent directory:

```
l_o_v_e/
├── archive/          # Project documentation archive
├── docs/             # User-facing documentation (MkDocs)
├── infra/            # Infrastructure and orchestration scripts (you are here)
├── listener/         # Audio transcription & semantic VAC analysis
├── observer/         # Data persistence & vector search
├── versor/           # Quaternion mathematics engine
└── experience/       # Mobile 3D visualization
```

### Manual Cloning

If you prefer to clone manually:

```bash
# Create parent directory
mkdir -p l_o_v_e && cd l_o_v_e

# Clone all repos
git clone git@gitlab.com:l_o_v_e/archive.git
git clone git@gitlab.com:l_o_v_e/docs.git
git clone git@gitlab.com:l_o_v_e/infra.git
git clone git@gitlab.com:l_o_v_e/listener.git
git clone git@gitlab.com:l_o_v_e/observer.git
git clone git@gitlab.com:l_o_v_e/versor.git
git clone git@gitlab.com:l_o_v_e/experience.git
```

## 🔧 Configuration

### Environment Variables

Each module has its own `.env` file:
- `../listener/.env`
- `../observer/.env`
- `../versor/.env`

Copy from `.env.example` files if needed.

### Service Ports

- **Versor**: 8001
- **Observer**: 8000
- **Listener**: 8002
- **PostgreSQL**: 5432
- **Redis**: 6379
- **Ollama**: 11434

### Python Version

The stack requires Python 3.14+. The setup script will:
1. Try to find Python 3.14
2. Save the command to `.python_cmd`
3. Use this version for all modules

## 📊 Monitoring

### View Logs

```bash
# All logs
tail -f logs/*.log

# Specific service
tail -f logs/Listener.log
```

### Check Services

```bash
# PostgreSQL
pg_isready

# Redis
redis-cli ping

# Ollama
curl http://localhost:11434/api/tags
```

### API Health

```bash
curl http://localhost:8001/health  # Versor
curl http://localhost:8000/health  # Observer
curl http://localhost:8002/health  # Listener
```

## 🐛 Troubleshooting

### Services Not Starting

```bash
# Run diagnostics
./test-love-stack.sh

# Check service status
brew services list

# Restart services
brew services restart postgresql@16
brew services restart redis
```

### Python Environment Issues

```bash
# Remove and recreate environments
cd ../listener && rm -rf venv
cd ../observer && rm -rf venv
cd ../versor && rm -rf venv

# Re-run setup
cd ../infra
./setup-love-stack.sh
```

### Port Conflicts

Check if ports are already in use:
```bash
lsof -i :8000
lsof -i :8001
lsof -i :8002
```

Kill conflicting processes or change ports in module configs.

## 📚 Additional Resources

- **Stack Setup Guide**: `STACK_SETUP.md`
- **Container Guide**: `CONTAINER_SETUP.md`
- **Platform-Specific Setup Guides**:
  - **Ubuntu/WSL**: `SETUP_UBUNTU_WSL.md`
  - **Windows**: `SETUP_WINDOWS.md`
  - **Cross-Platform**: `CROSS_PLATFORM_GUIDE.md`
- **Future Roadmaps**:
  - **Containerization**: `CONTAINERIZATION_ROADMAP.md`
- **Root README**: `../README.md`
- **Module READMEs**:
  - `../listener/README.md`
  - `../observer/README.md`
  - `../versor/README.md`
  - `../experience/README.md`

## 🎯 Project Structure

```
l_o_v_e/
├── listener/          # Audio & semantic analysis module
├── observer/          # Data persistence module
├── versor/            # Quaternion math module
├── experience/        # Mobile visualization module
└── infra/             # ← You are here
    ├── *.sh               # Bash scripts (macOS/Linux/WSL)
    ├── *.ps1              # PowerShell scripts (Windows)
    ├── lib/               # Cross-platform libraries
    ├── containers/        # Future: Containerfiles
    ├── compose/           # Future: Compose orchestration
    ├── scripts/           # Future: Container management
    ├── deploy/            # Future: Deployment configs
    └── logs/              # Centralized logs
```

---

**For more information, see the main project README: [`../README.md`](../README.md)**
