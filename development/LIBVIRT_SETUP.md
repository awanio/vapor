# Libvirt Development Environment Setup

This guide provides comprehensive instructions for setting up and using the Vapor API with libvirt integration for managing virtual machines, storage, and networking.

## 🎯 Overview

The Vapor API provides a RESTful interface for managing virtualization infrastructure through libvirt. This development environment allows you to test the API locally with a real libvirt/QEMU setup.

## 📋 Prerequisites

- Linux system (Ubuntu 20.04+, Debian 11+, RHEL 8+, or similar)
- Go 1.21 or higher
- libvirt and QEMU installed
- Docker (optional, for containerized development)
- Minimum 8GB RAM and 20GB disk space

## 🔧 Installation

### Step 1: Install libvirt and QEMU

#### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install -y \
    qemu-kvm \
    libvirt-daemon-system \
    libvirt-clients \
    bridge-utils \
    virt-manager \
    libvirt-dev \
    pkg-config

# Add your user to libvirt group
sudo usermod -aG libvirt $USER
newgrp libvirt

# Verify installation
virsh version
```

#### RHEL/CentOS/Fedora
```bash
sudo dnf install -y \
    qemu-kvm \
    libvirt \
    libvirt-client \
    virt-install \
    virt-manager \
    libvirt-devel

sudo systemctl enable --now libvirtd
sudo usermod -aG libvirt $USER
newgrp libvirt
```

### Step 2: Install Go Dependencies

```bash
cd /path/to/vapor/api
go mod download
```

### Step 3: Build the API with libvirt Support

```bash
# Build with libvirt tag
go build -tags "linux,libvirt" -o vapor-api ./cmd/server

# Or use the Makefile
make build-libvirt

# Verify build
./vapor-api --version
```

## ⚙️ Configuration

### 1. Libvirt Connection Setup

The API supports multiple libvirt connection URIs:

| URI Format | Description | Use Case |
|------------|-------------|----------|
| `qemu:///system` | Local system connection | Production/Development |
| `qemu:///session` | User session connection | Testing without root |
| `qemu+ssh://user@host/system` | Remote SSH connection | Remote management |
| `qemu+tls://host/system` | TLS connection | Secure remote access |
| `test:///default` | Test driver | Unit testing |

Configure the connection:

```bash
# Set environment variable
export LIBVIRT_URI="qemu:///system"

# Or in .env file
echo 'LIBVIRT_URI=qemu:///system' >> .env
```

### 2. API Configuration

Create a configuration file `.env` in the API directory:

```bash
# Server Configuration
HOST=0.0.0.0
PORT=8080
API_PREFIX=/api/v1

# Libvirt Settings
LIBVIRT_URI=qemu:///system
LIBVIRT_STORAGE_POOL=default
LIBVIRT_NETWORK=default

# Development Settings
LOG_LEVEL=debug
ENABLE_CORS=true
ENABLE_SWAGGER=true

# Security (for development only)
JWT_SECRET=development-secret-key
API_KEY=dev-api-key

# Resource Limits
MAX_VMS_PER_USER=10
DEFAULT_VM_MEMORY_MB=2048
DEFAULT_VM_VCPUS=2
```

### 3. Storage Pool Configuration

Create and configure storage pools for VM disks:

```bash
# Create default directory pool
sudo mkdir -p /var/lib/libvirt/images
sudo chown root:libvirt /var/lib/libvirt/images
sudo chmod 775 /var/lib/libvirt/images

# Define and start default pool
virsh pool-define-as default dir \
    --target /var/lib/libvirt/images
virsh pool-build default
virsh pool-start default
virsh pool-autostart default

# Create additional pools as needed
virsh pool-define-as ssd-pool dir \
    --target /mnt/ssd/vms
virsh pool-start ssd-pool
virsh pool-autostart ssd-pool

# Verify pools
virsh pool-list --all
virsh pool-info default
```

### 4. Network Configuration

Set up virtual networks:

