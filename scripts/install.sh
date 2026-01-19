#!/bin/bash
set -e

# Vapor Deployment Script
# This script deploys the Vapor binary and sets up the systemd service.

# Default values
VERSION=${VERSION:-"v0.0.1-rc.2"}
BASE_URL="https://storage.awan.io/assets/vapor/${VERSION}"
BINARY_NAME="vapor"
INSTALL_DIR="/usr/local/bin"
CONFIG_DIR="/etc/vapor"
LOG_DIR="/var/log/vapor"
APP_DIR="/var/lib/vapor"
TEMP_DIR="/tmp/vapor-install-$$"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper function for user prompts
# Usage: prompt_user "Question" "DEFAULT_VALUE(Y/n)" ENV_VAR_NAME
prompt_user() {
    local question="$1"
    local default="$2"
    local env_var="$3"
    local current_val="${!env_var}"

    # If environment variable is already set, use it (Non-interactive mode)
    if [ -n "$current_val" ]; then
        if [[ "$current_val" =~ ^[YyTt1] ]]; then
            return 0 # Yes
        else
            return 1 # No
        fi
    fi

    # Determine if we can be interactive
    if [ -t 0 ]; then
        # Standard TTY available
        read -p "$question [$default]: " response
    elif [ -c /dev/tty ]; then
        # Piped input, but we can open TTY
        read -p "$question [$default]: " response < /dev/tty
    else
        # Non-interactive and no TTY (defaults to "no" for safety, or based on default arg)
        if [[ "$default" =~ [Yy] ]]; then
             response="y"
        else
             response="n"
        fi
        echo "$question [$default]: $response (non-interactive default)"
    fi

    # Process response
    response=${response:-${default:0:1}} # Default to first char of default arg (Y or n)
    if [[ "$response" =~ ^[Yy] ]]; then
        return 0
    else
        return 1
    fi
}

echo -e "${GREEN}Starting Vapor deployment...${NC}"
echo "Deploying version: ${VERSION}"

# Check for root privileges
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: This script must be run as root${NC}"
    exit 1
fi

# Check OS and Architecture
if [ "$(uname -s)" != "Linux" ]; then
    echo -e "${RED}Error: This script must be run on a Linux system${NC}"
    exit 1
fi

ARCH=$(uname -m)
if [ "$ARCH" != "x86_64" ]; then
    echo -e "${RED}Error: This application requires x86_64 architecture, but system is $ARCH${NC}"
    exit 1
fi

# Check for systemd
if ! command -v systemctl >/dev/null 2>&1; then
    echo -e "${RED}Error: systemd is required but not found${NC}"
    exit 1
fi

# Detect Package Manager
PM=""
if command -v apt-get >/dev/null 2>&1; then
    PM="apt"
elif command -v dnf >/dev/null 2>&1; then
    PM="dnf"
elif command -v yum >/dev/null 2>&1; then
    PM="yum"
elif command -v pacman >/dev/null 2>&1; then
    PM="pacman"
fi

# --- Dependency Checks and Optional Installations ---

# 1. Libvirt Libraries (Required for functionality, but installation can be attempted)
if ! command -v virsh >/dev/null 2>&1; then
    if prompt_user "Libvirt client libraries are missing. Install them?" "Y/n" INSTALL_LIBVIRT_CLIENT; then
        echo "Installing libvirt client libraries..."
        case $PM in
            apt) apt-get update && apt-get install -y libvirt-clients ;;
            dnf|yum) $PM install -y libvirt-client ;;
            pacman) pacman -S --noconfirm libvirt ;;
            *) echo -e "${YELLOW}Warning: Could not install libvirt clients. Manual installation required.${NC}" ;;
        esac
    fi
fi

