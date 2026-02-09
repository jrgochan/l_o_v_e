# L.O.V.E. Stack - Cross-Platform Development Guide

## Overview

The L.O.V.E. stack is designed to run consistently across multiple platforms with minimal friction. This guide explains the architecture, platform support, and how to develop effectively on any system.

## Supported Platforms

| Platform | Status | Setup Method | Notes |
|----------|--------|--------------|-------|
| **macOS** | ✅ Fully Supported | Native bash scripts | Homebrew-based |
| **Linux (Ubuntu/Debian)** | ✅ Fully Supported | Native bash scripts | APT-based |
| **Windows (WSL)** | ✅ Fully Supported | PowerShell → WSL | Ubuntu 22.04 in WSL |
| **Windows (Native)** | ⚠️ Not Yet | Future PowerShell | Complex to maintain |
| **Containers (Podman)** | 🔜 Planned | Containerfiles | Platform-independent |
| **Containers (Docker)** | 🔜 Planned | Containerfiles | Compatible with Podman |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE LAYER                     │
├─────────────────┬───────────────┬───────────────────────────┤
│   macOS/Linux   │    Windows    │      Future: Any OS       │
│   Bash Scripts  │ PowerShell    │   Container Orchestration │
│                 │ (Wrapper)     │   (Podman/Docker Compose) │
└────────┬────────┴───────┬───────┴──────────┬────────────────┘
         │                │                  │
         v                v                  v
┌─────────────────────────────────────────────────────────────┐
│              CROSS-PLATFORM ABSTRACTION LAYER               │
│                                                              │
│  lib/os-detect.sh       - Platform detection                │
│  lib/package-manager.sh - Package installation abstraction  │
│  lib/service-manager.sh - Service management abstraction    │
│  lib/common.sh          - Shared utilities                  │
│  lib/WindowsHelper.psm1 - PowerShell utilities (Windows)    │
└────────┬────────────────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────────────────┐
│                    CORE LOGIC LAYER                         │
│                                                              │
│  setup-love-stack.sh    - Initial setup                     │
│  run-love-stack.sh      - Start services                    │
│  stop-love-stack.sh     - Stop services                     │
│  test-love-stack.sh     - Health checks                     │
└────────┬────────────────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                            │
│                                                              │
│  PostgreSQL  Redis  Ollama  Versor  Observer  Listener      │
└─────────────────────────────────────────────────────────────┘
```

## Platform-Specific Details

### macOS

**Package Manager:** Homebrew (`brew`)

**Service Manager:** `brew services`

**Advantages:**
- Native Unix environment
- Excellent developer tools
- Great performance

**Setup:**
```bash
cd infra
./setup-love-stack.sh
./run-love-stack.sh
```

**Package Mapping:**
- PostgreSQL: `postgresql@16`
- Python: `python@3.11`
- Redis: `redis`

### Linux (Ubuntu/Debian)

**Package Manager:** APT (`apt-get`)

**Service Manager:** systemd (`systemctl`) or SysV init (`service`)

**Advantages:**
- Native Linux environment
- Official packages
- Flexible and powerful

**Setup:**
```bash
cd infra
./setup-love-stack.sh
./run-love-stack.sh
```

**Package Mapping:**
- PostgreSQL: `postgresql-16`
- Python: `python3.11` (via deadsnakes PPA)
- Redis: `redis-server`

### Windows (WSL)

**Package Manager:** APT in WSL

**Service Manager:** systemd or SysV init in WSL

**Advantages:**
- Full Linux compatibility
- Native Windows integration
- Seamless file sharing

**Setup:**
```powershell
cd infra
.\Setup-LoveStack.ps1
.\Run-LoveStack.ps1
```

**How It Works:**
1. PowerShell scripts detect/install WSL
2. Ubuntu 22.04 runs in WSL
3. Bash scripts execute inside WSL
4. Services accessible from Windows at `localhost`

## Cross-Platform Abstraction

### OS Detection

The `lib/os-detect.sh` library detects:
- Operating system (macOS, Ubuntu, Debian, etc.)
- Package manager (brew, apt, dnf, etc.)
- Init system (systemd, brew-services, etc.)
- Special environments (WSL, containers)

```bash
# Usage in scripts
detect_os                # Returns: "macos", "ubuntu", "wsl-ubuntu", etc.
detect_package_manager   # Returns: "brew", "apt", etc.
detect_init_system       # Returns: "systemd", "brew-services", etc.
is_wsl                   # Returns: 0 if WSL, 1 otherwise
```

### Package Management

The `lib/package-manager.sh` library abstracts:
- Package installation
- Package name mapping
- Repository management

```bash
# Usage in scripts
install_package python3.11          # Installs correct package per platform
install_python_311                  # Handles PPA on Ubuntu
install_postgresql_16               # Handles official repos
map_package_name postgresql         # Returns platform-specific name
```

### Service Management

The `lib/service-manager.sh` library abstracts:
- Service start/stop/restart
- Service status checks
- Service name mapping

```bash
# Usage in scripts
start_service postgresql            # Uses correct method per platform
stop_service redis                  # Platform-aware
check_service_running ollama        # Works everywhere
```

## Development Workflows

### Native Development (Current)

**Best for:** Day-to-day development, fast iteration

```bash
# macOS/Linux
cd infra
./setup-love-stack.sh    # One-time
./run-love-stack.sh      # Start services
./stop-love-stack.sh     # Stop services

