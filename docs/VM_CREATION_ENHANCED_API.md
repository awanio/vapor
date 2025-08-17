# Enhanced VM Creation API Documentation

## Overview
The VM creation endpoint `/virtualization/virtualmachines/create-enhanced` provides a structured API for creating virtual machines with advanced features including nested storage configuration, PCI device passthrough, and template support.

## API Endpoint
```
POST /api/v1/virtualization/virtualmachines/create-enhanced
```

## Request Structure

### Required Fields
```json
{
  "name": "string",           // VM name (required)
  "memory": 2048,            // Memory in MB (required)
  "vcpus": 2,                // Number of vCPUs (required)
  "storage": {               // Storage configuration (required)
    "default_pool": "string", // Default storage pool (required)
    "disks": [               // At least one disk required
      {
        "action": "create|attach|clone",  // Action type (required)
        // Additional fields based on action
      }
    ]
  }
}
```

### Complete Structure
```json
{
  "name": "string",
  "memory": 2048,
  "vcpus": 2,
  "storage": {
    "default_pool": "string",
    "boot_iso": "string",     // Optional boot ISO
    "disks": []               // Array of disk configurations
  },
  "os_type": "string",        // OS type (linux, windows, etc)
  "os_variant": "string",     // OS variant (ubuntu20.04, win10, etc)
  "architecture": "string",   // Architecture (x86_64 by default)
  "uefi": false,             // Use UEFI boot
  "secure_boot": false,      // Enable secure boot
  "tpm": false,              // Add TPM device
  "networks": [],            // Network configurations
  "graphics": [],            // Graphics configurations
  "pci_devices": [],         // PCI passthrough devices
  "cloud_init": {},          // Cloud-init configuration
  "template": "string",      // Template name to use
  "autostart": false,        // Auto-start on host boot
  "custom_xml": "string",    // Custom XML overrides
  "metadata": {}             // Key-value metadata
}
```

## Storage Configuration

### Storage Structure
```json
{
  "storage": {
    "default_pool": "default",   // Required: default storage pool
    "boot_iso": "ubuntu.iso",    // Optional: boot ISO path
    "disks": [                   // Required: at least one disk
      {
        "action": "create",       // Required: action type
        "size": 20,              // Required for "create" action (in GB)
        "format": "qcow2",       // Optional: default "qcow2"
        "bus": "virtio",         // Optional: default "virtio"
        "storage_pool": "pool",  // Optional: override default_pool
        "target": "vda"          // Optional: auto-generated if not specified
      }
    ]
  }
}
```

### Disk Actions

#### Create Action
Creates a new disk in the storage pool.
```json
{
  "action": "create",
  "size": 20,                // Required: size in GB
  "format": "qcow2",         // Optional: disk format
  "storage_pool": "fast"     // Optional: override default pool
}
```

#### Attach Action
Attaches an existing disk.
```json
{
  "action": "attach",
  "path": "/path/to/disk.qcow2"  // Required: disk path
}
```

#### Clone Action
Clones an existing disk.
```json
{
  "action": "clone",
  "clone_from": "/path/to/source.qcow2",  // Required: source disk
  "storage_pool": "fast"                  // Optional: target pool
}
```

### Path Resolution Rules
1. **Absolute paths**: Used as-is, storage pools ignored
2. **Relative paths**: Resolved against the specified storage pool
3. **Boot ISO**: Automatically converted to CDROM configuration

### Boot ISO Handling
When `boot_iso` is specified, it's internally converted to:
```json
{
  "action": "attach",
  "path": "<resolved_iso_path>",
  "format": "raw",
  "bus": "ide",
  "device": "cdrom",
  "readonly": true,
  "boot_order": 1,
  "target": "hdc"
}
```

## PCI Device Passthrough

### Configuration
```json
{
  "pci_devices": [
    {
      "host_address": "0000:01:00.0",    // Required: PCI address on host
      "guest_address": "0000:05:00.0",   // Optional: auto-assign if omitted
      "rom_file": "/path/to/vbios.rom",  // Optional: for GPU passthrough
      "multifunction": true,              // Optional: default false
      "primary_gpu": false                // Optional: for GPU passthrough
    }
  ]
}
```

