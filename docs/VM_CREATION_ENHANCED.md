# Enhanced VM Creation API Documentation

## Overview

The enhanced VM creation API provides advanced features for creating virtual machines with multiple disks, ISO management, and flexible disk configurations.

## Key Improvements Over Basic VM Creation

### 1. Multiple Disk Support
- **Old**: Single `disk_path` or `disk_size` property
- **New**: Array of `disks` with multiple configuration options

### 2. ISO Management
- **Built-in ISO Library**: List, upload, and manage ISO images
- **ISO Resolution**: Reference ISOs by ID, name, or path
- **Usage Tracking**: Track which ISOs are used and when

### 3. Flexible Disk Options
Each disk can be configured in three ways:
- **Create New**: Specify size and format
- **Use Existing**: Provide path to existing disk
- **Clone From**: Clone an existing disk

## API Endpoints

### Enhanced VM Creation

**Endpoint**: `POST /api/v1/virtualmachines/create-enhanced`

**Request Body**:
```json
{
  "name": "my-vm",
  "memory": 4096,        // MB
  "vcpus": 4,
  
  // Multiple disks support
  "disks": [
    {
      // Option 1: Create new disk
      "size": 100,           // GB
      "format": "qcow2",     // optional, default: qcow2
      "bus": "virtio",       // optional, default: virtio
      "boot_order": 1        // optional, boot priority
    },
    {
      // Option 2: Use existing disk
      "path": "/var/lib/libvirt/images/data-disk.qcow2",
      "bus": "sata",
      "readonly": true
    },
    {
      // Option 3: Clone from existing
      "clone_from": "/templates/ubuntu-base.qcow2",
      "bus": "virtio",
      "boot_order": 2
    }
  ],
  
  // ISO configuration
  "iso_path": "ubuntu-22.04",     // Can be: ISO ID, name, or full path
  "secondary_iso": "virtio-drivers.iso",  // Optional, for drivers
  
  // Advanced options
  "os_type": "linux",
  "os_variant": "ubuntu22.04",
  "architecture": "x86_64",
  "uefi": true,
  "secure_boot": false,
  "tpm": false,
  
  // Multiple networks
  "networks": [
    {
      "type": "bridge",
      "source": "br0",
      "model": "virtio"
    },
    {
      "type": "nat",
      "source": "default"
    }
  ],
  
  "graphics": {
    "type": "vnc",
    "port": -1,  // auto-assign
    "password": "optional"
  },
  
  "storage_pool": "default",
  "autostart": true
}
```

### ISO Management

#### List ISOs
**Endpoint**: `GET /api/v1/virtualmachines/isos`

**Response**:
```json
{
  "isos": [
    {
      "id": "iso-abc123",
      "name": "ubuntu-22.04-server-amd64.iso",
      "path": "/var/lib/libvirt/images/iso/ubuntu-22.04-server-amd64.iso",
      "size": 1474560000,
      "os_type": "linux",
      "os_variant": "ubuntu22.04",
      "architecture": "x86_64",
      "boot_type": "uefi",
      "description": "Ubuntu 22.04 LTS Server",
      "uploaded_at": "2024-01-15T10:00:00Z",
      "last_used": "2024-01-20T15:30:00Z",
      "use_count": 5,
      "md5_hash": "abc123...",
      "sha256_hash": "def456...",
      "tags": ["ubuntu", "lts", "server"]
    }
  ]
}
```

#### Upload/Register ISO
**Endpoint**: `POST /api/v1/virtualmachines/isos`

**Request Body**:
```json
{
  "name": "ubuntu-22.04-server",
  
  // Option 1: Download from URL
  "url": "https://releases.ubuntu.com/22.04/ubuntu-22.04-live-server-amd64.iso",
  
  // Option 2: Register existing file
  "path": "/mnt/nfs/isos/ubuntu-22.04.iso",
  
  "os_type": "linux",
  "os_variant": "ubuntu22.04",
  "architecture": "x86_64",
  "description": "Ubuntu 22.04 LTS Server",
  "tags": ["ubuntu", "lts", "server"]
}
```

#### Delete ISO
**Endpoint**: `DELETE /api/v1/virtualmachines/isos/{iso_id}`

## Understanding the Properties

### disk_size vs disks array

#### Old way (still supported for backward compatibility):
```json
{
  "disk_size": 50  // Creates a single 50GB disk
}
```

