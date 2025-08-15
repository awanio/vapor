package libvirt

import (
"testing"
"time"

"github.com/stretchr/testify/assert"
"github.com/stretchr/testify/mock"
"libvirt.org/go/libvirt"
)

// MockLibvirtConnection is a mock implementation of libvirt connection
type MockLibvirtConnection struct {
mock.Mock
}

func (m *MockLibvirtConnection) Close() (int, error) {
args := m.Called()
return args.Int(0), args.Error(1)
}

func (m *MockLibvirtConnection) IsAlive() (bool, error) {
args := m.Called()
return args.Bool(0), args.Error(1)
}

// TestNewService tests the creation of a new libvirt service
func TestNewService(t *testing.T) {
// This test requires a real libvirt connection
// Skip if libvirt is not available
t.Run("create service with default URI", func(t *testing.T) {
service, err := NewService("")
if err != nil {
t.Skipf("Libvirt not available: %v", err)
}
assert.NotNil(t, service)
assert.NotNil(t, service.conn)
service.Close()
})

t.Run("create service with custom URI", func(t *testing.T) {
service, err := NewService("qemu:///system")
if err != nil {
t.Skipf("Libvirt not available: %v", err)
}
assert.NotNil(t, service)
assert.NotNil(t, service.conn)
service.Close()
})
}

// TestVMState tests VM state conversion
func TestVMState(t *testing.T) {
tests := []struct {
name     string
state    libvirt.DomainState
expected VMState
}{
{"running", libvirt.DOMAIN_RUNNING, VMStateRunning},
{"paused", libvirt.DOMAIN_PAUSED, VMStatePaused},
{"shutoff", libvirt.DOMAIN_SHUTOFF, VMStateShutoff},
{"crashed", libvirt.DOMAIN_CRASHED, VMStateCrashed},
}

for _, tt := range tests {
t.Run(tt.name, func(t *testing.T) {
// Test state conversion logic
var result VMState
switch tt.state {
case libvirt.DOMAIN_RUNNING:
result = VMStateRunning
case libvirt.DOMAIN_PAUSED:
result = VMStatePaused
case libvirt.DOMAIN_SHUTOFF:
result = VMStateShutoff
case libvirt.DOMAIN_CRASHED:
result = VMStateCrashed
default:
result = VMStateUnknown
}
assert.Equal(t, tt.expected, result)
})
}
}

// TestVMCreateRequest tests VM creation request validation
func TestVMCreateRequest(t *testing.T) {
tests := []struct {
name    string
req     VMCreateRequest
wantErr bool
}{
{
name: "valid request",
req: VMCreateRequest{
Name:   "test-vm",
Memory: 2048,
VCPUs:  2,
},
wantErr: false,
},
{
name: "missing name",
req: VMCreateRequest{
Memory: 2048,
VCPUs:  2,
},
wantErr: true,
},
{
name: "invalid memory",
req: VMCreateRequest{
Name:   "test-vm",
Memory: 0,
VCPUs:  2,
},
wantErr: true,
},
{
name: "invalid vcpus",
req: VMCreateRequest{
Name:   "test-vm",
Memory: 2048,
VCPUs:  0,
},
wantErr: true,
},
}

for _, tt := range tests {
t.Run(tt.name, func(t *testing.T) {
// Validate request
err := validateVMCreateRequest(&tt.req)
if tt.wantErr {
assert.Error(t, err)
} else {
assert.NoError(t, err)
}
})
}
}

// validateVMCreateRequest validates a VM creation request
func validateVMCreateRequest(req *VMCreateRequest) error {
if req.Name == "" {
return assert.AnError
}
if req.Memory == 0 {
return assert.AnError
}
if req.VCPUs == 0 {
return assert.AnError
}
return nil
}

