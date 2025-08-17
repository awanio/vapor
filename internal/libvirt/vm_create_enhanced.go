package libvirt

import (
"context"
"fmt"
"os"
"path/filepath"
"strings"
"time"
)

// VMCreateRequestEnhanced represents an enhanced request to create a new VM
type VMCreateRequestEnhanced struct {
Name   string `json:"name" binding:"required"`
Memory uint64 `json:"memory" binding:"required"` // in MB
VCPUs  uint   `json:"vcpus" binding:"required"`

// Nested storage configuration
Storage *StorageConfig `json:"storage" binding:"required"`

// OS configuration
OSType       string `json:"os_type"`              // linux, windows, etc
OSVariant    string `json:"os_variant,omitempty"` // ubuntu20.04, win10, etc
Architecture string `json:"architecture"`         // x86_64 by default
UEFI         bool   `json:"uefi"`                 // Use UEFI boot
SecureBoot   bool   `json:"secure_boot"`          // Enable secure boot
TPM          bool   `json:"tpm"`                  // Add TPM device

// Network configuration
Networks []NetworkConfig `json:"networks,omitempty"` // Multiple networks

// Graphics configuration
Graphics []EnhancedGraphicsConfig `json:"graphics,omitempty"` // Support multiple graphics devices

// PCI device passthrough at creation
PCIDevices []PCIDeviceConfig `json:"pci_devices,omitempty"`

// Cloud-init configuration
CloudInit *CloudInitConfig `json:"cloud_init,omitempty"`

// Template to use
Template string `json:"template,omitempty"`

// Auto-start on host boot
AutoStart bool `json:"autostart"`

// Custom XML overrides (advanced users)
CustomXML string `json:"custom_xml,omitempty"`

// Metadata for the VM
Metadata map[string]string `json:"metadata,omitempty"`
}

// StorageConfig represents the nested storage configuration
type StorageConfig struct {
DefaultPool string             `json:"default_pool" binding:"required"` // Default pool for relative paths
BootISO     string             `json:"boot_iso,omitempty"`              // Optional convenience field for boot ISO
Disks       []DiskCreateConfig `json:"disks" binding:"required,min=1"` // Array of disk configurations
}

// EnhancedGraphicsConfig extends graphics configuration
type EnhancedGraphicsConfig struct {
Type     string `json:"type" binding:"required"`    // vnc, spice, egl-headless, none
Port     int    `json:"port,omitempty"`     // -1 for auto
AutoPort bool   `json:"autoport,omitempty"` // Auto-assign port
Listen   string `json:"listen,omitempty"`   // Listen address (default: 127.0.0.1)
Password string `json:"password,omitempty"`
}

// DiskCreateConfig represents disk configuration for VM creation
type DiskCreateConfig struct {
// Disk creation action
Action string `json:"action" binding:"required,oneof=create attach clone"` // "create", "attach", "clone"

// For create action
Size   uint64 `json:"size,omitempty"`   // Size in GB for new disk (required for create)
Format string `json:"format,omitempty"` // qcow2, raw, etc (default: qcow2)

// For attach/clone action or override
Path string `json:"path,omitempty"` // Path to existing disk or relative path

// Storage pool override (if different from default_pool)
StoragePool string `json:"storage_pool,omitempty"`

// For clone action
CloneFrom string `json:"clone_from,omitempty"` // Path to source disk to clone (required for clone)

// Common options
Bus       DiskBus `json:"bus,omitempty"`        // virtio, sata, scsi, ide (default: virtio)
BootOrder int     `json:"boot_order,omitempty"` // Boot priority (1 = first)
Cache     string  `json:"cache,omitempty"`      // none, writethrough, writeback
IOMode    string  `json:"io_mode,omitempty"`    // native, threads
ReadOnly  bool    `json:"readonly"`
Device    string  `json:"device,omitempty"` // "disk", "cdrom", "floppy"

// Target device (auto-generated if not specified)
Target string `json:"target,omitempty"` // vda, vdb, sda, hdc, etc
}

