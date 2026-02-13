# L.O.V.E. Stack Infrastructure

Orchestration scripts, configuration, and tooling for the L.O.V.E. stack.

## 🚀 Quick Start

The easiest way to interact with the stack is through the root **`Makefile`**:

```bash
make help             # Show all available commands
make setup            # First-time installation
make dev              # Start dev mode (hot-reload)
make lint             # Quality checks (shell + python + TS + swift)
make lint-fix         # Auto-fix issues
make test             # Run all tests
make fmt              # Auto-format code
make clean            # Remove build artifacts
```

Module-specific commands:

```bash
make lint-versor      # Lint Versor only
make test-observer    # Test Observer only
make test-listener    # Test Listener only
```

Or run scripts directly:

```bash
./infra/bin/setup-love-stack.sh    # Initial environment setup
./infra/bin/run-love-stack.sh      # Start all services
./infra/bin/stop-love-stack.sh     # Stop all APIs
./infra/bin/test-love-stack.sh     # Health checks + tests
./infra/bin/lint-love-stack.sh     # Master lint (--fix to auto-fix)
./infra/bin/build-love-stack.sh    # Build all modules
./infra/bin/clean-love-stack.sh    # Clean artifacts
```

## 📂 Directory Structure

```
infra/
├── bin/                 # Top-level commands (setup, run, stop, test, lint, build, clean)
├── lib/                 # Shared shell libraries
│   ├── common.sh        # Core utilities (colors, commands, venv, versions)
│   ├── os-detect.sh     # Cross-platform OS detection
│   ├── package-manager.sh # Package manager abstraction (brew, apt, etc.)
│   └── service-manager.sh # Service management (systemd, launchctl, etc.)
├── scripts/             # Development quality scripts
│   ├── check-python-quality.sh    # Python lint (black, isort, flake8, pylint, mypy, bandit)
│   ├── check-typescript-quality.sh # TypeScript lint (eslint, tsc)
│   ├── check-swift-quality.sh     # Swift lint (swiftlint)
│   ├── check-dependencies.sh      # Dependency health checks
│   ├── format-code.sh             # Auto-format (black, isort, autoflake)
│   ├── run-tests.sh               # Test runner (pytest)
│   ├── install-dev-tools.sh       # Install dev tools via uv
│   ├── sync-versions.sh           # Sync from TOOL_VERSIONS
│   ├── verify-all.sh              # Full verification suite
│   ├── maintenance/               # Archive, cleanup scripts
│   └── lib/                       # Backward-compat shim (→ infra/lib/common.sh)
├── configs/             # Environment and tool configuration
│   ├── base.env         # Shared environment variables
│   └── pyproject.toml   # Shared tool configuration (black, isort, etc.)
├── deploy/              # Deployment tooling
│   ├── deploy-ansible.sh   # Ansible deployment orchestrator
│   └── ansible/            # Ansible roles and playbooks
├── compose/             # (Placeholder) Podman/Docker Compose files
├── containers/          # (Placeholder) Containerfiles
├── archive/             # Legacy configuration archive
├── docs/                # Infra-specific documentation
├── logs/                # Runtime logs (gitignored)
├── TOOL_VERSIONS        # Pinned tool versions
└── .gitignore           # Ignores: .venv*, logs/, .pids/, __pycache__/
```

## 🔧 Development Environment

### Prerequisites

- **Python 3.11+** (3.12 recommended)
- **Node.js 18+**
- **uv** — Python package manager
- **PostgreSQL** (16+ recommended)
- **Redis** (6+)
- **Ollama** — LLM inference

### Virtual Environment

The stack uses a single root `.venv` managed by **uv**:

```bash
uv sync --all-extras    # Install all deps + dev tools
```

All quality scripts activate this venv automatically via `activate_project_venv` in `lib/common.sh`.

### Pre-commit Hooks

Install once:

```bash
pre-commit install
```

Hooks run automatically on `git commit`. To run manually:

```bash
pre-commit run --all-files
```

Configured hooks: **black**, **isort**, **flake8**, **bandit**, **shellcheck**, **eslint**, and general hygiene (trailing whitespace, large files, merge conflicts).

### Tool Versions

All tool versions are pinned in `TOOL_VERSIONS`. Scripts use `load_versions` and `get_version` from `lib/common.sh` to read them.

## 🌐 Service Ports

| Service | Port |
|---------|------|
| Observer | 8000 |
| Versor | 8001 |
| Listener | 8002 |
| Experience (Web) | 3000 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| Ollama | 11434 |

## 📊 Monitoring

```bash
# View all logs
tail -f logs/*.log

# Service health
pg_isready                                    # PostgreSQL
redis-cli ping                                # Redis
curl http://localhost:11434/api/tags           # Ollama
curl http://localhost:8001/health              # Versor
curl http://localhost:8000/health              # Observer
curl http://localhost:8002/health              # Listener
```

## 🐛 Troubleshooting

### Services Not Starting

```bash
make test                         # Run diagnostics
brew services list                # Check service status (macOS)
brew services restart postgresql@18
brew services restart redis
```

### Python Environment Issues

```bash
rm -rf .venv                      # Remove broken venv
uv sync --all-extras              # Recreate and install
```

### Port Conflicts

```bash
lsof -i :8000                     # Find what's using a port
```

## 📚 Documentation

- **`STACK_SETUP.md`** — Step-by-step setup guide
- **`CONTAINER_SETUP.md`** — Podman/Docker deployment
- **`CROSS_PLATFORM_GUIDE.md`** — Windows/macOS/Linux setup
- **Root README** — [`../README.md`](../README.md)
