# Contributing to L.O.V.E.

Thank you for your interest in contributing to the L.O.V.E. platform! This guide covers everything you need to get started.

---

## 🏗️ Project Structure

The L.O.V.E. stack is a multi-module monorepo:

| Module | Language | Port | Purpose |
|--------|----------|------|---------|
| **Listener** | Python 3.12 / FastAPI | 8002 | Audio transcription & VAC extraction |
| **Observer** | Python 3.12 / FastAPI | 8000 | Data persistence & vector search |
| **Versor** | Python 3.12 / FastAPI | 8001 | Quaternion mathematics engine |
| **Experience** | Next.js / React 19 | 3000 | 3D visualization & UI |
| **Infra** | Shell / Ansible | — | Deployment & orchestration |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.12+
- Node.js 18+
- PostgreSQL 18+ with pgvector
- Redis 7+
- Ollama (for local LLM inference)

### Setup

```bash
cd infra
./bin/setup-love-stack.sh
```

### Run Tests

```bash
# Full stack
./infra/bin/test-love-stack.sh

# Individual modules
cd versor && python -m pytest
cd observer && python -m pytest
cd listener && python -m pytest
cd experience/web && npm test
```

---

## 📝 Development Workflow

1. **Create a feature branch** from `main`
2. **Make your changes** following the code style of the module
3. **Write or update tests** — all modules have test suites
4. **Run linters** before committing:
   ```bash
   ./infra/bin/lint-love-stack.sh
   ```
5. **Update documentation** if your changes affect public APIs or behavior
6. **Submit a pull request** with a clear description of changes

---

## 🧹 Code Style

### Python (Listener, Observer, Versor)

- **Formatter:** Black (line length 100)
- **Linter:** Flake8 + Ruff
- **Type hints:** Required for all public functions
- **Docstrings:** Google-style for all public classes and functions

### TypeScript/JavaScript (Experience)

- **Formatter:** Prettier
- **Linter:** ESLint
- **Framework:** React 19 with Next.js

### Shell (Infra)

- **Linter:** ShellCheck
- **Style:** POSIX-compatible where possible

---

## 📁 Where to Contribute

| Area | Module | Good First Issues |
|------|--------|-------------------|
| Bug fixes | Any | Check issue tracker |
| API endpoints | Observer, Listener | Add missing endpoints |
| UI components | Experience | New visualizations |
| Documentation | `docs/` | Improve guides, fix examples |
| Tests | Any | Increase coverage |
| Infrastructure | Infra | CI/CD improvements |

---

## 🛡️ Intellectual Property Notice

The VAC (Valence-Arousal-Connection) model and quaternion-based emotional mapping system are the subject of **U.S. Provisional Patent Application No. 63/962,600**. Contributors should be aware that their contributions may be covered by this patent.

---

## 📄 License

See individual module LICENSE files for licensing terms.
