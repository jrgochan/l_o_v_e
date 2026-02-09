# L.O.V.E. Stack - Cross-Platform Implementation Plan

## Overview

This document outlines the plan to make the L.O.V.E. stack fully POSIX-compliant and compatible with Ubuntu WSL, while maintaining backward compatibility with macOS.

## Current State Analysis

### Issues Identified

#### 1. macOS-Specific Dependencies
- **Homebrew (`brew`)** - Package and service management
- **Hardcoded paths**: `/opt/homebrew/bin`, `/usr/local/bin`
- **Service management**: `brew services start/stop postgresql@16 redis`
- **Package names**: `postgresql@16` (Homebrew-specific versioning)

#### 2. Non-POSIX Shell Syntax
- `read -n 1` - bash-specific flag
- `[[ ]]` double brackets - bash extension (POSIX uses `[ ]`)
- `=~` regex operator - bash-specific
- `source` command - bash built-in (POSIX uses `.`)

#### 3. Missing Cross-Platform Logic
- No OS detection (macOS vs Linux)
- No package manager detection (apt, yum, pacman, brew)
- No init system detection (systemd vs SysV vs brew services)
- Assumes specific service names and locations

## Implementation Strategy

### Phase 1: Cross-Platform Library (CURRENT FOCUS)

Create reusable library files in `infra/lib/`:

#### 1. `os-detect.sh` - Platform Detection
```bash
detect_os()              # Returns: "macos", "ubuntu", "debian", "rhel", "wsl", "unknown"
detect_package_manager() # Returns: "brew", "apt", "yum", "dnf", "pacman"
detect_init_system()     # Returns: "systemd", "brew-services", "sysvinit", "none"
is_wsl()                 # Returns: 0 if WSL, 1 otherwise
```

#### 2. `package-manager.sh` - Package Management Abstraction
```bash
install_package()            # Usage: install_package python3.11
check_package_installed()    # Returns: 0 if installed, 1 otherwise
map_package_name()          # Translates package names between systems
```

**Package Name Mappings:**
- `postgresql@16` (macOS) → `postgresql-16` (Ubuntu)
- `python@3.11` (macOS) → `python3.11` (Ubuntu)
- `redis` (macOS) → `redis-server` (Ubuntu)

#### 3. `service-manager.sh` - Service Management Abstraction
```bash
start_service()              # Usage: start_service postgresql
stop_service()               # Usage: stop_service postgresql
check_service_running()      # Returns: 0 if running, 1 otherwise
restart_service()            # Usage: restart_service redis
```

**Service Management Methods:**
- **macOS**: `brew services start/stop/restart`
- **Ubuntu with systemd**: `sudo systemctl start/stop/restart`
- **Ubuntu without systemd**: `sudo service start/stop/restart`
- **Manual**: Direct process management

#### 4. `common.sh` - Shared Utilities
```bash
# POSIX-compliant utilities
print_success()
print_error()
print_warning()
print_info()
print_header()
prompt_yes_no()             # POSIX-compliant user prompts
string_contains()           # Uses 'case' instead of '=~'
command_exists()
```

### Phase 2: Update Main Scripts

#### Scripts to Update:
1. `setup-love-stack.sh` - Initial setup
2. `run-love-stack.sh` - Start all services
3. `stop-love-stack.sh` - Stop all services
4. `test-love-stack.sh` - Health checks and tests

#### POSIX Compliance Changes:
- Replace `#!/bin/bash` → `#!/bin/sh` (or ensure bash scripts are POSIX-compliant)
- Replace `[[` → `[`
- Replace `=~` → `case` statements or `grep`
- Replace `read -n 1` → standard `read`
- Replace `source` → `.`

#### Ubuntu-Specific Additions:

**Python 3.11 Installation:**
```bash
# Add deadsnakes PPA
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3.11-dev
```

**PostgreSQL 16 Installation:**
```bash
# Add PostgreSQL APT repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-16
```

