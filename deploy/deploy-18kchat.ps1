# 18KChat Deployment Script
param(
    [string]$RemoteHost = "152.42.163.174",
    [string]$RemoteUser = "18kchat",
    [string]$RemotePath = "/home/18kchat",
    [string]$SshKeyPath = "$PSScriptRoot/18kchat_rsa"
)

# Configuration
$ErrorActionPreference = "Stop"
$LocalPath = Split-Path -Parent $PSScriptRoot
$TempZipFile = "$env:TEMP\18kchat_deploy.zip"
$ExcludeList = @(
    "node_modules/*",
    ".git/*",
    "*.log",
    ".env",
    "deploy/*",
    "*.zip",
    "dist/*",
    "backups/*"
)

function Write-Status {
    param([string]$Message)
    Write-Host "→ $Message" -ForegroundColor Cyan
}

function Test-Command {
    param([string]$Command)
    try {
        if (Get-Command $Command -ErrorAction Stop) { return $true }
    }
    catch {
        return $false
    }
}

# Check prerequisites
Write-Status "Checking prerequisites..."
if (-not (Test-Command "ssh")) {
    throw "OpenSSH is not installed. Please install OpenSSH client."
}
if (-not (Test-Command "scp")) {
    throw "SCP is not installed. Please install OpenSSH client."
}

# Validate SSH key
if (-not (Test-Path $SshKeyPath)) {
    throw "SSH key not found at: $SshKeyPath"
}

# Create deployment package
Write-Status "Creating deployment package..."
if (Test-Path $TempZipFile) {
    Remove-Item $TempZipFile -Force
}

# Create exclude pattern for Compress-Archive
$ExcludePattern = $ExcludeList | ForEach-Object { "^$($_ -replace '\*', '.*')$" }

# Get all files except excluded ones
$FilesToInclude = Get-ChildItem -Path $LocalPath -Recurse -File | 
    Where-Object { 
        $file = $_.FullName.Substring($LocalPath.Length + 1)
        $include = $true
        foreach ($pattern in $ExcludePattern) {
            if ($file -match $pattern) {
                $include = $false
                break
            }
        }
        $include
    }

# Create deployment zip
Compress-Archive -Path $FilesToInclude.FullName -DestinationPath $TempZipFile

# Transfer files
Write-Status "Transferring files to remote server..."
try {
    # Create remote backup
    $BackupCommand = "cd $RemotePath && if [ -f package.json ]; then tar czf backup_`$(date +%Y%m%d_%H%M%S).tar.gz * --exclude='node_modules' --exclude='*.tar.gz'; fi"
    ssh -i $SshKeyPath -o StrictHostKeyChecking=no "${RemoteUser}@${RemoteHost}" $BackupCommand

    # Transfer zip file
    scp -i $SshKeyPath -o StrictHostKeyChecking=no $TempZipFile "${RemoteUser}@${RemoteHost}:${RemotePath}/deploy.zip"

    # Unzip and cleanup on remote
    $DeployCommand = @"
cd $RemotePath &&
unzip -o deploy.zip &&
rm deploy.zip &&
npm install --production &&
pm2 restart 18kchat || pm2 start server.js --name 18kchat
"@
    
    Write-Status "Deploying application..."
    ssh -i $SshKeyPath -o StrictHostKeyChecking=no "${RemoteUser}@${RemoteHost}" $DeployCommand
}
catch {
    Write-Host "Deployment failed: $_" -ForegroundColor Red
    exit 1
}
finally {
    # Cleanup local temp file
    if (Test-Path $TempZipFile) {
        Remove-Item $TempZipFile -Force
    }
}

Write-Status "Deployment completed successfully!"
Write-Host "You can access your application at: http://${RemoteHost}"
