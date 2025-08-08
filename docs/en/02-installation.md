# Installation Guide

## System Requirements

Before installing Vapor, ensure your system meets the following requirements:

### Operating System
- **Primary Target**: Linux x86_64
  - Ubuntu 18.04 LTS or newer
  - Debian 10 or newer
  - RHEL/CentOS 8 or newer
  - Fedora 32 or newer
  - Arch Linux (latest)
  - Alpine Linux 3.12 or newer
- **Architecture**: x86_64 (AMD64)
  - ARM64 support is experimental
- **Kernel**: Linux 4.15 or newer

### Hardware Requirements
- **CPU**: 2 cores minimum (4+ cores recommended)
- **RAM**: 2GB minimum (4GB+ recommended)
- **Disk**: 1GB free space for Vapor
- **Network**: Active network connection

### Required System Packages

#### Core Utilities
These are typically pre-installed on most Linux distributions:
- `mount`, `umount` - Filesystem mounting operations
- `lsblk` - Block device information
- `useradd`, `usermod`, `userdel` - User management
- `systemd` - Service management and logging

#### Filesystem Tools
Install based on the filesystems you plan to use:
```bash
# Ubuntu/Debian
sudo apt-get install -y e2fsprogs xfsprogs btrfs-progs

# RHEL/CentOS/Fedora
sudo dnf install -y e2fsprogs xfsprogs btrfs-progs

# Arch Linux
sudo pacman -S e2fsprogs xfsprogs btrfs-progs

# Alpine Linux
sudo apk add e2fsprogs xfsprogs btrfs-progs
```

#### Optional Advanced Features
For full functionality, install these optional packages:
```bash
# LVM Support
sudo apt-get install -y lvm2

# iSCSI Support
sudo apt-get install -y open-iscsi

# Multipath Support
sudo apt-get install -y multipath-tools

# Container Runtime (choose one)
sudo apt-get install -y docker.io
# OR
sudo apt-get install -y containerd
# OR
sudo apt-get install -y cri-o
```

## Installation Methods

### Method 1: Quick Installation (Recommended)

The easiest way to install Vapor is using our automated installation script:

```bash
# Download the installation script
wget https://github.com/awanio/vapor/releases/latest/download/deploy.sh

# Make it executable
chmod +x deploy.sh

# Run the installation
sudo ./deploy.sh
```

The script will:
1. Check system compatibility
2. Download the latest Vapor binary
3. Install required dependencies
4. Configure systemd service
5. Start Vapor automatically

### Method 2: Manual Installation

For more control over the installation process:

#### Step 1: Download the Binary
```bash
# Create directory for Vapor
sudo mkdir -p /opt/vapor

# Download the latest release
wget https://github.com/awanio/vapor/releases/latest/download/vapor-linux-amd64 \
  -O /opt/vapor/vapor

# Make it executable
sudo chmod +x /opt/vapor/vapor

# Create symbolic link
sudo ln -s /opt/vapor/vapor /usr/local/bin/vapor
```

#### Step 2: Create Configuration
```bash
# Create configuration directory
sudo mkdir -p /etc/vapor

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Create environment file
sudo tee /etc/vapor/environment > /dev/null <<EOF
# Vapor Configuration
JWT_SECRET=$JWT_SECRET
SERVER_ADDR=:8080
LOG_LEVEL=info
EOF

# Secure the configuration
sudo chmod 600 /etc/vapor/environment
```

#### Step 3: Create systemd Service
```bash
# Create service file
sudo tee /etc/systemd/system/vapor.service > /dev/null <<EOF
[Unit]
Description=Vapor System Management API
Documentation=https://github.com/awanio/vapor
After=network.target

[Service]
Type=simple
User=root
Group=root
ExecStart=/usr/local/bin/vapor
Restart=on-failure
RestartSec=5
EnvironmentFile=/etc/vapor/environment

# Security settings
NoNewPrivileges=true
PrivateTmp=true

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=vapor

[Install]
WantedBy=multi-user.target
EOF
```

#### Step 4: Enable and Start Service
```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable vapor

# Start the service
sudo systemctl start vapor

# Check status
sudo systemctl status vapor
```

### Method 3: Docker Installation