#### New way (recommended):
```json
{
  "disks": [
    { "size": 50 },      // System disk: 50GB
    { "size": 100 },     // Data disk: 100GB
    { "size": 200 }      // Backup disk: 200GB
  ]
}
```

### ISO Path Resolution

The `iso_path` property is intelligent and can accept:

1. **ISO ID** from the library: `"iso-abc123"`
2. **ISO Name** from the library: `"ubuntu-22.04"`
3. **Absolute path**: `"/var/lib/libvirt/images/iso/ubuntu.iso"`
4. **Filename** (searches default directories): `"ubuntu.iso"`

The system will:
- First check if it's an ID or name in the ISO library
- Then check if it's an absolute path that exists
- Finally search default ISO directories:
  - `/var/lib/libvirt/images/iso`
  - `/var/lib/vapor/iso`
  - `/usr/share/iso`

## Examples

### Example 1: Simple VM with Single Disk
```json
{
  "name": "simple-vm",
  "memory": 2048,
  "vcpus": 2,
  "disks": [
    { "size": 20 }
  ]
}
```

### Example 2: Windows VM with Multiple Disks and Drivers ISO
```json
{
  "name": "windows-vm",
  "memory": 8192,
  "vcpus": 4,
  "disks": [
    { "size": 60, "bus": "sata", "boot_order": 1 },  // C: drive
    { "size": 100, "bus": "sata" }                    // D: drive
  ],
  "iso_path": "windows-11.iso",
  "secondary_iso": "virtio-win-drivers.iso",
  "os_type": "windows",
  "os_variant": "win11",
  "uefi": true,
  "secure_boot": true,
  "tpm": true
}
```

### Example 3: Development VM with Existing Disks
```json
{
  "name": "dev-vm",
  "memory": 16384,
  "vcpus": 8,
  "disks": [
    { 
      "clone_from": "/templates/ubuntu-dev-base.qcow2",
      "boot_order": 1
    },
    {
      "path": "/shared/data/projects.qcow2",
      "readonly": false
    },
    {
      "path": "/shared/data/documentation.qcow2",
      "readonly": true
    }
  ],
  "networks": [
    { "type": "bridge", "source": "br0" },
    { "type": "bridge", "source": "br-internal" }
  ]
}
```

### Example 4: VM from Template with Additional Storage
```json
{
  "name": "app-server",
  "memory": 4096,
  "vcpus": 4,
  "template": "ubuntu-22.04",  // Use predefined template
  "disks": [
    { "size": 50 },    // Override template disk size
    { "size": 500 }    // Add additional data disk
  ],
  "networks": [
    { "type": "bridge", "source": "br0" }
  ]
}
```

## Migration from Old API

If you're currently using the basic VM creation endpoint, here's how to migrate:

### Old Request:
```json
{
  "name": "my-vm",
  "memory": 4096,
  "vcpus": 2,
  "disk_size": 50,           // Single disk
  "disk_path": "/path/to/disk.qcow2",  // OR existing disk
  "iso_path": "/path/to/iso.iso"
}
```

### New Enhanced Request:
```json
{
  "name": "my-vm",
  "memory": 4096,
  "vcpus": 2,
  "disks": [
    { "size": 50 }           // Or { "path": "/path/to/disk.qcow2" }
  ],
  "iso_path": "ubuntu-22.04"  // Can use ISO library
}
```

## Best Practices

1. **Use the ISO Library**: Upload commonly used ISOs once and reference them by name
2. **Specify Disk Bus Types**: Use `virtio` for best performance, `sata` for compatibility
3. **Set Boot Order**: Explicitly set `boot_order` for multi-disk systems
4. **Use Templates**: Create base templates for common configurations
5. **Clone for Speed**: Clone from template disks instead of installing from ISO
6. **Tag Your ISOs**: Use tags to organize and find ISOs quickly

## Error Handling

Common errors and their meanings:

- `400 Bad Request`: Invalid request format or missing required fields
- `404 Not Found`: ISO or disk path not found
- `409 Conflict`: VM name already exists
- `500 Internal Server Error`: Libvirt operation failed

## Performance Tips

1. **Pre-create Disks**: For large disks, pre-create them in the storage pool
2. **Use qcow2 Format**: Supports snapshots and thin provisioning
3. **Clone Template Disks**: Much faster than fresh installations
4. **Virtio Drivers**: Always use virtio for best performance
5. **Storage Pool Selection**: Place disks on appropriate storage (SSD vs HDD)
