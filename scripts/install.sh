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

# Function to check if a command exists
check_command() {
    command -v "$1" &> /dev/null
}

# Function to prompt for installation
prompt_install() {
    local prompt_msg="$1"
    local response
    
    while true; do
        read -p "$prompt_msg (y/n): " response
        case $response in
            [Yy]* ) return 0;;
            [Nn]* ) return 1;;
            * ) echo "Please answer yes or no.";;
        esac
    done
}

# Function to detect package manager
detect_package_manager() {
    if check_command apt-get; then
        echo "apt"
    elif check_command dnf; then
        echo "dnf"
    elif check_command yum; then
        echo "yum"
    elif check_command zypper; then
        echo "zypper"
    else
        echo "unknown"
    fi
}

# Function to install Docker
install_docker() {
    local pkg_mgr="$1"
    echo -e "${BLUE}Installing Docker...${NC}"
    
    case "$pkg_mgr" in
        apt)
            apt-get update -qq
            apt-get install -y apt-transport-https ca-certificates curl software-properties-common
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
            add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
            apt-get update -qq
            apt-get install -y docker-ce docker-ce-cli containerd.io
            ;;
        dnf|yum)
            yum install -y yum-utils
            yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            yum install -y docker-ce docker-ce-cli containerd.io
            ;;
        *)
            echo -e "${YELLOW}Warning: Cannot install Docker automatically on this system.${NC}"
            echo "Please install Docker manually from: https://docs.docker.com/get-docker/"
            return 1
            ;;
    esac
    
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}Docker installed successfully${NC}"
}

# Function to install containerd standalone
install_containerd() {
    local pkg_mgr="$1"
    echo -e "${BLUE}Installing containerd...${NC}"
    
    case "$pkg_mgr" in
        apt)
            apt-get update -qq
            apt-get install -y containerd
            ;;
        dnf|yum)
            yum install -y containerd
            ;;
        *)
            # Manual installation from binary
            echo "Installing containerd from binary..."
            local CONTAINERD_VERSION="1.7.11"
            curl -L https://github.com/containerd/containerd/releases/download/v${CONTAINERD_VERSION}/containerd-${CONTAINERD_VERSION}-linux-amd64.tar.gz | tar -xz -C /usr/local
            
            # Create systemd service for containerd
            cat > /etc/systemd/system/containerd.service << 'EOF'
[Unit]
Description=containerd container runtime
After=network.target

[Service]
ExecStart=/usr/local/bin/containerd
Restart=always
RestartSec=5
Delegate=yes
KillMode=process
OOMScoreAdjust=-999
LimitNOFILE=1048576
LimitNPROC=infinity
LimitCORE=infinity

[Install]
WantedBy=multi-user.target
EOF
            ;;
    esac
    
    mkdir -p /etc/containerd
    if [ ! -f /etc/containerd/config.toml ]; then
        containerd config default > /etc/containerd/config.toml
    fi
    
    systemctl daemon-reload
    systemctl enable containerd
    systemctl start containerd
    echo -e "${GREEN}containerd installed successfully${NC}"
}

# Function to install Kubernetes tools
install_kubernetes() {
    local pkg_mgr="$1"
    echo -e "${BLUE}Installing Kubernetes tools (kubectl, kubeadm, kubelet)...${NC}"
    
    case "$pkg_mgr" in
        apt)
            apt-get update -qq
            apt-get install -y apt-transport-https ca-certificates curl
            curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
            echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /" | tee /etc/apt/sources.list.d/kubernetes.list
            apt-get update -qq
            apt-get install -y kubelet kubeadm kubectl
            apt-mark hold kubelet kubeadm kubectl
            ;;
        dnf|yum)
            cat > /etc/yum.repos.d/kubernetes.repo << 'EOF'
[kubernetes]
name=Kubernetes
baseurl=https://pkgs.k8s.io/core:/stable:/v1.29/rpm/
enabled=1
gpgcheck=1
gpgkey=https://pkgs.k8s.io/core:/stable:/v1.29/rpm/repodata/repomd.xml.key
EOF
            yum install -y kubelet kubeadm kubectl
            ;;
        *)
            echo -e "${YELLOW}Warning: Cannot install Kubernetes automatically on this system.${NC}"
            echo "Please install Kubernetes manually from: https://kubernetes.io/docs/setup/"
            return 1
            ;;
    esac
    
    systemctl enable kubelet
    echo -e "${GREEN}Kubernetes tools installed successfully${NC}"
}

