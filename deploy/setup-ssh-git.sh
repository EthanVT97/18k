#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# SSH Configuration
SSH_DIR="/c/Users/$USERNAME/.ssh"
SSH_KEY="$SSH_DIR/id_ed25519"
SSH_KEY_PUB="$SSH_DIR/id_ed25519.pub"
SSH_CONFIG="$SSH_DIR/config"
SSH_USER="18kchat"
SSH_HOST="152.42.163.174"

echo -e "${YELLOW}Setting up SSH for deployment...${NC}"

# Create .ssh directory if it doesn't exist
mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"

# Create private key
echo -e "${YELLOW}Creating SSH private key...${NC}"
cat > "$SSH_KEY" << EOL
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACBCHXXbdvO5k0DgXxbQOmsd6NM9D1UFljoalb
-----END OPENSSH PRIVATE KEY-----
EOL

# Set correct permissions for private key
chmod 600 "$SSH_KEY"

# Create public key
echo -e "${YELLOW}Creating SSH public key...${NC}"
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEIdtdt287mTQOBfFtA6ax3o0z0PVQWWOhqVsHGbE2s7 18kchat@LAPTOP-29K8UNL5" > "$SSH_KEY_PUB"
chmod 644 "$SSH_KEY_PUB"

# Create SSH config
echo -e "${YELLOW}Creating SSH config...${NC}"
cat > "$SSH_CONFIG" << EOL
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
EOL

chmod 600 "$SSH_CONFIG"

echo -e "${GREEN}SSH key and config files created!${NC}"
echo -e "${YELLOW}Testing SSH connection...${NC}"

# Test SSH connection
if ssh -i "$SSH_KEY" -o BatchMode=yes -o StrictHostKeyChecking=accept-new "$SSH_USER@$SSH_HOST" "echo 'SSH connection successful'" 2>/dev/null; then
    echo -e "${GREEN}SSH connection successful!${NC}"
else
    echo -e "${RED}SSH connection failed. Here's what to do:${NC}"
    echo -e "${YELLOW}1. Copy this public key:${NC}"
    echo -e "${GREEN}$(cat "$SSH_KEY_PUB")${NC}"
    echo -e "${YELLOW}2. Add this public key to your server's authorized_keys:${NC}"
    echo -e "   - Connect to your server using your existing method"
    echo -e "   - Run: ${GREEN}mkdir -p ~/.ssh && chmod 700 ~/.ssh${NC}"
    echo -e "   - Run: ${GREEN}echo '$(cat "$SSH_KEY_PUB")' >> ~/.ssh/authorized_keys${NC}"
    echo -e "   - Run: ${GREEN}chmod 600 ~/.ssh/authorized_keys${NC}"
    echo -e "${YELLOW}3. Then try running the deployment script again${NC}"
fi
