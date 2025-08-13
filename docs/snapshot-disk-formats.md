# VM Snapshot Support by Disk Format

## Overview
This document outlines snapshot capabilities for different disk image formats used with KVM/QEMU virtualization.

## Disk Format Compatibility Matrix

| Format | Internal Snapshots | External Snapshots | Memory State | Performance | Space Efficiency |
|--------|-------------------|-------------------|--------------|-------------|------------------|
| qcow2  | ✅ Full           | ✅ Full           | ✅ Yes       | Excellent   | Excellent        |
| raw    | ❌ No             | ✅ Yes (as qcow2) | ⚠️ Limited   | Good        | Poor             |
| vmdk   | ❌ No             | ✅ Yes (as qcow2) | ⚠️ Limited   | Fair        | Fair             |
| vdi    | ❌ No             | ✅ Yes (as qcow2) | ⚠️ Limited   | Fair        | Fair             |
| vhd    | ❌ No             | ✅ Yes (as qcow2) | ⚠️ Limited   | Fair        | Fair             |
| lvm    | ❌ N/A            | ✅ Yes (LVM)      | ⚠️ External  | Excellent   | Good             |
| rbd    | ✅ Yes (RBD)      | ✅ Yes            | ⚠️ External  | Excellent   | Excellent        |

## Detailed Format Information

### QCOW2 (Recommended)
**Best choice for snapshot functionality**

```xml
<!-- Disk definition for qcow2 -->
<disk type='file' device='disk'>
  <driver name='qemu' type='qcow2'/>
  <source file='/var/lib/libvirt/images/vm-disk.qcow2'/>
  <target dev='vda' bus='virtio'/>
</disk>
```

**Advantages:**
- Native snapshot support built into the format
- Multiple snapshots in single file
- Snapshot chains and branching
- Memory state can be embedded
- Copy-on-write for space efficiency
- Compression support

**Limitations:**
- Slightly lower I/O performance than raw (usually negligible with modern systems)

### RAW
**High performance but limited snapshot features**

```xml
<!-- Disk definition for raw -->
<disk type='file' device='disk'>
  <driver name='qemu' type='raw'/>
  <source file='/var/lib/libvirt/images/vm-disk.raw'/>
  <target dev='vda' bus='virtio'/>
</disk>
```

**Snapshot Behavior:**
- External snapshots create qcow2 overlay files
- Original raw file becomes backing store (read-only)
- New writes go to qcow2 overlay

```bash
# After snapshot on raw disk:
vm-disk.raw (backing file - read-only)
    └── vm-disk.snapshot1.qcow2 (active overlay - read/write)
```

### LVM Logical Volumes
**Enterprise-grade snapshot support**

```xml
<!-- Disk definition for LVM -->
<disk type='block' device='disk'>
  <driver name='qemu' type='raw'/>
  <source dev='/dev/vg_vms/vm_disk'/>
  <target dev='vda' bus='virtio'/>
</disk>
```

**Snapshot Commands:**
```bash
# Create LVM snapshot
lvcreate -L 10G -s -n vm_disk_snap1 /dev/vg_vms/vm_disk

# Merge snapshot back
lvconvert --merge /dev/vg_vms/vm_disk_snap1
```

## Code Implementation Suggestions

### 1. Detect Disk Format Before Snapshot

```go
func (s *Service) canCreateInternalSnapshot(domain *libvirt.Domain) (bool, error) {
    xmlDesc, err := domain.GetXMLDesc(0)
    if err != nil {
        return false, err
    }
    
    // Parse XML to check disk formats
    // Return true only if all disks are qcow2 or support internal snapshots
    return checkDiskFormats(xmlDesc)
}
```

### 2. Handle Format-Specific Snapshot Creation