**Ollama Installation:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Node.js 18+ Installation:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

#### WSL Considerations:

1. **Systemd Detection:**
   - Ubuntu 22.04+ WSL supports systemd
   - Older versions require `service` command
   - Check `/etc/wsl.conf` for systemd setting

2. **Port Management:**
   - Use `ss` or `netstat` instead of `lsof` (more portable)
   - Both are available on Ubuntu

3. **Process Management:**
   - Replace `pkill` with portable alternatives
   - Use PID files for tracking

### Phase 3: Documentation

#### Files to Create:
1. `infra/SETUP_UBUNTU_WSL.md` - Complete Ubuntu WSL setup guide
2. `infra/CROSS_PLATFORM_GUIDE.md` - General cross-platform information
3. Update `infra/README.md` - Add platform compatibility section

### Phase 4: Testing

**Test Matrix:**
- ✅ macOS 13+ with Homebrew (existing)
- 🆕 Ubuntu 20.04 WSL (without systemd)
- 🆕 Ubuntu 22.04+ WSL (with systemd)
- 🆕 Native Ubuntu 22.04+

**Test Checklist:**
- [ ] Scripts run without errors
- [ ] All services start successfully
- [ ] APIs accessible on correct ports
- [ ] Python environments created properly
- [ ] Dependencies installed correctly
- [ ] Tests pass on all platforms

## Future: Containerization Roadmap

*(Documented for future reference - not current implementation)*

### Phase A: Services-Only Docker Compose
**Timeline:** 1 day
**Priority:** Medium

Run PostgreSQL, Redis, and Ollama in containers while keeping APIs local for fast iteration.

```yaml
# docker-compose.services.yml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: love_dev
    ports: ["5432:5432"]
    volumes: ["postgres-data:/var/lib/postgresql/data"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes: ["redis-data:/data"]

  ollama:
    image: ollama/ollama:latest
    ports: ["11434:11434"]
    volumes: ["ollama-models:/root/.ollama"]

volumes:
  postgres-data:
  redis-data:
  ollama-models:
```

**Benefits:**
- ✅ Consistent service versions across team
- ✅ No system-level service installation needed
- ✅ Easy cleanup and reset
- ✅ APIs still run locally for fast hot-reload

**Usage:**
```bash
# Start services
docker compose -f docker-compose.services.yml up -d

# Run APIs locally as before
cd versor && source venv/bin/activate && uvicorn app.main:app --port 8001
# etc.
```

### Phase B: Full Stack Containerization
**Timeline:** 2-3 days
**Priority:** Low (future)

Complete containerization of all modules.

**Dockerfiles Required:**
- `versor/Dockerfile`
- `observer/Dockerfile`
- `listener/Dockerfile`
- `experience/web/Dockerfile`

**Full Docker Compose:**
```yaml
version: '3.8'
services:
  postgres: { ... }
  redis: { ... }
  ollama: { ... }

  versor:
    build: ./versor
    depends_on: [postgres, redis]
    ports: ["8001:8001"]

  observer:
    build: ./observer
    depends_on: [postgres, redis]
    ports: ["8000:8000"]

  listener:
    build: ./listener
    depends_on: [redis, ollama]
    ports: ["8002:8002"]

  experience:
    build: ./experience/web
    depends_on: [versor, observer, listener]
    ports: ["3000:3000"]
```

### Phase C: Development Workflow Scripts
**Timeline:** 1 day
**Priority:** Low (future)

Provide flexible development options:

```bash
infra/
├── docker-compose.yml              # Full production-like stack
├── docker-compose.dev.yml          # Development overrides (volumes, hot-reload)
├── docker-compose.services.yml     # Services only
└── scripts/
    ├── dev-local.sh               # Everything local (current)
    ├── dev-hybrid.sh              # Services in Docker, APIs local
    └── dev-full.sh                # Everything in Docker
```

**Hybrid Development Mode** (Recommended):
```bash
# Start services in Docker
docker compose -f docker-compose.services.yml up -d

# Run APIs locally with hot-reload
./run-love-stack.sh
```

