# Setup SSH Key for DigitalOcean
# Run this script as administrator

# Function to write colored output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

# Check if OpenSSH is installed
$opensshFeature = Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Client*'
if ($opensshFeature.State -ne "Installed") {
    Write-ColorOutput Yellow "OpenSSH client is not installed. Installing now..."
    Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
    if ($?) {
        Write-ColorOutput Green "OpenSSH client installed successfully!"
    } else {
        Write-ColorOutput Red "Failed to install OpenSSH client. Please install it manually."
        exit 1
    }
}

# Set up SSH directory and key path
$sshPath = "$env:USERPROFILE\.ssh"
$keyName = "18kchat_digitalocean"
$keyPath = Join-Path $sshPath $keyName

# Create .ssh directory if it doesn't exist
if (-not (Test-Path $sshPath)) {
    New-Item -ItemType Directory -Path $sshPath | Out-Null
    $acl = Get-Acl $sshPath
    $acl.SetAccessRuleProtection($true, $false)
    $rule = New-Object System.Security.AccessControl.FileSystemAccessRule($env:USERNAME, "FullControl", "Allow")
    $acl.AddAccessRule($rule)
    Set-Acl $sshPath $acl
    Write-ColorOutput Green "Created .ssh directory with secure permissions"
}

# Check if key already exists
if (Test-Path $keyPath) {
    Write-ColorOutput Yellow "SSH key already exists at $keyPath"
    $response = Read-Host "Do you want to create a new key? (y/n)"
    if ($response -ne "y") {
        Write-ColorOutput Yellow "Exiting without creating new key"
        exit 0
    }
}

# Generate SSH key
Write-ColorOutput Green "Generating SSH key..."
$email = "18kchat@$env:COMPUTERNAME"
ssh-keygen -t ed25519 -C $email -f $keyPath -N '""'

if ($?) {
    # Set correct permissions
    $acl = Get-Acl $keyPath
    $acl.SetAccessRuleProtection($true, $false)
    $rule = New-Object System.Security.AccessControl.FileSystemAccessRule($env:USERNAME, "FullControl", "Allow")
    $acl.AddAccessRule($rule)
    Set-Acl $keyPath $acl
    
    Write-ColorOutput Green "`nSSH key generated successfully!"
    Write-ColorOutput Yellow "`nYour public key is:"
    Get-Content "$keyPath.pub"
    
    Write-ColorOutput Green "`nInstructions:"
    Write-ColorOutput Yellow "1. Copy the public key above"
    Write-ColorOutput Yellow "2. Go to DigitalOcean dashboard"
    Write-ColorOutput Yellow "3. Navigate to Settings > Security > SSH Keys"
    Write-ColorOutput Yellow "4. Click 'Add SSH Key'"
    Write-ColorOutput Yellow "5. Paste the public key and give it a name"
    
    # Save key info to a file
    $infoFile = "ssh_key_info.txt"
    @"
SSH Key Information
Generated on: $(Get-Date)
Key path: $keyPath
Public key:
$(Get-Content "$keyPath.pub")
"@ | Out-File $infoFile
    
    Write-ColorOutput Green "`nKey information has been saved to $infoFile"
    
    # Test SSH connection
    $testConnection = Read-Host "`nWould you like to test the SSH connection to your server? (y/n)"
    if ($testConnection -eq "y") {
        $serverIP = Read-Host "Enter your server IP address"
        Write-ColorOutput Green "`nTesting connection to $serverIP..."
        
        try {
            ssh -i $keyPath -o ConnectTimeout=10 "root@$serverIP" exit
            if ($?) {
                Write-ColorOutput Green "SSH connection successful!"
            }
        }
        catch {
            Write-ColorOutput Red "SSH connection failed. Please check your server configuration and try again."
        }
    }
}
else {
    Write-ColorOutput Red "Failed to generate SSH key"
    exit 1
}

# Add key to ssh-agent
Write-ColorOutput Green "`nStarting ssh-agent..."
Start-Service ssh-agent
ssh-add $keyPath

Write-ColorOutput Green "`nSetup complete! You can now use this key to connect to your DigitalOcean droplet."
Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