// PCIDeviceConfig represents PCI device passthrough configuration
type PCIDeviceConfig struct {
HostAddress   string `json:"host_address" binding:"required"`  // Required: PCI address on host (e.g., "0000:01:00.0")
GuestAddress  string `json:"guest_address,omitempty"`          // Optional: PCI address in guest (auto-assign if omitted)
ROMFile       string `json:"rom_file,omitempty"`               // Optional: Path to ROM file (for GPU passthrough)
Multifunction bool   `json:"multifunction,omitempty"`          // Optional: Enable multifunction (default: false)
PrimaryGPU    bool   `json:"primary_gpu,omitempty"`            // Optional: Set as primary GPU (for GPU passthrough)
}

// CreateVMEnhanced creates a VM with enhanced disk and ISO support
func (s *Service) CreateVMEnhanced(ctx context.Context, req *VMCreateRequestEnhanced) (*VM, error) {
s.mu.Lock()
defer s.mu.Unlock()

// Validate storage is provided
if req.Storage == nil {
return nil, fmt.Errorf("storage configuration is required")
}

// Apply template if specified
if req.Template != "" {
if err := s.applyVMTemplate(ctx, req); err != nil {
return nil, fmt.Errorf("failed to apply template: %w", err)
}
}

// Validate and prepare storage configuration
diskConfigs, err := s.prepareEnhancedStorageConfig(ctx, req)
if err != nil {
return nil, fmt.Errorf("failed to prepare storage: %w", err)
}

// Validate PCI devices if specified
if len(req.PCIDevices) > 0 {
if err := s.validatePCIDevices(ctx, req.PCIDevices); err != nil {
return nil, fmt.Errorf("failed to validate PCI devices: %w", err)
}
}

// For now, use the existing createDisk method for the primary disk
// This is a temporary measure until we implement the full XML generation
var primaryDiskPath string
if len(diskConfigs) > 0 && diskConfigs[0].Created {
primaryDiskPath = diskConfigs[0].Path
}

// Convert to basic request for now (until full XML generation is implemented)
basicReq := &VMCreateRequest{
Name:         req.Name,
Memory:       req.Memory,
VCPUs:        req.VCPUs,
OSType:       req.OSType,
Architecture: req.Architecture,
DiskPath:     primaryDiskPath,
AutoStart:    req.AutoStart,
Metadata:     req.Metadata,
}

// Set network config if available
if len(req.Networks) > 0 {
basicReq.Network = req.Networks[0]
}

// Set graphics config if available
if len(req.Graphics) > 0 {
basicReq.Graphics = GraphicsConfig{
Type:     req.Graphics[0].Type,
Port:     req.Graphics[0].Port,
Password: req.Graphics[0].Password,
}
}

// Set cloud-init if available
basicReq.CloudInit = req.CloudInit

// Handle ISO path
for _, disk := range diskConfigs {
if disk.IsBootISO {
basicReq.ISOPath = disk.Path
break
}
}

// Generate domain XML
domainXML, err := s.generateDomainXML(basicReq)
if err != nil {
// Clean up any created disks on failure
s.cleanupCreatedDisks(diskConfigs)
return nil, fmt.Errorf("failed to generate domain XML: %w", err)
}

// Create the domain
domain, err := s.conn.DomainDefineXML(domainXML)
if err != nil {
// Clean up any created disks on failure
s.cleanupCreatedDisks(diskConfigs)
return nil, fmt.Errorf("failed to define domain: %w", err)
}
defer domain.Free()

// TODO: Attach PCI devices if specified
// This would require implementing the PCI attachment logic

// Set autostart if requested
if req.AutoStart {
if err := domain.SetAutostart(true); err != nil {
fmt.Printf("Warning: failed to set autostart: %v\n", err)
}
}

// Start the VM if boot ISO is provided (for installation)
if basicReq.ISOPath != "" {
if err := domain.Create(); err != nil {
fmt.Printf("Warning: failed to start VM: %v\n", err)
}
}

return s.domainToVM(domain)
}

