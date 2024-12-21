#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_message() {
    echo -e "${2}${1}${NC}"
}

# Check if ssh-keygen is available
if ! command -v ssh-keygen &> /dev/null; then
    print_message "ssh-keygen could not be found. Please install OpenSSH." "$RED"
    exit 1
fi

# Set the key path
SSH_DIR="$HOME/.ssh"
KEY_NAME="18kchat_digitalocean"
KEY_PATH="$SSH_DIR/$KEY_NAME"

# Create .ssh directory if it doesn't exist
if [ ! -d "$SSH_DIR" ]; then
    mkdir -p "$SSH_DIR"
    chmod 700 "$SSH_DIR"
    print_message "Created .ssh directory" "$GREEN"
fi

# Check if key already exists
if [ -f "$KEY_PATH" ]; then
    print_message "SSH key already exists at $KEY_PATH" "$YELLOW"
    read -p "Do you want to create a new key? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_message "Exiting without creating new key" "$YELLOW"
        exit 0
    fi
fi

# Generate SSH key
print_message "Generating SSH key..." "$GREEN"
ssh-keygen -t ed25519 -C "18kchat@$(hostname)" -f "$KEY_PATH" -N ""

if [ $? -eq 0 ]; then
    # Set correct permissions
    chmod 600 "$KEY_PATH"
    chmod 644 "$KEY_PATH.pub"
    
    print_message "\nSSH key generated successfully!" "$GREEN"
    print_message "\nYour public key is:" "$YELLOW"
    cat "$KEY_PATH.pub"
    
    print_message "\nInstructions:" "$GREEN"
    print_message "1. Copy the public key above" "$YELLOW"
    print_message "2. Go to DigitalOcean dashboard" "$YELLOW"
    print_message "3. Navigate to Settings > Security > SSH Keys" "$YELLOW"
    print_message "4. Click 'Add SSH Key'" "$YELLOW"
    print_message "5. Paste the public key and give it a name" "$YELLOW"
    
    # Save key info to a file
    INFO_FILE="ssh_key_info.txt"
    echo "SSH Key Information" > "$INFO_FILE"
    echo "Generated on: $(date)" >> "$INFO_FILE"
    echo "Key path: $KEY_PATH" >> "$INFO_FILE"
    echo "Public key:" >> "$INFO_FILE"
    cat "$KEY_PATH.pub" >> "$INFO_FILE"
    
    print_message "\nKey information has been saved to $INFO_FILE" "$GREEN"
else
    print_message "Failed to generate SSH key" "$RED"
    exit 1
fi

# Test SSH key
print_message "\nWould you like to test the SSH connection to your server? (y/n) " "$YELLOW"
read -r TEST_CONNECTION

if [[ $TEST_CONNECTION =~ ^[Yy]$ ]]; then
    read -p "Enter your server IP address: " SERVER_IP
    print_message "\nTesting connection to $SERVER_IP..." "$GREEN"
    
    # Try to connect with the new key
    ssh -i "$KEY_PATH" -o ConnectTimeout=10 "root@$SERVER_IP" exit
    
    if [ $? -eq 0 ]; then
        print_message "SSH connection successful!" "$GREEN"
    else
        print_message "SSH connection failed. Please check your server configuration and try again." "$RED"
    fi
fi
