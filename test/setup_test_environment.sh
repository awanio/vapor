#!/bin/bash

# Setup script for Vapor libvirt testing environment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[SETUP]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Check if running on Linux
check_os() {
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        error "This script requires Linux OS"
    fi
    log "✓ Running on Linux"
}

# Check if libvirt is installed
check_libvirt() {
    log "Checking libvirt installation..."
    
    if ! command -v virsh &> /dev/null; then
        warn "libvirt not found. Installing..."
        
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y qemu-kvm libvirt-daemon-system libvirt-clients bridge-utils
        elif command -v dnf &> /dev/null; then
            sudo dnf install -y qemu-kvm libvirt virt-install bridge-utils
        elif command -v yum &> /dev/null; then
            sudo yum install -y qemu-kvm libvirt virt-install bridge-utils
        else
            error "Cannot install libvirt. Please install manually."
        fi
    fi
    
    # Check libvirt service
    if ! systemctl is-active --quiet libvirtd; then
        warn "libvirtd service is not running. Starting..."
        sudo systemctl start libvirtd
        sudo systemctl enable libvirtd
    fi
    
    log "✓ libvirt is installed and running"
}

# Check user permissions
check_permissions() {
    log "Checking user permissions..."
    
    if ! groups | grep -q libvirt; then
        warn "User not in libvirt group. Adding..."
        sudo usermod -aG libvirt $USER
        warn "You need to logout and login again for group changes to take effect"
    fi
    
    # Test connection
    if virsh -c qemu:///system list &> /dev/null; then
        log "✓ Can connect to libvirt"
    else
        warn "Cannot connect to libvirt. You may need to logout/login or use sudo"
    fi
}

# Setup default storage pool
setup_storage_pool() {
    log "Setting up default storage pool..."
    
    # Check if default pool exists
    if virsh pool-info default &> /dev/null; then
        log "✓ Default storage pool exists"
        
        # Ensure it's active
        if ! virsh pool-list --name | grep -q "^default$"; then
            virsh pool-start default
        fi
    else
        warn "Creating default storage pool..."
        
        # Create directory for images
        sudo mkdir -p /var/lib/libvirt/images
        
        # Define and start pool
        virsh pool-define-as default dir --target /var/lib/libvirt/images
        virsh pool-build default
        virsh pool-start default
        virsh pool-autostart default
        
        log "✓ Default storage pool created"
    fi
    
    # Show pool info
    info "Storage pool info:"
    virsh pool-info default
}

# Setup default network
setup_network() {
    log "Setting up default network..."
    
    # Check if default network exists
    if virsh net-info default &> /dev/null; then
        log "✓ Default network exists"
        
        # Ensure it's active
        if ! virsh net-list --name | grep -q "^default$"; then
            virsh net-start default
        fi
    else
        warn "Creating default network..."
        
        # Create default network XML
        cat > /tmp/default-network.xml << 'NETXML'
<network>
  <name>default</name>
  <forward mode='nat'/>
  <bridge name='virbr0' stp='on' delay='0'/>
  <ip address='192.168.122.1' netmask='255.255.255.0'>
    <dhcp>
      <range start='192.168.122.2' end='192.168.122.254'/>
    </dhcp>
  </ip>
</network>
NETXML
        
        virsh net-define /tmp/default-network.xml
        virsh net-start default
        virsh net-autostart default
        rm /tmp/default-network.xml
        
        log "✓ Default network created"
    fi
    
    # Show network info
    info "Network info:"
    virsh net-info default
}

# Download test image
setup_test_image() {
    log "Setting up test image..."
    
    IMAGE_DIR="/var/lib/libvirt/images"
    IMAGE_NAME="cirros-0.6.1-x86_64-disk.img"
    IMAGE_URL="http://download.cirros-cloud.net/0.6.1/$IMAGE_NAME"
    
    if [ -f "$IMAGE_DIR/$IMAGE_NAME" ]; then
        log "✓ Test image already exists"
    else
        warn "Downloading test image (CirrOS)..."
        sudo wget -q -O "$IMAGE_DIR/$IMAGE_NAME" "$IMAGE_URL"
        sudo chmod 644 "$IMAGE_DIR/$IMAGE_NAME"
        log "✓ Test image downloaded"
    fi
    
    info "Test image: $IMAGE_DIR/$IMAGE_NAME (CirrOS - minimal Linux for testing)"
}

# Create test configuration
create_test_config() {
    log "Creating test configuration..."
    
    cat > /tmp/vapor-test.conf << 'CONFIG'
[server]
port = 8080
host = 0.0.0.0

[database]
path = /tmp/vapor-test.db

[libvirt]
enabled = true
uri = qemu:///system

[auth]
enabled = false

[logging]
level = debug
CONFIG
    
    log "✓ Test configuration created at /tmp/vapor-test.conf"
}

# Verify libvirt functionality
verify_libvirt() {
    log "Verifying libvirt functionality..."
    
    # List capabilities
    if virsh capabilities > /dev/null 2>&1; then
        log "✓ Can query capabilities"
    else
        error "Cannot query libvirt capabilities"
    fi
    
    # List VMs
    VM_COUNT=$(virsh list --all | grep -c "^ " || true)
    info "Found $VM_COUNT existing VMs"
    
    # List pools
    POOL_COUNT=$(virsh pool-list --all | grep -c "^ " || true)
    info "Found $POOL_COUNT storage pools"
    
    # List networks
    NET_COUNT=$(virsh net-list --all | grep -c "^ " || true)
    info "Found $NET_COUNT networks"
}

# Build Vapor
build_vapor() {
    log "Building Vapor..."
    
    cd "$(dirname "$0")/.."
    
    if [ -f "go.mod" ]; then
        go build -o bin/vapor ./cmd/vapor
        log "✓ Vapor built successfully"
    else
        error "Not in Vapor project directory"
    fi
}

# Main setup
main() {
    echo "========================================="
    echo "Vapor Test Environment Setup"
    echo "========================================="
    echo ""
    
    check_os
    check_libvirt
    check_permissions
    setup_storage_pool
    setup_network
    setup_test_image
    create_test_config
    verify_libvirt
    build_vapor
    
    echo ""
    echo "========================================="
    log "✓ Test environment ready!"
    echo "========================================="
    echo ""
    info "To run tests:"
    echo "  1. Start Vapor server:"
    echo "     ./bin/vapor -c /tmp/vapor-test.conf"
    echo ""
    echo "  2. Run smoke test:"
    echo "     ./test/smoke_test.sh"
    echo ""
    echo "  3. Run E2E tests:"
    echo "     RUN_E2E_TESTS=true go test -tags e2e ./test -v"
    echo ""
    echo "  4. Run performance tests:"
    echo "     ./test/performance_test.sh"
    echo ""
}

# Run main
main
