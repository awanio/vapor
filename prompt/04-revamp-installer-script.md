Revamp this installer script /scripts/install.sh by utilizing Ansible as the installation and setup engine. So the first requred package should exists is Ansible and all it dependencies such as python etc. So the script need to detect it first. If not exists, inform user that the installation will install Ansible and libvirt-client since both packages and it dependencies are requred. If user "yes or y" then proceeed. If not then abort the installation.

Next use similar experience by asking user whether they want to install additional packages or not whcih is: Libvirt, Docker, Containerd, Kubernetes and Helm. You need to provide ansible playbook for those packages. We will focus for Debian and Redhat OS family for now. So make sure the the playbook support for both OS family.

For Kubernetes installation, you will ask user not only about install the package or not, but if user answer yes, then ask them again for other node credential, IP, ssh port and role that will join as part of cluster, pods CIDR ips and SVC CIDR. Provide default value for CIDR. Provide CNI option for user to select where the list is: Flannel (default), Calico, Cilium or KubeOVN. Then use Local Path Provisioner (https://github.com/rancher/local-path-provisioner) as PVC provider. Provide rollback by asking user first, if error raised in the middle of installation process.

Finally install vapir binary and set all it configuration to make it run in systemctl.

```
# Default values
VERSION=${VERSION:-"v0.0.1-rc.2"}
BASE_URL="https://storage.awan.io/assets/vapor/${VERSION}"
BINARY_NAME="vapor"
INSTALL_DIR="/usr/local/bin"
CONFIG_DIR="/etc/vapor"
LOG_DIR="/var/log/vapor"
APP_DIR="/var/lib/vapor"
TEMP_DIR="/tmp/vapor-install-$$"

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
```