For containerized deployment:

```bash
# Create data directory
mkdir -p ~/vapor-data

# Run Vapor container
docker run -d \
  --name vapor \
  --restart unless-stopped \
  --privileged \
  --pid host \
  --network host \
  -v /:/host:ro \
  -v ~/vapor-data:/data \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e JWT_SECRET=$(openssl rand -base64 32) \
  -p 8080:8080 \
  awanio/vapor:latest
```

### Method 4: Building from Source

For developers or custom builds:

```bash
# Clone the repository
git clone https://github.com/awanio/vapor.git
cd vapor

# Install Go 1.21 or newer
# See: https://golang.org/doc/install

# Build the binary
make build

# Install
sudo make install

# Start the service
sudo systemctl start vapor
```

## Post-Installation Steps

### 1. Verify Installation

Check that Vapor is running correctly:

```bash
# Check service status
sudo systemctl status vapor

# Check logs
sudo journalctl -u vapor -n 50

# Test API endpoint
curl http://localhost:8080/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 30
}
```

### 2. Configure Firewall

If you have a firewall enabled, allow access to Vapor:

```bash
# UFW (Ubuntu/Debian)
sudo ufw allow 8080/tcp

# firewalld (RHEL/CentOS/Fedora)
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload

# iptables
sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
sudo service iptables save
```

### 3. Configure Reverse Proxy (Optional)

For production deployments, use a reverse proxy like Nginx:

```nginx
server {
    listen 80;
    server_name vapor.example.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name vapor.example.com;
    
    # SSL configuration
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Proxy settings
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket support
    location /api/v1/ws/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}
```

### 4. Set Up Automatic Backups

Create a backup script for Vapor configuration:

```bash
#!/bin/bash
# /usr/local/bin/vapor-backup.sh

BACKUP_DIR="/var/backups/vapor"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup configuration
tar -czf $BACKUP_DIR/vapor-config-$DATE.tar.gz /etc/vapor/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "vapor-config-*.tar.gz" -mtime +7 -delete
```

Add to crontab:
```bash
# Run daily at 2 AM
0 2 * * * /usr/local/bin/vapor-backup.sh
```

## Upgrading Vapor

To upgrade to a newer version:

### Automated Upgrade
```bash
# Download and run upgrade script
wget https://github.com/awanio/vapor/releases/latest/download/upgrade.sh
chmod +x upgrade.sh
sudo ./upgrade.sh
```

### Manual Upgrade
```bash
# Stop the service
sudo systemctl stop vapor

# Backup current binary
sudo cp /usr/local/bin/vapor /usr/local/bin/vapor.backup

# Download new version
wget https://github.com/awanio/vapor/releases/latest/download/vapor-linux-amd64 \
  -O /usr/local/bin/vapor

# Make executable
sudo chmod +x /usr/local/bin/vapor

# Start service
sudo systemctl start vapor
```

## Uninstallation

To completely remove Vapor:

```bash
# Stop and disable service
sudo systemctl stop vapor
sudo systemctl disable vapor

# Remove files
sudo rm -f /usr/local/bin/vapor
sudo rm -f /etc/systemd/system/vapor.service
sudo rm -rf /etc/vapor

# Reload systemd
sudo systemctl daemon-reload
```

## Troubleshooting Installation

### Service Fails to Start

Check the logs for errors:
```bash
sudo journalctl -u vapor -n 100 --no-pager
```

Common issues:
- Port 8080 already in use
- Missing required packages
- Insufficient permissions

### Cannot Access Web Interface

1. Check if service is running:
   ```bash
   sudo systemctl is-active vapor
   ```

2. Check if port is listening:
   ```bash
   sudo netstat -tlnp | grep 8080
   ```

3. Check firewall rules:
   ```bash
   sudo iptables -L -n | grep 8080
   ```

### Permission Denied Errors

Ensure Vapor is running with appropriate privileges:
```bash
# Check service user
sudo systemctl show vapor | grep User=

# Should show: User=root
```

## Next Steps

Once installation is complete, proceed to [First Login](03-first-login.md) to access Vapor for the first time.

---

[← Previous: Introduction](01-introduction.md) | [Next: First Login →](03-first-login.md)
