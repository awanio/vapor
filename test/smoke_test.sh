#!/bin/bash

# Vapor Virtualization Smoke Test
# This script performs basic operations to verify the system works

set -e

# Configuration
BASE_URL="${BASE_URL:-http://localhost:8080/api/v1}"
TEST_VM_NAME="smoke-test-vm-$(date +%s)"
VERBOSE="${VERBOSE:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log() {
    echo -e "${GREEN}[SMOKE TEST]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

verbose() {
    if [ "$VERBOSE" = "true" ]; then
        echo -e "${YELLOW}[DEBUG]${NC} $1"
    fi
}

# Make API request
api_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    verbose "Making $method request to $endpoint"
    
    if [ -n "$data" ]; then
        verbose "Request data: $data"
        response=$(curl -s -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "${BASE_URL}${endpoint}")
    else
        response=$(curl -s -X "$method" \
            -H "Content-Type: application/json" \
            "${BASE_URL}${endpoint}")
    fi
    
    verbose "Response: $response"
    echo "$response"
}

# Check if server is running
check_server() {
    log "Checking if server is running..."
    
    if ! curl -s -f "${BASE_URL}/health" > /dev/null 2>&1; then
        # Try without /health endpoint
        if ! curl -s -f "${BASE_URL}/../" > /dev/null 2>&1; then
            error "Server is not running at $BASE_URL"
        fi
    fi
    
    log "✓ Server is running"
}

# Test storage pools
test_storage_pools() {
    log "Testing storage pools..."
    
    response=$(api_request GET "/virtualization/storages/pools")
    
    if echo "$response" | grep -q '"pools"'; then
        log "✓ Storage pools endpoint works"
        
        # Check for default pool
        if echo "$response" | grep -q '"name":"default"'; then
            log "✓ Default storage pool exists"
        else
            log "⚠ Default storage pool not found (non-critical)"
        fi
    else
        error "Failed to list storage pools"
    fi
}

# Test networks
test_networks() {
    log "Testing networks..."
    
    response=$(api_request GET "/virtualization/networks")
    
    if echo "$response" | grep -q '"networks"'; then
        log "✓ Networks endpoint works"
        
        # Check for default network
        if echo "$response" | grep -q '"name":"default"'; then
            log "✓ Default network exists"
        else
            log "⚠ Default network not found (non-critical)"
        fi
    else
        error "Failed to list networks"
    fi
}

# Test VM operations
test_vm_operations() {
    log "Testing VM operations..."
    
    # Create VM
    log "Creating test VM: $TEST_VM_NAME"
    
    create_data='{
        "name": "'$TEST_VM_NAME'",
        "memory": 256,
        "vcpus": 1,
        "disk_size": 1,
        "os_type": "linux",
        "network": {
            "type": "network",
            "source": "default",
            "model": "virtio"
        }
    }'
    
    response=$(api_request POST "/virtualization/virtualmachines" "$create_data")
    
    if echo "$response" | grep -q '"uuid"'; then
        VM_UUID=$(echo "$response" | grep -o '"uuid":"[^"]*"' | cut -d'"' -f4)
        log "✓ VM created with UUID: $VM_UUID"
    else
        error "Failed to create VM: $response"
    fi
    
    # Get VM details
    log "Getting VM details..."
    response=$(api_request GET "/virtualization/virtualmachines/$VM_UUID")
    
    if echo "$response" | grep -q "$TEST_VM_NAME"; then
        log "✓ VM details retrieved"
    else
        error "Failed to get VM details"
    fi
    
    # Check snapshot capabilities
    log "Checking snapshot capabilities..."
    response=$(api_request GET "/virtualization/virtualmachines/$VM_UUID/snapshots/capabilities")
    
    if echo "$response" | grep -q '"overall_capabilities"'; then
        log "✓ Snapshot capabilities endpoint works"
    else
        log "⚠ Snapshot capabilities check failed (non-critical)"
    fi
    
    # List VMs
    log "Listing VMs..."
    response=$(api_request GET "/virtualization/virtualmachines")
    
    if echo "$response" | grep -q '"vms"'; then
        log "✓ VM listing works"
    else
        error "Failed to list VMs"
    fi
    
    # Delete VM
    log "Deleting test VM..."
    response=$(api_request DELETE "/virtualization/virtualmachines/$VM_UUID?remove_disks=true")
    
    # Verify deletion
    response=$(api_request GET "/virtualization/virtualmachines/$VM_UUID")
    if echo "$response" | grep -q "not found\|404"; then
        log "✓ VM deleted successfully"
    else
        log "⚠ VM deletion verification failed"
    fi
}

# Test PCI devices (optional)
test_pci_devices() {
    log "Testing PCI devices..."
    
    response=$(api_request GET "/virtualization/virtualmachines/pci-devices")
    
    if echo "$response" | grep -q '"devices"\|"error"'; then
        if echo "$response" | grep -q '"devices"'; then
            log "✓ PCI devices endpoint works"
        else
            log "⚠ PCI devices not available (non-critical)"
        fi
    else
        error "Unexpected response from PCI devices endpoint"
    fi
}

# Main execution
main() {
    echo "======================================"
    echo "Vapor Virtualization Smoke Test"
    echo "======================================"
    echo "Server: $BASE_URL"
    echo "Test VM: $TEST_VM_NAME"
    echo ""
    
    # Run tests
    check_server
    test_storage_pools
    test_networks
    test_vm_operations
    test_pci_devices
    
    echo ""
    echo "======================================"
    log "✓ All smoke tests passed!"
    echo "======================================"
}

# Run main function
main