```bash
# Start default NAT network
virsh net-start default
virsh net-autostart default

# Create a bridged network (optional)
cat > /tmp/bridge-network.xml <<EOF
<network>
  <name>br0</name>
  <forward mode='bridge'/>
  <bridge name='br0'/>
</network>
EOF

virsh net-define /tmp/bridge-network.xml
virsh net-start br0
virsh net-autostart br0

# Create isolated network for testing
cat > /tmp/isolated-network.xml <<EOF
<network>
  <name>isolated</name>
  <ip address='192.168.100.1' netmask='255.255.255.0'>
    <dhcp>
      <range start='192.168.100.10' end='192.168.100.100'/>
    </dhcp>
  </ip>
</network>
EOF

virsh net-define /tmp/isolated-network.xml
virsh net-start isolated

# List networks
virsh net-list --all
```

## 🚀 Running the Development Environment

### Option 1: Direct Execution

```bash
# Start the API server
./vapor-api

# With custom configuration
LIBVIRT_URI=qemu:///system \
  PORT=8080 \
  LOG_LEVEL=debug \
  ./vapor-api

# Using systemd service (optional)
sudo cp development/vapor-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start vapor-api
sudo systemctl enable vapor-api
```

### Option 2: Docker Container with Host libvirt

```bash
# Build Docker image with libvirt support
docker build -f development/Dockerfile.libvirt -t vapor-api:libvirt .

# Run with access to host libvirt
docker run -d \
  --name vapor-api \
  --network host \
  --privileged \
  -v /var/run/libvirt:/var/run/libvirt \
  -v /var/lib/libvirt:/var/lib/libvirt \
  -e LIBVIRT_URI=qemu:///system \
  vapor-api:libvirt
```

### Option 3: Development with Hot Reload

```bash
# Install air for hot reload
go install github.com/cosmtrek/air@latest

# Create air config
cat > .air.toml <<EOF
root = "."
tmp_dir = "tmp"

[build]
  cmd = "go build -tags 'linux,libvirt' -o ./tmp/vapor-api ./cmd/server"
  bin = "tmp/vapor-api"
  include_ext = ["go", "tpl", "tmpl", "html"]
  exclude_dir = ["assets", "tmp", "vendor", "development"]
  delay = 1000

[log]
  time = true
EOF

# Run with hot reload
air
```

## 📡 API Endpoints

### Virtual Machines (`/api/v1/virtualmachines`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/virtualmachines` | List all VMs |
| POST | `/virtualmachines` | Create a new VM |
| GET | `/virtualmachines/{id}` | Get VM details |
| PUT | `/virtualmachines/{id}` | Update VM configuration |
| DELETE | `/virtualmachines/{id}` | Delete a VM |
| POST | `/virtualmachines/{id}/action` | Perform VM action |
| GET | `/virtualmachines/{id}/metrics` | Get VM metrics |
| GET | `/virtualmachines/{id}/console` | Get console access |
| GET | `/virtualmachines/{id}/snapshots` | List snapshots |
| POST | `/virtualmachines/{id}/snapshots` | Create snapshot |
| DELETE | `/virtualmachines/{id}/snapshots/{name}` | Delete snapshot |
| POST | `/virtualmachines/{id}/snapshots/{name}/revert` | Revert to snapshot |
| POST | `/virtualmachines/{id}/clone` | Clone VM |

### Storage Management (`/api/v1/storage`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/storage/pools` | List storage pools |
| POST | `/storage/pools` | Create storage pool |
| GET | `/storage/pools/{name}` | Get pool details |
| DELETE | `/storage/pools/{name}` | Delete storage pool |
| GET | `/storage/pools/{name}/volumes` | List volumes |
| POST | `/storage/pools/{name}/volumes` | Create volume |
| GET | `/storage/volumes/{name}` | Get volume details |
| DELETE | `/storage/volumes/{name}` | Delete volume |

### Network Management (`/api/v1/networks`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/networks` | List networks |
| POST | `/networks` | Create network |
| GET | `/networks/{name}` | Get network details |
| PUT | `/networks/{name}` | Update network |
| DELETE | `/networks/{name}` | Delete network |

### Templates (`/api/v1/templates`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/templates` | List templates |
| POST | `/templates` | Create template |
| GET | `/templates/{name}` | Get template details |
| DELETE | `/templates/{name}` | Delete template |

## 📝 API Usage Examples

### Create a Virtual Machine