### Requirements
- IOMMU enabled in BIOS and kernel
- VFIO driver loaded
- All devices in IOMMU group must be passed through
- Device not assigned to other VMs

## Template System

### Using Templates
```json
{
  "name": "my-vm",
  "template": "ubuntu-desktop",
  "memory": 8192,  // Override template value
  "storage": {
    "default_pool": "fast-ssd",
    "disks": [
      {
        "action": "create",
        "size": 100  // Override template disk size
      }
    ]
  }
}
```

### Template Merge Strategy
1. **Simple fields** (memory, vcpus): Override if provided
2. **Arrays**: Replace entirely (not appended)
   - storage.disks
   - networks
   - pci_devices
3. **Nested objects**: Merge at top level
4. **Metadata**: Merge keys (request overrides template)

## Examples

### Simple VM with Boot ISO
```json
{
  "name": "ubuntu-vm",
  "memory": 2048,
  "vcpus": 2,
  "storage": {
    "default_pool": "default",
    "boot_iso": "ubuntu-22.04.iso",
    "disks": [
      {
        "action": "create",
        "size": 20
      }
    ]
  }
}
```

### Multi-Disk VM
```json
{
  "name": "database-server",
  "memory": 16384,
  "vcpus": 8,
  "storage": {
    "default_pool": "fast-nvme",
    "disks": [
      {
        "action": "create",
        "size": 50,
        "format": "qcow2"
      },
      {
        "action": "create",
        "size": 500,
        "storage_pool": "bulk-storage"
      },
      {
        "action": "attach",
        "path": "/mnt/shared/data.qcow2"
      }
    ]
  }
}
```

### GPU Passthrough Workstation
```json
{
  "name": "gpu-workstation",
  "memory": 32768,
  "vcpus": 16,
  "storage": {
    "default_pool": "fast-nvme",
    "boot_iso": "ubuntu-desktop.iso",
    "disks": [
      {
        "action": "create",
        "size": 100
      }
    ]
  },
  "pci_devices": [
    {
      "host_address": "0000:01:00.0",
      "rom_file": "/usr/share/vgabios/rtx3080.rom",
      "primary_gpu": true
    },
    {
      "host_address": "0000:01:00.1"
    }
  ],
  "graphics": [
    {
      "type": "none"
    }
  ]
}
```

### Template-Based VM
```json
{
  "name": "web-server",
  "template": "centos-minimal",
  "memory": 4096,
  "storage": {
    "default_pool": "default",
    "disks": [
      {
        "action": "create",
        "size": 50
      }
    ]
  },
  "autostart": true
}
```

## Error Responses

### Storage Pool Not Found
```json
{
  "error": "default storage pool 'custom-pool' not found: storage pool not found"
}
```

### Invalid Disk Configuration
```json
{
  "error": "disk 0: size is required for create action"
}
```

### PCI Device Error
```json
{
  "error": "device 0 (0000:01:00.0) IOMMU check failed: IOMMU not enabled"
}
```

## Response Structure

### Success Response
```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "name": "ubuntu-vm",
  "state": "shutoff",
  "memory": 2048,
  "vcpus": 2,
  // ... additional VM details
}
```

### Error Response
```json
{
  "error": "error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

## Validation Rules

### Storage
- `storage` object is required
- `default_pool` must exist
- At least one disk is required
- `size` required for "create" action
- `path` required for "attach" action
- `clone_from` required for "clone" action

### PCI Devices
- Device must exist on host
- IOMMU must be enabled
- Device must not be assigned to another VM
- ROM file must exist if specified

### Templates
- Template must exist if specified
- Template values are defaults, can be overridden

## Performance Considerations

1. **Disk Creation**: Sequential to avoid storage contention
2. **PCI Passthrough**: May require memory locking limits adjustment
3. **Template Application**: Templates are cached for performance
4. **Boot ISO**: Verified for existence before VM creation

## Security Notes

1. **Path Validation**: Absolute paths are validated for security
2. **PCI Devices**: Require appropriate permissions
3. **Storage Pools**: Access controlled by libvirt
4. **Template Access**: Templates are validated before application

---

*API Version: 2.0.0*
*Last Updated: 2025-08-16*
