# L.O.V.E. Stack Setup Guide - Windows

## Quick Start

The L.O.V.E. stack runs on Windows via WSL (Windows Subsystem for Linux). Our PowerShell scripts handle everything automatically!

```powershell
# In PowerShell (from the infra/ directory)
.\Setup-LoveStack.ps1   # One-time setup (installs WSL if needed)
.\Run-LoveStack.ps1     # Start the stack
.\Stop-LoveStack.ps1    # Stop the stack
.\Test-LoveStack.ps1    # Verify everything works
```

That's it! The stack will be accessible from Windows at `localhost`.

## Prerequisites

### System Requirements
- **Windows 10** version 2004 or higher (Build 19041+) OR **Windows 11**
- **8GB RAM** minimum (16GB recommended)
- **20GB free disk space** (for WSL, dependencies, and models)
- **Administrator privileges** (for WSL installation)

### Optional: Enable WSL Before Running Scripts

If you want to set up WSL manually first:

```powershell
# In PowerShell as Administrator
wsl --install -d Ubuntu-22.04
```

Then restart your computer and create a Unix username/password when prompted.

## Installation Steps

### Step 1: Run Setup Script

```powershell
cd infra
.\Setup-LoveStack.ps1
```

**What this does:**
1. ✅ Checks for WSL installation
2. ✅ Installs WSL + Ubuntu 22.04 if needed
3. ✅ Runs the Linux setup script inside WSL
4. ✅ Installs Python 3.11, PostgreSQL, Redis, Ollama
5. ✅ Creates virtual environments for all modules
6. ✅ Downloads the Llama 3.1 8B model

**First-time setup takes:** 10-20 minutes (depending on download speeds)

### Step 2: Start the Stack

```powershell
.\Run-LoveStack.ps1
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Ollama (port 11434)
- Versor API (port 8001)
- Observer API (port 8000)
- Listener API (port 8002)
- Experience Web UI (port 3000)

All accessible from Windows at `localhost`!

### Step 3: Verify Setup

```powershell
.\Test-LoveStack.ps1
```

Runs health checks on all components.

## Understanding WSL

**WSL (Windows Subsystem for Linux)** lets you run a Linux environment directly on Windows without a virtual machine.

### Why WSL?
- ✅ Native Linux compatibility
- ✅ Excellent performance
- ✅ Seamless Windows integration
- ✅ Same workflow as macOS/Linux developers
- ✅ Microsoft's officially recommended approach

### WSL Architecture

```
┌─────────────────────────────────────┐
│         Windows 11/10               │
│                                     │
│  ┌──────────────────────────────┐  │
│  │   WSL 2 (Linux Kernel)       │  │
│  │                              │  │
│  │  ┌────────────────────────┐  │  │
│  │  │  Ubuntu 22.04          │  │  │
│  │  │                        │  │  │
│  │  │  • PostgreSQL          │  │  │
│  │  │  • Redis               │  │  │
│  │  │  • Python APIs         │  │  │
│  │  │  • Ollama LLM          │  │  │
│  │  └────────────────────────┘  │  │
│  └──────────────────────────────┘  │
│                                     │
│  ↕️  Network: localhost             │
│  ↕️  File System: /mnt/c/...        │
└─────────────────────────────────────┘
```

**Key Points:**
- Services in WSL are accessible from Windows at `localhost`
- Windows files are mounted at `/mnt/c/`, `/mnt/d/`, etc.
- PowerShell scripts handle all WSL interaction for you

## Accessing Services from Windows

All services run in WSL but are accessible from Windows browsers and tools:

### Web UIs
- **Main App:** http://localhost:3000
- **Admin Panel:** http://localhost:3000/admin/atlas

### API Documentation
- **Versor API:** http://localhost:8001/docs
- **Observer API:** http://localhost:8000/docs
- **Listener API:** http://localhost:8002/docs

### Database & Services
- **PostgreSQL:** `localhost:5432`
- **Redis:** `localhost:6379`
- **Ollama:** http://localhost:11434

Use your favorite Windows tools (DBeaver, Postman, etc.) to connect!

## Development Workflow

### Starting Your Day
```powershell
cd path\to\l_o_v_e\infra
.\Run-LoveStack.ps1
```

### During Development
- Edit code in Windows (VS Code, etc.)
- Changes are immediately visible to WSL
- Hot-reload works for Next.js and Python APIs
- View logs in the PowerShell window

### Ending Your Day
```powershell
.\Stop-LoveStack.ps1
# or just press Ctrl+C in the Run-LoveStack.ps1 window
```

### Running Tests
```powershell
.\Test-LoveStack.ps1
```

## VS Code Integration

### Recommended Extensions
- **WSL** - Microsoft's official WSL extension
- **Python** - For Python development
- **Pylance** - Python language server
- **Remote - WSL** - Edit files directly in WSL

### Opening Project in WSL
```bash
# In WSL terminal
cd /mnt/c/Users/YourName/code/l_o_v_e
code .
```

This opens VS Code with full WSL integration!

## Troubleshooting

### Issue: "WSL is not installed"

**Solution:** Run PowerShell as Administrator:
```powershell
wsl --install -d Ubuntu-22.04
```

Then restart your computer.

### Issue: "Ubuntu distribution not found"

**Solution:** Install Ubuntu manually:
```powershell
wsl --install -d Ubuntu-22.04
```

Follow prompts to create a username and password.

### Issue: "Failed to start WSL"

**Solution 1 - Restart WSL:**
```powershell
wsl --shutdown
# Wait 8 seconds
wsl
```

**Solution 2 - Check WSL status:**
```powershell
wsl --list --verbose
```

Should show Ubuntu running in WSL 2.

### Issue: "Port already in use"

**Solution:** Kill the process using the port:
```powershell
# Find what's using port 3000
netstat -ano | findstr :3000

