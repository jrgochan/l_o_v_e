# ============================================================================
# L.O.V.E. Stack — Developer Makefile
# ============================================================================
# Common commands for development, testing, and deployment.
#
# Usage:
#   make help          Show all targets
#   make setup         Install all dependencies
#   make lint          Run all quality checks
#   make test          Run all tests
#   make fmt           Auto-format code
#   make clean         Remove build artifacts
#
# Module-specific:
#   make lint-versor   Lint only Versor
#   make test-observer Run tests only for Observer
# ============================================================================

SHELL := /bin/bash
.DEFAULT_GOAL := help

# Project root (where this Makefile lives)
PROJECT_ROOT := $(shell pwd)
INFRA := $(PROJECT_ROOT)/infra

# ============================================================================
# Help
# ============================================================================

.PHONY: help
help: ## Show this help message
	@echo ""
	@echo "  L.O.V.E. Stack — Developer Commands"
	@echo "  ───────────────────────────────────────────────────"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ============================================================================
# Setup
# ============================================================================

.PHONY: setup
setup: ## Install all dependencies (uv + node)
	@$(INFRA)/bin/setup-love-stack.sh

.PHONY: setup-dev
setup-dev: ## Install dev tools into root .venv
	@$(INFRA)/scripts/install-dev-tools.sh

.PHONY: sync
sync: ## Sync Python dependencies via uv
	@uv sync --all-extras

# ============================================================================
# Quality — Lint & Format
# ============================================================================

.PHONY: lint
lint: ## Run all quality checks (shell + python + typescript + swift)
	@$(INFRA)/bin/lint-love-stack.sh

.PHONY: scan
scan: ## Run Trivy container image security scan
	@$(INFRA)/bin/scan-images.sh

.PHONY: lint-fix
lint-fix: ## Auto-fix all quality issues
	@$(INFRA)/bin/lint-love-stack.sh --fix

.PHONY: lint-python
lint-python: ## Lint Python code only
	@$(INFRA)/scripts/check-python-quality.sh

.PHONY: lint-typescript
lint-typescript: ## Lint TypeScript code only
	@$(INFRA)/scripts/check-typescript-quality.sh

.PHONY: lint-shell
lint-shell: ## Lint shell scripts via shellcheck
	@$(INFRA)/bin/lint-love-stack.sh --module infra

.PHONY: lint-swift
lint-swift: ## Lint Swift code only
	@$(INFRA)/scripts/check-swift-quality.sh

.PHONY: lint-versor
lint-versor: ## Lint Versor module only
	@$(INFRA)/scripts/check-python-quality.sh --module=versor

.PHONY: lint-observer
lint-observer: ## Lint Observer module only
	@$(INFRA)/scripts/check-python-quality.sh --module=observer

.PHONY: lint-listener
lint-listener: ## Lint Listener module only
	@$(INFRA)/scripts/check-python-quality.sh --module=listener

.PHONY: fmt
fmt: ## Auto-format all code (Python + TypeScript)
	@$(INFRA)/scripts/format-code.sh

# ============================================================================
# Testing
# ============================================================================

.PHONY: test
test: ## Run all tests
	@$(INFRA)/bin/test-love-stack.sh

.PHONY: test-ci
test-ci: ## Run tests in CI mode
	@$(INFRA)/bin/test-love-stack.sh --ci

.PHONY: test-versor
test-versor: ## Run Versor tests only
	@$(INFRA)/bin/test-love-stack.sh --module versor

.PHONY: test-observer
test-observer: ## Run Observer tests only
	@$(INFRA)/bin/test-love-stack.sh --module observer

.PHONY: test-listener
test-listener: ## Run Listener tests only
	@$(INFRA)/bin/test-love-stack.sh --module listener

.PHONY: test-experience
test-experience: ## Run Experience (web) tests only
	@$(INFRA)/bin/test-love-stack.sh --module experience

# ============================================================================
# Run & Stop
# ============================================================================

