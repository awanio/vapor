#!/bin/bash

# Deployment script for Vapor
# This script downloads and installs Vapor from pre-built releases

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VERSION="${VAPOR_VERSION:-v0.0.1-rc.0}"
BASE_URL="https://storage.awan.io/assets/vapor/${VERSION}"
BINARY_NAME="vapor"
SERVICE_NAME="vapor.service"
INSTALL_DIR="/usr/local/bin"
CONFIG_DIR="/etc/vapor"
LOG_DIR="/var/log/vapor"
APP_DIR="/var/lib/vapor"
TEMP_DIR="/tmp/vapor-install-$$"

echo -e "${GREEN}Vapor Deployment Script${NC}"
echo "========================================"
echo -e "Version: ${BLUE}${VERSION}${NC}"
echo ""

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo -e "${RED}Error: This script must be run on a Linux system${NC}"
    exit 1
fi

# Check architecture
ARCH=$(uname -m)
if [[ "$ARCH" != "x86_64" ]]; then
    echo -e "${RED}Error: This application requires x86_64 architecture, but system is $ARCH${NC}"
    exit 1
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
REQUIRED_COMMANDS="lsblk mount umount journalctl useradd usermod userdel curl tar"
OPTIONAL_COMMANDS="ansible vgs lvs pvs iscsiadm multipath btrfs docker libvirt kubelet kubeadm kubectl nerdctl"
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
    echo "Some advanced features may not work."
fi

# Create temporary directory
echo "Creating temporary directory..."
mkdir -p "$TEMP_DIR"