// preparedDisk represents a disk that has been prepared for VM creation
type preparedDisk struct {
Path        string
Config      DiskCreateConfig
Created     bool   // Whether we created this disk (for cleanup on failure)
IsBootISO   bool   // Whether this disk was created from boot_iso field
StoragePool string // Resolved storage pool for this disk
}

// prepareEnhancedStorageConfig validates and prepares the storage configuration
func (s *Service) prepareEnhancedStorageConfig(ctx context.Context, req *VMCreateRequestEnhanced) ([]preparedDisk, error) {
var disks []preparedDisk

// Validate default pool exists
if err := s.validateStoragePool(ctx, req.Storage.DefaultPool); err != nil {
return nil, fmt.Errorf("default storage pool '%s' not found: %w", req.Storage.DefaultPool, err)
}

// Handle boot ISO if specified
if req.Storage.BootISO != "" {
bootDisk, err := s.prepareBootISO(ctx, req.Storage.BootISO, req.Storage.DefaultPool)
if err != nil {
return nil, fmt.Errorf("failed to prepare boot ISO: %w", err)
}
disks = append(disks, bootDisk)
}

// Process each disk configuration
for i, diskConfig := range req.Storage.Disks {
// Skip if it's a cdrom device and we already have a boot ISO
if diskConfig.Device == "cdrom" && req.Storage.BootISO != "" {
continue
}

// Validate action-specific requirements
switch diskConfig.Action {
case "create":
if diskConfig.Size == 0 {
return nil, fmt.Errorf("disk %d: size is required for create action", i)
}
case "attach":
if diskConfig.Path == "" {
return nil, fmt.Errorf("disk %d: path is required for attach action", i)
}
case "clone":
if diskConfig.CloneFrom == "" {
return nil, fmt.Errorf("disk %d: clone_from is required for clone action", i)
}
}

// Determine which storage pool to use
poolName := req.Storage.DefaultPool
if diskConfig.StoragePool != "" {
poolName = diskConfig.StoragePool
// Validate the override pool exists
if err := s.validateStoragePool(ctx, poolName); err != nil {
return nil, fmt.Errorf("storage pool '%s' not found for disk %d: %w", poolName, i, err)
}
}

// Prepare the disk based on action
var prepDisk preparedDisk
prepDisk.StoragePool = poolName
prepDisk.Config = diskConfig

switch diskConfig.Action {
case "create":
path, err := s.createEnhancedDisk(ctx, diskConfig, poolName, fmt.Sprintf("%s-disk%d", req.Name, i))
if err != nil {
// Clean up any previously created disks
s.cleanupCreatedDisks(disks)
return nil, fmt.Errorf("failed to create disk %d: %w", i, err)
}
prepDisk.Path = path
prepDisk.Created = true

case "attach":
path, err := s.resolveEnhancedDiskPath(ctx, diskConfig.Path, poolName)
if err != nil {
return nil, fmt.Errorf("failed to resolve path for disk %d: %w", i, err)
}
prepDisk.Path = path

case "clone":
sourcePath, err := s.resolveEnhancedDiskPath(ctx, diskConfig.CloneFrom, poolName)
if err != nil {
return nil, fmt.Errorf("failed to resolve clone source for disk %d: %w", i, err)
}
targetPath, err := s.cloneEnhancedDisk(ctx, sourcePath, poolName, fmt.Sprintf("%s-disk%d", req.Name, i))
if err != nil {
s.cleanupCreatedDisks(disks)
return nil, fmt.Errorf("failed to clone disk %d: %w", i, err)
}
prepDisk.Path = targetPath
prepDisk.Created = true
}

// Auto-generate target if not specified
if prepDisk.Config.Target == "" {
prepDisk.Config.Target = s.generateDiskTarget(diskConfig.Bus, i)
}

// Set default format if not specified
if prepDisk.Config.Format == "" {
prepDisk.Config.Format = "qcow2"
}

// Set default bus if not specified
if prepDisk.Config.Bus == "" {
prepDisk.Config.Bus = DiskBusVirtio
}

disks = append(disks, prepDisk)
}

return disks, nil
}

