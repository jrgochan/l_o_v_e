# WindowsHelper.psm1
# PowerShell module for L.O.V.E. Stack Windows support
# Provides WSL detection, installation, and command execution helpers

#Requires -Version 5.1

# Module variables
$script:WSLDistroName = "Ubuntu-22.04"
$script:ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

function Write-ColoredMessage {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message,
        
        [Parameter(Mandatory = $true)]
        [ValidateSet('Success', 'Error', 'Warning', 'Info', 'Header')]
        [string]$Type
    )
    
    $symbols = @{
        Success = "✅"
        Error   = "❌"
        Warning = "⚠️ "
        Info    = "ℹ️ "
        Header  = "🚀"
    }
    
    $colors = @{
        Success = 'Green'
        Error   = 'Red'
        Warning = 'Yellow'
        Info    = 'Cyan'
        Header  = 'Blue'
    }
    
    Write-Host "$($symbols[$Type]) " -NoNewline -ForegroundColor $colors[$Type]
    Write-Host $Message -ForegroundColor $colors[$Type]
}

function Write-Header {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Title
    )
    
    Write-Host ""
    Write-ColoredMessage -Message $Title -Type Header
    Write-Host ("=" * 50)
}

function Test-WSLInstalled {
    <#
    .SYNOPSIS
    Checks if WSL is installed on the system
    
    .DESCRIPTION
    Tests for WSL installation by checking wsl.exe availability
    
    .OUTPUTS
    Boolean indicating if WSL is installed
    #>
    
    try {
        $null = wsl.exe --version 2>$null
        return $true
    }
    catch {
        return $false
    }
}

function Test-WSLDistributionInstalled {
    <#
    .SYNOPSIS
    Checks if a specific WSL distribution is installed
    
    .PARAMETER DistroName
    Name of the distribution to check (default: Ubuntu-22.04)
    
    .OUTPUTS
    Boolean indicating if the distribution is installed
    #>
    
    [CmdletBinding()]
    param(
        [string]$DistroName = $script:WSLDistroName
    )
    
    if (-not (Test-WSLInstalled)) {
        return $false
    }
    
    try {
        $distros = wsl.exe --list --quiet 2>$null | ForEach-Object { $_.Trim() }
        return $distros -contains $DistroName
    }
    catch {
        return $false
    }
}

function Get-WSLDefaultDistribution {
    <#
    .SYNOPSIS
    Gets the default WSL distribution name
    
    .OUTPUTS
    String containing the default distribution name, or $null if none set
    #>
    
    if (-not (Test-WSLInstalled)) {
        return $null
    }
    
    try {
        $output = wsl.exe --list --verbose 2>$null
        $lines = $output -split "`n" | Where-Object { $_ -match '\*' }
        if ($lines) {
            $distro = ($lines[0] -replace '\*', '').Trim() -split '\s+' | Select-Object -First 1
            return $distro
        }
    }
    catch {
        return $null
    }
    
    return $null
}

function Install-WSL {
    <#
    .SYNOPSIS
    Installs WSL with Ubuntu distribution
    
    .DESCRIPTION
    Installs WSL 2 with Ubuntu 22.04 distribution using wsl --install command.
    Requires administrator privileges and may require a system restart.
    
    .OUTPUTS
    Boolean indicating success or failure
    #>
    
    Write-Header "Installing WSL"
    
    # Check if running as administrator
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    
    if (-not $isAdmin) {
        Write-ColoredMessage -Message "Administrator privileges required to install WSL" -Type Error
        Write-Host ""
        Write-Host "Please run this script as Administrator or install WSL manually:" -ForegroundColor Yellow
        Write-Host "  1. Open PowerShell as Administrator" -ForegroundColor Cyan
        Write-Host "  2. Run: wsl --install -d $script:WSLDistroName" -ForegroundColor Cyan
        Write-Host ""
        return $false
    }
    
    Write-ColoredMessage -Message "Installing WSL with $script:WSLDistroName distribution..." -Type Info
    Write-Host "This may take several minutes and might require a system restart." -ForegroundColor Yellow
    Write-Host ""
    
    try {
        wsl.exe --install -d $script:WSLDistroName
        
        Write-Host ""
        Write-ColoredMessage -Message "WSL installation initiated" -Type Success
        Write-Host ""
        Write-Host "⚠️  Important: " -ForegroundColor Yellow -NoNewline
        Write-Host "You may need to restart your computer to complete the installation."
        Write-Host ""
        Write-Host "After restart:" -ForegroundColor Cyan
        Write-Host "  1. WSL will finish installing" -ForegroundColor Cyan
        Write-Host "  2. You'll be prompted to create a Unix username and password" -ForegroundColor Cyan
        Write-Host "  3. Re-run this script to continue setup" -ForegroundColor Cyan
        Write-Host ""
        
        return $true
    }
    catch {
        Write-ColoredMessage -Message "Failed to install WSL: $_" -Type Error
        Write-Host ""
        Write-Host "Manual installation steps:" -ForegroundColor Yellow
        Write-Host "  1. Open PowerShell as Administrator" -ForegroundColor Cyan
        Write-Host "  2. Run: wsl --install -d $script:WSLDistroName" -ForegroundColor Cyan
        Write-Host "  3. Follow the prompts" -ForegroundColor Cyan
        Write-Host ""
        return $false
    }
}

