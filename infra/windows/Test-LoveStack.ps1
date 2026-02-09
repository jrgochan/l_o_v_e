#Requires -Version 5.1

<#
.SYNOPSIS
L.O.V.E. Stack Test Script for Windows

.DESCRIPTION
Windows entry point for testing the L.O.V.E. stack.
This script runs the bash test script in WSL to verify setup and health.

.EXAMPLE
.\Test-LoveStack.ps1

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
    Write-Host "  L.O.V.E. Stack - Health Checks & Tests" -ForegroundColor Cyan
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

    Write-ColoredMessage -Message "WSL is running" -Type Success
    Write-Host ""

    # Check if test script exists
    $testScript = Join-Path $ScriptDir "test-love-stack.sh"

    if (-not (Test-Path $testScript)) {
        Write-ColoredMessage -Message "Test script not found: $testScript" -Type Error
        exit 1
    }

    Write-ColoredMessage -Message "Running L.O.V.E. stack health checks..." -Type Info
    Write-Host ""
    Write-Host "This will verify:" -ForegroundColor Cyan
    Write-Host "  • Python 3.11+ installation" -ForegroundColor White
    Write-Host "  • PostgreSQL status" -ForegroundColor White
    Write-Host "  • Redis status" -ForegroundColor White
    Write-Host "  • Ollama status" -ForegroundColor White
    Write-Host "  • Virtual environments" -ForegroundColor White
    Write-Host "  • API endpoints (if running)" -ForegroundColor White
    Write-Host ""

    $wslProjectPath = Convert-WindowsPathToWSL -Path $ProjectRoot

    # Run the test script in WSL with explicit distribution
    $exitCode = 0
    try {
        wsl.exe -d $distro bash -c "cd '$wslProjectPath/infra' && chmod +x test-love-stack.sh && ./test-love-stack.sh"
        $exitCode = $LASTEXITCODE
    }
    catch {
        Write-ColoredMessage -Message "Test script execution failed: $_" -Type Error
        exit 1
    }

    Write-Host ""

    if ($exitCode -eq 0) {
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
        Write-Host "  All Tests Passed! ✅" -ForegroundColor Green
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
        Write-Host ""
        Write-Host "The L.O.V.E. stack is healthy and ready to use!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Access points from Windows:" -ForegroundColor Cyan
        Write-Host "  • Versor API:  http://localhost:8001/docs" -ForegroundColor White
        Write-Host "  • Observer API: http://localhost:8000/docs" -ForegroundColor White
        Write-Host "  • Listener API: http://localhost:8002/docs" -ForegroundColor White
        Write-Host "  • Web UI:       http://localhost:3000" -ForegroundColor White
        Write-Host ""
    }
    else {
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Yellow
        Write-Host "  Some Tests Failed" -ForegroundColor Yellow
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Yellow
        Write-Host ""
        Write-ColoredMessage -Message "Test script exited with code $exitCode" -Type Warning
        Write-Host ""
        Write-Host "Please review the output above for issues." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Common fixes:" -ForegroundColor Cyan
        Write-Host "  • Run Setup-LoveStack.ps1 to ensure all dependencies are installed" -ForegroundColor White
        Write-Host "  • Run Run-LoveStack.ps1 to start services if they're not running" -ForegroundColor White
        Write-Host "  • Check WSL: wsl --list --verbose" -ForegroundColor White
        Write-Host ""
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