// prepareBootISO converts boot_iso field to a disk configuration
func (s *Service) prepareBootISO(ctx context.Context, bootISO string, defaultPool string) (preparedDisk, error) {
// Resolve the ISO path
isoPath, err := s.resolveEnhancedDiskPath(ctx, bootISO, defaultPool)
if err != nil {
return preparedDisk{}, fmt.Errorf("failed to resolve boot ISO path: %w", err)
}

// Verify the file exists and is readable
if _, err := os.Stat(isoPath); err != nil {
return preparedDisk{}, fmt.Errorf("boot ISO not found at %s: %w", isoPath, err)
}

// Create a disk configuration for the ISO
return preparedDisk{
Path:      isoPath,
IsBootISO: true,
Config: DiskCreateConfig{
Action:    "attach",
Path:      isoPath,
Format:    "raw",
Bus:       DiskBusIDE,    // Use IDE for better compatibility with boot media
Device:    "cdrom",
ReadOnly:  true,
BootOrder: 1,              // Boot from CD first
Target:    "hdc",          // Standard CD-ROM target
},
StoragePool: defaultPool,
}, nil
}

// resolveEnhancedDiskPath resolves a disk path considering storage pools
func (s *Service) resolveEnhancedDiskPath(ctx context.Context, path string, poolName string) (string, error) {
// If absolute path, use as-is
if filepath.IsAbs(path) {
return path, nil
}

// Get pool path
poolPath := fmt.Sprintf("/var/lib/libvirt/images/%s", poolName)
return filepath.Join(poolPath, path), nil
}

// validateStoragePool checks if a storage pool exists
func (s *Service) validateStoragePool(ctx context.Context, poolName string) error {
	if s.conn == nil {
		return fmt.Errorf("libvirt connection not initialized")
	}
pool, err := s.conn.LookupStoragePoolByName(poolName)
if err != nil {
return err
}
defer pool.Free()
return nil
}

// createEnhancedDisk creates a new disk in the specified storage pool
func (s *Service) createEnhancedDisk(ctx context.Context, config DiskCreateConfig, poolName string, diskName string) (string, error) {
if config.Format == "" {
config.Format = "qcow2"
}

// Use the existing createDisk method
return s.createDisk(poolName, diskName, config.Size)
}

// cloneEnhancedDisk clones an existing disk to a new location
func (s *Service) cloneEnhancedDisk(ctx context.Context, sourcePath string, poolName string, diskName string) (string, error) {
// Use the existing cloneDisk method
return s.cloneDisk(sourcePath, poolName, diskName)
}

// generateDiskTarget generates a disk target device name based on bus type
func (s *Service) generateDiskTarget(bus DiskBus, index int) string {
switch bus {
case DiskBusVirtio:
return fmt.Sprintf("vd%c", 'a'+index)
case DiskBusSATA, DiskBusSCSI:
return fmt.Sprintf("sd%c", 'a'+index)
case DiskBusIDE:
return fmt.Sprintf("hd%c", 'a'+index)
default:
return fmt.Sprintf("vd%c", 'a'+index)
}
}

// cleanupCreatedDisks removes any disks that were created during failed VM creation
func (s *Service) cleanupCreatedDisks(disks []preparedDisk) {
for _, disk := range disks {
if disk.Created {
os.Remove(disk.Path)
}
}
}

// validatePCIDevices validates PCI devices for passthrough
func (s *Service) validatePCIDevices(ctx context.Context, devices []PCIDeviceConfig) error {
for i, device := range devices {
// Check if device exists
if err := s.checkPCIDeviceExists(device.HostAddress); err != nil {
return fmt.Errorf("device %d (%s): %w", i, device.HostAddress, err)
}

// Check IOMMU group
if err := s.checkIOMMUGroup(device.HostAddress); err != nil {
return fmt.Errorf("device %d (%s) IOMMU check failed: %w", i, device.HostAddress, err)
}

// Check ROM file if specified
if device.ROMFile != "" {
if _, err := os.Stat(device.ROMFile); err != nil {
return fmt.Errorf("device %d (%s) ROM file not found: %w", i, device.HostAddress, err)
}
}
}
return nil
}