function Invoke-WSLCommand {
    <#
    .SYNOPSIS
    Executes a command in WSL and returns the output
    
    .PARAMETER Command
    The bash command to execute
    
    .PARAMETER DistroName
    Name of the distribution to use (optional)
    
    .PARAMETER WorkingDirectory
    Working directory in WSL filesystem (optional)
    
    .OUTPUTS
    Object containing ExitCode, Output, and Error properties
    #>
    
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command,
        
        [string]$DistroName = "",
        
        [string]$WorkingDirectory = ""
    )
    
    if (-not (Test-WSLInstalled)) {
        throw "WSL is not installed"
    }
    
    # Build wsl command
    $wslArgs = @()
    
    if ($DistroName) {
        $wslArgs += @("-d", $DistroName)
    }
    
    if ($WorkingDirectory) {
        $wslPath = Convert-WindowsPathToWSL -Path $WorkingDirectory
        $Command = "cd '$wslPath' && $Command"
    }
    
    $wslArgs += @("bash", "-c", $Command)
    
    # Execute command
    $output = @()
    $errorOutput = @()
    
    try {
        $process = Start-Process -FilePath "wsl.exe" `
            -ArgumentList $wslArgs `
            -NoNewWindow `
            -Wait `
            -PassThru `
            -RedirectStandardOutput ([System.IO.Path]::GetTempFileName()) `
            -RedirectStandardError ([System.IO.Path]::GetTempFileName())
        
        $output = Get-Content $process.StandardOutput.FileName
        $errorOutput = Get-Content $process.StandardError.FileName
        
        Remove-Item $process.StandardOutput.FileName -Force -ErrorAction SilentlyContinue
        Remove-Item $process.StandardError.FileName -Force -ErrorAction SilentlyContinue
        
        return [PSCustomObject]@{
            ExitCode = $process.ExitCode
            Output   = $output
            Error    = $errorOutput
        }
    }
    catch {
        return [PSCustomObject]@{
            ExitCode = -1
            Output   = @()
            Error    = @("Failed to execute WSL command: $_")
        }
    }
}

function Convert-WindowsPathToWSL {
    <#
    .SYNOPSIS
    Converts a Windows path to WSL path format
    
    .PARAMETER Path
    Windows path to convert
    
    .OUTPUTS
    String containing the WSL path
    
    .EXAMPLE
    Convert-WindowsPathToWSL -Path "C:\Users\john\code\project"
    # Returns: /mnt/c/Users/john/code/project
    #>
    
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )
    
    $Path = $Path.Trim()
    
    # Convert backslashes to forward slashes
    $wslPath = $Path -replace '\\', '/'
    
    # Convert drive letter (C: -> /mnt/c)
    if ($wslPath -match '^([A-Za-z]):(.*)$') {
        $drive = $matches[1].ToLower()
        $rest = $matches[2]
        $wslPath = "/mnt/$drive$rest"
    }
    
    return $wslPath
}

function Convert-WSLPathToWindows {
    <#
    .SYNOPSIS
    Converts a WSL path to Windows path format
    
    .PARAMETER Path
    WSL path to convert
    
    .OUTPUTS
    String containing the Windows path
    
    .EXAMPLE
    Convert-WSLPathToWindows -Path "/mnt/c/Users/john/code/project"
    # Returns: C:\Users\john\code\project
    #>
    
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )
    
    $Path = $Path.Trim()
    
    # Convert /mnt/drive to Windows drive letter
    if ($Path -match '^/mnt/([a-z])(.*)$') {
        $drive = $matches[1].ToUpper()
        $rest = $matches[2]
        $windowsPath = "${drive}:$rest"
    }
    else {
        # Path is in WSL filesystem, can't convert
        return $Path
    }
    
    # Convert forward slashes to backslashes
    $windowsPath = $windowsPath -replace '/', '\'
    
    return $windowsPath
}