```go
func (s *Service) CreateSnapshot(ctx context.Context, nameOrUUID string, req *VMSnapshotRequest) (*VMSnapshot, error) {
    // ... existing code ...
    
    // Check disk format compatibility
    canInternal, err := s.canCreateInternalSnapshot(domain)
    if err != nil {
        return nil, err
    }
    
    flags := uint32(0)
    if !canInternal || !req.Memory {
        // Force external snapshot for non-qcow2 disks
        flags = libvirt.DOMAIN_SNAPSHOT_CREATE_DISK_ONLY
        if !canInternal {
            log.Info("Using external snapshot due to disk format limitations")
        }
    }
    
    // For raw disks, warn about conversion
    if hasRawDisks {
        log.Warn("Raw disk will use qcow2 overlay for snapshot")
    }
    
    // ... rest of implementation ...
}
```

### 3. Add Format Information to API Response

```go
type VMSnapshot struct {
    Name         string            `json:"name"`
    Type         string            `json:"type"` // "internal" or "external"
    DiskFormats  []string          `json:"disk_formats"`
    Limitations  []string          `json:"limitations,omitempty"`
    // ... other fields ...
}
```

## Best Practices

### 1. **Default to QCOW2 for New VMs**
```go
const DefaultDiskFormat = "qcow2"
```

### 2. **Convert RAW to QCOW2 When Snapshots Needed**
```bash
# Convert raw to qcow2 (offline)
qemu-img convert -f raw -O qcow2 vm-disk.raw vm-disk.qcow2

# Update VM configuration to use new disk
virsh edit vm-name
```

### 3. **Use External Snapshots for Mixed Formats**
When a VM has multiple disks with different formats, external snapshots are safer:

```go
func (s *Service) shouldUseExternalSnapshot(disks []DiskInfo) bool {
    formats := make(map[string]bool)
    for _, disk := range disks {
        formats[disk.Format] = true
    }
    // Use external if mixed formats or any non-qcow2
    return len(formats) > 1 || !formats["qcow2"]
}
```

### 4. **Snapshot Chain Management**
For external snapshots, monitor chain length:

```go
const MaxSnapshotChainLength = 10

func (s *Service) checkSnapshotChainLength(domain *libvirt.Domain) error {
    // Check chain length and warn/consolidate if too long
    // Long chains can impact performance
}
```

## Migration Considerations

### Converting Between Formats
```bash
# RAW to QCOW2 (recommended for snapshot support)
qemu-img convert -f raw -O qcow2 input.raw output.qcow2

# QCOW2 to RAW (for maximum performance)
qemu-img convert -f qcow2 -O raw input.qcow2 output.raw

# VMDK to QCOW2 (migrating from VMware)
qemu-img convert -f vmdk -O qcow2 input.vmdk output.qcow2
```

### Consolidating Snapshot Chains
```bash
# Merge external snapshot back to base
virsh blockcommit vm-name vda --active --pivot

# Or manually with qemu-img
qemu-img commit overlay.qcow2
```

## Performance Impact

| Operation | QCOW2 Internal | QCOW2 External | RAW + External | LVM Snapshot |
|-----------|---------------|----------------|----------------|--------------|
| Create    | Fast          | Fast           | Fast           | Very Fast    |
| Delete    | Fast          | Moderate       | Moderate       | Fast         |
| Revert    | Fast          | Fast           | Fast           | Fast         |
| I/O Impact| Low           | Low-Moderate   | Moderate       | Low          |
| Space     | Efficient     | Efficient      | Less Efficient | Moderate     |

## Recommendations

1. **New Deployments**: Use QCOW2 as default format
2. **High Performance**: Use RAW with LVM for snapshots
3. **Cloud/Distributed**: Use RBD with Ceph
4. **Migration from VMware**: Convert VMDK to QCOW2
5. **Existing RAW disks**: Accept external snapshot limitations or convert to QCOW2

## Error Messages for Unsupported Operations

```go
var ErrInternalSnapshotNotSupported = errors.New(
    "Internal snapshots not supported for RAW disk format. " +
    "External snapshot will be created using qcow2 overlay.")

var ErrMemorySnapshotRequiresQcow2 = errors.New(
    "Memory state snapshots require all disks to be in qcow2 format.")
```