# 2. Container Runtime (Docker/containerd)
if ! command -v docker >/dev/null 2>&1 && ! command -v containerd >/dev/null 2>&1; then
    if prompt_user "No container runtime found. Install Docker?" "Y/n" INSTALL_DOCKER; then
        echo "Installing Docker..."
        case $PM in
            apt)
                curl -fsSL https://get.docker.com -o get-docker.sh
                sh get-docker.sh
                rm get-docker.sh
                ;;
            dnf|yum)
                $PM install -y docker
                systemctl enable --now docker
                ;;
             *) echo -e "${YELLOW}Warning: Could not install Docker. Manual installation required.${NC}" ;;
        esac
    fi
fi

# 3. Kubernetes Tools (kubectl)
if ! command -v kubectl >/dev/null 2>&1; then
    if prompt_user "Kubernetes tools (kubectl) are missing. Install them?" "Y/n" INSTALL_K8S_TOOLS; then
         echo "Installing kubectl..."
         # Basic install for linux/amd64
         curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
         install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
         rm kubectl
    fi
fi

# 4. KVM/Libvirt Server (Virtualization)
if ! systemctl is-active libvirtd >/dev/null 2>&1; then
     if prompt_user "KVM/Libvirt service is not active. Install/Enable KVM virtualization?" "n/Y" INSTALL_LIBVIRT; then
        echo "Installing/Enabling KVM..."
        case $PM in
            apt) apt-get install -y qemu-kvm libvirt-daemon-system libvirt-clients bridge-utils ;;
            dnf|yum) $PM install -y qemu-kvm libvirt ;;
        esac
        systemctl enable --now libvirtd
     fi
fi

# Check for other recommended tools (non-blocking)
MISSING_TOOLS=""
for tool in ansible vgs lvs pvs iscsiadm multipath btrfs nerdctl; do
    if ! command -v $tool >/dev/null 2>&1; then
        MISSING_TOOLS="$MISSING_TOOLS $tool"
    fi
done

if [ -n "$MISSING_TOOLS" ]; then
    echo -e "${YELLOW}Warning: The following optional tools are missing, some features may be limited:${NC}"
    echo -e "${YELLOW}  $MISSING_TOOLS${NC}"
fi


# --- Vapor Installation ---

# Create temp directory
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"

# Download binary
echo "Downloading Vapor binary from ${BASE_URL}/${BINARY_NAME}..."
if ! curl -fsSL "${BASE_URL}/${BINARY_NAME}" -o "${BINARY_NAME}"; then
    echo -e "${RED}Error: Failed to download binary from ${BASE_URL}/${BINARY_NAME}${NC}"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Basic verification (check if it's an ELF binary)
if ! head -c 4 "${BINARY_NAME}" | grep -q 'ELF'; then
    echo -e "${RED}Error: Downloaded file is not a valid executable${NC}"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Create directories
echo "Creating directories..."
mkdir -p "$CONFIG_DIR"
mkdir -p "$LOG_DIR"
mkdir -p "$APP_DIR"

# Stop existing service if running
if systemctl is-active --quiet vapor.service; then
    echo "Stopping existing Vapor service..."
    systemctl stop vapor.service
fi

# Install binary
echo "Installing binary to ${INSTALL_DIR}..."
chmod +x "${BINARY_NAME}"
mv "${BINARY_NAME}" "${INSTALL_DIR}/${BINARY_NAME}"

# Verify installation
if ! "${INSTALL_DIR}/${BINARY_NAME}" --version >/dev/null 2>&1; then
    echo -e "${YELLOW}Warning: Could not verify binary version (binary may not support --version flag)${NC}"
else
    echo -e "${GREEN}Binary installed successfully${NC}"
fi

# Cleanup
rm -rf "$TEMP_DIR"

# Create/Update configuration
echo "Configuring Vapor..."

# Environment file
ENV_FILE="${CONFIG_DIR}/environment"
if [ ! -f "$ENV_FILE" ]; then
    cat > "$ENV_FILE" <<EOF
VAPOR_PORT=7770
VAPOR_HOST=0.0.0.0
VAPOR_ENV=production
# Add other environment variables here