# Kill the process (use PID from above)
taskkill /PID <PID> /F
```

Or in WSL:
```bash
wsl
lsof -ti :3000 | xargs kill -9
```

### Issue: "Setup script fails in WSL"

**Solution:** Run manually in WSL to see errors:
```powershell
wsl
cd /mnt/c/Users/YourName/path/to/l_o_v_e/infra
./setup-love-stack.sh
```

Check the error messages for specific issues.

### Issue: "Ollama not responding"

**Solution:** Start Ollama manually in WSL:
```bash
wsl
ollama serve &
# Check if running
curl http://localhost:11434/api/tags
```

### Issue: "PostgreSQL connection refused"

**Solution:** Start PostgreSQL in WSL:
```bash
wsl
sudo systemctl start postgresql
# or if no systemd:
sudo service postgresql start
```

### Issue: "Scripts won't run"

**Solution:** Set execution policy:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue: "Performance is slow"

**Solutions:**

1. **Move code to WSL filesystem:**
```bash
# Instead of /mnt/c/Users/... use:
cd ~
mkdir -p code
cd code
git clone <your-repo>
```

2. **Allocate more memory to WSL:**

Create/edit `C:\Users\YourName\.wslconfig`:
```ini
[wsl2]
memory=8GB
processors=4
swap=2GB
```

Then restart WSL:
```powershell
wsl --shutdown
```

## Advanced: Direct WSL Access

### Opening WSL Terminal
```powershell
wsl
```

### Running Commands in WSL from PowerShell
```powershell
wsl ls -la
wsl cat /etc/os-release
```

### Navigating Windows Files in WSL
```bash
# Windows: C:\Users\john\code\project
# In WSL:  /mnt/c/Users/john/code/project

cd /mnt/c/Users/$USER/code/l_o_v_e
```

### Using Linux Tools Directly
```bash
wsl
# Now you're in Linux!
htop                  # System monitor
ncdu                  # Disk usage
psql                  # PostgreSQL client
redis-cli            # Redis client
```

## File Management

### Where Files Live

**Windows Location:**
```
C:\Users\YourName\code\l_o_v_e\
```

**WSL Location (same files):**
```
/mnt/c/Users/YourName/code/l_o_v_e/
```

**WSL Home Directory:**
```
# In WSL: ~
# In Windows: \\wsl$\Ubuntu-22.04\home\username\
```

### Accessing WSL Files from Windows Explorer

Navigate to: `\\wsl$\Ubuntu-22.04\`

Or from the project in Windows, you can access WSL files through the network path.

## Stopping Everything

### Stop Just the APIs
```powershell
.\Stop-LoveStack.ps1
```

Leaves services (PostgreSQL, Redis, Ollama) running.

### Stop Services Too
```powershell
wsl
sudo systemctl stop postgresql redis-server
pkill ollama
```

### Completely Shutdown WSL
```powershell
wsl --shutdown
```

This stops everything and frees up memory.

## Updating the Stack

### Update Dependencies
```powershell
# In project directory
git pull
.\Setup-LoveStack.ps1  # Re-run setup
```

### Update WSL
```powershell
wsl --update
```

### Update Ubuntu Packages
```powershell
wsl
sudo apt update && sudo apt upgrade -y
```

## Uninstalling

### Remove L.O.V.E. Stack
Just delete the project folder from Windows. WSL will be cleaned up automatically when Ubuntu is removed.

### Remove WSL Ubuntu
```powershell
wsl --unregister Ubuntu-22.04
```

### Remove WSL Completely
```powershell
wsl --unregister Ubuntu-22.04
# Then in Windows Features, disable WSL
```

## Getting Help

### Check Logs
```powershell
# In infra/logs/ directory
Get-Content logs\Versor.log -Tail 50
Get-Content logs\Observer.log -Tail 50
Get-Content logs\Listener.log -Tail 50
```

Or in WSL:
```bash
tail -f infra/logs/*.log
```

### Run Diagnostics
```powershell
.\Test-LoveStack.ps1
```

### WSL Diagnostics
```powershell
wsl --list --verbose
wsl --status
```

### Check Service Status in WSL
```bash
wsl
systemctl status postgresql
systemctl status redis-server
curl http://localhost:11434/api/tags  # Ollama
```

## Tips & Best Practices

### Performance Tips
1. 🚀 Keep code in WSL filesystem (`~`) for best performance
2. 🚀 Allocate sufficient RAM in `.wslconfig`
3. 🚀 Use WSL 2 (not WSL 1)
4. 🚀 Close unused applications to free memory

### Development Tips
1. 💡 Use VS Code with Remote-WSL extension
2. 💡 Keep a WSL terminal open for quick commands
3. 💡 Use Windows tools (browsers, DB clients) with WSL services
4. 💡 Version control works from either Windows or WSL

### Maintenance Tips
1. 🔧 Regularly update WSL and Ubuntu
2. 🔧 Run `.\Test-LoveStack.ps1` after updates
3. 🔧 Restart WSL occasionally: `wsl --shutdown`
4. 🔧 Monitor disk space in WSL

## Next Steps

After setup:

1. **Start the stack:** `.\Run-LoveStack.ps1`
2. **Open the UI:** http://localhost:3000
3. **Read the documentation:** Check the `../docs/` folder
4. **Explore the APIs:** Visit the `/docs` endpoints

## Resources

- **WSL Documentation:** https://docs.microsoft.com/en-us/windows/wsl/
- **VS Code + WSL:** https://code.visualstudio.com/docs/remote/wsl
- **Ubuntu in WSL:** https://ubuntu.com/wsl
- **Project Documentation:** `../docs/README.md`

---

**Welcome to L.O.V.E. Stack on Windows! 🚀**