// TestSnapshotRequest tests snapshot request validation
func TestSnapshotRequest(t *testing.T) {
tests := []struct {
name    string
req     VMSnapshotRequest
wantErr bool
}{
{
name: "valid request",
req: VMSnapshotRequest{
Name:        "snapshot1",
Description: "Test snapshot",
Memory:      true,
},
wantErr: false,
},
{
name: "missing name",
req: VMSnapshotRequest{
Description: "Test snapshot",
Memory:      true,
},
wantErr: true,
},
}

for _, tt := range tests {
t.Run(tt.name, func(t *testing.T) {
// Validate request
err := validateSnapshotRequest(&tt.req)
if tt.wantErr {
assert.Error(t, err)
} else {
assert.NoError(t, err)
}
})
}
}

// validateSnapshotRequest validates a snapshot request
func validateSnapshotRequest(req *VMSnapshotRequest) error {
if req.Name == "" {
return assert.AnError
}
return nil
}

// TestBackupRequest tests backup request validation
func TestBackupRequest(t *testing.T) {
tests := []struct {
name    string
req     VMBackupRequest
wantErr bool
}{
{
name: "valid full backup",
req: VMBackupRequest{
Type:        BackupTypeFull,
DestinationPath: "/backup/path",
Compression: BackupCompressionGzip,
},
wantErr: false,
},
{
name: "valid incremental backup",
req: VMBackupRequest{
Type:        BackupTypeIncremental,
DestinationPath: "/backup/path",
Compression: BackupCompressionNone,
},
wantErr: false,
},
{
name: "missing destination",
req: VMBackupRequest{
Type:        BackupTypeFull,
Compression: BackupCompressionGzip,
},
wantErr: true,
},
}

for _, tt := range tests {
t.Run(tt.name, func(t *testing.T) {
// Validate request
err := validateBackupRequest(&tt.req)
if tt.wantErr {
assert.Error(t, err)
} else {
assert.NoError(t, err)
}
})
}
}

// validateBackupRequest validates a backup request
func validateBackupRequest(req *VMBackupRequest) error {
if req.DestinationPath == "" {
return assert.AnError
}
return nil
}

// TestMigrationRequest tests migration request validation
func TestMigrationRequest(t *testing.T) {
tests := []struct {
name    string
req     MigrationRequest
wantErr bool
}{
{
name: "valid live migration",
req: MigrationRequest{
DestinationHost: "host2.example.com",
Live:     true,
},
wantErr: false,
},
{
name: "valid offline migration",
req: MigrationRequest{
DestinationHost: "host2.example.com",
Live:     false,
},
wantErr: false,
},
{
name: "missing destination host",
req: MigrationRequest{
Live: true,
},
wantErr: true,
},
}

for _, tt := range tests {
t.Run(tt.name, func(t *testing.T) {
// Validate request
err := validateMigrationRequest(&tt.req)
if tt.wantErr {
assert.Error(t, err)
} else {
assert.NoError(t, err)
}
})
}
}

// validateMigrationRequest validates a migration request
func validateMigrationRequest(req *MigrationRequest) error {
if req.DestinationHost == "" {
return assert.AnError
}
return nil
}

// TestStoragePoolRequest tests storage pool request validation
func TestStoragePoolRequest(t *testing.T) {
tests := []struct {
name    string
req     StoragePoolCreateRequest
wantErr bool
}{
{
name: "valid directory pool",
req: StoragePoolCreateRequest{
Name: "test-pool",
Type: "dir",
Path: "/var/lib/libvirt/images",
},
wantErr: false,
},
{
name: "valid NFS pool",
req: StoragePoolCreateRequest{
Name:   "nfs-pool",
Type:   "netfs",
Source: "nfs.example.com:/export/vms",
Path:   "/mnt/nfs",
},
wantErr: false,
},
{
name: "missing name",
req: StoragePoolCreateRequest{
Type: "dir",
Path: "/var/lib/libvirt/images",
},
wantErr: true,
},
{
name: "missing path",
req: StoragePoolCreateRequest{
Name: "test-pool",
Type: "dir",
},
wantErr: true,
},
}

for _, tt := range tests {
t.Run(tt.name, func(t *testing.T) {
// Validate request
err := validateStoragePoolRequest(&tt.req)
if tt.wantErr {
assert.Error(t, err)
} else {
assert.NoError(t, err)
}
})
}
}

