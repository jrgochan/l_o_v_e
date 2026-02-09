# L.O.V.E. Platform - Canonical Configuration Files

This directory contains the canonical (master) configuration files for **ALL** code quality tools across the L.O.V.E. platform - both Python and TypeScript/JavaScript.

## 📋 Complete File Inventory

### Python Tool Configurations
- **`.flake8`** - Python linting (PEP 8 compliance)
- **`pyproject.toml`** - Python tools (black, isort, mypy, pytest, pylint, bandit, etc.)

### TypeScript/JavaScript Tool Configurations
- **`.prettierrc.json`** - Code formatting (JSON format)
- **`prettier.config.mjs`** - Code formatting (ES module format, with overrides)
- **`eslint.config.mjs`** - Linting (modern flat config)
- **`tsconfig.base.json`** - Base TypeScript compiler options

### Cross-Language Configurations
- **`.editorconfig`** - Editor consistency (Python + TypeScript + all languages)
- **`.gitattributes`** - Git behavior (line endings, binary files)
- **`.nvmrc`** - Node.js version pinning

### Git Hooks
- **`.pre-commit-config.yaml`** - Pre-commit hooks (Python + TypeScript formatters/linters)

### Documentation
- **`README.md`** - This file!

## 🎯 Purpose

These canonical configs serve as the **single source of truth** for code quality standards across all modules (observer, listener, versor, experience).

### Benefits

1. **Consistency** - All modules follow the same standards
2. **Maintainability** - Update once, apply everywhere
3. **Onboarding** - New developers get consistent tooling
4. **Quality** - Enforced standards improve code quality
5. **Cross-Language** - Python and TypeScript share common standards

## 🔄 Distribution Strategy

### Root Directory (Git-Ignored, Local Development)
These configs are **copied to project root** for local development convenience:
- `/.flake8` (git-ignored)
- `/pyproject.toml` (git-ignored)
- `/.pre-commit-config.yaml` (git-ignored)
- `/.editorconfig` (git-ignored)
- `/.gitattributes` (git-ignored)

### Python Modules (Git-Tracked)
Each Python module has its own tracked copy:

**Observer** (`observer/`):
- `.flake8` ✅
- `pyproject.toml` ✅
- `pytest.ini` ✅
- `.editorconfig` ✅

**Listener** (`listener/`):
- `.flake8` ✅
- `pyproject.toml` ✅
- `pytest.ini` ✅
- `.editorconfig` ✅

**Versor** (`versor/`):
- `.flake8` ✅
- `pyproject.toml` ✅
- `.editorconfig` ✅

### TypeScript Modules (Git-Tracked)
Each TypeScript module has its own tracked copy:

**Experience Web** (`experience/web/`):
- `eslint.config.mjs` ✅ (extends Next.js configs)
- `tsconfig.json` ✅ (extends base + adds paths)
- `.prettierrc.json` ✅
- `prettier.config.mjs` ✅
- `.editorconfig` ✅
- `jest.config.js` ✅

**Experience Shared** (`experience/shared/`):
- `.prettierrc.json` ✅
- `.editorconfig` ✅

## 🛠️ Usage

### For Developers - Initial Setup

When setting up your development environment:

```bash
# This automatically installs tools AND distributes configs
./infra/scripts/install-dev-tools.sh
```

### For Module Maintainers - Updating Configs

To update a module's config from canonical:

**Python modules:**
```bash
cp infra/configs/.flake8 observer/.flake8
cp infra/configs/.flake8 listener/.flake8
cp infra/configs/.flake8 versor/.flake8

cp infra/configs/pyproject.toml observer/pyproject.toml
cp infra/configs/pyproject.toml listener/pyproject.toml
cp infra/configs/pyproject.toml versor/pyproject.toml
```

**TypeScript modules:**
```bash
cp infra/configs/.prettierrc.json experience/web/.prettierrc.json
cp infra/configs/.prettierrc.json experience/shared/.prettierrc.json
cp infra/configs/prettier.config.mjs experience/web/prettier.config.mjs
```

**All modules (cross-language):**
```bash
# EditorConfig for everyone
for module in observer listener versor experience/web experience/shared; do
  cp infra/configs/.editorconfig $module/.editorconfig
done
```

### Updating Standards Platform-Wide

To change code quality standards for the entire platform:

1. Edit the canonical files in `infra/configs/`
2. Commit and push changes
3. Distribute to modules using commands above
4. Developers will get updates on next `install-dev-tools.sh` run

## 📝 Tool Configuration Details

### Python Tools

#### `.flake8`
- **Purpose**: PEP 8 style guide enforcement
- **Max line length**: 100
- **Max complexity**: 15
- **Ignores**: E203, E501, W503 (conflicts with black)
- **Per-file ignores**: F401, F403 in `__init__.py`

