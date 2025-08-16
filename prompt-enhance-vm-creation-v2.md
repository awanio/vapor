# Task: Enhance VM Creation Endpoint for Vapor Project

## Context
You are working on the Vapor project, an open-source Linux OS management system built with Go. The project uses libvirt for virtualization management and has an existing VM creation endpoint at `/virtualization/virtualmachines/create-enhanced`.

## Current State
The endpoint currently accepts a JSON payload with a flat structure:
- Basic VM properties (name, memory, vcpus)
- Storage configuration spread across root level (storage_pool, iso_path, disks)
- Networks, graphics, cloud_init configurations
- Template system for base configurations
- Custom metadata fields

**Note**: Since the project is not yet in production, we will restructure the API for better organization.

## Objective
Enhance the VM creation endpoint to:
1. Reorganize storage configuration into a nested structure
2. Reduce redundancy in storage handling
3. Add PCI device passthrough capability at creation time
4. Improve template system documentation

## Requirements

### 1. Storage Structure Reorganization

#### Current Issue
- Storage-related fields scattered at root level (storage_pool, iso_path, disks)
- Redundancy between `iso_path` field and `disks` array
- Unclear relationship between storage pool and disk paths

#### Required Changes
1. **Implement nested storage structure**:
   ```json
   {
     "storage": {
       "default_pool": "default",      // Default pool for relative paths
       "boot_iso": "ubuntu-22.04.iso", // Optional convenience field
       "disks": [                      // Array of disk configurations
         {
           "action": "create",
           "size": 20,
           "path": "disk1.qcow2",
           "storage_pool": "fast-ssd"  // Optional: override default_pool
         }
       ]
     }
   }
   ```

2. **When `storage.boot_iso` is provided**, internally convert it to a disk entry:
   ```json
   {
     "action": "attach",
     "path": "<resolved_iso_path>",
     "format": "raw",
     "bus": "ide",      // or "sata" for modern VMs
     "target": "hdc",   // auto-assign if not specified
     "device": "cdrom",
     "readonly": true
   }
   ```

3. **Path resolution logic**:
   ```go
   func resolveStoragePath(path string, pool string, defaultPool string) string {
       // If absolute path, use as-is
       if filepath.IsAbs(path) {
           return path
       }
       
       // Determine which pool to use
       activePool := defaultPool
       if pool != "" {
           activePool = pool
       }
       
       // Get pool path and join with relative path
       poolPath := getStoragePoolPath(activePool)
       return filepath.Join(poolPath, path)
   }
   ```

#### Implementation Notes
- Check if any disk entry has `device: "cdrom"` when `boot_iso` is provided
- Auto-assign next available target for cdrom if not specified
- Apply path resolution to both `boot_iso` and disk paths
- Validate storage pool exists before using

### 2. Storage Pool Behavior

#### Required Clarifications
1. **storage.default_pool**: 
   - Used for all relative paths when disk doesn't specify storage_pool
   - Applied to boot_iso if it's a relative path
   - Must reference an existing libvirt storage pool

2. **Per-disk pool override**:
   - Each disk can specify its own `storage_pool`
   - Overrides `default_pool` for that specific disk
   - Allows mixing disks from different pools

3. **Path resolution rules**:
   - Absolute paths: Use as-is, ignore pools
   - Relative paths: Resolve against appropriate pool
   - Empty path: Auto-generate name and use pool

### 3. PCI Device Attachment at Creation

#### Current Issue
- PCI devices can only be attached after VM creation
- Requires multiple API calls for GPU passthrough
- Some devices need to be present at boot

#### Required Changes
1. **Add `pci_devices` array to creation payload**:
   ```json
   {
     "pci_devices": [
       {
         "host_address": "0000:01:00.0",     // Required: PCI address on host
         "guest_address": "0000:05:00.0",    // Optional: auto-assign if omitted
         "rom_file": "/path/to/vbios.rom",   // Optional: for GPU passthrough
         "multifunction": true,               // Optional: default false
         "primary_gpu": false                 // Optional: for GPU passthrough
       }
     ]
   }
   ```

2. **Validation requirements**:
   - Verify device exists: `lspci -s <host_address>`
   - Check device not assigned to another VM
   - Validate entire IOMMU group availability
   - Ensure VFIO driver is available

3. **Auto-configuration**:
   - Calculate memory locking limits for VFIO
   - Enable IOMMU in VM features
   - Unbind device from host driver if needed
   - Set up VFIO permissions

### 4. Template System Documentation

