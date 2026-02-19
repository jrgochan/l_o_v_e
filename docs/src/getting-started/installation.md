# Installation Guide

## Prerequisites

### System Requirements

- **Python:** 3.12+
- **PostgreSQL:** 18+ (with pgvector extension)
- **pgvector:** 0.5.0+
- **Redis:** 6.0+
- **Node.js:** 18.0+
- **Ollama:** Latest
- **ffmpeg:** Latest

### Operating Systems

- macOS (recommended)
- Ubuntu/Debian Linux
- Windows WSL2

## Quick Install

### macOS

```bash
# Install dependencies
brew install postgresql pgvector redis ollama ffmpeg node python@3.12

# Clone the monorepo
cd ~/code
git clone git@github.com:jrgochan/l_o_v_e.git
cd l_o_v_e

# Run setup
cd infra
./bin/setup-love-stack.sh
```

### Ubuntu/Debian

```bash
# Install dependencies
sudo apt update
sudo apt install postgresql redis-server ffmpeg nodejs npm python3.12

# Install pgvector (see infra/PGVECTOR_SETUP.md)

# Clone and setup (same as macOS)
```

## Detailed Installation

### 1. Install System Dependencies

See version requirements in `infra/TOOL_VERSIONS`

### 2. Clone Repositories

The L.O.V.E. Stack uses a multi-repository structure:

- `infra/` - Infrastructure and setup scripts
- `observer/` - Emotional state tracking module
- `versor/` - Quaternion mathematics module
- `listener/` - Audio processing module
- `experience/` - User interface module

### 3. Run Setup Script

```bash
cd infra
./bin/setup-love-stack.sh --help  # See all options
./bin/setup-love-stack.sh         # Interactive setup
```

The setup script will:

1. Check Python 3.12+
2. Verify system dependencies
3. Create virtual environments
4. Install Python packages
5. Download Ollama model (4.7GB)
6. Initialize database
7. Seed data (87 emotions, strategies, patterns)

## Setup Options

```bash
# Fastest re-run (if already setup)
./bin/setup-love-stack.sh --minimal

# CI/CD automated
./bin/setup-love-stack.sh --yes

# Skip large downloads
./bin/setup-love-stack.sh --skip-ollama

# Fresh complete install
./bin/setup-love-stack.sh --clean
```

## Troubleshooting

### Python 3.12 not found

```bash
# macOS
brew install python@3.12

# Ubuntu
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt install python3.12
```

### pgvector not available

See `infra/PGVECTOR_SETUP.md` for detailed installation guide.

### Database seeding fails

- Ensure Versor is running (auto-started by setup script)
- Check `/tmp/versor.log` for errors
- Re-run: `cd infra && ./init-database.sh`

## Verification

```bash
# Check database
psql -U love_user -d love_db -c "SELECT COUNT(*) FROM atlas_definitions;"
# Should return 87

# Start the stack
cd infra
./bin/run-love-stack.sh
```

## Next Steps

See [Quick Start Guide](quick-start.md) for your first API calls and basic usage.