#### `pyproject.toml`
Contains configuration for:
- **black**: Code formatter (100 char lines, Python 3.11)
- **isort**: Import sorter (black-compatible profile)
- **mypy**: Type checker (strict mode with practical relaxations)
- **pytest**: Test framework (coverage required, async support)
- **pylint**: Additional linter (complementary to flake8)
- **bandit**: Security scanner
- **pydocstyle**: Docstring checker (Google style)
- **coverage**: Test coverage reporting

### TypeScript/JavaScript Tools

#### `.prettierrc.json` / `prettier.config.mjs`
- **Purpose**: Code formatting
- **Print width**: 100
- **Tab width**: 2 spaces
- **Line endings**: LF
- **Semicolons**: Yes
- **Quotes**: Double
- **Trailing commas**: ES5

#### `eslint.config.mjs`
- **Purpose**: Linting and code quality
- **Base**: ES recommended + TypeScript
- **Complexity**: Max 15
- **Max lines per function**: 100
- **Unused vars**: Error (except `_` prefix)
- **No console**: Warn (except warn/error)

#### `tsconfig.base.json`
- **Purpose**: Base TypeScript compiler options
- **Target**: ES2017
- **Module**: ESNext
- **Strict mode**: Enabled
- **No unused locals/params**: Enabled
- **JSX**: react-jsx

### Cross-Language Tools

#### `.editorconfig`
- **Purpose**: Editor consistency across IDEs
- **Python**: 4 spaces, 100 char lines
- **TypeScript/JS**: 2 spaces, 100 char lines
- **Line endings**: LF for all
- **Charset**: UTF-8
- **Trim trailing whitespace**: Yes (except markdown)

#### `.gitattributes`
- **Purpose**: Git behavior consistency
- **Text files**: Auto-detect, normalize to LF
- **Source code**: Explicit LF
- **Binary files**: Marked as binary
- **Exports**: Exclude config files from archives

#### `.nvmrc`
- **Purpose**: Node.js version pinning
- **Version**: v20.11.0

### Git Hooks

#### `.pre-commit-config.yaml`
Auto-runs before commits:
- **Python**: black, isort, flake8, mypy (light), bandit, autoflake
- **TypeScript**: prettier, eslint (when added)
- **Shell**: shellcheck
- **Generic**: trailing whitespace, EOF, YAML/JSON validation

## 🚫 Git Ignore Rules

Root-level config files must be in `.gitignore`:
```gitignore
# Tool configurations (maintained in infra/configs/)
/.flake8
/pyproject.toml
/.pre-commit-config.yaml
/.prettierrc.json
/prettier.config.mjs
/eslint.config.mjs
/tsconfig.base.json
/.editorconfig
/.gitattributes
/.nvmrc
```

This prevents checking in files that can't be committed to the root directory while still allowing modules to maintain their own tracked copies.

## 🔍 Verification

To verify configs are properly distributed:

```bash
# Check canonical configs exist
ls -la infra/configs/

# Check Python modules have all configs
for module in observer listener versor; do
  echo "=== $module ==="
  ls -la $module/.flake8 $module/pyproject.toml $module/.editorconfig
done

# Check TypeScript modules have all configs
echo "=== experience/web ==="
ls -la experience/web/.prettierrc.json experience/web/.editorconfig

echo "=== experience/shared ==="
ls -la experience/shared/.prettierrc.json experience/shared/.editorconfig
```

## 📊 Complete Tool Coverage Matrix

| Tool | Purpose | Observer | Listener | Versor | Experience | Canonical |
|------|---------|----------|----------|--------|------------|-----------|
| **Python Formatting & Style** |
| black | Auto-formatting | ✅ | ✅ | ✅ | - | ✅ |
| isort | Import sorting | ✅ | ✅ | ✅ | - | ✅ |
| **Python Linting** |
| flake8 | PEP 8 linting | ✅ | ✅ | ✅ | - | ✅ |
| pylint | Additional linting | ✅ | ✅ | ✅ | - | ✅ |
| **Python Type Checking** |
| mypy | Static type checking | ✅ | ✅ | ✅ | - | ✅ |
| **Python Testing** |
| pytest | Test framework | ✅ | ✅ | ✅ | - | ✅ |
| coverage | Code coverage | ✅ | ✅ | ✅ | - | ✅ |
| **Python Security** |
| bandit | Security scanner | ✅ | ✅ | ✅ | - | ✅ |
| **TypeScript/JavaScript Formatting** |
| prettier | Auto-formatting | - | - | - | ✅ | ✅ |
| **TypeScript/JavaScript Linting** |
| eslint | Linting | - | - | - | ✅ | ✅ |
| typescript | Type checking | - | - | - | ✅ | ✅ |
| **TypeScript/JavaScript Testing** |
| jest | Test framework | - | - | - | ✅ | ✅ |
| **Cross-Language** |
| editorconfig | Editor settings | ✅ | ✅ | ✅ | ✅ | ✅ |
| gitattributes | Git behavior | - | - | - | - | ✅ |
| **Version Management** |
| nvm | Node version | - | - | - | ✅ | ✅ |