.PHONY: run
run: ## Start the full L.O.V.E. stack
	@$(INFRA)/bin/run-love-stack.sh

.PHONY: dev
dev: ## Start dev mode (hot-reload)
	@$(INFRA)/bin/dev-stack.sh

.PHONY: stop
stop: ## Stop all running services
	@$(INFRA)/bin/stop-love-stack.sh

# ============================================================================
# Build & Deploy
# ============================================================================

.PHONY: build
build: ## Build all modules
	@$(INFRA)/bin/build-love-stack.sh

.PHONY: deploy
deploy: ## Deploy via Ansible
	@$(INFRA)/deploy/deploy-ansible.sh

# ============================================================================
# Maintenance
# ============================================================================

.PHONY: clean
clean: ## Remove build artifacts, caches, logs
	@$(INFRA)/bin/clean-love-stack.sh

.PHONY: clean-full
clean-full: ## Full clean including virtual environments
	@$(INFRA)/bin/clean-love-stack.sh --all

.PHONY: clean-logs
clean-logs: ## Remove large/old log files from infra/logs
	@$(INFRA)/scripts/maintenance/clean-logs.sh

.PHONY: deps
deps: ## Check dependency health
	@$(INFRA)/scripts/check-dependencies.sh

.PHONY: versions
versions: ## Sync tool versions from TOOL_VERSIONS
	@$(INFRA)/scripts/sync-versions.sh

.PHONY: verify
verify: ## Run all verification checks
	@$(INFRA)/scripts/verify-all.sh

.PHONY: status
status: ## Show stack health dashboard
	@$(INFRA)/bin/status-love-stack.sh

.PHONY: changelog
changelog: ## Generate changelog from git commits
	@$(INFRA)/scripts/maintenance/generate-changelog.sh

.PHONY: env-examples
env-examples: ## Generate .env.example for each module
	@$(INFRA)/scripts/maintenance/generate-env-examples.sh

# ============================================================================
# Database
# ============================================================================

.PHONY: db-migrate
db-migrate: ## Create Alembic migration (MSG="description")
	@$(INFRA)/scripts/db/db-manage.sh migrate "$(MSG)"

.PHONY: db-upgrade
db-upgrade: ## Upgrade database to latest migration
	@$(INFRA)/scripts/db/db-manage.sh upgrade

.PHONY: db-status
db-status: ## Show migration status
	@$(INFRA)/scripts/db/db-manage.sh status

.PHONY: db-reset
db-reset: ## DROP and recreate database (destructive!)
	@$(INFRA)/scripts/db/db-manage.sh reset

.PHONY: backup
backup: ## Backup database to infra/backups/
	@$(INFRA)/scripts/db/db-backup.sh backup

.PHONY: restore
restore: ## Restore database from backup (FILE=<path>)
	@$(INFRA)/scripts/db/db-backup.sh restore "$(FILE)"

# ============================================================================
# Performance & Analysis
# ============================================================================

.PHONY: bench
bench: ## Benchmark API response times
	@$(INFRA)/scripts/bench-apis.sh

.PHONY: dep-graph
dep-graph: ## Generate module dependency graph
	@$(INFRA)/scripts/maintenance/dep-graph.sh

.PHONY: release
release: ## Create release (TYPE=patch|minor|major)
	@$(INFRA)/scripts/maintenance/release.sh $(TYPE)

# ============================================================================
# Git Hooks
# ============================================================================

.PHONY: install-hooks
install-hooks: ## Install git hooks (post-checkout auto-sync)
	@cp $(INFRA)/hooks/post-checkout .git/hooks/post-checkout
	@chmod +x .git/hooks/post-checkout
	@echo "✅ Git hooks installed"

# ============================================================================
# Documentation
# ============================================================================

.PHONY: docs
docs: ## Serve documentation locally
	@cd docs && mkdocs serve

.PHONY: docs-build
docs-build: ## Build documentation
	@cd docs && mkdocs build