#### Required Changes
1. **Document merge strategy**:
   ```go
   // Template Merge Strategy:
   // 1. Load base template configuration
   // 2. Simple fields (memory, vcpus): override if provided
   // 3. Arrays: replace entirely if provided (not append)
   //    - storage.disks: full replacement
   //    - networks: full replacement  
   //    - pci_devices: full replacement
   // 4. Nested objects:
   //    - storage: merge at storage level (can override default_pool only)
   //    - cloud_init: deep merge
   // 5. metadata: merge keys (override on conflict)
   ```

2. **Add (if not exists) template discovery endpoints**:
   - `GET /virtualization/virtualmachines/templates` - list available templates
   - `GET /virtualization/virtualmachines/templates/{name}` - get template details

## Migration from Old Structure

### Old Structure (flat):
```json
{
  "name": "vm-01",
  "storage_pool": "default",
  "iso_path": "ubuntu.iso",
  "disks": [...]
}
```

### New Structure (nested):
```json
{
  "name": "vm-01",
  "storage": {
    "default_pool": "default",
    "boot_iso": "ubuntu.iso",
    "disks": [...]
  }
}
```

### Migration Path:
1. Update all internal templates to new structure
2. Update API documentation
3. Consider providing migration utility for early adopters
4. Remove support for old structure (okay since not in production)

## Complete Example Payload

```json
{
  "name": "gpu-workstation",
  "template": "ubuntu-workstation",
  "memory": 16384,
  "vcpus": 8,
  "storage": {
    "default_pool": "fast-nvme",
    "boot_iso": "ubuntu-22.04-desktop.iso",
    "disks": [
      {
        "action": "create",
        "size": 100,
        "path": "system.qcow2"
      },
      {
        "action": "create",
        "size": 500,
        "storage_pool": "bulk-storage",
        "path": "data.qcow2"
      },
      {
        "action": "attach",
        "path": "/mnt/share/common-data.qcow2"
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
  "networks": [
    {
      "type": "network",
      "source": "default",
      "model": "virtio"
    }
  ],
  "graphics": [
    {
      "type": "vnc",
      "autoport": true,
      "listen": "0.0.0.0"
    }
  ],
  "cloud_init": {
    "user_data": "#cloud-config\npackages:\n  - nginx",
    "meta_data": "instance-id: gpu-workstation"
  },
  "autostart": true
}
```

## Code Locations to Modify

1. **Type definitions** (`internal/libvirt/types.go`):
   - Update `VMCreateRequest` struct with nested storage
   - Add `PCIDevice` struct
   - Add `StorageConfig` struct

2. **VM creation handler** (`internal/libvirt/vm_create.go`):
   - Update to handle nested storage structure
   - Add boot_iso to disk conversion
   - Add PCI device attachment logic
   - Update path resolution logic

3. **Validation** (`internal/libvirt/validation.go`):
   - Add storage structure validation
   - Add PCI device validation
   - Add storage pool existence check

4. **Template handling** (`internal/libvirt/templates.go`):
   - Update template merge logic for nested structure
   - Add template discovery endpoints

5. **OpenAPI specification** (`openapi.yaml`):
   - Update request/response schemas
   - Add new endpoints
   - Document breaking changes

## Testing Requirements

### Unit Tests
1. Test boot_iso to disk conversion
2. Test path resolution with various pool configurations
3. Test PCI device validation
4. Test template merging with nested storage

### Integration Tests
1. Create VM with nested storage structure
2. Create VM with PCI passthrough
3. Create VM with mixed storage pools
4. Create VM from template with overrides

### Manual Testing
1. GPU passthrough with primary display
2. Network adapter passthrough
3. Boot from ISO with multiple disks
4. Template-based creation with storage overrides

## Success Criteria

1. ✅ **Clean Structure**: All storage configuration grouped logically
2. ✅ **No Redundancy**: Clear relationship between boot media and disks
3. ✅ **PCI at Creation**: Full passthrough configuration at VM creation
4. ✅ **Clear Documentation**: Template merge behavior documented
5. ✅ **Proper Validation**: All inputs validated with clear error messages
6. ✅ **Updated OpenAPI**: Specification reflects all changes

## Important Notes

- This is a breaking change to the API structure
- Acceptable because project is not in production
- Focus on clean design over backward compatibility
- Ensure comprehensive testing of new structure
- Update all example code and documentation

## References

- Libvirt Domain XML: https://libvirt.org/formatdomain.html
- Storage Pools: https://libvirt.org/formatstorage.html
- PCI Passthrough: https://libvirt.org/formatdomain.html#hostdev
- VFIO/IOMMU: https://www.kernel.org/doc/Documentation/vfio.txt

---

*This prompt provides complete requirements for restructuring the VM creation endpoint with a cleaner, nested storage configuration.*
