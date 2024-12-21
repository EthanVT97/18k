# Deployment script for 18KChat
# Usage: .\Deploy.ps1 -Environment [production|staging]

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("production", "staging")]
    [string]$Environment
)

# SSH Configuration
$SSHUser = "18kchat"
$SSHHost = "152.42.163.174"
$SSHKey = "$env:USERPROFILE\.ssh\id_ed25519"
$RemotePath = "/var/www/18kchat"

# Configuration
$Timestamp = Get-Date -Format "yyyyMMddHHmmss"
$DeployPath = "/var/www/18kchat"
$ReleasePath = "$DeployPath/releases/$Timestamp"
$CurrentPath = "$DeployPath/current"
$SharedPath = "$DeployPath/shared"

# Function to write colored output
function Write-ColorOutput {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message,
        
        [Parameter(Mandatory=$false)]
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# Check if SSH key exists
if (-not (Test-Path $SSHKey)) {
    Write-ColorOutput "SSH key not found at $SSHKey" -Color Red
    exit 1
}

Write-ColorOutput "Starting deployment to $Environment environment..." -Color Green

# Check SSH connection
Write-ColorOutput "Checking SSH connection..." -Color Yellow
$sshTest = ssh -i $SSHKey -o BatchMode=yes -o StrictHostKeyChecking=accept-new "$SSHUser@$SSHHost" "echo 'SSH connection successful'"
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "SSH connection failed. Please check your SSH key and connection." -Color Red
    exit 1
}

# Create necessary directories
Write-ColorOutput "Creating directories..." -Color Yellow
ssh -i $SSHKey $SSHUser@$SSHHost "mkdir -p $ReleasePath $SharedPath/logs $SharedPath/uploads $SharedPath/public/uploads"

# Copy application files using rsync (requires rsync to be installed on Windows)
Write-ColorOutput "Copying application files..." -Color Yellow
$excludeList = @(
    '--exclude', '.git',
    '--exclude', 'node_modules',
    '--exclude', 'deploy',
    '--exclude', '.env'
)

rsync -avz -e "ssh -i $SSHKey" $excludeList ./ "$SSHUser@$SSHHost`:$ReleasePath/"

# Install dependencies
Write-ColorOutput "Installing dependencies..." -Color Yellow
ssh -i $SSHKey $SSHUser@$SSHHost "cd $ReleasePath && npm ci --production"

# Create symbolic links
Write-ColorOutput "Creating symlinks..." -Color Yellow
$symlinkCommands = @"
    ln -s $SharedPath/.env $ReleasePath/.env
    ln -s $SharedPath/uploads $ReleasePath/uploads
    ln -s $SharedPath/public/uploads $ReleasePath/public/uploads
    ln -s $SharedPath/logs $ReleasePath/logs
"@
ssh -i $SSHKey $SSHUser@$SSHHost $symlinkCommands

# Build assets if needed
if (Test-Path "package.json") {
    Write-ColorOutput "Building assets..." -Color Yellow
    ssh -i $SSHKey $SSHUser@$SSHHost "cd $ReleasePath && npm run build"
}

# Update current symlink
Write-ColorOutput "Updating current symlink..." -Color Yellow
ssh -i $SSHKey $SSHUser@$SSHHost "ln -sfn $ReleasePath $CurrentPath"

# Restart application
Write-ColorOutput "Restarting application..." -Color Yellow
if ($Environment -eq "production") {
    ssh -i $SSHKey $SSHUser@$SSHHost "cd $CurrentPath && pm2 reload 18kchat-prod"
} else {
    ssh -i $SSHKey $SSHUser@$SSHHost "cd $CurrentPath && pm2 reload 18kchat-staging"
}

# Clean up old releases
Write-ColorOutput "Cleaning up old releases..." -Color Yellow
$cleanupCommand = @"
    cd $DeployPath/releases
    ls -t | tail -n +6 | xargs -r rm -rf
"@
ssh -i $SSHKey $SSHUser@$SSHHost $cleanupCommand

Write-ColorOutput "Deployment completed successfully!" -Color Green

# Health check
Write-ColorOutput "Performing health check..." -Color Yellow
Start-Sleep -Seconds 5
$healthCheckUrl = if ($Environment -eq "production") {
    "https://18kchat.com/health"
} else {
    "https://staging.18kchat.com/health"
}

try {
    $response = Invoke-WebRequest -Uri $healthCheckUrl -Method Get
    if ($response.StatusCode -eq 200) {
        Write-ColorOutput "Health check passed!" -Color Green
    } else {
        throw "Health check failed with status code: $($response.StatusCode)"
    }
} catch {
    Write-ColorOutput "Health check failed! Error: $_" -Color Red
    Write-ColorOutput "Rolling back to previous release..." -Color Yellow
    
    # Get previous release
    $prevRelease = ssh -i $SSHKey $SSHUser@$SSHHost "ls -t $DeployPath/releases | head -n 2 | tail -n 1"
    if ($prevRelease) {
        $rollbackCommands = @"
            ln -sfn $DeployPath/releases/$prevRelease $CurrentPath
            cd $CurrentPath && pm2 reload 18kchat-$Environment
"@
        ssh -i $SSHKey $SSHUser@$SSHHost $rollbackCommands
        Write-ColorOutput "Rolled back to release: $prevRelease" -Color Yellow
    } else {
        Write-ColorOutput "No previous release found for rollback" -Color Red
    }
}