```bash
curl -X POST http://localhost:8080/api/v1/virtualmachines \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-vm-01",
    "memory": 2048,
    "vcpus": 2,
    "disk_size": 20,
    "os_type": "linux",
    "architecture": "x86_64",
    "network": {
      "type": "nat",
      "source": "default",
      "model": "virtio"
    },
    "graphics": {
      "type": "vnc",
      "port": -1
    },
    "cloud_init": {
      "users": [{
        "name": "admin",
        "ssh_authorized_keys": ["ssh-rsa AAAAB3..."],
        "sudo": "ALL=(ALL) NOPASSWD:ALL"
      }],
      "packages": ["curl", "wget", "git"]
    },
    "autostart": false
  }'
```

### VM Lifecycle Management

```bash
# Start VM
curl -X POST http://localhost:8080/api/v1/virtualmachines/{uuid}/action \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'

# Stop VM gracefully
curl -X POST http://localhost:8080/api/v1/virtualmachines/{uuid}/action \
  -H "Content-Type: application/json" \
  -d '{"action": "stop"}'

# Force stop VM
curl -X POST http://localhost:8080/api/v1/virtualmachines/{uuid}/action \
  -H "Content-Type: application/json" \
  -d '{"action": "stop", "force": true}'

# Restart VM
curl -X POST http://localhost:8080/api/v1/virtualmachines/{uuid}/action \
  -H "Content-Type: application/json" \
  -d '{"action": "restart"}'
```

### Snapshot Management

```bash
# Create snapshot
curl -X POST http://localhost:8080/api/v1/virtualmachines/{uuid}/snapshots \
  -H "Content-Type: application/json" \
  -d '{
    "name": "before-update",
    "description": "Snapshot before system update",
    "memory": true
  }'

# List snapshots
curl http://localhost:8080/api/v1/virtualmachines/{uuid}/snapshots

# Revert to snapshot
curl -X POST http://localhost:8080/api/v1/virtualmachines/{uuid}/snapshots/before-update/revert
```

### Storage Operations

```bash
# Create storage pool
curl -X POST http://localhost:8080/api/v1/storage/pools \
  -H "Content-Type: application/json" \
  -d '{
    "name": "fast-storage",
    "type": "dir",
    "path": "/mnt/fast-storage",
    "autostart": true
  }'

# Create volume
curl -X POST http://localhost:8080/api/v1/storage/pools/default/volumes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "data-disk",
    "capacity": 107374182400,
    "format": "qcow2"
  }'
```

### Network Operations

```bash
# Create NAT network
curl -X POST http://localhost:8080/api/v1/networks \
  -H "Content-Type: application/json" \
  -d '{
    "name": "dev-network",
    "mode": "nat",
    "ip_range": {
      "address": "192.168.200.1",
      "netmask": "255.255.255.0"
    },
    "dhcp": {
      "start": "192.168.200.10",
      "end": "192.168.200.100"
    },
    "autostart": true
  }'
```

## 🧪 Testing

### Unit Tests

```bash
# Run all tests
go test -tags "linux,libvirt" ./...

# Run specific package tests
go test -tags "linux,libvirt" ./internal/libvirt/...

# With coverage
go test -tags "linux,libvirt" -cover -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

### Integration Tests

```bash
# Set up test environment
export LIBVIRT_URI="test:///default"

# Run integration tests
go test -tags "integration,linux,libvirt" ./tests/integration/...

# Run with real libvirt
export LIBVIRT_URI="qemu:///system"
go test -tags "integration,linux,libvirt" -run TestRealLibvirt ./tests/integration/...
```

### API Testing Script

Create a test script `test-api.sh`:

```bash
#!/bin/bash
set -e

API_URL="http://localhost:8080/api/v1"

echo "Testing API endpoints..."

# Health check
echo "Health check:"
curl -s ${API_URL}/health | jq '.'

# List VMs
echo "List VMs:"
curl -s ${API_URL}/virtualmachines | jq '.'

# Create test VM
echo "Creating test VM:"
VM_UUID=$(curl -s -X POST ${API_URL}/virtualmachines \
  -H "Content-Type: application/json" \
  -d '{
    "name": "api-test-vm",
    "memory": 1024,
    "vcpus": 1
  }' | jq -r '.uuid')

echo "Created VM: $VM_UUID"

# Get VM details
echo "VM Details:"
curl -s ${API_URL}/virtualmachines/${VM_UUID} | jq '.'

# Clean up
echo "Deleting test VM:"
curl -s -X DELETE ${API_URL}/virtualmachines/${VM_UUID}