function Test-WSLServiceRunning {
    <#
    .SYNOPSIS
    Checks if WSL is currently running
    
    .OUTPUTS
    Boolean indicating if WSL is running
    #>
    
    if (-not (Test-WSLInstalled)) {
        return $false
    }
    
    try {
        $result = Invoke-WSLCommand -Command "echo test" -ErrorAction Stop
        return $result.ExitCode -eq 0
    }
    catch {
        return $false
    }
}

function Start-WSL {
    <#
    .SYNOPSIS
    Ensures WSL is running
    
    .OUTPUTS
    Boolean indicating success
    #>
    
    if (Test-WSLServiceRunning) {
        return $true
    }
    
    Write-ColoredMessage -Message "Starting WSL..." -Type Info
    
    try {
        $null = wsl.exe echo "WSL started"
        Start-Sleep -Seconds 2
        return Test-WSLServiceRunning
    }
    catch {
        Write-ColoredMessage -Message "Failed to start WSL: $_" -Type Error
        return $false
    }
}

function Invoke-WSLBashScript {
    <#
    .SYNOPSIS
    Executes a bash script file in WSL
    
    .PARAMETER ScriptPath
    Path to the bash script (Windows path)
    
    .PARAMETER Arguments
    Arguments to pass to the script
    
    .OUTPUTS
    Object containing ExitCode, Output, and Error properties
    #>
    
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$ScriptPath,
        
        [string[]]$Arguments = @()
    )
    
    if (-not (Test-Path $ScriptPath)) {
        throw "Script not found: $ScriptPath"
    }
    
    $wslScriptPath = Convert-WindowsPathToWSL -Path $ScriptPath
    $argString = $Arguments -join " "
    
    # Make script executable and run it
    $command = "chmod +x '$wslScriptPath' && '$wslScriptPath' $argString"
    
    return Invoke-WSLCommand -Command $command -WorkingDirectory (Split-Path $ScriptPath)
}

function Show-WSLSetupInstructions {
    <#
    .SYNOPSIS
    Displays instructions for completing WSL setup
    #>
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
    Write-Host "  WSL Setup Required" -ForegroundColor Yellow
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
    Write-Host ""
    Write-Host "To use the L.O.V.E. stack on Windows, you need WSL (Windows Subsystem for Linux)." -ForegroundColor White
    Write-Host ""
    Write-Host "Installation Steps:" -ForegroundColor Cyan
    Write-Host "  1. Open PowerShell as Administrator" -ForegroundColor White
    Write-Host "  2. Run: " -NoNewline -ForegroundColor White
    Write-Host "wsl --install -d Ubuntu-22.04" -ForegroundColor Yellow
    Write-Host "  3. Restart your computer if prompted" -ForegroundColor White
    Write-Host "  4. Create a Unix username and password when prompted" -ForegroundColor White
    Write-Host "  5. Re-run this script" -ForegroundColor White
    Write-Host ""
    Write-Host "For more information: " -NoNewline -ForegroundColor White
    Write-Host "https://docs.microsoft.com/en-us/windows/wsl/install" -ForegroundColor Cyan
    Write-Host ""
}

function Get-ProjectWSLPath {
    <#
    .SYNOPSIS
    Gets the WSL path to the project root
    
    .OUTPUTS
    String containing the WSL path to the project
    #>
    
    return Convert-WindowsPathToWSL -Path $script:ProjectRoot
}

# Export module members
Export-ModuleMember -Function @(
    'Write-ColoredMessage',
    'Write-Header',
    'Test-WSLInstalled',
    'Test-WSLDistributionInstalled',
    'Get-WSLDefaultDistribution',
    'Install-WSL',
    'Invoke-WSLCommand',
    'Convert-WindowsPathToWSL',
    'Convert-WSLPathToWindows',
    'Test-WSLServiceRunning',
    'Start-WSL',
    'Invoke-WSLBashScript',
    'Show-WSLSetupInstructions',
    'Get-ProjectWSLPath'
)