# Cleanup function
cleanup() {
    echo "Cleaning up temporary files..."
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

# Download binary
echo "Downloading Vapor binary from ${BASE_URL}/${BINARY_NAME}..."
if curl -fsSL --progress-bar -o "$TEMP_DIR/$BINARY_NAME" "${BASE_URL}/${BINARY_NAME}"; then
    echo -e "${GREEN}Download successful${NC}"
else
    echo -e "${RED}Error: Failed to download binary from ${BASE_URL}/${BINARY_NAME}${NC}"
    echo "Please check your internet connection and the URL."
    exit 1
fi

# Verify binary is executable
if ! file "$TEMP_DIR/$BINARY_NAME" | grep -q "executable"; then
    echo -e "${RED}Error: Downloaded file is not a valid executable${NC}"
    exit 1
fi

# Create directories
echo "Creating directories..."
mkdir -p "$CONFIG_DIR"
mkdir -p "$LOG_DIR"
mkdir -p "$APP_DIR"

# Stop existing service if running
if systemctl is-active --quiet $SERVICE_NAME 2>/dev/null; then
    echo "Stopping existing Vapor service..."
    systemctl stop $SERVICE_NAME
fi

# Install binary
echo "Installing binary to $INSTALL_DIR/$BINARY_NAME..."
cp "$TEMP_DIR/$BINARY_NAME" "$INSTALL_DIR/$BINARY_NAME"
chmod +x "$INSTALL_DIR/$BINARY_NAME"

# Verify installation
if ! "$INSTALL_DIR/$BINARY_NAME" --version &> /dev/null; then
    echo -e "${YELLOW}Warning: Could not verify binary version (binary may not support --version flag)${NC}"
fi

# Create environment file if it doesn't exist
if [ ! -f "$CONFIG_DIR/environment" ]; then
    echo "Creating environment configuration..."
    cat > "$CONFIG_DIR/environment" << 'ENVEOF'
# Vapor Environment Configuration
# Uncomment and modify as needed

# VAPOR_DEBUG=true
# VAPOR_DRY_RUN=false
ENVEOF
    chmod 600 "$CONFIG_DIR/environment"
else
    echo "Environment file already exists, skipping..."
fi

# Create configuration file if it doesn't exist
if [ ! -f "$CONFIG_DIR/vapor.conf" ]; then
    echo "Creating configuration file..."
    JWT_SECRET=$(openssl rand -base64 32)
    cat > "$CONFIG_DIR/vapor.conf" << CONFEOF
# Vapor Configuration File
JWT_SECRET=${JWT_SECRET}
port: "7770"
appdir: ${APP_DIR}

# TLS/HTTPS Configuration (enabled by default for security)
tls_enabled: true
# Certificates will be auto-generated in ${APP_DIR}/certs/
# To use custom certificates, specify paths below:
# tls_cert_dir: "${APP_DIR}/certs"
# tls_cert_file: "${APP_DIR}/certs/server.crt"
# tls_key_file: "${APP_DIR}/certs/server.key"
CONFEOF
    chmod 600 "$CONFIG_DIR/vapor.conf"
    echo -e "${GREEN}New JWT secret generated${NC}"
    echo -e "${GREEN}TLS enabled by default${NC}"
else
    echo "Configuration file already exists, skipping..."
    echo -e "${YELLOW}Warning: Keeping existing configuration and JWT secret${NC}"
fi

# Install systemd service
echo "Installing systemd service..."
cat > "/etc/systemd/system/$SERVICE_NAME" << SERVICEEOF
[Unit]
Description=Vapor - Linux OS Management System
Documentation=https://github.com/awanio/vapor
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
Group=root
ExecStart=${INSTALL_DIR}/${BINARY_NAME} --config ${CONFIG_DIR}/vapor.conf
Restart=on-failure
RestartSec=5
EnvironmentFile=${CONFIG_DIR}/environment

# Security settings
NoNewPrivileges=true
PrivateTmp=true

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${BINARY_NAME}

# Resource limits
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
SERVICEEOF

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
sleep 3
if systemctl is-active --quiet $SERVICE_NAME; then
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   Vapor deployed successfully!                   ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Installation Details:${NC}"
    echo "  Version:       $VERSION"
    echo "  Binary:        $INSTALL_DIR/$BINARY_NAME"
    echo "  Config:        $CONFIG_DIR/vapor.conf"
    echo "  App Directory: $APP_DIR"
    echo "  Log Directory: $LOG_DIR"
    echo ""
    echo -e "${BLUE}Service Information:${NC}"
    echo "  Status:        $(systemctl is-active $SERVICE_NAME)"
    echo "  Enabled:       $(systemctl is-enabled $SERVICE_NAME)"
    echo ""
    # Get all non-loopback IP addresses
    echo -e "${BLUE}Access Information:${NC}"
    
    # Collect all IPs
    IPS=$(ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '^127\.' | grep -v '^169\.254\.')
    
    if [ -n "$IPS" ]; then
        echo "  API Endpoints (HTTPS - TLS enabled):"
        while IFS= read -r ip; do
            echo "    https://${ip}:7770"
        done <<< "$IPS"
    else
        echo "  API Endpoint:  https://localhost:7770 (TLS enabled)"
        echo "  ${YELLOW}Warning: No non-loopback IP addresses detected${NC}"
    fi
    
    echo "  Username:      YOUR-LINUX-USER"
    echo "  Password:      YOUR-LINUX-PASSWORD"
    echo -e "${BLUE}Useful Commands:${NC}"
    echo "  View logs:     journalctl -u $SERVICE_NAME -f"
    echo ""
    echo "  Service status: systemctl status $SERVICE_NAME"
    echo "  Restart:       systemctl restart $SERVICE_NAME"
    echo "  Stop:          systemctl stop $SERVICE_NAME"
    echo ""
    echo -e "${BLUE}TLS/HTTPS Configuration:${NC}"
    echo "  Status:        Enabled (self-signed certificates)"
    echo "  Cert Location: $APP_DIR/certs/"
    echo "  Auto-generated: Yes (on first start)"
    echo "  Valid for:     3 years"
    echo ""
    echo -e "${YELLOW}Note:${NC} Self-signed certificates will be auto-generated on first start."
    echo "      For trusted certificates, see: $CONFIG_DIR/vapor.conf"
    echo ""
    echo -e "${BLUE}Testing HTTPS:${NC}"
    echo "  curl -k https://localhost:7770/health"
    echo "  (Use -k to accept self-signed certificate)"
    echo ""
else
    echo ""
    echo -e "${RED}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║   Service failed to start!                       ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo "  1. Check logs: journalctl -u $SERVICE_NAME -n 50"
    echo "  2. Check config: cat $CONFIG_DIR/vapor.conf"
    echo "  3. Test binary: $INSTALL_DIR/$BINARY_NAME --version"
    echo ""
    exit 1
fi
