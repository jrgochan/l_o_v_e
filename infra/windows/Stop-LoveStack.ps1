#Requires -Version 5.1

<#
.SYNOPSIS
L.O.V.E. Stack Stop Script for Windows

.DESCRIPTION
Windows entry point for stopping the L.O.V.E. stack APIs.
This script runs the bash stop script in WSL.

.EXAMPLE
.\Stop-LoveStack.ps1

.NOTES
Requires WSL with Ubuntu to be installed and configured.
This stops APIs but leaves services (PostgreSQL, Redis, Ollama) running.
#>

[CmdletBinding()]
param()

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# Import Windows helper module
Import-Module "$ScriptDir\lib\WindowsHelper.psm1" -Force

# Main execution
try {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
    Write-Host "  L.O.V.E. Stack - Stopping Services" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
    Write-Host ""

    # Always use Ubuntu-22.04 explicitly
    $distro = "Ubuntu-22.04"

    # Check WSL installation
    if (-not (Test-WSLInstalled)) {
        Write-ColoredMessage -Message "WSL is not installed" -Type Error
        Write-Host ""
        Write-Host "Cannot stop services without WSL." -ForegroundColor Yellow
        exit 1
    }

    if (-not (Test-WSLDistributionInstalled)) {
        Write-ColoredMessage -Message "Ubuntu-22.04 distribution not found" -Type Error
        exit 1
    }

    # Check if stop script exists
    $stopScript = Join-Path $ScriptDir "stop-love-stack.sh"

    if (-not (Test-Path $stopScript)) {
        Write-ColoredMessage -Message "Stop script not found: $stopScript" -Type Error
        exit 1
    }

    Write-ColoredMessage -Message "Stopping L.O.V.E. stack APIs..." -Type Info
    Write-Host ""

    $wslProjectPath = Convert-WindowsPathToWSL -Path $ProjectRoot

    # Run the stop script in WSL with explicit distribution
    $exitCode = 0
    try {
        wsl.exe -d $distro bash -c "cd '$wslProjectPath/infra' && chmod +x stop-love-stack.sh && ./stop-love-stack.sh"
        $exitCode = $LASTEXITCODE
    }
    catch {
        Write-ColoredMessage -Message "Stop script execution failed: $_" -Type Error
        exit 1
    }

    Write-Host ""

    if ($exitCode -eq 0) {
        Write-ColoredMessage -Message "All APIs stopped successfully" -Type Success
        Write-Host ""
        Write-Host "Note: Services (PostgreSQL, Redis, Ollama) are still running." -ForegroundColor Cyan
        Write-Host "To stop them, run the following in WSL:" -ForegroundColor Cyan
        Write-Host "  wsl" -ForegroundColor Yellow
        Write-Host "  sudo systemctl stop postgresql redis-server" -ForegroundColor Yellow
        Write-Host "  pkill ollama" -ForegroundColor Yellow
        Write-Host ""
    }
    else {
        Write-ColoredMessage -Message "Stop script exited with code $exitCode" -Type Warning
        Write-Host ""
        Write-Host "Some services may still be running." -ForegroundColor Yellow
        exit $exitCode
    }
}
catch {
    Write-Host ""
    Write-ColoredMessage -Message "An error occurred: $_" -Type Error
    Write-Host ""
    Write-Host "Stack trace:" -ForegroundColor Yellow
    Write-Host $_.ScriptStackTrace -ForegroundColor Gray
    exit 1
}
