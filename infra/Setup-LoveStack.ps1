#Requires -Version 5.1

<#
.SYNOPSIS
L.O.V.E. Stack Setup Script for Windows

.DESCRIPTION
Windows entry point for setting up the L.O.V.E. stack.
This script checks for WSL, installs it if needed, and runs the bash setup script.

.EXAMPLE
.\Setup-LoveStack.ps1

.NOTES
Requires Windows 10 version 2004 or higher (Build 19041 or higher)
or Windows 11 for WSL support.
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
    Write-Host "  L.O.V.E. Stack Setup - Windows" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
    Write-Host ""
    
    # Check WSL installation
    Write-Header "Checking WSL Installation"
    
    if (-not (Test-WSLInstalled)) {
        Write-ColoredMessage -Message "WSL is not installed" -Type Warning
        Write-Host ""
        Write-Host "The L.O.V.E. stack requires WSL (Windows Subsystem for Linux) to run." -ForegroundColor White
        Write-Host ""
        
        $install = Read-Host "Would you like to install WSL now? (y/n)"
        
        if ($install -eq 'y' -or $install -eq 'Y') {
            $success = Install-WSL
            
            if ($success) {
                Write-Host ""
                Write-Host "Please restart your computer and re-run this script." -ForegroundColor Yellow
                exit 0
            }
            else {
                Show-WSLSetupInstructions
                exit 1
            }
        }
        else {
            Show-WSLSetupInstructions
            exit 1
        }
    }
    
    Write-ColoredMessage -Message "WSL is installed" -Type Success
    
    # Check for Ubuntu distribution
    if (-not (Test-WSLDistributionInstalled)) {
        Write-ColoredMessage -Message "Ubuntu-22.04 distribution not found" -Type Warning
        Write-Host ""
        Write-Host "Installing Ubuntu-22.04..." -ForegroundColor Cyan
        
        try {
            wsl.exe --install -d Ubuntu-22.04
            Write-Host ""
            Write-ColoredMessage -Message "Ubuntu-22.04 installation initiated" -Type Success
            Write-Host ""
            Write-Host "Please complete the Ubuntu setup (create username/password) and re-run this script." -ForegroundColor Yellow
            exit 0
        }
        catch {
            Write-ColoredMessage -Message "Failed to install Ubuntu: $_" -Type Error
            exit 1
        }
    }
    
    # Always use Ubuntu-22.04 explicitly (ignore default which might be podman or docker)
    $distro = "Ubuntu-22.04"
    Write-ColoredMessage -Message "Using WSL distribution: $distro" -Type Info
    
    # Check if Ubuntu-22.04 is stopped and needs to be started
    $distroInfo = wsl.exe --list --verbose | Select-String "Ubuntu-22.04"
    if ($distroInfo -match "Stopped") {
        Write-ColoredMessage -Message "Ubuntu-22.04 is stopped, starting it..." -Type Info
    }
    
    # Set Ubuntu-22.04 as default (optional, but helps avoid confusion)
    try {
        Write-ColoredMessage -Message "Setting Ubuntu-22.04 as default WSL distribution..." -Type Info
        wsl.exe --set-default Ubuntu-22.04 2>$null
        Start-Sleep -Seconds 1
    }
    catch {
        Write-ColoredMessage -Message "Note: Could not set as default (you have other WSL distros)" -Type Warning
    }
    
    # We already validated Ubuntu-22.04 exists with Test-WSLDistributionInstalled
    # Just proceed to start it
    
    Write-Host ""
    Write-ColoredMessage -Message "Starting WSL..." -Type Info
    
    # Try starting WSL with specific distribution
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
        Write-Host "Troubleshooting:" -ForegroundColor Yellow
        Write-Host "  1. Restart WSL: " -NoNewline -ForegroundColor White
        Write-Host "wsl --shutdown" -ForegroundColor Yellow
        Write-Host "     Wait 8 seconds, then try again" -ForegroundColor White
        Write-Host ""
        Write-Host "  2. If that doesn't work, check the distribution:" -ForegroundColor White
        Write-Host "     " -NoNewline
        Write-Host "wsl -d Ubuntu-22.04" -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }
    
    Write-ColoredMessage -Message "WSL is running" -Type Success
    
    # Run the bash setup script
    Write-Host ""
    Write-Header "Running Setup Script in WSL"
    Write-Host ""
    Write-Host "This will:" -ForegroundColor Cyan
    Write-Host "  • Install Python 3.11+" -ForegroundColor White
    Write-Host "  • Install PostgreSQL, Redis, Ollama" -ForegroundColor White
    Write-Host "  • Create virtual environments" -ForegroundColor White
    Write-Host "  • Install all dependencies" -ForegroundColor White
    Write-Host ""
    
    $setupScript = Join-Path $ScriptDir "setup-love-stack.sh"
    
    if (-not (Test-Path $setupScript)) {
        Write-ColoredMessage -Message "Setup script not found: $setupScript" -Type Error
        exit 1
    }
    
    # Execute setup script in WSL with live output
    Write-ColoredMessage -Message "Starting setup (this may take several minutes)..." -Type Info
    Write-Host ""
    
    $wslScriptPath = Convert-WindowsPathToWSL -Path $setupScript
    $wslProjectPath = Convert-WindowsPathToWSL -Path $ProjectRoot
    
    # Run with interactive output, using specific distribution
    $exitCode = 0
    try {
        wsl.exe -d $distro bash -c "cd '$wslProjectPath/infra' && chmod +x setup-love-stack.sh && ./setup-love-stack.sh"
        $exitCode = $LASTEXITCODE
    }
    catch {
        Write-ColoredMessage -Message "Setup script execution failed: $_" -Type Error
        exit 1
    }
    
    Write-Host ""
    
    if ($exitCode -eq 0) {
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
        Write-Host "  Setup Complete! " -ForegroundColor Green
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
        Write-Host ""
        Write-Host "✅ L.O.V.E. stack is ready to use!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Run " -NoNewline -ForegroundColor White
        Write-Host ".\Run-LoveStack.ps1" -NoNewline -ForegroundColor Yellow
        Write-Host " to start the stack" -ForegroundColor White
        Write-Host "  2. Access the UI at " -NoNewline -ForegroundColor White
        Write-Host "http://localhost:3000" -ForegroundColor Cyan
        Write-Host ""
    }
    else {
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Red
        Write-Host "  Setup Incomplete" -ForegroundColor Red
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Red
        Write-Host ""
        Write-ColoredMessage -Message "Setup script exited with code $exitCode" -Type Error
        Write-Host ""
        Write-Host "Please check the output above for errors." -ForegroundColor Yellow
        Write-Host "You can also run the setup manually in WSL:" -ForegroundColor Yellow
        Write-Host "  wsl" -ForegroundColor Cyan
        Write-Host "  cd $wslProjectPath/infra" -ForegroundColor Cyan
        Write-Host "  ./setup-love-stack.sh" -ForegroundColor Cyan
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
