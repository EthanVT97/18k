#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# SSH key configuration
SSH_KEY_PATH="$HOME/.ssh/id_ed25519"
SSH_KEY_PUB="AAAAC3NzaC1lZDI1NTE5AAAAIEIdtdt287mTQOBfFtA6ax3o0z0PVQWWOhqVsHGbE2s7"
SSH_USER="18kchat"
SSH_HOST="152.42.163.174"

# Create .ssh directory if it doesn't exist
echo -e "${YELLOW}Creating .ssh directory...${NC}"
mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"

# Check if key already exists
if [ -f "$SSH_KEY_PATH" ]; then
    echo -e "${YELLOW}SSH key already exists at $SSH_KEY_PATH${NC}"
    read -p "Do you want to overwrite it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Aborting...${NC}"
        exit 1
    fi
fi

# Create SSH key
echo -e "${YELLOW}Creating SSH key...${NC}"
echo "$SSH_KEY_PUB" > "$SSH_KEY_PATH.pub"
chmod 644 "$SSH_KEY_PATH.pub"

# Add key to authorized_keys on remote server
echo -e "${YELLOW}Adding key to remote server...${NC}"
ssh-copy-id -i "$SSH_KEY_PATH.pub" "$SSH_USER@$SSH_HOST"

# Test connection
echo -e "${YELLOW}Testing SSH connection...${NC}"
if ssh -i "$SSH_KEY_PATH" -o BatchMode=yes -o StrictHostKeyChecking=accept-new "$SSH_USER@$SSH_HOST" "echo 'SSH connection successful'"; then
    echo -e "${GREEN}SSH key setup completed successfully!${NC}"
else
    echo -e "${RED}SSH connection test failed. Please check your configuration.${NC}"
    exit 1
fi

# Add SSH config
echo -e "${YELLOW}Adding SSH config...${NC}"
cat >> "$HOME/.ssh/config" << EOF

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
EOF

echo -e "${GREEN}SSH configuration completed!${NC}"
echo -e "${YELLOW}You can now use 'ssh 18kchat-prod' or 'ssh 18kchat-staging' to connect${NC}"
