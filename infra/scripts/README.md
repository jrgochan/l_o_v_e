# L.O.V.E. Platform - Developer Experience Scripts

Comprehensive code quality verification system for Observer, Listener, Versor, and Experience modules.

## Quick Start

```bash
# 1. Install all development tools
./infra/scripts/install-dev-tools.sh

# 2. Verify everything is set up
./infra/scripts/check-dependencies.sh

# 3. Before committing, run full verification
./infra/scripts/verify-all.sh --fix

# 4. Quick feedback loop (fast checks only)
./infra/scripts/verify-all.sh --quick --fix
```

## Scripts Overview

### 🎯 Master Script

**`verify-all.sh`** - One command to rule them all
```bash
# Full verification (all checks + tests)
./infra/scripts/verify-all.sh

# Auto-fix issues
./infra/scripts/verify-all.sh --fix

# Quick mode (no integration tests)
./infra/scripts/verify-all.sh --quick

# Specific module only
./infra/scripts/verify-all.sh --module=observer --fix
```

### 🔍 Quality Checks

**`check-dependencies.sh`** - Verify all tools installed
```bash
./infra/scripts/check-dependencies.sh
```

**`check-python-quality.sh`** - Python code quality
```bash
# Check all Python modules
./infra/scripts/check-python-quality.sh

# Auto-fix issues
./infra/scripts/check-python-quality.sh --fix

# Specific module
./infra/scripts/check-python-quality.sh --module=observer --fix
```

Runs:
- ✅ `black` - Code formatting
- ✅ `isort` - Import sorting
- ✅ `flake8` - PEP 8 linting
- ✅ `pylint` - Additional quality checks
- ✅ `mypy --strict` - Type safety
- ✅ `pydocstyle` - Docstring standards (Google style)
- ✅ `bandit` - Security scanning
- ✅ `radon` - Complexity analysis

**`check-typescript-quality.sh`** - TypeScript/Experience quality
```bash
# Check Experience module
./infra/scripts/check-typescript-quality.sh

# Auto-fix issues
./infra/scripts/check-typescript-quality.sh --fix
```

Runs:
- ✅ `tsc --noEmit` - Type checking
- ✅ `eslint` - Linting
- ✅ `prettier` - Code formatting
- ✅ `npm audit` - Security
- ✅ `npm run build` - Build test

### 🧪 Testing

**`run-tests.sh`** - Comprehensive test suites
```bash
# Run all tests (100% coverage target)
./infra/scripts/run-tests.sh

# Quick mode (unit tests only)
./infra/scripts/run-tests.sh --quick

# Specific module
./infra/scripts/run-tests.sh --module=listener

# Custom coverage target
./infra/scripts/run-tests.sh --coverage=90
```

Features:
- Parallel execution (`pytest -n auto`)
- 100% coverage target
- HTML reports generated
- Unit/integration test markers

### 🎨 Formatting

**`format-code.sh`** - Auto-format all code
```bash
# Format all modules
./infra/scripts/format-code.sh

# Format specific module
./infra/scripts/format-code.sh --module=observer
```

Formats:
- Python: black, isort, autoflake
- TypeScript: prettier, eslint --fix

### 🛠️ Installation

**`install-dev-tools.sh`** - Bootstrap development environment
```bash
./infra/scripts/install-dev-tools.sh
```

Installs:
- Python 3.11+ verification
- All Python quality tools
- Node.js toolchain
- TypeScript tools
- Pre-commit hooks
- Module dependencies

## Configuration Files

### Python Configuration (`pyproject.toml`)
- Black, isort, mypy, pytest, pydocstyle settings
- Centralized at project root
- Consistent across all Python modules

### Flake8 Configuration (`.flake8`)
- PEP 8 enforcement
- Complexity limits (max 15)
- Line length (100)

### Pre-commit Hooks (`.pre-commit-config.yaml`)
- Auto-format on commit
- Fast checks only
- Can bypass with `--no-verify`

## Workflow Examples

### Before Committing
```bash
# Format and verify everything
./infra/scripts/verify-all.sh --fix

# Quick check (if in a hurry)
./infra/scripts/verify-all.sh --quick --fix
```

### After Pulling Changes
```bash
# Verify codebase health
./infra/scripts/verify-all.sh --quick
```

### Working on Specific Module
```bash
# Format Observer code
./infra/scripts/format-code.sh --module=observer

# Check quality
./infra/scripts/check-python-quality.sh --module=observer

# Run tests
./infra/scripts/run-tests.sh --module=observer
```

### CI/CD Integration
```bash
# Full verification (what CI runs)
./infra/scripts/verify-all.sh

# Exit code: 0 = pass, 1+ = fail
```

## Quality Standards

### Python
- **Formatter:** black (line-length=100)
- **Import sorter:** isort (black-compatible)
- **Linter:** flake8 + pylint
- **Type checker:** mypy --strict
- **Docstrings:** Google style (pydocstyle)
- **Security:** bandit
- **Coverage:** 100% target

### TypeScript
- **Type checker:** tsc --noEmit
- **Linter:** eslint
- **Formatter:** prettier
- **Tests:** Jest
- **Coverage:** 100% target

## Troubleshooting

### "Command not found"
Run dependency checker:
```bash
./infra/scripts/check-dependencies.sh
```

Install missing tools:
```bash
./infra/scripts/install-dev-tools.sh
```

### "Permission denied"
Make scripts executable:
```bash
chmod +x infra/scripts/*.sh
```

### "Tests failing"
Run specific module to isolate:
```bash
./infra/scripts/run-tests.sh --module=observer
```

View HTML coverage report:
```bash
open observer/htmlcov/index.html
```

### "Mypy strict mode too strict"
Adjust in `pyproject.toml`:
```toml
[tool.mypy]
strict = false  # Disable strict mode temporarily
```

## Pre-commit Hooks

### Install
```bash
pre-commit install
```

### Run manually
```bash
pre-commit run --all-files
```

### Bypass (when needed)
```bash
git commit --no-verify
```

## Performance

### Script Execution Times
- `check-dependencies.sh`: <5 seconds
- `check-python-quality.sh`: 30-60 seconds per module
- `check-typescript-quality.sh`: 20-40 seconds
- `run-tests.sh --quick`: 10-30 seconds
- `run-tests.sh` (full): 2-5 minutes
- `verify-all.sh`: 5-10 minutes (full)
- `verify-all.sh --quick`: 1-2 minutes

### Optimization Tips
- Use `--quick` for fast feedback
- Use `--module=<name>` for focused work
- Run full verification before pushing
- Pre-commit hooks keep commits clean

## Architecture

### POSIX Compliance
- All scripts use `#!/bin/sh`
- No bashisms
- Portable across Unix/Linux/macOS
- Tested with shellcheck

### Idempotency
- Safe to run multiple times
- Tool checking before execution
- No destructive operations
- Graceful handling of missing tools

### Modularity
- Each script has single responsibility
- Composable (can run individually)
- Shared library (`lib/common.sh`)
- Clear naming conventions

## Support

### Documentation
- Tool configurations: `pyproject.toml`, `.flake8`
- Pre-commit: `.pre-commit-config.yaml`
- This README

### Getting Help
```bash
# Show script help
./infra/scripts/verify-all.sh --help
```

## Maintenance

### Updating Tool Versions
Edit `.pre-commit-config.yaml` and update `rev:` tags

### Adding New Checks
1. Add check to appropriate script
2. Update this README
3. Test thoroughly
4. Document in pyproject.toml if needed

---

**Created:** January 3, 2026
**Maintained by:** L.O.V.E. Platform Team
**Questions?** See project documentation in `docs/`