// checkPCIDeviceExists verifies if a PCI device exists on the host
func (s *Service) checkPCIDeviceExists(address string) error {
// Check using lspci
cmd := fmt.Sprintf("lspci -s %s", address)
output, err := s.executeSystemCommandWithOutput(cmd)
if err != nil || output == "" {
return fmt.Errorf("PCI device not found")
}
return nil
}

// checkIOMMUGroup checks if the device's IOMMU group is available
func (s *Service) checkIOMMUGroup(address string) error {
// Check if IOMMU is enabled
iommuPath := fmt.Sprintf("/sys/bus/pci/devices/%s/iommu_group", address)
if _, err := os.Stat(iommuPath); err != nil {
return fmt.Errorf("IOMMU not enabled or device not in IOMMU group")
}
return nil
}

// applyVMTemplate applies a template to the VM creation request
func (s *Service) applyVMTemplate(ctx context.Context, req *VMCreateRequestEnhanced) error {
// Get template by name
template, err := s.TemplateService.GetTemplateByName(ctx, req.Template)
if err != nil {
return fmt.Errorf("template '%s' not found: %w", req.Template, err)
}

// Apply template values (only if not already set in request)
// Memory and VCPUs
if req.Memory == 0 && template.RecommendedMemory > 0 {
req.Memory = template.RecommendedMemory
}
if req.VCPUs == 0 && template.RecommendedVCPUs > 0 {
req.VCPUs = template.RecommendedVCPUs
}

// OS configuration
if req.OSType == "" {
req.OSType = template.OSType
}
if req.OSVariant == "" {
req.OSVariant = template.OSVariant
}

// Storage - merge strategy (only if storage not fully specified)
if req.Storage == nil {
req.Storage = &StorageConfig{
DefaultPool: "default",
Disks: []DiskCreateConfig{
{
Action: "create",
Size:   template.RecommendedDisk,
Format: template.DiskFormat,
Bus:    DiskBusVirtio,
},
},
}
}

// Network - replace if not specified
if len(req.Networks) == 0 && template.NetworkModel != "" {
req.Networks = []NetworkConfig{
{
Type:   NetworkTypeNAT,
Source: "default",
Model:  template.NetworkModel,
},
}
}

// Graphics - replace if not specified
if len(req.Graphics) == 0 && template.GraphicsType != "" {
req.Graphics = []EnhancedGraphicsConfig{
{
Type:     template.GraphicsType,
AutoPort: true,
Listen:   "0.0.0.0",
},
}
}

// Boot configuration
req.UEFI = req.UEFI || template.UEFIBoot
req.SecureBoot = req.SecureBoot || template.SecureBoot
req.TPM = req.TPM || template.TPM

// Merge metadata
if template.Metadata != nil {
if req.Metadata == nil {
req.Metadata = make(map[string]string)
}
for k, v := range template.Metadata {
if _, exists := req.Metadata[k]; !exists {
req.Metadata[k] = v
}
}
}

return nil
}

// ISOUploadRequest represents a request to upload an ISO
type ISOUploadRequest struct {
Name         string   `json:"name" binding:"required"`
URL          string   `json:"url,omitempty"`  // Download from URL
Path         string   `json:"path,omitempty"` // Local path (for server-side)
OSType       string   `json:"os_type,omitempty"`
OSVariant    string   `json:"os_variant,omitempty"`
Architecture string   `json:"architecture,omitempty"`
Description  string   `json:"description,omitempty"`
Tags         []string `json:"tags,omitempty"`
}

