#!/bin/bash

# Deployment script for 18KChat using Git Bash
# Usage: ./deploy-git.sh [production|staging]

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
ENV=$1
SSH_USER="18kchat"
SSH_HOST="152.42.163.174"
SSH_KEY="/c/Users/$USERNAME/.ssh/id_ed25519"
DEPLOY_PATH="/var/www/18kchat"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
RELEASE_PATH="$DEPLOY_PATH/releases/$TIMESTAMP"

# Check environment argument
if [ "$ENV" != "production" ] && [ "$ENV" != "staging" ]; then
    echo -e "${RED}Error: Please specify environment (production or staging)${NC}"
    echo -e "Usage: ./deploy-git.sh [production|staging]"
    exit 1
fi

# Check if Git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}Git is not installed. Please install Git for Windows first.${NC}"
    exit 1
fi

echo -e "${GREEN}Starting deployment to $ENV environment...${NC}"

# Create SSH key directory if it doesn't exist
mkdir -p "/c/Users/$USERNAME/.ssh"

# Setup SSH key if not exists
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${YELLOW}Setting up SSH key...${NC}"
    echo "AAAAC3NzaC1lZDI1NTE5AAAAIEIdtdt287mTQOBfFtA6ax3o0z0PVQWWOhqVsHGbE2s7" > "$SSH_KEY.pub"
    chmod 644 "$SSH_KEY.pub"
fi

# Test SSH connection
echo -e "${YELLOW}Testing SSH connection...${NC}"
if ! ssh -i "$SSH_KEY" -o BatchMode=yes -o StrictHostKeyChecking=accept-new "$SSH_USER@$SSH_HOST" "echo 'SSH connection successful'"; then
    echo -e "${RED}SSH connection failed. Please check your SSH key and connection.${NC}"
    exit 1
fi

# Create deployment directories
echo -e "${YELLOW}Creating deployment directories...${NC}"
ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "mkdir -p $RELEASE_PATH $DEPLOY_PATH/shared/{logs,uploads,public/uploads}"

# Use Git archive for deployment
echo -e "${YELLOW}Creating deployment archive...${NC}"
git archive --format=tar HEAD | ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "cd $RELEASE_PATH && tar xf -"

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "cd $RELEASE_PATH && npm ci --production"

# Create symlinks
echo -e "${YELLOW}Creating symlinks...${NC}"
ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "
    ln -sf $DEPLOY_PATH/shared/.env $RELEASE_PATH/.env
    ln -sf $DEPLOY_PATH/shared/uploads $RELEASE_PATH/uploads
    ln -sf $DEPLOY_PATH/shared/public/uploads $RELEASE_PATH/public/uploads
    ln -sf $DEPLOY_PATH/shared/logs $RELEASE_PATH/logs
"

# Update current symlink
echo -e "${YELLOW}Updating current symlink...${NC}"
ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "ln -sfn $RELEASE_PATH $DEPLOY_PATH/current"

# Restart application
echo -e "${YELLOW}Restarting application...${NC}"
if [ "$ENV" = "production" ]; then
    ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "cd $DEPLOY_PATH/current && pm2 reload 18kchat-prod"
else
    ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "cd $DEPLOY_PATH/current && pm2 reload 18kchat-staging"
fi

# Clean up old releases
echo -e "${YELLOW}Cleaning up old releases...${NC}"
ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "
    cd $DEPLOY_PATH/releases
    ls -t | tail -n +6 | xargs -r rm -rf
"

# Health check
echo -e "${YELLOW}Performing health check...${NC}"
sleep 5
HEALTH_URL="https://18kchat.com/health"
[ "$ENV" = "staging" ] && HEALTH_URL="https://staging.18kchat.com/health"

if command -v curl &> /dev/null; then
    HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")
else
    # Fallback to using PowerShell if curl is not available
    HEALTH_STATUS=$(powershell -Command "try { (Invoke-WebRequest -Uri '$HEALTH_URL').StatusCode } catch { \$_.Exception.Response.StatusCode.value__ }")
fi

if [ "$HEALTH_STATUS" = "200" ]; then
    echo -e "${GREEN}Health check passed!${NC}"
else
    echo -e "${RED}Health check failed! Status code: $HEALTH_STATUS${NC}"
    echo -e "${YELLOW}Rolling back to previous release...${NC}"
    
    PREV_RELEASE=$(ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "ls -t $DEPLOY_PATH/releases | head -n 2 | tail -n 1")
    if [ -n "$PREV_RELEASE" ]; then
        ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "
            ln -sfn $DEPLOY_PATH/releases/$PREV_RELEASE $DEPLOY_PATH/current
            cd $DEPLOY_PATH/current && pm2 reload 18kchat-$ENV
        "
        echo -e "${YELLOW}Rolled back to release: $PREV_RELEASE${NC}"
    else
        echo -e "${RED}No previous release found for rollback${NC}"
    fi
fi

echo -e "${GREEN}Deployment process completed!${NC}"