### Phase D: CI/CD Integration
**Timeline:** 1 day
**Priority:** Medium (when ready)

GitHub Actions / GitLab CI integration:

```yaml
# .github/workflows/test.yml
name: Test L.O.V.E. Stack
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Start services
        run: docker compose up -d

      - name: Wait for services
        run: |
          timeout 30 bash -c 'until docker compose exec postgres pg_isready; do sleep 1; done'

      - name: Run Versor tests
        run: docker compose run versor pytest

      - name: Run Observer tests
        run: docker compose run observer pytest

      - name: Run Listener tests
        run: docker compose run listener pytest -m "not slow"
```

## Implementation Timeline

### Current Sprint: POSIX Scripts (3 hours)

**Step 1:** Create library files (30 min)
- [x] `infra/lib/os-detect.sh`
- [x] `infra/lib/package-manager.sh`
- [x] `infra/lib/service-manager.sh`
- [x] `infra/lib/common.sh`

**Step 2:** Update setup script (45 min)
- [ ] Refactor `setup-love-stack.sh`
- [ ] Add Ubuntu support
- [ ] Make POSIX-compliant

**Step 3:** Update runtime scripts (30 min)
- [ ] Refactor `run-love-stack.sh`
- [ ] Refactor `stop-love-stack.sh`
- [ ] Add platform detection

**Step 4:** Update test script (20 min)
- [ ] Refactor `test-love-stack.sh`
- [ ] POSIX compliance

**Step 5:** Documentation (15 min)
- [ ] Create `SETUP_UBUNTU_WSL.md`
- [ ] Update main `README.md`

**Step 6:** Testing (30 min)
- [ ] Test on macOS (regression)
- [ ] Test on Ubuntu WSL

### Future Sprints

**Sprint 2: Services-Only Docker** (1 day)
- When team expands or deployment needed

**Sprint 3: Full Containerization** (2-3 days)
- When preparing for production deployment

**Sprint 4: CI/CD** (1 day)
- When ready for automated testing

## Success Criteria

### Phase 1 (Current)
- ✅ All scripts run on both macOS and Ubuntu WSL
- ✅ No manual intervention required after initial setup
- ✅ Backward compatible with existing macOS setup
- ✅ Clear error messages for missing dependencies
- ✅ Documentation for Ubuntu WSL users

### Future Phases
- ✅ One-command Docker Compose startup
- ✅ Hot-reload working in containerized development
- ✅ CI/CD pipeline passing all tests
- ✅ Production-ready container images

## Notes

- **Current Priority**: POSIX compliance and Ubuntu WSL support
- **Development Environment**: Local services (fast iteration)
- **Future Direction**: Containerization for consistency and deployment
- **Team Size**: Solo developer (documentation for potential growth)
- **CI/CD**: Planned for future when deployment pipeline needed

## Questions & Decisions

**Q: Why not start with Docker?**
A: Local development is faster for iteration. Docker adds value for team consistency and deployment, which will be needed later.

**Q: Why keep bash instead of pure POSIX sh?**
A: Bash is universally available (macOS, WSL, Linux). We'll use POSIX-compliant bash syntax to maximize portability.

**Q: How to handle Python 3.11 on older Ubuntu?**
A: Use deadsnakes PPA for easy installation on Ubuntu 20.04+.

**Q: What about Windows native (non-WSL)?**
A: Not currently planned. WSL is the recommended Windows development environment. Docker would be the path for Windows native support.

## References

- [POSIX Shell Command Language](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html)
- [Bash vs POSIX](https://wiki.ubuntu.com/DashAsBinSh)
- [WSL systemd support](https://devblogs.microsoft.com/commandline/systemd-support-is-now-available-in-wsl/)
- [Docker Compose specification](https://docs.docker.com/compose/compose-file/)

---

**Last Updated:** December 8, 2025
**Status:** Phase 1 Implementation In Progress