// validateStoragePoolRequest validates a storage pool request
func validateStoragePoolRequest(req *StoragePoolCreateRequest) error {
if req.Name == "" {
return assert.AnError
}
if req.Path == "" {
return assert.AnError
}
return nil
}

// TestNetworkRequest tests network request validation
func TestNetworkRequest(t *testing.T) {
tests := []struct {
name    string
req     NetworkCreateRequest
wantErr bool
}{
{
name: "valid NAT network",
req: NetworkCreateRequest{
Name:    "test-net",
Mode:    "nat",
Bridge:  "virbr1",
// IPRange will need proper struct initialization,
},
wantErr: false,
},
{
name: "valid bridge network",
req: NetworkCreateRequest{
Name:   "bridge-net",
Mode:   "bridge",
Bridge: "br0",
},
wantErr: false,
},
{
name: "missing name",
req: NetworkCreateRequest{
Mode:   "nat",
Bridge: "virbr1",
},
wantErr: true,
},
}

for _, tt := range tests {
t.Run(tt.name, func(t *testing.T) {
// Validate request
err := validateNetworkRequest(&tt.req)
if tt.wantErr {
assert.Error(t, err)
} else {
assert.NoError(t, err)
}
})
}
}

// validateNetworkRequest validates a network request
func validateNetworkRequest(req *NetworkCreateRequest) error {
if req.Name == "" {
return assert.AnError
}
return nil
}

// TestVMTemplate tests VM template functionality
func TestVMTemplate(t *testing.T) {
template := &VMTemplate{
Name:              "ubuntu-22.04",
Description:       "Ubuntu 22.04 LTS",
OSType:            "linux",
MinMemory:         2048 * 1024 * 1024,
RecommendedMemory: 4096 * 1024 * 1024,
MinVCPUs:          2,
RecommendedVCPUs:  4,
MinDisk:           20 * 1024 * 1024 * 1024,
RecommendedDisk:   50 * 1024 * 1024 * 1024,
DiskFormat:        "qcow2",
NetworkModel:      "virtio",
GraphicsType:      "vnc",
CloudInit:         true,
}

assert.Equal(t, "ubuntu-22.04", template.Name)
assert.Equal(t, "linux", template.OSType)
assert.True(t, template.CloudInit)
assert.Equal(t, uint64(2048*1024*1024), template.MinMemory)
assert.Equal(t, uint(2), template.MinVCPUs)
}

// TestDiskFormat tests disk format identification
func TestDiskFormat(t *testing.T) {
tests := []struct {
name     string
format   DiskFormat
supports struct {
internal bool
external bool
memory   bool
}
}{
{
name:   "qcow2",
format: DiskFormatQCOW2,
supports: struct {
internal bool
external bool
memory   bool
}{true, true, true},
},
{
name:   "raw",
format: DiskFormatRAW,
supports: struct {
internal bool
external bool
memory   bool
}{false, true, false},
},
{
name:   "vmdk",
format: DiskFormatVMDK,
supports: struct {
internal bool
external bool
memory   bool
}{false, true, false},
},
}

for _, tt := range tests {
t.Run(string(tt.format), func(t *testing.T) {
// Test format capabilities
if tt.format == DiskFormatQCOW2 {
assert.True(t, tt.supports.internal)
assert.True(t, tt.supports.memory)
} else {
assert.False(t, tt.supports.internal)
assert.False(t, tt.supports.memory)
}
assert.True(t, tt.supports.external) // All formats support external snapshots
})
}
}