# Function to install KVM/Libvirt
install_kvm_libvirt() {
    local pkg_mgr="$1"
    echo -e "${BLUE}Installing KVM/Libvirt...${NC}"
    
    # Check if CPU supports virtualization
    if ! grep -E '(vmx|svm)' /proc/cpuinfo &> /dev/null; then
        echo -e "${YELLOW}Warning: CPU virtualization support not detected.${NC}"
        echo "KVM may not work properly on this system."
    fi
    
    case "$pkg_mgr" in
        apt)
            apt-get update -qq
            apt-get install -y qemu-kvm libvirt-daemon-system libvirt-clients bridge-utils virt-manager
            ;;
        dnf)
            dnf install -y @virtualization
            ;;
        yum)
            yum groupinstall -y "Virtualization Host"
            yum install -y libvirt libvirt-client virt-install virt-manager
            ;;
        *)
            echo -e "${YELLOW}Warning: Cannot install KVM/Libvirt automatically on this system.${NC}"
            echo "Please install KVM/Libvirt manually."
            return 1
            ;;
    esac
    
    systemctl enable libvirtd
    systemctl start libvirtd
    echo -e "${GREEN}KVM/Libvirt installed successfully${NC}"
}

# Function to install libvirt client libraries (mandatory)
install_libvirt_client_libs() {
    local pkg_mgr="$1"
    echo -e "${BLUE}Installing mandatory libvirt client libraries...${NC}"
    
    case "$pkg_mgr" in
        apt)
            apt-get update -qq
            apt-get install -y libvirt0 2>&1 | grep -v "^Get:" || true
            ;;
        dnf)
            dnf install -y libvirt-libs -q
            ;;
        yum)
            yum install -y libvirt-libs -q
            ;;
        zypper)
            zypper install -y libvirt-libs
            ;;
        *)
            echo -e "${RED}Error: Could not install libvirt client libraries automatically.${NC}"
            echo "Please install the libvirt client library package manually:"
            echo "  - Debian/Ubuntu: sudo apt-get install libvirt0"
            echo "  - RHEL/CentOS: sudo yum install libvirt-libs"
            echo "  - Fedora: sudo dnf install libvirt-libs"
            echo "  - openSUSE: sudo zypper install libvirt-libs"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}libvirt client libraries installed successfully${NC}"
}

# Check for required commands
echo "Checking system requirements..."
REQUIRED_COMMANDS="lsblk mount umount journalctl useradd usermod userdel curl tar"
MISSING_COMMANDS=""

for cmd in $REQUIRED_COMMANDS; do
    if ! check_command "$cmd"; then
        MISSING_COMMANDS="$MISSING_COMMANDS $cmd"
    fi
done

if [ -n "$MISSING_COMMANDS" ]; then
    echo -e "${RED}Error: The following required commands are missing:$MISSING_COMMANDS${NC}"
    echo "Please install the required packages first."
    exit 1
fi

# Detect package manager
PKG_MANAGER=$(detect_package_manager)
echo -e "${BLUE}Detected package manager: ${PKG_MANAGER}${NC}"

# Check and install libvirt client libraries (MANDATORY - no user prompt)
echo ""
echo "Checking for mandatory libvirt client libraries..."
LIBVIRT_CLIENT_FOUND=false
if ldconfig -p 2>/dev/null | grep -q "libvirt.so.0" || \
   ls /usr/lib/x86_64-linux-gnu/libvirt.so.0 2>/dev/null || \
   ls /usr/lib64/libvirt.so.0 2>/dev/null; then
    LIBVIRT_CLIENT_FOUND=true
    echo -e "${GREEN}✓ libvirt client libraries found${NC}"
fi

if [ "$LIBVIRT_CLIENT_FOUND" = false ]; then
    echo -e "${YELLOW}libvirt client libraries not found (mandatory dependency).${NC}"
    install_libvirt_client_libs "$PKG_MANAGER"
fi

# Check for Docker and containerd
echo ""
echo "Checking container runtime status..."
DOCKER_FOUND=false
CONTAINERD_FOUND=false

if check_command docker && systemctl is-active --quiet docker 2>/dev/null; then
    DOCKER_FOUND=true
    echo -e "${GREEN}✓ Docker is installed and running${NC}"
fi

if check_command containerd && systemctl is-active --quiet containerd 2>/dev/null; then
    CONTAINERD_FOUND=true
    echo -e "${GREEN}✓ containerd is installed and running${NC}"
fi

# Prompt for container runtime installation if neither is found
if [ "$DOCKER_FOUND" = false ] && [ "$CONTAINERD_FOUND" = false ]; then
    echo -e "${YELLOW}No container runtime detected (Docker or containerd).${NC}"
    echo "Container runtime is optional but recommended for container management features."
    
    if prompt_install "Would you like to install Docker?"; then
        install_docker "$PKG_MANAGER"
    elif prompt_install "Would you like to install containerd instead?"; then
        install_containerd "$PKG_MANAGER"
    else
        echo -e "${YELLOW}Skipping container runtime installation.${NC}"
    fi
