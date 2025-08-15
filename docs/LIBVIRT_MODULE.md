# Vapor Libvirt Module - Complete Implementation

## Overview
The libvirt module for Vapor provides comprehensive virtualization management capabilities through a RESTful API that complies with the OpenAPI specification.

## ✅ Implementation Status

### Core VM Management
- ✅ **List VMs** - `GET /virtualization/virtualmachines`
- ✅ **Get VM Details** - `GET /virtualization/virtualmachines/{id}`
- ✅ **Create VM** - `POST /virtualization/virtualmachines`
- ✅ **Update VM** - `PUT /virtualization/virtualmachines/{id}`
- ✅ **Delete VM** - `DELETE /virtualization/virtualmachines/{id}`
- ✅ **VM Actions** - `POST /virtualization/virtualmachines/{id}/action`

### Snapshot Management
- ✅ **Check Snapshot Capabilities** - `GET /virtualization/virtualmachines/{id}/snapshots/capabilities`
- ✅ **List Snapshots** - `GET /virtualization/virtualmachines/{id}/snapshots`
- ✅ **Create Snapshot** - `POST /virtualization/virtualmachines/{id}/snapshots`
- ✅ **Revert to Snapshot** - `POST /virtualization/virtualmachines/{id}/snapshots/{snapshot}/revert`
- ✅ **Delete Snapshot** - `DELETE /virtualization/virtualmachines/{id}/snapshots/{snapshot}`

### Backup & Restore
- ✅ **List Backups** - `GET /virtualization/virtualmachines/{id}/backups`
- ✅ **Create Backup** - `POST /virtualization/virtualmachines/{id}/backups`
- ✅ **Restore from Backup** - `POST /virtualization/virtualmachines/restore`
- ✅ **Delete Backup** - `DELETE /virtualization/virtualmachines/backups/{backup_id}`

### Live Migration
- ✅ **Initiate Migration** - `POST /virtualization/virtualmachines/{id}/migrate`
- ✅ **Check Migration Status** - `GET /virtualization/virtualmachines/{id}/migration/status`

### PCI Passthrough
- ✅ **List PCI Devices** - `GET /virtualization/virtualmachines/pci-devices`
- ✅ **Attach PCI Device** - `POST /virtualization/virtualmachines/{id}/pci-devices`
- ✅ **Detach PCI Device** - `DELETE /virtualization/virtualmachines/{id}/pci-devices/{device_id}`

### Storage Management
- ✅ **List Storage Pools** - `GET /virtualization/storages/pools`
- ✅ **Create Storage Pool** - `POST /virtualization/storages/pools`
- ✅ **Get Storage Pool** - `GET /virtualization/storages/pools/{name}`
- ✅ **Delete Storage Pool** - `DELETE /virtualization/storages/pools/{name}`
- ✅ **List Volumes** - `GET /virtualization/storages/pools/{pool_name}/volumes`
- ✅ **Create Volume** - `POST /virtualization/storages/pools/{pool_name}/volumes`
- ✅ **Get Volume** - `GET /virtualization/storages/pools/{pool_name}/volumes/{vol_name}`
- ✅ **Delete Volume** - `DELETE /virtualization/storages/pools/{pool_name}/volumes/{vol_name}`

### Network Management
- ✅ **List Networks** - `GET /virtualization/networks`
- ✅ **Create Network** - `POST /virtualization/networks`
- ✅ **Get Network** - `GET /virtualization/networks/{name}`
- ✅ **Delete Network** - `DELETE /virtualization/networks/{name}`

### Advanced Features
- ✅ **Resource Hotplug** - `POST /virtualization/virtualmachines/{id}/hotplug`
- ✅ **Enhanced VM Creation** - `POST /virtualization/virtualmachines/create-enhanced`
- ✅ **VM Templates** - Full CRUD operations for VM templates
- ✅ **ISO Management** - Upload and manage ISO images
- ✅ **VM Metrics** - Real-time VM performance metrics
- ✅ **Console Access** - VNC/SPICE console connectivity

## Building and Testing

### Prerequisites
- Go 1.21 or higher
- libvirt-dev package installed
- Linux operating system

### Build Commands
```bash
# Build the main binary
go build -tags="linux libvirt" ./cmd/vapor

# Build all packages
go build -tags="linux libvirt" ./...

# Run tests
go test -tags="linux libvirt" ./internal/libvirt -v

# Run integration tests
go test -tags="linux libvirt integration" ./internal/libvirt -v
```

### Configuration
Create a `vapor.conf` file:
```ini
[server]
port = 8080
host = 0.0.0.0

[database]
path = /var/lib/vapor/vapor.db

[libvirt]
enabled = true
uri = qemu:///system
```

## API Usage Examples

### Create a VM
```bash
curl -X POST http://localhost:8080/api/v1/virtualization/virtualmachines \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-vm",
    "memory": 2048,
    "vcpus": 2,
    "disk_size": 20,
    "os_type": "linux",
    "network": {
      "type": "bridge",
      "source": "br0"
    }
  }'
```

### Create a Snapshot
```bash
curl -X POST http://localhost:8080/api/v1/virtualization/virtualmachines/{vm-id}/snapshots \
  -H "Content-Type: application/json" \
  -d '{
    "name": "snapshot-1",
    "description": "Before system update",
    "memory": true
  }'
```

### Check Snapshot Capabilities
```bash
curl -X GET http://localhost:8080/api/v1/virtualization/virtualmachines/{vm-id}/snapshots/capabilities
```

### Migrate a VM
```bash
curl -X POST http://localhost:8080/api/v1/virtualization/virtualmachines/{vm-id}/migrate \
  -H "Content-Type: application/json" \
  -d '{
    "destination_host": "host2.example.com",
    "live": true,
    "tunneled": true
  }'
```

## Key Features

### Snapshot Capabilities Detection
The module automatically detects what snapshot operations are supported based on:
- Disk format (QCOW2 supports internal snapshots, RAW requires external)
- Storage backend capabilities
- Guest agent availability for quiesced snapshots

### Enhanced VM Creation
Supports advanced VM creation with:
- Multiple disk configurations
- Cloud-init support
- UEFI/SecureBoot options
- TPM device support
- Custom network configurations
- PCI device passthrough

### Robust Error Handling
- Comprehensive error messages
- Graceful fallback for unsupported operations
- Detailed logging for troubleshooting

## Testing

### Unit Tests
The module includes comprehensive unit tests covering:
- VM state management
- Snapshot operations
- Backup/restore functionality
- Migration workflows
- Storage and network management

### Integration Tests
Integration tests verify:
- Endpoint availability
- API compliance with OpenAPI spec
- Libvirt connection handling
- Resource cleanup

## Troubleshooting

### Common Issues

1. **Libvirt connection failed**
   - Ensure libvirtd service is running
   - Check user permissions for libvirt socket
   - Verify URI in configuration

2. **Snapshot creation fails**
   - Check disk format compatibility
   - Ensure sufficient storage space
   - Verify VM state (some operations require stopped VM)

3. **Migration fails**
   - Verify network connectivity between hosts
   - Check shared storage configuration
   - Ensure compatible libvirt versions

## License
Apache 2.0

## Contributors
- Vapor Development Team
- Open Source Community

## Support
For issues or questions, please file a GitHub issue or contact the development team.
