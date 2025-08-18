#!/bin/bash

# Deployment script for Vapor
# This script should be run on the target Linux x86_64 system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BINARY_NAME="vapor"
SERVICE_NAME="vapor.service"
INSTALL_DIR="/usr/local/bin"
CONFIG_DIR="/etc/vapor"
LOG_DIR="/var/log/vapor"
APP_DIR="/var/lib/vapor

echo -e "${GREEN}Vapor Deployment Script${NC}"
echo "========================================"

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo -e "${RED}Error: This script must be run on a Linux system${NC}"
    exit 1
fi

# Check architecture
ARCH=$(uname -m)
if [[ "$ARCH" != "x86_64" ]]; then
    echo -e "${YELLOW}Warning: This application is built for x86_64, but system is $ARCH${NC}"
fi

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}Error: This script must be run as root${NC}"
   exit 1
fi

# Check for systemd
if ! command -v systemctl &> /dev/null; then
    echo -e "${RED}Error: systemd is required but not found${NC}"
    exit 1
fi

# Check for required commands
echo "Checking system requirements..."
REQUIRED_COMMANDS="lsblk mount umount journalctl useradd usermod userdel ansible curl"
OPTIONAL_COMMANDS="vgs lvs pvs iscsiadm multipath btrfs docker libvirt kubelet kubeadm kubectl nerdctl"
MISSING_COMMANDS=""
MISSING_OPTIONAL=""

for cmd in $REQUIRED_COMMANDS; do
    if ! command -v $cmd &> /dev/null; then
        MISSING_COMMANDS="$MISSING_COMMANDS $cmd"
    fi
done

for cmd in $OPTIONAL_COMMANDS; do
    if ! command -v $cmd &> /dev/null; then
        MISSING_OPTIONAL="$MISSING_OPTIONAL $cmd"
    fi
done

if [ -n "$MISSING_COMMANDS" ]; then
    echo -e "${RED}Error: The following required commands are missing:$MISSING_COMMANDS${NC}"
    echo "Please install the required packages first."
    exit 1
fi

if [ -n "$MISSING_OPTIONAL" ]; then
    echo -e "${YELLOW}Warning: The following optional commands are missing:$MISSING_OPTIONAL${NC}"
    echo "Some advanced storage features (LVM, iSCSI, multipath, BTRFS) may not work."
fi

curl -fsSL -o /tmp/vapor-linux-amd64.tar.gz https://storage.awan.io/assets/vapor/latest/vapor-linux-amd64.tar.gz
tar -xzvf /tmp/vapor-linux-amd64.tar.gz -C /tmp/vapor

# Create directories
echo "Creating directories..."
mkdir -p "$CONFIG_DIR"
mkdir -p "$LOG_DIR"
mkdir -p "$APP_DIR"

# Copy binary
if [ -f "bin/${BINARY_NAME}-linux-amd64" ]; then
    echo "Installing binary..."
    cp "bin/${BINARY_NAME}-linux-amd64" "$INSTALL_DIR/$BINARY_NAME"
    chmod +x "$INSTALL_DIR/$BINARY_NAME"
elif [ -f "$BINARY_NAME" ]; then
    echo "Installing binary..."
    cp "$BINARY_NAME" "$INSTALL_DIR/$BINARY_NAME"
    chmod +x "$INSTALL_DIR/$BINARY_NAME"
elif [ -f "/tmp/vapor/build/$BINARY_NAME" ]; then
    echo "Installing binary..."
    cp "$BINARY_NAME" "$INSTALL_DIR/$BINARY_NAME"
    chmod +x "$INSTALL_DIR/$BINARY_NAME"
else
    echo -e "${RED}Error: Binary not found. Please build first with 'make build-linux'${NC}"
    exit 1
fi

# Copy OpenAPI documentation if exists
if [ -f "openapi.yaml" ]; then
    echo "Installing API documentation..."
    cp openapi.yaml "$CONFIG_DIR/"
elif [ -f "/tmp/vapor/build/openapi.yaml" ]; then
    echo "Installing API documentation..."
    cp /tmp/vapor/build/openapi.yaml "$CONFIG_DIR/"
fi

# Copy Ansible Playbooks
if [ -f "./ansible" ]; then
    echo "Installing Ansible Playbooks..."
    cp -r ./ansible "$APP_DIR/"
elif [ -f "/tmp/vapor/build/ansible" ]; then
    echo "Installing Ansible Playbooks..."
    cp -r /tmp/vapor/build/ansible "$APP_DIR/"
fi

# Create environment file
echo "Creating environment configuration..."
cat > "$CONFIG_DIR/environment" << EOF
# Vapor Configuration
# VAPOR_DEBUG=true
EOF
chmod 600 "$CONFIG_DIR/environment"

# Create configuration file
echo "Creating configuration file..."
cat > "$CONFIG_DIR/vapor.conf" << EOF
# Vapor Configuration
JWT_SECRET=$(openssl rand -base64 32)
port: "7770"
appdir: /var/lib/vapor
EOF
chmod 600 "$CONFIG_DIR/vapor.conf"

# Install systemd service
echo "Installing systemd service..."
cat > "/etc/systemd/system/$SERVICE_NAME" << EOF
[Unit]
Description=Vapor
Documentation=https://github.com/awanio/vapor
After=network.target

[Service]
Type=simple
User=root
Group=root
ExecStart=$INSTALL_DIR/$BINARY_NAME --config $CONFIG_DIR/vapor.conf
Restart=on-failure
RestartSec=5
EnvironmentFile=$CONFIG_DIR/environment

# Security settings
NoNewPrivileges=true
PrivateTmp=true

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$BINARY_NAME

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
echo "Reloading systemd..."
systemctl daemon-reload

# Enable service
echo "Enabling service..."
systemctl enable $SERVICE_NAME

# Start service
echo "Starting service..."
systemctl start $SERVICE_NAME

# Check status
sleep 2
if systemctl is-active --quiet $SERVICE_NAME; then
    echo -e "${GREEN}Service started successfully!${NC}"
else
    echo -e "${RED}Service failed to start. Check logs with: journalctl -u $SERVICE_NAME${NC}"
    exit 1
fi

# Display service info
echo ""
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo ""
echo "Service Status:"
systemctl status $SERVICE_NAME --no-pager
echo ""
echo "Access the API at: http://localhost:7770"
echo "View logs with: journalctl -u $SERVICE_NAME -f"
echo ""
echo "Default credentials:"
echo "  Username: YOUR-LINUX-USER"
echo "  Password: YOUR-LINUX-PASSWORD"
echo ""
echo "Configuration file: $CONFIG_DIR/vapor.conf"
