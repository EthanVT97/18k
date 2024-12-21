# SSH Key Setup for DigitalOcean

This directory contains scripts to help you set up SSH keys for secure access to your DigitalOcean droplet.

## Windows Users (PowerShell)

1. Open PowerShell as Administrator
2. Navigate to this directory
3. Run the following command:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
.\Setup-SSHKey.ps1
```

## Linux/Mac Users (Bash)

1. Open Terminal
2. Navigate to this directory
3. Make the script executable and run it:
```bash
chmod +x setup_ssh.sh
./setup_ssh.sh
```

## Manual Setup

If you prefer to set up SSH keys manually:

1. Generate SSH key:
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

2. Start the SSH agent:
```bash
# On Windows (PowerShell):
Start-Service ssh-agent
# On Linux/Mac:
eval "$(ssh-agent -s)"
```

3. Add your SSH key:
```bash
ssh-add ~/.ssh/id_ed25519
```

4. Copy your public key:
```bash
# On Windows (PowerShell):
Get-Content ~/.ssh/id_ed25519.pub | clip
# On Linux:
cat ~/.ssh/id_ed25519.pub | xclip -selection clipboard
# On Mac:
cat ~/.ssh/id_ed25519.pub | pbcopy
```

5. Add the key to DigitalOcean:
   - Go to DigitalOcean dashboard
   - Navigate to Settings > Security > SSH Keys
   - Click "Add SSH Key"
   - Paste your public key and give it a name

## Testing the Connection

Test your SSH connection with:
```bash
ssh -T root@your_droplet_ip
```

## Troubleshooting

1. If you get a permission denied error:
   - Check that your key is added to ssh-agent
   - Verify the key is added to DigitalOcean
   - Ensure proper permissions on .ssh directory and keys

2. If the connection times out:
   - Verify your droplet's IP address
   - Check if the droplet is running
   - Verify firewall settings allow SSH (port 22)

3. For "Host key verification failed":
   - Remove the old key from known_hosts:
     ```bash
     ssh-keygen -R your_droplet_ip
     ```

## Security Best Practices

1. Use a strong key type (ED25519 is recommended)
2. Keep your private key secure and never share it
3. Use a passphrase for additional security
4. Regularly rotate your SSH keys
5. Disable password authentication on your server
6. Use SSH config file for multiple servers

## Additional Resources

- [DigitalOcean SSH Key Documentation](https://docs.digitalocean.com/products/droplets/how-to/add-ssh-keys/)
- [OpenSSH Documentation](https://www.openssh.com/manual.html)
- [GitHub's SSH Key Guide](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