# Windows
cd infra
.\Setup-LoveStack.ps1
.\Run-LoveStack.ps1
.\Stop-LoveStack.ps1
```

**Advantages:**
- ✅ Fast hot-reload
- ✅ Direct system access
- ✅ Easy debugging
- ✅ Familiar environment

**Disadvantages:**
- ⚠️ Requires system-level package installation
- ⚠️ Potential version conflicts
- ⚠️ Different environments across team

### Hybrid Development (Future)

**Best for:** Consistent services, flexible development

```bash
# Start services in containers
podman-compose -f compose/compose.services.yml up -d

# Run APIs natively for fast iteration
cd infra
./run-love-stack.sh
```

**Advantages:**
- ✅ Consistent PostgreSQL, Redis, Ollama versions
- ✅ Easy cleanup (just stop containers)
- ✅ APIs still run natively (fast reload)
- ✅ No system-level service installation

**Disadvantages:**
- ⚠️ Requires Podman/Docker
- ⚠️ Slightly more complex setup

### Full Containerization (Future)

**Best for:** Production-like environment, deployment testing

```bash
# Everything in containers
podman-compose -f compose/compose.yml up
```

**Advantages:**
- ✅ Complete consistency
- ✅ Production parity
- ✅ Easy to share
- ✅ Works on any platform

**Disadvantages:**
- ⚠️ Slower reload cycles
- ⚠️ More complex debugging
- ⚠️ Resource overhead

## File Structure for Multi-Platform Support

```
infra/
├── setup-love-stack.sh          # Core setup (Unix/WSL)
├── run-love-stack.sh            # Core run (Unix/WSL)
├── stop-love-stack.sh           # Core stop (Unix/WSL)
├── test-love-stack.sh           # Core test (Unix/WSL)
│
├── Setup-LoveStack.ps1          # Windows wrapper
├── Run-LoveStack.ps1            # Windows wrapper
├── Stop-LoveStack.ps1           # Windows wrapper
├── Test-LoveStack.ps1           # Windows wrapper
│
├── lib/                          # Cross-platform libraries
│   ├── os-detect.sh             # Platform detection
│   ├── package-manager.sh       # Package abstraction
│   ├── service-manager.sh       # Service abstraction
│   ├── common.sh                # Shared utilities
│   └── WindowsHelper.psm1       # PowerShell helpers
│
├── containers/                   # Future: Containerfiles
│   ├── Containerfile.versor
│   ├── Containerfile.observer
│   ├── Containerfile.listener
│   └── ...
│
├── compose/                      # Future: Compose files
│   ├── compose.yml              # Full stack
│   ├── compose.dev.yml          # Dev overrides
│   └── compose.services.yml     # Services only
│
├── README.md                     # Main docs
├── SETUP_UBUNTU_WSL.md          # Ubuntu/WSL guide
├── SETUP_WINDOWS.md             # Windows guide
└── CROSS_PLATFORM_GUIDE.md      # This file
```

## Platform Migration Paths

### From macOS to Linux
1. Code works identically
2. May need to adjust package names (handled by libraries)
3. Different init system (handled by libraries)

### From macOS to Windows (WSL)
1. Use PowerShell scripts
2. Everything runs in WSL (Ubuntu)
3. Access from Windows at `localhost`

### From Native to Containers
1. Build container images
2. Use compose files
3. Same code, different runtime

## Best Practices

### Writing Cross-Platform Scripts

**DO:**
- ✅ Use abstraction libraries (`lib/*.sh`)
- ✅ Test on multiple platforms
- ✅ Use POSIX-compliant shell syntax
- ✅ Handle platform-specific edge cases
- ✅ Document platform requirements

**DON'T:**
- ❌ Hard-code package names
- ❌ Hard-code service names
- ❌ Assume specific paths
- ❌ Use bash-only features in sh scripts
- ❌ Skip error handling

### Example: Platform-Aware Script

```bash
#!/bin/bash

# Source libraries
. "$(dirname "$0")/lib/os-detect.sh"
. "$(dirname "$0")/lib/service-manager.sh"

# Detect platform
OS=$(detect_os)
echo "Detected OS: $OS"

# Platform-agnostic service management
start_service postgresql  # Works on macOS, Linux, WSL
start_service redis       # Automatically uses correct method

# Check service status
if check_service_running postgresql; then
    echo "PostgreSQL is running"
fi
```

## Testing Across Platforms

### Manual Testing Checklist

Test on each supported platform:

- [ ] Setup script completes without errors
- [ ] All services start successfully
- [ ] APIs are accessible at correct ports
- [ ] Test script passes
- [ ] Stop script cleanly stops services
- [ ] No platform-specific errors in logs

### Automated Testing (Future)

GitHub Actions / GitLab CI matrix:
```yaml
strategy:
  matrix:
    os: [ubuntu-22.04, macos-13, windows-2022]

steps:
  - name: Setup L.O.V.E. Stack
    run: |
      # Platform detection in CI
      cd infra
      ./setup-love-stack.sh || .\Setup-LoveStack.ps1
```

## Migration Strategies

### Moving Code Between Platforms

**Scenario 1: Developed on macOS, Deploy on Linux**
```bash
# On Linux server
git clone <repo>
cd infra
./setup-love-stack.sh  # Automatically adapts to Linux
./run-love-stack.sh
```

**Scenario 2: Developed on Windows, Team on macOS**
```bash
# Team members on macOS
git clone <repo>
cd infra
./setup-love-stack.sh  # Native macOS setup
```

**Scenario 3: Moving to Containers**
```bash
# Any platform
git clone <repo>
podman-compose -f infra/compose/compose.yml up
```

## Future: Native Windows Support

**Status:** Not currently implemented (WSL is recommended)

**If implemented, would require:**
1. Full PowerShell script suite (not just wrappers)
2. Windows-native package installation (Chocolatey/winget)
3. Windows Services integration
4. Significant maintenance overhead

**Estimated effort:** 4-6 days initial + ongoing maintenance

**Decision:** WSL provides better developer experience with less maintenance

## Future: Container-First Approach

**Status:** Planned for Phase 2

### Benefits
- ✅ True "write once, run anywhere"
- ✅ No system dependencies
- ✅ Easy CI/CD integration
- ✅ Production parity

### Timeline
- **Phase 2.1:** Create Containerfiles (2 days)
- **Phase 2.2:** Create compose files (1 day)
- **Phase 2.3:** Testing and docs (1 day)

### Migration Path
```
Current (Native)
    ↓
Phase 2.1 (Hybrid - Services in containers)
    ↓
Phase 2.2 (Full containerization)
    ↓
Phase 2.3 (Kubernetes ready)
```

## Troubleshooting Platform Issues

### Issue: Script works on macOS but not Linux

**Likely cause:** bash-specific syntax

**Solution:** Use POSIX-compliant syntax or check OS first

### Issue: Package not found

**Likely cause:** Package name differs between platforms

**Solution:** Use `map_package_name` function

### Issue: Service won't start

**Likely cause:** Different init system

**Solution:** Use `start_service` function (handles all init systems)

### Issue: Path issues on Windows

**Likely cause:** Backslash vs forward slash

**Solution:** PowerShell module handles path conversion

## Resources

- **Bash Best Practices:** https://google.github.io/styleguide/shellguide.html
- **POSIX Shell:** https://pubs.opengroup.org/onlinepubs/9699919799/
- **WSL Documentation:** https://docs.microsoft.com/en-us/windows/wsl/
- **Podman Guide:** https://podman.io/getting-started/

## Contributing

When adding new features:

1. Test on at least 2 platforms (macOS + Linux or Windows)
2. Use abstraction libraries for platform-specific operations
3. Update this guide if adding new platform support
4. Document any platform-specific quirks

---

**The goal: Write once, run everywhere. The reality: Abstract well, test thoroughly.** 🚀