## 🎨 Code Quality Standards

### Python
- **Line length**: 100 characters
- **Indentation**: 4 spaces
- **Imports**: Sorted (stdlib → third-party → local)
- **Type hints**: Required (strict mypy)
- **Docstrings**: Google style
- **Test coverage**: 100% required
- **Security**: Bandit scans all code

### TypeScript/JavaScript
- **Line length**: 100 characters
- **Indentation**: 2 spaces
- **Quotes**: Double quotes
- **Semicolons**: Required
- **Trailing commas**: ES5
- **Type safety**: Strict TypeScript
- **Complexity**: Max 15 cyclomatic complexity

### All Languages
- **Line endings**: LF (Unix-style)
- **Charset**: UTF-8
- **Trailing whitespace**: Removed
- **Final newline**: Required

## 📚 Related Documentation

- `infra/scripts/README.md` - DX tooling scripts
- `infra/scripts/check-python-quality.sh` - Python quality checking
- `infra/scripts/check-typescript-quality.sh` - TypeScript quality checking
- `infra/scripts/format-code.sh` - Auto-formatting for all languages
- `.gitignore` - Ignore rules for root configs

## 🚀 Quick Start

### New Developer Setup
```bash
# 1. Install all DX tools and distribute configs
./infra/scripts/install-dev-tools.sh

# 2. Verify everything works
./infra/scripts/check-dependencies.sh

# 3. Run quality checks
./infra/scripts/check-python-quality.sh --module=versor
./infra/scripts/check-typescript-quality.sh --module=experience

# 4. Auto-fix formatting
./infra/scripts/format-code.sh --fix
```

### Before Committing Code
```bash
# Quick check and auto-fix
./infra/scripts/verify-all.sh --quick --fix

# Or use pre-commit hooks (automatic)
pre-commit run --all-files
```

## 💡 Best Practices

1. **Always use canonical configs as the base** - Don't create custom configs from scratch
2. **Only override when necessary** - Most modules should use canonical as-is
3. **Document deviations** - If a module needs custom settings, document why
4. **Keep canonical configs in sync** - Update infra/configs/ first, then distribute
5. **Test after updates** - Run quality checks after updating any configs

## 🔄 Maintenance Workflow

```bash
# 1. Edit canonical config
vim infra/configs/.flake8

# 2. Distribute to modules
cp infra/configs/.flake8 observer/.flake8
cp infra/configs/.flake8 listener/.flake8
cp infra/configs/.flake8 versor/.flake8

# 3. Verify changes work
./infra/scripts/check-python-quality.sh --module=observer
./infra/scripts/check-python-quality.sh --module=listener
./infra/scripts/check-python-quality.sh --module=versor

# 4. Commit all changes together
git add infra/configs/.flake8 observer/.flake8 listener/.flake8 versor/.flake8
git commit -m "chore: update flake8 configuration across all modules"
```

## 📈 Quality Metrics

With these configurations enforced, the platform maintains:
- **Python modules**: 9.5+/10 pylint score
- **TypeScript modules**: Zero ESLint errors (when configured)
- **Test coverage**: 100% (with reasonable exclusions)
- **Security**: No high-severity vulnerabilities
- **Consistency**: All code follows same style

## 🆘 Troubleshooting

### Config not being picked up?
1. Check file is in correct location
2. Verify file permissions (should be readable)
3. Check tool is installed: `which black` or `which prettier`
4. Try absolute path: `black --config=/path/to/.flake8`

### Conflicts between tools?
- black and flake8: E203, E501, W503 are ignored
- prettier and eslint: Use eslint-config-prettier
- mypy strict mode: Some warnings expected, that's OK

### Module needs custom settings?
1. Copy canonical config to module
2. Add module-specific overrides
3. Document why in module's README
4. Consider if change should be in canonical instead

## 📞 Support

For issues with configurations:
1. Check this README first
2. Review tool documentation
3. Check `infra/scripts/README.md` for usage examples
4. Review pre-commit hook output for specific errors

---

**Last Updated**: January 3, 2026
**Maintained By**: Infrastructure Team
**Status**: ✅ Complete - All tools configured
