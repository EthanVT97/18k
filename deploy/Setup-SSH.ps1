# Setup SSH for 18KChat deployment
# Run this script as administrator for best results

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

# SSH Configuration
$SSHKeyPath = "$env:USERPROFILE\.ssh\id_ed25519"
$SSHKeyPub = "AAAAC3NzaC1lZDI1NTE5AAAAIEIdtdt287mTQOBfFtA6ax3o0z0PVQWWOhqVsHGbE2s7"
$SSHUser = "18kchat"
$SSHHost = "152.42.163.174"

# Create .ssh directory if it doesn't exist
Write-ColorOutput "Creating .ssh directory..." -Color Yellow
$sshDir = "$env:USERPROFILE\.ssh"
if (-not (Test-Path $sshDir)) {
    New-Item -ItemType Directory -Path $sshDir | Out-Null
}

# Set proper permissions on .ssh directory
$acl = Get-Acl $sshDir
$acl.SetAccessRuleProtection($true, $false)
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    $env:USERNAME,
    "FullControl",
    "ContainerInherit,ObjectInherit",
    "None",
    "Allow"
)
$acl.AddAccessRule($rule)
Set-Acl $sshDir $acl

# Check if key already exists
if (Test-Path $SSHKeyPath) {
    Write-ColorOutput "SSH key already exists at $SSHKeyPath" -Color Yellow
    $response = Read-Host "Do you want to overwrite it? (y/n)"
    if ($response -ne "y") {
        Write-ColorOutput "Aborting..." -Color Red
        exit 1
    }
}

# Create SSH key files
Write-ColorOutput "Creating SSH key..." -Color Yellow
$SSHKeyPub | Out-File -FilePath "$SSHKeyPath.pub" -Encoding ASCII -NoNewline
Set-Content -Path "$SSHKeyPath.pub" -Value $SSHKeyPub -NoNewline

# Set proper permissions on SSH key files
$acl = Get-Acl "$SSHKeyPath.pub"
$acl.SetAccessRuleProtection($true, $false)
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    $env:USERNAME,
    "Read",
    "Allow"
)
$acl.AddAccessRule($rule)
Set-Acl "$SSHKeyPath.pub" $acl

# Create SSH config
Write-ColorOutput "Adding SSH config..." -Color Yellow
$sshConfig = @"
# 18KChat Production
Host 18kchat-prod
    HostName 152.42.163.174
    User 18kchat
    IdentityFile ~/.ssh/id_ed25519
    StrictHostKeyChecking accept-new

# 18KChat Staging
Host 18kchat-staging
    HostName 152.42.163.174
    User 18kchat
    IdentityFile ~/.ssh/id_ed25519
    StrictHostKeyChecking accept-new
"@

$sshConfigPath = "$env:USERPROFILE\.ssh\config"
Add-Content -Path $sshConfigPath -Value $sshConfig

# Test SSH connection
Write-ColorOutput "Testing SSH connection..." -Color Yellow
try {
    $result = ssh -i $SSHKeyPath -o BatchMode=yes -o StrictHostKeyChecking=accept-new "$SSHUser@$SSHHost" "echo 'SSH connection successful'"
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "SSH key setup completed successfully!" -Color Green
    } else {
        throw "SSH connection test failed"
    }
} catch {
    Write-ColorOutput "SSH connection test failed. Error: $_" -Color Red
    exit 1
}

Write-ColorOutput "SSH configuration completed!" -Color Green
Write-ColorOutput "You can now use 'ssh 18kchat-prod' or 'ssh 18kchat-staging' to connect" -Color Yellow

# Check for required tools
Write-ColorOutput "Checking for required tools..." -Color Yellow

# Check for OpenSSH
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-ColorOutput "OpenSSH is not installed. Installing..." -Color Yellow
    Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
}

# Check for rsync
if (-not (Get-Command rsync -ErrorAction SilentlyContinue)) {
    Write-ColorOutput "rsync is not installed. Please install it using chocolatey or another package manager:" -Color Yellow
    Write-ColorOutput "choco install rsync" -Color White
}