// UploadISO registers or downloads an ISO image
func (s *Service) UploadISO(ctx context.Context, req *ISOUploadRequest) (*ISOImage, error) {
var isoPath string

// Determine ISO location
if req.Path != "" {
isoPath = req.Path
} else if req.URL != "" {
// Download from URL
return nil, fmt.Errorf("URL download not implemented")
} else {
return nil, fmt.Errorf("either path or URL must be specified")
}

// Verify the file exists
fileInfo, err := os.Stat(isoPath)
if err != nil {
return nil, fmt.Errorf("ISO file not found: %w", err)
}

// Generate a unique ID
imageID, err := generateRandomID(8)
if err != nil {
return nil, fmt.Errorf("failed to generate ID: %w", err)
}

iso := &ISOImage{
ImageID:      imageID,
Filename:     req.Name,
Path:         isoPath,
SizeBytes:    fileInfo.Size(),
OSType:       req.OSType,
OSVersion:    req.OSVariant,
Architecture: req.Architecture,
Description:  req.Description,
CreatedAt:    time.Now(),
UploadStatus: "completed",
IsPublic:     true,
UploadedBy:   "system",
}

// Store in database if available
if s.db != nil {
_, err = s.db.ExecContext(ctx, `
INSERT INTO iso_images (
image_id, filename, path, size_bytes,
os_type, os_version, architecture,
description, is_public, uploaded_by,
upload_status, created_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
iso.ImageID, iso.Filename, iso.Path, iso.SizeBytes,
iso.OSType, iso.OSVersion, iso.Architecture,
iso.Description, iso.IsPublic, iso.UploadedBy,
iso.UploadStatus, iso.CreatedAt,
)
if err != nil {
return nil, fmt.Errorf("failed to store ISO in database: %w", err)
}
}

return iso, nil
}

// ListISOs returns available ISO images
func (s *Service) ListISOs(ctx context.Context) ([]ISOImage, error) {
if s.db == nil {
// If no database, return empty list
return []ISOImage{}, nil
}

// Query from database
rows, err := s.db.QueryContext(ctx, `
SELECT image_id, filename, path, size_bytes, os_type, os_version, architecture, 
       description, created_at, md5_hash, sha256_hash
FROM iso_images 
ORDER BY created_at DESC
`)
if err != nil {
return nil, fmt.Errorf("failed to query ISOs: %w", err)
}
defer rows.Close()

var isos []ISOImage
for rows.Next() {
var iso ISOImage
err := rows.Scan(
&iso.ImageID, &iso.Filename, &iso.Path, &iso.SizeBytes,
&iso.OSType, &iso.OSVersion, &iso.Architecture,
&iso.Description, &iso.CreatedAt, &iso.MD5Hash, &iso.SHA256Hash,
)
if err != nil {
return nil, fmt.Errorf("failed to scan ISO row: %w", err)
}
isos = append(isos, iso)
}

return isos, nil
}

// DeleteISO deletes an ISO image
func (s *Service) DeleteISO(ctx context.Context, isoID string) error {
if s.db == nil {
return fmt.Errorf("database not configured")
}

// Get ISO info
var isoPath string
err := s.db.QueryRowContext(ctx, "SELECT path FROM iso_images WHERE image_id = ?", isoID).Scan(&isoPath)
if err != nil {
return fmt.Errorf("ISO not found: %w", err)
}

// Delete from database
_, err = s.db.ExecContext(ctx, "DELETE FROM iso_images WHERE image_id = ?", isoID)
if err != nil {
return fmt.Errorf("failed to delete ISO record: %w", err)
}

// Optionally delete the file (check if it's in managed directory)
managedDirs := []string{
"/var/lib/libvirt/images",
"/var/lib/vapor/isos",
}

for _, dir := range managedDirs {
if strings.HasPrefix(isoPath, dir) {
if err := os.Remove(isoPath); err != nil && !os.IsNotExist(err) {
fmt.Printf("Warning: failed to delete ISO file: %v\n", err)
}
break
}
}

return nil
}