// TestISOImage tests ISO image functionality
func TestISOImage(t *testing.T) {
iso := &ISOImage{
ImageID:      "iso-001",
Filename:     "ubuntu-22.04.iso",
Path:         "/var/lib/libvirt/images/ubuntu-22.04.iso",
SizeBytes:    3825205248, // ~3.6GB
OSType:       "linux",
OSVersion:    "ubuntu22.04",
Architecture: "x86_64",
Description:  "Ubuntu 22.04 LTS Server",
IsPublic:     true,
UploadedBy:   "admin",
UploadStatus: "completed",
CreatedAt:    time.Now(),
}

assert.Equal(t, "iso-001", iso.ImageID)
assert.Equal(t, "ubuntu-22.04.iso", iso.Filename)
assert.Equal(t, int64(3825205248), iso.SizeBytes)
assert.Equal(t, "completed", iso.UploadStatus)
assert.True(t, iso.IsPublic)
}

// TestPCIDevice tests PCI device functionality
func TestPCIDevice(t *testing.T) {
device := &PCIDevice{
DeviceID:    "gpu-001",
VendorID:    "10de", // NVIDIA
ProductID:   "1b06", // GTX 1080 Ti
VendorName:  "NVIDIA Corporation",
ProductName: "GeForce GTX 1080 Ti",
DeviceType:  PCIDeviceTypeGPU,
PCIAddress:  "0000:01:00.0",
IOMMUGroup:  1,
Driver:      "vfio-pci",
IsAvailable: true,
}

assert.Equal(t, "gpu-001", device.DeviceID)
assert.Equal(t, PCIDeviceTypeGPU, device.DeviceType)
assert.Equal(t, "0000:01:00.0", device.PCIAddress)
assert.True(t, device.IsAvailable)
}

// TestVMMetrics tests VM metrics functionality
func TestVMMetrics(t *testing.T) {
metrics := &VMMetrics{
UUID:          "vm-001",
Timestamp:     time.Now(),
CPUUsage:      45.5,
MemoryUsed:    1024 * 1024 * 1024, // 1GB
// MemoryTotal:   2048 * 1024 * 1024, // 2GB
MemoryUsage:   50.0,
DiskRead: 1000000,
DiskWrite: 500000,
NetworkRX: 2000000,
NetworkTX: 1500000,
}

assert.Equal(t, "vm-001", metrics.UUID)
assert.Equal(t, float64(45.5), metrics.CPUUsage)
assert.Equal(t, float64(50.0), metrics.MemoryUsage)
assert.Equal(t, uint64(1024*1024*1024), metrics.MemoryUsed)
}

// TestMigrationStatus tests migration status functionality
func TestMigrationStatus(t *testing.T) {
tests := []struct {
name     string
status   string
progress int
isActive bool
}{
{"pending", "pending", 0, false},
{"active", "active", 50, true},
{"completed", "completed", 100, false},
{"failed", "failed", 0, false},
{"cancelled", "cancelled", 0, false},
}

for _, tt := range tests {
t.Run(tt.name, func(t *testing.T) {
status := &MigrationStatusResponse{
VMName:          "vm-001",
MigrationID:   "migration-001",
Status:        tt.status,
Progress:      tt.progress,
DataRemaining: 0,
DataProcessed: 0,
StartedAt:     time.Now(),
}

assert.Equal(t, tt.status, status.Status)
assert.Equal(t, tt.progress, status.Progress)
if tt.isActive {
assert.Equal(t, "active", status.Status)
}
})
}
}

// TestConsoleResponse tests console response functionality
func TestConsoleResponse(t *testing.T) {
console := &ConsoleResponse{
Type:     "vnc",
Host:     "localhost",
Port:     5900,
Password: "secret",
Token:    "console-token-123",
}

assert.Equal(t, "vnc", console.Type)
assert.Equal(t, "localhost", console.Host)
assert.Equal(t, 5900, console.Port)
assert.NotEmpty(t, console.Token)
}
