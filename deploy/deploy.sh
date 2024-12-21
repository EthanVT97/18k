#!/bin/bash

# Deployment script for 18KChat
# Usage: ./deploy.sh [production|staging]

# SSH Configuration
SSH_USER="18kchat"
SSH_HOST="152.42.163.174"
SSH_KEY="~/.ssh/id_ed25519"
REMOTE_PATH="/var/www/18kchat"

# Configuration
TIMESTAMP=$(date +%Y%m%d%H%M%S)
ENV=$1
DEPLOY_PATH="/var/www/18kchat"
RELEASE_PATH="$DEPLOY_PATH/releases/$TIMESTAMP"
CURRENT_PATH="$DEPLOY_PATH/current"
SHARED_PATH="$DEPLOY_PATH/shared"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check environment argument
if [ "$ENV" != "production" ] && [ "$ENV" != "staging" ]; then
    echo -e "${RED}Error: Please specify environment (production or staging)${NC}"
    exit 1
fi

echo -e "${GREEN}Starting deployment to $ENV environment...${NC}"

# Check SSH connection
echo -e "${YELLOW}Checking SSH connection...${NC}"
if ! ssh -i $SSH_KEY -o BatchMode=yes -o StrictHostKeyChecking=accept-new $SSH_USER@$SSH_HOST "echo 'SSH connection successful'"; then
    echo -e "${RED}SSH connection failed. Please check your SSH key and connection.${NC}"
    exit 1
fi

# Create necessary directories
echo -e "${YELLOW}Creating directories...${NC}"
ssh -i $SSH_KEY $SSH_USER@$SSH_HOST "mkdir -p $RELEASE_PATH $SHARED_PATH/logs $SHARED_PATH/uploads $SHARED_PATH/public/uploads"

# Copy application files
echo -e "${YELLOW}Copying application files...${NC}"
rsync -avz -e "ssh -i $SSH_KEY" \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='deploy' \
    --exclude='.env' \
    ./ $SSH_USER@$SSH_HOST:$RELEASE_PATH/

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
ssh -i $SSH_KEY $SSH_USER@$SSH_HOST "cd $RELEASE_PATH && npm ci --production"

# Create symbolic links for shared files
echo -e "${YELLOW}Creating symlinks...${NC}"
ssh -i $SSH_KEY $SSH_USER@$SSH_HOST "
    ln -s $SHARED_PATH/.env $RELEASE_PATH/.env
    ln -s $SHARED_PATH/uploads $RELEASE_PATH/uploads
    ln -s $SHARED_PATH/public/uploads $RELEASE_PATH/public/uploads
    ln -s $SHARED_PATH/logs $RELEASE_PATH/logs
"

# Build assets if needed
if [ -f "$RELEASE_PATH/package.json" ]; then
    echo -e "${YELLOW}Building assets...${NC}"
    ssh -i $SSH_KEY $SSH_USER@$SSH_HOST "cd $RELEASE_PATH && npm run build"
fi

# Update current symlink
echo -e "${YELLOW}Updating current symlink...${NC}"
ssh -i $SSH_KEY $SSH_USER@$SSH_HOST "ln -sfn $RELEASE_PATH $CURRENT_PATH"

# Restart application
echo -e "${YELLOW}Restarting application...${NC}"
if [ "$ENV" == "production" ]; then
    ssh -i $SSH_KEY $SSH_USER@$SSH_HOST "cd $CURRENT_PATH && pm2 reload 18kchat-prod"
else
    ssh -i $SSH_KEY $SSH_USER@$SSH_HOST "cd $CURRENT_PATH && pm2 reload 18kchat-staging"
fi

# Clean up old releases
echo -e "${YELLOW}Cleaning up old releases...${NC}"
ssh -i $SSH_KEY $SSH_USER@$SSH_HOST "
    cd $DEPLOY_PATH/releases
    ls -t | tail -n +6 | xargs -r rm -rf
"

echo -e "${GREEN}Deployment completed successfully!${NC}"

# Health check
echo -e "${YELLOW}Performing health check...${NC}"
sleep 5
HEALTH_CHECK_URL="https://18kchat.com/health"
if [ "$ENV" == "staging" ]; then
    HEALTH_CHECK_URL="https://staging.18kchat.com/health"
fi

HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_CHECK_URL)
if [ "$HEALTH_STATUS" == "200" ]; then
    echo -e "${GREEN}Health check passed!${NC}"
else
    echo -e "${RED}Health check failed! Status code: $HEALTH_STATUS${NC}"
    echo -e "${YELLOW}Rolling back to previous release...${NC}"
    
    # Get previous release
    PREV_RELEASE=$(ssh -i $SSH_KEY $SSH_USER@$SSH_HOST "ls -t $DEPLOY_PATH/releases | head -n 2 | tail -n 1")
    if [ ! -z "$PREV_RELEASE" ]; then
        ssh -i $SSH_KEY $SSH_USER@$SSH_HOST "
            ln -sfn $DEPLOY_PATH/releases/$PREV_RELEASE $CURRENT_PATH
            cd $CURRENT_PATH && pm2 reload 18kchat-$ENV
        "
        echo -e "${YELLOW}Rolled back to release: $PREV_RELEASE${NC}"
    else
        echo -e "${RED}No previous release found for rollback${NC}"
    fi
fi