elif [ "$DOCKER_FOUND" = false ] && [ "$CONTAINERD_FOUND" = true ]; then
    echo "containerd is installed. Docker is optional since you have a container runtime."
    if prompt_install "Would you also like to install Docker?"; then
        install_docker "$PKG_MANAGER"
    fi
elif [ "$DOCKER_FOUND" = true ] && [ "$CONTAINERD_FOUND" = false ]; then
    echo "Docker is installed (which includes containerd). No additional container runtime needed."
fi

# Check for Kubernetes
echo ""
echo "Checking Kubernetes status..."
K8S_FOUND=false
K8S_TOOLS=""

if check_command kubectl; then
    K8S_TOOLS="$K8S_TOOLS kubectl"
fi
if check_command kubeadm; then
    K8S_TOOLS="$K8S_TOOLS kubeadm"
fi
if check_command kubelet; then
    K8S_TOOLS="$K8S_TOOLS kubelet"
fi

if [ -n "$K8S_TOOLS" ]; then
    K8S_FOUND=true
    echo -e "${GREEN}✓ Kubernetes tools found:$K8S_TOOLS${NC}"
else
    echo -e "${YELLOW}Kubernetes tools not found.${NC}"
    echo "Kubernetes is optional but recommended for cluster management features."
    
    if prompt_install "Would you like to install Kubernetes tools (kubectl, kubeadm, kubelet)?"; then
        install_kubernetes "$PKG_MANAGER"
    else
        echo -e "${YELLOW}Skipping Kubernetes installation.${NC}"
    fi
fi

# Check for KVM/Libvirt (full installation)
echo ""
echo "Checking KVM/Libvirt status..."
KVM_LIBVIRT_FOUND=false

if check_command virsh && systemctl is-active --quiet libvirtd 2>/dev/null; then
    KVM_LIBVIRT_FOUND=true
    echo -e "${GREEN}✓ KVM/Libvirt is installed and running${NC}"
else
    echo -e "${YELLOW}Full KVM/Libvirt stack not found.${NC}"
    echo "KVM/Libvirt is optional but recommended for VM management features."
    
    if prompt_install "Would you like to install KVM/Libvirt for VM management?"; then
        install_kvm_libvirt "$PKG_MANAGER"
    else
        echo -e "${YELLOW}Skipping KVM/Libvirt installation.${NC}"
    fi
fi

# Check other optional tools
echo ""
echo "Checking other optional tools..."
OPTIONAL_COMMANDS="ansible vgs lvs pvs iscsiadm multipath btrfs nerdctl"
MISSING_OPTIONAL=""

for cmd in $OPTIONAL_COMMANDS; do
    if ! check_command "$cmd"; then
        MISSING_OPTIONAL="$MISSING_OPTIONAL $cmd"
    fi
done

if [ -n "$MISSING_OPTIONAL" ]; then
    echo -e "${YELLOW}Optional tools not found:$MISSING_OPTIONAL${NC}"
    echo "Some advanced features may not be available."
fi

# Create temporary directory
echo ""
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

# Verify binary is an ELF executable (check magic bytes)
if ! head -c 4 "$TEMP_DIR/$BINARY_NAME" | grep -q "^.ELF"; then
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
JWT_SECRET: "${JWT_SECRET}"
port: "7770"
appdir: "${APP_DIR}"

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
    
    # Show installed components status
    echo -e "${BLUE}Installed Components:${NC}"
    echo -e "  libvirt client: ${GREEN}✓ Installed (mandatory)${NC}"
    
    if [ "$DOCKER_FOUND" = true ]; then
        echo -e "  Docker:         ${GREEN}✓ Installed${NC}"
    else
        echo -e "  Docker:         ${YELLOW}✗ Not installed${NC}"
    fi
    
    if [ "$CONTAINERD_FOUND" = true ]; then
        echo -e "  containerd:     ${GREEN}✓ Installed${NC}"
    else
        echo -e "  containerd:     ${YELLOW}✗ Not installed${NC}"
    fi
    
    if [ "$K8S_FOUND" = true ]; then
        echo -e "  Kubernetes:     ${GREEN}✓ Installed${NC}"
    else
        echo -e "  Kubernetes:     ${YELLOW}✗ Not installed${NC}"
    fi
    
    if [ "$KVM_LIBVIRT_FOUND" = true ]; then
        echo -e "  KVM/Libvirt:    ${GREEN}✓ Installed${NC}"
    else
        echo -e "  KVM/Libvirt:    ${YELLOW}✗ Not installed${NC}"
    fi
    
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
