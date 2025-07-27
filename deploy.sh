#!/bin/bash

# Deployment script for System Management API
# This script should be run on the target Linux x86_64 system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BINARY_NAME="system-api"
SERVICE_NAME="system-api.service"
INSTALL_DIR="/usr/local/bin"
CONFIG_DIR="/etc/system-api"
LOG_DIR="/var/log/system-api"

echo -e "${GREEN}System Management API Deployment Script${NC}"
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
REQUIRED_COMMANDS="lsblk mount umount journalctl useradd usermod userdel"
MISSING_COMMANDS=""

for cmd in $REQUIRED_COMMANDS; do
    if ! command -v $cmd &> /dev/null; then
        MISSING_COMMANDS="$MISSING_COMMANDS $cmd"
    fi
done

if [ -n "$MISSING_COMMANDS" ]; then
    echo -e "${YELLOW}Warning: The following commands are missing:$MISSING_COMMANDS${NC}"
    echo "Some features may not work properly."
fi

# Create directories
echo "Creating directories..."
mkdir -p "$CONFIG_DIR"
mkdir -p "$LOG_DIR"

# Copy binary
if [ -f "bin/${BINARY_NAME}-linux-amd64" ]; then
    echo "Installing binary..."
    cp "bin/${BINARY_NAME}-linux-amd64" "$INSTALL_DIR/$BINARY_NAME"
    chmod +x "$INSTALL_DIR/$BINARY_NAME"
elif [ -f "$BINARY_NAME" ]; then
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
fi

# Create environment file
echo "Creating environment configuration..."
cat > "$CONFIG_DIR/environment" << EOF
# System API Configuration
JWT_SECRET=$(openssl rand -base64 32)
SERVER_ADDR=:8080
LOG_LEVEL=info
EOF
chmod 600 "$CONFIG_DIR/environment"

# Install systemd service
echo "Installing systemd service..."
cat > "/etc/systemd/system/$SERVICE_NAME" << EOF
[Unit]
Description=System Management API Service
Documentation=https://github.com/vapor/system-api
After=network.target

[Service]
Type=simple
User=root
Group=root
ExecStart=$INSTALL_DIR/$BINARY_NAME
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
echo "Access the API at: http://localhost:8080"
echo "View logs with: journalctl -u $SERVICE_NAME -f"
echo ""
echo "Default credentials:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo -e "${YELLOW}⚠️  Important: Change the default credentials and JWT_SECRET in production!${NC}"
echo "Configuration file: $CONFIG_DIR/environment"