echo "API tests completed!"
```

## 🔍 Debugging

### Enable Debug Logging

```bash
# Environment variables
export LOG_LEVEL=debug
export LIBVIRT_DEBUG=1
export LIBVIRT_LOG_OUTPUTS="1:file:/tmp/libvirt.log"

# Run with debug
./vapor-api --debug
```

### Check Logs

```bash
# API logs
tail -f /var/log/vapor-api.log

# Libvirt logs
sudo journalctl -u libvirtd -f

# QEMU/KVM logs
sudo tail -f /var/log/libvirt/qemu/*.log

# System logs
dmesg | grep -i kvm
```

### Debug Commands

```bash
# Check KVM support
egrep -c '(vmx|svm)' /proc/cpuinfo
lsmod | grep kvm

# List all VMs
virsh list --all

# VM details
virsh dominfo <vm-name>
virsh dumpxml <vm-name>

# Storage info
virsh pool-list --all --details
virsh vol-list default

# Network info
virsh net-list --all
ip addr show virbr0
```

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. Permission Denied Errors

```bash
# Fix libvirt group membership
sudo usermod -aG libvirt $USER
sudo usermod -aG kvm $USER
newgrp libvirt

# Fix socket permissions
sudo chmod 666 /var/run/libvirt/libvirt-sock
```

#### 2. Failed to Connect to Libvirt

```bash
# Check service status
sudo systemctl status libvirtd
sudo systemctl restart libvirtd

# Check socket
ls -l /var/run/libvirt/libvirt-sock

# Test connection
virsh -c qemu:///system version
```

#### 3. KVM Not Available

```bash
# Check virtualization support
egrep -c '(vmx|svm)' /proc/cpuinfo

# Enable in BIOS if needed
# Intel: VT-x
# AMD: AMD-V

# Load kernel modules
sudo modprobe kvm
sudo modprobe kvm_intel  # or kvm_amd
```

#### 4. Network Issues

```bash
# Restart default network
virsh net-destroy default
virsh net-start default

# Check firewall
sudo iptables -L -n -v
sudo firewall-cmd --list-all

# Check bridge
brctl show
ip link show virbr0
```

#### 5. Storage Pool Issues

```bash
# Refresh pool
virsh pool-refresh default

# Fix permissions
sudo chown -R libvirt:libvirt /var/lib/libvirt/images
sudo chmod 775 /var/lib/libvirt/images

# Recreate pool
virsh pool-destroy default
virsh pool-undefine default
virsh pool-define-as default dir --target /var/lib/libvirt/images
virsh pool-start default
```

## 🔐 Security Best Practices

### Development Environment

1. **Isolation**: Use separate networks for testing
2. **Access Control**: Limit API access to localhost
3. **Secrets**: Use development-only secrets
4. **Firewall**: Configure iptables/firewalld rules

### Production Considerations

1. **TLS/SSL**: Enable HTTPS for API endpoints
2. **Authentication**: Implement OAuth2/JWT
3. **Authorization**: Use RBAC for multi-tenancy
4. **Network Isolation**: Use VLANs or separate bridges
5. **SELinux/AppArmor**: Enable mandatory access controls
6. **Audit Logging**: Enable comprehensive logging
7. **Regular Updates**: Keep hypervisor and guests updated

## 📊 Performance Tuning

### Libvirt Optimization

```bash
# Edit /etc/libvirt/libvirtd.conf
max_clients = 100
max_workers = 20
max_requests = 100
max_client_requests = 10

# Restart service
sudo systemctl restart libvirtd
```

### QEMU/KVM Optimization

```bash
# Enable huge pages
echo 1024 > /sys/kernel/mm/hugepages/hugepages-2048kB/nr_hugepages

# CPU pinning example
virsh vcpupin <vm-name> 0 0
virsh vcpupin <vm-name> 1 1
```

### API Performance

```bash
# Environment variables
export GOMAXPROCS=8
export API_WORKERS=4
export API_QUEUE_SIZE=100
```

## 📚 Additional Resources

- [Libvirt API Documentation](https://libvirt.org/html/index.html)
- [QEMU Documentation](https://www.qemu.org/docs/master/)
- [KVM Performance Tuning](https://www.linux-kvm.org/page/Tuning_KVM)
- [Go libvirt Bindings](https://pkg.go.dev/libvirt.org/go/libvirt)
- [Cloud-Init Documentation](https://cloudinit.readthedocs.io/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the terms specified in the main project LICENSE file.
