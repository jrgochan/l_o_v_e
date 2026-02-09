#Requires -Version 5.1

<#
.SYNOPSIS
L.O.V.E. Stack Run Script for Windows

.DESCRIPTION
Windows entry point for starting the L.O.V.E. stack.
This script runs the bash run script in WSL.

.EXAMPLE
.\Run-LoveStack.ps1

.NOTES
Requires WSL with Ubuntu to be installed and configured.
Run Setup-LoveStack.ps1 first if you haven't already.
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
    Write-Host "  L.O.V.E. Stack - Starting Services" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
    Write-Host ""

    # Always use Ubuntu-22.04 explicitly
    $distro = "Ubuntu-22.04"

    # Check WSL installation
    if (-not (Test-WSLInstalled)) {
        Write-ColoredMessage -Message "WSL is not installed" -Type Error
        Write-Host ""
        Write-Host "Please run Setup-LoveStack.ps1 first to install WSL and set up the stack." -ForegroundColor Yellow
        exit 1
    }

    if (-not (Test-WSLDistributionInstalled)) {
        Write-ColoredMessage -Message "Ubuntu-22.04 distribution not found" -Type Error
        Write-Host ""
        Write-Host "Please run Setup-LoveStack.ps1 first to install Ubuntu and set up the stack." -ForegroundColor Yellow
        exit 1
    }

    # Start WSL with Ubuntu-22.04
    Write-ColoredMessage -Message "Starting WSL ($distro)..." -Type Info

    $wslStarted = $false
    try {
        $null = wsl.exe -d $distro echo "test" 2>&1
        if ($LASTEXITCODE -eq 0) {
            $wslStarted = $true
        }
    }
    catch {
        $wslStarted = $false
    }

    if (-not $wslStarted) {
        Write-ColoredMessage -Message "Failed to start WSL" -Type Error
        Write-Host ""
        Write-Host "Try: " -NoNewline -ForegroundColor White
        Write-Host "wsl --shutdown" -ForegroundColor Yellow
        Write-Host "Then re-run this script" -ForegroundColor White
        exit 1
    }

    Write-ColoredMessage -Message "WSL is running" -Type Success
    Write-Host ""

    # Check if setup has been run
    $runScript = Join-Path $ScriptDir "run-love-stack.sh"

    if (-not (Test-Path $runScript)) {
        Write-ColoredMessage -Message "Run script not found: $runScript" -Type Error
        exit 1
    }

    $wslProjectPath = Convert-WindowsPathToWSL -Path $ProjectRoot

    Write-ColoredMessage -Message "Starting L.O.V.E. stack..." -Type Info
    Write-Host ""
    Write-Host "This will start:" -ForegroundColor Cyan
    Write-Host "  • PostgreSQL (port 5432)" -ForegroundColor White
    Write-Host "  • Redis (port 6379)" -ForegroundColor White
    Write-Host "  • Ollama (port 11434)" -ForegroundColor White
    Write-Host "  • Versor API (port 8001)" -ForegroundColor White
    Write-Host "  • Observer API (port 8000)" -ForegroundColor White
    Write-Host "  • Listener API (port 8002)" -ForegroundColor White
    Write-Host "  • Experience Web UI (port 3000)" -ForegroundColor White
    Write-Host ""
    Write-Host "All services will be accessible from Windows at localhost" -ForegroundColor Green
    Write-Host ""
    Write-ColoredMessage -Message "Press Ctrl+C to stop all services" -Type Warning
    Write-Host ""

    # Run the script in WSL with explicit distribution
    # Note: This will keep running until Ctrl+C
    $exitCode = 0
    try {
        wsl.exe -d $distro bash -c "cd '$wslProjectPath/infra' && chmod +x run-love-stack.sh && ./run-love-stack.sh"
        $exitCode = $LASTEXITCODE
    }
    catch {
        Write-Host ""
        Write-ColoredMessage -Message "Stack execution interrupted" -Type Warning
        exit 0
    }

    Write-Host ""
    if ($exitCode -eq 0) {
        Write-ColoredMessage -Message "Stack stopped successfully" -Type Success
    }
    else {
        Write-ColoredMessage -Message "Stack stopped with code $exitCode" -Type Warning
    }
}
catch {
    Write-Host ""
    Write-ColoredMessage -Message "An error occurred: $_" -Type Error
    Write-Host ""
    Write-Host "Stack trace:" -ForegroundColor Yellow
    Write-Host $_.ScriptStackTrace -ForegroundColor Gray

    # Try to clean up
    Write-Host ""
    Write-ColoredMessage -Message "Attempting to stop services..." -Type Info
    $stopScript = Join-Path $ScriptDir "Stop-LoveStack.ps1"
    if (Test-Path $stopScript) {
        & $stopScript
    }

    exit 1
}
