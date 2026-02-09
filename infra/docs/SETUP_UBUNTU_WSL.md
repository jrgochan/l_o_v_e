# L.O.V.E. Stack Setup Guide - Ubuntu WSL

## Quick Start

The L.O.V.E. stack now supports Ubuntu WSL out of the box with automatic platform detection!

```bash
cd infra
./setup-love-stack.sh   # Detects Ubuntu and installs via apt
./run-love-stack.sh     # Starts all services and APIs
```

That's it! The scripts automatically detect you're on Ubuntu and use the appropriate package manager and service commands.

## Prerequisites

### 1. Ubuntu Version
- **Recommended:** Ubuntu 22.04 or later (has systemd support in WSL)
- **Minimum:** Ubuntu 20.04

### 2. Enable Systemd (Ubuntu 22.04+)

Edit `/etc/wsl.conf`:
```ini
[boot]
systemd=true
```

Then restart WSL:
```bash
# In Windows PowerShell
wsl --shutdown
# Restart your Ubuntu WSL
```

If you're on Ubuntu 20.04, the scripts will fall back to using the `service` command.

## What Gets Installed

The setup script automatically installs:

### System Packages
- **Python 3.11** (via deadsnakes PPA)
- **PostgreSQL 16** (via official PostgreSQL repo)
- **Redis** (via apt)
- **Node.js 18+** (via NodeSource repo)
- **FFmpeg** (via apt)
- **Build tools** (gcc, make, etc.)

### Python Modules
- Virtual environments for Versor, Observer, and Listener
- All Python dependencies from requirements.txt
- Spacy language model (for Listener)

### AI/LLM
- **Ollama** (via official install script)
- **Llama 3.1 8B** model (optional, prompted during setup)

## Manual Installation (If Script Fails)

### 1. Install Python 3.11
```bash
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3.11-dev
```

### 2. Install PostgreSQL 16
```bash
# Add PostgreSQL APT repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-16
```

### 3. Install Other Dependencies
```bash
sudo apt install -y redis-server ffmpeg build-essential
```

### 4. Install Node.js 18+
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### 5. Install Ollama
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### 6. Run Setup Script
```bash
cd infra
./setup-love-stack.sh
```

## Starting Services

### With systemd (Ubuntu 22.04+):
```bash
sudo systemctl start postgresql
sudo systemctl start redis-server
ollama serve &  # Ollama doesn't have a systemd service yet
```

### Without systemd (Ubuntu 20.04):
```bash
sudo service postgresql start
sudo service redis-server start
ollama serve &
```

### Or Use the Script (Recommended):
```bash
cd infra
./run-love-stack.sh  # Automatically detects and uses correct method
```

## Troubleshooting

### Issue: "Python 3.11 not found"
**Solution:** The deadsnakes PPA may not have been added. Run:
```bash
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3.11-dev
```

### Issue: "PostgreSQL not starting"
**Solution:** Check if systemd is enabled or use manual startup:
```bash
# With systemd
sudo systemctl status postgresql

# Without systemd
sudo service postgresql status

# Manual start
sudo -u postgres pg_ctlcluster 16 main start
```

### Issue: "Port already in use"
**Solution:** Kill the process using the port:
```bash
# Find process on port 5432 (PostgreSQL)
sudo lsof -i :5432
# Or
ss -tlnp | grep 5432

# Kill it
sudo kill -9 <PID>
```

### Issue: "Ollama not responding"
**Solution:** Start Ollama manually:
```bash
# Start in background
nohup ollama serve > /tmp/ollama.log 2>&1 &

# Check if running
curl http://localhost:11434/api/tags
```

### Issue: "Permission denied" when installing
**Solution:** Make sure you have sudo access:
```bash
sudo apt update  # Test sudo access
```

### Issue: Scripts won't run
**Solution:** Make sure they're executable:
```bash
chmod +x infra/*.sh infra/lib/*.sh
```

## Stopping the Stack

```bash
cd infra
./stop-love-stack.sh  # Stops APIs, keeps services running
```

To stop services too:
```bash
# With systemd
sudo systemctl stop postgresql redis-server
pkill ollama

# Without systemd
sudo service postgresql stop
sudo service redis-server stop
pkill ollama
```

## WSL-Specific Notes

### Memory Management
WSL has different default memory limits. If you experience issues:

Edit `.wslconfig` in your Windows user directory (`C:\Users\<YourName>\.wslconfig`):
```ini
[wsl2]
memory=8GB
processors=4
```

### Network Access
WSL uses NAT networking. Your services will be accessible from Windows at `localhost` on the same ports.

### File System Performance
For best performance, keep your code in the Linux filesystem (`~/code/...`) rather than Windows filesystem (`/mnt/c/...`).

### systemd Support
Ubuntu 22.04+ supports systemd in WSL. Check with:
```bash
systemctl --version
```

If not available, the scripts automatically fall back to `service` command.

## Differences from macOS

| Feature | macOS | Ubuntu WSL |
|---------|-------|------------|
| Package Manager | Homebrew (`brew`) | APT (`apt`) |
| Service Manager | `brew services` | `systemctl` or `service` |
| PostgreSQL | `postgresql@16` | `postgresql-16` |
| Redis | `redis` | `redis-server` |
| Python Setup | Homebrew Python | deadsnakes PPA |
| Node Setup | Homebrew Node | NodeSource repo |

**Good news:** The scripts handle all these differences automatically!

## Verifying Setup

```bash
cd infra
./test-love-stack.sh  # Runs health checks
```

Should show:
- ✅ Python 3.11+ found
- ✅ PostgreSQL installed and running
- ✅ Redis installed and running
- ✅ Ollama installed and running
- ✅ Node.js 18+ installed
- ✅ All virtual environments created

## Next Steps

After successful setup:

1. **Configure environment files** (done automatically by setup script)
2. **Start the stack:** `./run-love-stack.sh`
3. **Access the UI:** http://localhost:3000
4. **Access Admin:** http://localhost:3000/admin/atlas

## Getting Help

If you encounter issues:

1. Check the logs in `infra/logs/`
2. Run the test script: `./test-love-stack.sh`
3. Check service status manually
4. Review error messages (they're platform-aware now!)

## Platform Detection

The scripts automatically detect:
- **OS:** Ubuntu (or wsl-ubuntu if in WSL)
- **Package Manager:** apt
- **Init System:** systemd (or sysvinit on older WSL)
- **Architecture:** x86_64 or arm64

You can see this info when running any script - it's displayed at the start!

---

**Happy developing on your Ubuntu WSL desktop! 🚀**
