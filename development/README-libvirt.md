# Vapor Libvirt Development Environment

This directory contains a complete development environment for the Vapor API with full libvirt/KVM virtualization support.

## 🚀 Quick Start

```bash
# Navigate to development directory
cd development/

# Start the libvirt environment
make -f Makefile.libvirt up

# View available commands
make -f Makefile.libvirt help
```

## 📦 What's Included

### Services

1. **libvirt-host** - Full KVM/QEMU hypervisor with libvirt
   - Libvirt daemon with all storage and network drivers
   - QEMU/KVM for x86_64 and ARM virtualization
   - Open vSwitch for advanced networking
   - VNC/SPICE for remote console access
   - Cloud-init support for automated provisioning

2. **vapor-api-libvirt** - Vapor API with libvirt integration
   - Full libvirt API support
   - Ansible with libvirt collection
   - Docker management via docker-in-docker
   - WebSocket console proxy

3. **novnc** - Browser-based VNC console
   - Access VM consoles from web browser
   - No VNC client required

4. **storage-server** - HTTP server for ISOs and images
   - Serve installation ISOs
   - Host VM templates
   - Share disk images

5. **dind** - Docker-in-Docker for container management
   - Isolated Docker daemon
   - TLS secured connection

## 🛠️ Prerequisites

- Docker and Docker Compose
- 8GB+ RAM recommended
- 20GB+ free disk space
- (Optional) KVM support on host for nested virtualization

### Check KVM Support (Optional)
```bash
# On Linux host
ls -la /dev/kvm
# If exists, KVM acceleration is available
```

## 📖 Usage

### Starting the Environment

```bash
# Build and start all services
make -f Makefile.libvirt build
make -f Makefile.libvirt up

# Check service health
make -f Makefile.libvirt test
```

### Managing VMs via API

```bash
# Create a VM
curl -X POST http://localhost:8080/api/v1/vms \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-vm",
    "memory": 2048,
    "vcpus": 2,
    "disk_size": 10,
    "network": {
      "type": "nat",
      "source": "default"
    },
    "graphics": {
      "type": "vnc",
      "port": -1
    }
  }'

# List VMs
curl http://localhost:8080/api/v1/vms

# Start a VM
curl -X POST http://localhost:8080/api/v1/vms/test-vm/action \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'

# Get VM metrics
curl http://localhost:8080/api/v1/vms/test-vm/metrics
```

### Using virsh CLI

```bash
# Enter libvirt container
make -f Makefile.libvirt shell

# Inside container:
virsh list --all              # List all VMs
virsh net-list --all          # List networks
virsh pool-list --all         # List storage pools

# Create a VM with virt-install
virt-install \
  --name ubuntu-vm \
  --memory 2048 \
  --vcpus 2 \
  --disk size=20 \
  --cdrom /var/lib/libvirt/iso/ubuntu.iso \
  --network network=default \
  --graphics vnc,listen=0.0.0.0 \
  --noautoconsole
```

### Accessing VM Consoles

#### Via NoVNC (Web Browser)
1. Open http://localhost:6080 in your browser
2. Connect to VNC port (5900 + display number)

#### Via virsh console
```bash
make -f Makefile.libvirt vm-console VM=test-vm
# Press Ctrl+] to exit
```

### VM Templates

```bash
# Download cloud images
make -f Makefile.libvirt install-templates

# Templates will be in:
# development/storage/templates/
```

### Using Ansible Integration

The API includes Ansible with libvirt support:

```bash
# Run Ansible playbook via API
curl -X POST http://localhost:8080/api/v1/ansible/playbooks/run \
  -H "Content-Type: application/json" \
  -d '{
    "playbook": "create-vm.yml",
    "extra_vars": {
      "vm_name": "ansible-vm",
      "vm_memory": 2048,
      "vm_vcpus": 2
    }
  }'
```

## 🔧 Configuration

### Environment Variables

Edit `docker-compose.libvirt.yml` to modify:

- `LIBVIRT_URI` - Libvirt connection URI
- `VNC_PASSWORD` - VNC console password
- `SPICE_PASSWORD` - SPICE console password
- `JWT_SECRET` - API authentication secret

### Storage Pools

Default storage pools:
- `/var/lib/libvirt/images` - VM disk images
- `/var/lib/libvirt/iso` - Installation ISOs
- `/var/lib/libvirt/backups` - VM backups

### Networks

Default network: `192.168.122.0/24` with NAT

## 📊 Monitoring

```bash
# Monitor VM resources
make -f Makefile.libvirt monitor

# View logs
make -f Makefile.libvirt logs

# View specific service logs
make -f Makefile.libvirt logs-libvirt
make -f Makefile.libvirt logs-api
```

## 💾 Backup & Restore

```bash
# Backup all VMs
make -f Makefile.libvirt backup

# Restore from backup
make -f Makefile.libvirt restore FILE=vms-backup-20240101-120000.tar.gz
```

## 🧪 Development

### Rebuilding API

```bash
# After code changes
make -f Makefile.libvirt dev-reload
```

### Running Tests

```bash
# Execute tests in container
make -f Makefile.libvirt dev-exec CMD="go test ./..."
```

### Debugging

```bash
# Enter API container
make -f Makefile.libvirt shell-api

# Check libvirt connection
virsh -c qemu+unix:///system?socket=/var/run/libvirt/libvirt-sock list
```

## 🐛 Troubleshooting

### Libvirt Connection Issues

```bash
# Check libvirt socket
docker exec vapor-libvirt-dev ls -la /var/run/libvirt/

# Check libvirt daemon
docker exec vapor-libvirt-dev systemctl status libvirtd
```

### KVM Not Available

If you see "KVM not available" errors:
1. Ensure KVM is enabled in BIOS
2. Check kernel modules: `lsmod | grep kvm`
3. The environment will fall back to QEMU emulation (slower)

### Permission Denied

```bash
# Ensure containers run privileged
docker-compose -f docker-compose.libvirt.yml down
docker-compose -f docker-compose.libvirt.yml up -d
```

## 📁 Directory Structure

```
development/
├── docker-compose.libvirt.yml   # Main compose file
├── Dockerfile.libvirt           # Libvirt host container
├── Dockerfile.libvirt-api       # Vapor API with libvirt
├── Makefile.libvirt            # Development commands
├── storage/
│   ├── iso/                    # Installation ISOs
│   ├── images/                 # VM disk images
│   └── templates/              # VM templates
└── backups/                    # VM backups
```

## 🔒 Security Notes

⚠️ **This is a development environment with relaxed security:**
- No authentication on libvirt
- Open VNC/SPICE ports
- Privileged containers
- Default passwords

**Do not use in production!**

## 📚 Additional Resources

- [Libvirt Documentation](https://libvirt.org/docs.html)
- [QEMU Documentation](https://www.qemu.org/documentation/)
- [KVM Documentation](https://www.linux-kvm.org/page/Documents)
- [Cloud-init Documentation](https://cloudinit.readthedocs.io/)

## 🤝 Contributing

To add new VM management features:
1. Update `internal/libvirt/` with new functionality
2. Add API endpoints in `internal/routes/libvirt.go`
3. Test in this development environment
4. Submit PR with tests

## 📄 License

Part of the Vapor project. See main LICENSE file.
