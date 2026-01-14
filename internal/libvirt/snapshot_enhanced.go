package libvirt

import (
	"context"
	"encoding/xml"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"libvirt.org/go/libvirt"
)

// DiskFormat represents the format of a disk image
type DiskFormat string

const (
	DiskFormatQCOW2 DiskFormat = "qcow2"
	DiskFormatRAW   DiskFormat = "raw"
	DiskFormatVMDK  DiskFormat = "vmdk"
	DiskFormatVDI   DiskFormat = "vdi"
	DiskFormatVHD   DiskFormat = "vhd"
	DiskFormatVHDX  DiskFormat = "vhdx"
	DiskFormatLVM   DiskFormat = "lvm"
	DiskFormatRBD   DiskFormat = "rbd"
)

// SnapshotCapability describes what snapshot operations are supported
type SnapshotCapability struct {
	InternalSnapshots bool     `json:"internal_snapshots"`
	ExternalSnapshots bool     `json:"external_snapshots"`
	MemorySnapshots   bool     `json:"memory_snapshots"`
	LiveSnapshots     bool     `json:"live_snapshots"`
	Limitations       []string `json:"limitations,omitempty"`
}

// DiskInfo contains information about a VM disk
type DiskInfo struct {
	Device      string     `json:"device"`                 // e.g., "vda", "vdb"
	Path        string     `json:"path"`                   // File path or device path
	Format      DiskFormat `json:"format"`                 // Disk format
	Type        string     `json:"type"`                   // "file" or "block"
	Size        int64      `json:"size"`                   // Size in bytes
	BackingFile string     `json:"backing_file,omitempty"` // For snapshot chains
}

// VMSnapshotCapabilities describes snapshot capabilities for a VM
type VMSnapshotCapabilities struct {
	VMName              string                        `json:"vm_name"`
	Disks               []DiskInfo                    `json:"disks"`
	OverallCapabilities SnapshotCapability            `json:"overall_capabilities"`
	DiskCapabilities    map[string]SnapshotCapability `json:"disk_capabilities"`
	Recommendations     []string                      `json:"recommendations,omitempty"`
}

// Domain XML parsing structures

type DevicesXML struct {
	Disks []DiskXML `xml:"disk"`
}

type DiskXML struct {
	Type   string    `xml:"type,attr"`
	Device string    `xml:"device,attr"`
	Driver DriverXML `xml:"driver"`
	Source SourceXML `xml:"source"`
	Target TargetXML `xml:"target"`
}

type DriverXML struct {
	Name string `xml:"name,attr"`
	Type string `xml:"type,attr"`
}

type SourceXML struct {
	File string `xml:"file,attr"`
	Dev  string `xml:"dev,attr"`
	Name string `xml:"name,attr"` // For RBD
}

type TargetXML struct {
	Dev string `xml:"dev,attr"`
	Bus string `xml:"bus,attr"`
}

// GetSnapshotCapabilities analyzes a VM's disks and returns snapshot capabilities
func (s *Service) GetSnapshotCapabilities(ctx context.Context, nameOrUUID string) (*VMSnapshotCapabilities, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	domain, err := s.lookupDomain(nameOrUUID)
	if err != nil {
		return nil, err
	}
	defer domain.Free()

	vmName, _ := domain.GetName()

	// Get domain XML
	xmlDesc, err := domain.GetXMLDesc(0)
	if err != nil {
		return nil, fmt.Errorf("failed to get domain XML: %w", err)
	}

	// Parse XML
	var domainXML DomainXML
	if err := xml.Unmarshal([]byte(xmlDesc), &domainXML); err != nil {
		return nil, fmt.Errorf("failed to parse domain XML: %w", err)
	}

	capabilities := &VMSnapshotCapabilities{
		VMName:           vmName,
		Disks:            []DiskInfo{},
		DiskCapabilities: make(map[string]SnapshotCapability),
		Recommendations:  []string{},
	}

	// Analyze each disk
	allQCOW2 := true
	hasRAW := false
	hasLVM := false
	hasRBD := false
	hasMixedFormats := false
	hasNonFileDisk := false
	formats := make(map[DiskFormat]bool)

	for _, disk := range domainXML.Devices.Disks {
		if disk.Device != "disk" {
			continue // Skip CD-ROMs and other devices
		}

		diskInfo := DiskInfo{
			Device: disk.Target.Dev,
			Type:   disk.Type,
		}

		if disk.Type != "file" {
			hasNonFileDisk = true
		}

		// Determine format
		format := DiskFormat(disk.Driver.Type)
		if format == "" {
			format = DiskFormatRAW // Default to RAW if not specified
		}
		diskInfo.Format = format
		formats[format] = true

		// Set path based on type
		switch disk.Type {
		case "file":
			diskInfo.Path = disk.Source.File
		case "block":
			diskInfo.Path = disk.Source.Dev
			// Block devices are typically RAW or LVM
			if strings.Contains(diskInfo.Path, "/dev/") {
				if strings.Contains(diskInfo.Path, "mapper") || strings.Contains(diskInfo.Path, "vg") {
					diskInfo.Format = DiskFormatLVM
					format = DiskFormatLVM
				}
			}
		case "network":
			if disk.Driver.Type == "raw" && disk.Source.Name != "" {
				diskInfo.Format = DiskFormatRBD
				format = DiskFormatRBD
				diskInfo.Path = disk.Source.Name
			}
		}

		capabilities.Disks = append(capabilities.Disks, diskInfo)

		// Get capabilities for this disk format
		diskCap := getFormatCapabilities(format)
		capabilities.DiskCapabilities[diskInfo.Device] = diskCap

		// Track format types
		if format != DiskFormatQCOW2 {
			allQCOW2 = false
		}
		if format == DiskFormatRAW {
			hasRAW = true
		}
		if format == DiskFormatLVM {
			hasLVM = true
		}
		if format == DiskFormatRBD {
			hasRBD = true
		}
	}

	if len(formats) > 1 {
		hasMixedFormats = true
	}

	// Determine overall capabilities
	overall := SnapshotCapability{
		InternalSnapshots: allQCOW2,
		ExternalSnapshots: !hasNonFileDisk,
		MemorySnapshots:   allQCOW2,
		LiveSnapshots:     true,
		Limitations:       []string{},
	}

	// Add limitations and recommendations
	if !allQCOW2 {
		overall.Limitations = append(overall.Limitations,
			"Internal snapshots require all disks to be in qcow2 format")

		if hasRAW {
			overall.Limitations = append(overall.Limitations,
				"RAW disks will use qcow2 overlay for external snapshots")
			capabilities.Recommendations = append(capabilities.Recommendations,
				"Consider converting RAW disks to qcow2 for better snapshot support")
		}
	}

	if hasNonFileDisk {
		overall.Limitations = append(overall.Limitations, "External snapshots are only supported for file-backed disks")
	}

	if hasMixedFormats {
		overall.Limitations = append(overall.Limitations,
			"Mixed disk formats detected - only external snapshots supported")
		capabilities.Recommendations = append(capabilities.Recommendations,
			"Standardize on qcow2 format for all disks for optimal snapshot functionality")
	}

	if !allQCOW2 && !hasLVM && !hasRBD {
		overall.MemorySnapshots = false
		overall.Limitations = append(overall.Limitations,
			"Memory snapshots require all disks to support internal snapshots")
	}

	if hasLVM {
		capabilities.Recommendations = append(capabilities.Recommendations,
			"LVM snapshots provide excellent performance for large VMs")
	}

	if hasRBD {
		capabilities.Recommendations = append(capabilities.Recommendations,
			"RBD snapshots are managed by Ceph storage cluster")
	}

	capabilities.OverallCapabilities = overall

	return capabilities, nil
}

// getFormatCapabilities returns the snapshot capabilities for a disk format
func getFormatCapabilities(format DiskFormat) SnapshotCapability {
	switch format {
	case DiskFormatQCOW2:
		return SnapshotCapability{
			InternalSnapshots: true,
			ExternalSnapshots: true,
			MemorySnapshots:   true,
			LiveSnapshots:     true,
		}
	case DiskFormatRAW:
		return SnapshotCapability{
			InternalSnapshots: false,
			ExternalSnapshots: true,
			MemorySnapshots:   false,
			LiveSnapshots:     true,
			Limitations: []string{
				"No internal snapshot support",
				"External snapshots create qcow2 overlay",
			},
		}
	case DiskFormatLVM:
		return SnapshotCapability{
			InternalSnapshots: false,
			ExternalSnapshots: true,
			MemorySnapshots:   false,
			LiveSnapshots:     true,
			Limitations: []string{
				"Uses LVM native snapshots",
				"Memory state stored separately",
			},
		}
	case DiskFormatRBD:
		return SnapshotCapability{
			InternalSnapshots: true, // RBD has native snapshot support
			ExternalSnapshots: true,
			MemorySnapshots:   false, // Memory stored separately
			LiveSnapshots:     true,
			Limitations: []string{
				"Snapshots managed by Ceph",
				"Memory state stored separately",
			},
		}
	case DiskFormatVMDK, DiskFormatVDI, DiskFormatVHD, DiskFormatVHDX:
		return SnapshotCapability{
			InternalSnapshots: false,
			ExternalSnapshots: true,
			MemorySnapshots:   false,
			LiveSnapshots:     true,
			Limitations: []string{
				"Native format snapshots not supported",
				"External snapshots use qcow2 overlay",
			},
		}
	default:
		return SnapshotCapability{
			InternalSnapshots: false,
			ExternalSnapshots: true,
			MemorySnapshots:   false,
			LiveSnapshots:     false,
			Limitations: []string{
				"Unknown disk format - limited snapshot support",
			},
		}
	}
}

// CreateSnapshotEnhanced creates a VM snapshot with format-aware handling
func (s *Service) CreateSnapshotEnhanced(ctx context.Context, nameOrUUID string, req *VMSnapshotRequest) (*VMSnapshot, error) {
	// First, check capabilities
	capabilities, err := s.GetSnapshotCapabilities(ctx, nameOrUUID)
	if err != nil {
		return nil, fmt.Errorf("failed to check snapshot capabilities: %w", err)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	domain, err := s.lookupDomain(nameOrUUID)
	if err != nil {
		return nil, err
	}
	defer domain.Free()

	// Get VM info for database tracking
	vmUUID, _ := domain.GetUUIDString()
	vmName, _ := domain.GetName()

	// Check if VM is running
	state, _, err := domain.GetState()
	if err != nil {
		return nil, fmt.Errorf("failed to get VM state: %w", err)
	}
	isRunning := state == libvirt.DOMAIN_RUNNING

	fmt.Printf("DEBUG CreateSnapshotEnhanced: VM=%s, Memory=%v, isRunning=%v\n", vmName, req.Memory, isRunning)

	// Determine snapshot type and flags
	snapshotType := "internal"
	flags := uint32(0)
	warnings := []string{}

	// For running VMs without memory: cannot revert without restart
	// Libvirt limitation: external snapshots cannot be reverted, internal snapshots require memory for running VMs
	if !req.Memory && isRunning {
		return nil, fmt.Errorf("cannot create revertible disk-only snapshot of a running VM. " +
			"Options: (1) include memory in snapshot (recommended), " +
			"(2) stop VM before taking snapshot, " +
			"(3) take external snapshot (non-revertible)")
	} else if !capabilities.OverallCapabilities.InternalSnapshots {
		if req.Memory && !capabilities.OverallCapabilities.MemorySnapshots {
			return nil, fmt.Errorf("memory snapshots not supported: %v",
				strings.Join(capabilities.OverallCapabilities.Limitations, "; "))
		}

		if !capabilities.OverallCapabilities.ExternalSnapshots {
			return nil, fmt.Errorf("external snapshots not supported: %v", strings.Join(capabilities.OverallCapabilities.Limitations, "; "))
		}

		flags = uint32(libvirt.DOMAIN_SNAPSHOT_CREATE_DISK_ONLY)
		snapshotType = "external"
		warnings = append(warnings, "Using external snapshot due to disk format limitations")

		// Add specific warnings for RAW disks
		for _, disk := range capabilities.Disks {
			if disk.Format == DiskFormatRAW {
				warnings = append(warnings,
					fmt.Sprintf("Disk %s (RAW) will use qcow2 overlay", disk.Device))
			}
		}
	} else if req.Memory {
		// Internal snapshot with memory
		snapshotType = "internal-memory"
	}

	// Check if quiesce is requested but guest agent might not be available
	quiesceFlag := uint32(0)
	if req.Quiesce {
		// Try to check if guest agent is available
		// This would require guest agent communication
		quiesceFlag = uint32(libvirt.DOMAIN_SNAPSHOT_CREATE_QUIESCE)
		warnings = append(warnings, "Quiesce requested - requires guest agent")
	}

	// Build per-disk overlay definitions when doing external snapshots to avoid libvirt auto-naming collisions.
	disksXML := ""
	if snapshotType == "external" {
		var b strings.Builder
		b.WriteString("\t\t<disks>\n")
		for _, disk := range capabilities.Disks {
			if disk.Path == "" || disk.Type != "file" {
				continue // block/RBD disks handled by libvirt defaults
			}
			dir := filepath.Dir(disk.Path)
			overlayName := fmt.Sprintf("%s-%s-%d.qcow2", vmName, disk.Device, time.Now().UnixNano())
			overlayPath := filepath.Join(dir, overlayName)
			b.WriteString(fmt.Sprintf("\t\t\t<disk name=\"%s\" snapshot=\"external\">\n", disk.Device))
			b.WriteString(fmt.Sprintf("\t\t\t\t<source file=\"%s\"/>\n", overlayPath))
			b.WriteString("\t\t\t\t<driver type=\"qcow2\"/>\n")
			b.WriteString("\t\t\t</disk>\n")
		}
		b.WriteString("\t\t</disks>\n")
		if b.Len() > len("\t\t<disks>\n\t\t</disks>\n") {
			disksXML = b.String()
		}
	}

	// Generate snapshot XML with enhanced metadata
	snapshotXML := fmt.Sprintf(`
		<domainsnapshot>
			<name>%s</name>
			<description>%s</description>
			<memory snapshot='%s'/>
			<metadata>
				<vapor:snapshot xmlns:vapor="http://vapor.io/snapshot">
					<vapor:type>%s</vapor:type>
					<vapor:disk_formats>%s</vapor:disk_formats>
					<vapor:created_by>API</vapor:created_by>
				</vapor:snapshot>
			</metadata>
%s		</domainsnapshot>`,
		req.Name,
		req.Description,
		map[bool]string{true: "internal", false: "no"}[req.Memory && capabilities.OverallCapabilities.MemorySnapshots],
		snapshotType,
		formatListToString(capabilities.Disks),
		disksXML)

	// Create the snapshot
	snapshot, err := domain.CreateSnapshotXML(snapshotXML, libvirt.DomainSnapshotCreateFlags(flags|quiesceFlag))
	if err != nil {
		// If quiesce fails, try without it
		if req.Quiesce && strings.Contains(err.Error(), "agent") {
			warnings = append(warnings, "Guest agent not available - creating snapshot without quiesce")
			snapshot, err = domain.CreateSnapshotXML(snapshotXML, libvirt.DomainSnapshotCreateFlags(flags))
		}
		if err != nil {
			return nil, fmt.Errorf("failed to create snapshot: %w", err)
		}
	}
	defer snapshot.Free()

	// Convert to VMSnapshot
	vmSnapshot, err := s.snapshotToVMSnapshotEnhanced(snapshot, snapshotType, capabilities.Disks)
	if err != nil {
		return nil, err
	}

	// Add warnings to response
	if len(warnings) > 0 {
		vmSnapshot.Warnings = warnings
	}

	// Track in database with enhanced metadata
	if s.db != nil {
		metadata := fmt.Sprintf(`{
			"type": "%s",
			"disk_formats": %s,
			"warnings": %s
		}`, snapshotType,
			formatDisksToJSON(capabilities.Disks),
			formatWarningsToJSON(warnings))

		_, dbErr := s.db.Exec(`
			INSERT INTO vm_snapshots (
				vm_uuid, vm_name, snapshot_name, description, 
				memory_included, state, metadata
			) VALUES (?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(vm_uuid, snapshot_name) DO UPDATE SET
				description = excluded.description,
				memory_included = excluded.memory_included,
				metadata = excluded.metadata,
				state = excluded.state
		`, vmUUID, vmName, req.Name, req.Description,
			req.Memory && capabilities.OverallCapabilities.MemorySnapshots,
			snapshotType, metadata)

		if dbErr != nil {
			// Log but don't fail the operation
			fmt.Printf("Warning: failed to track snapshot in database: %v\n", dbErr)
		}
	}

	return vmSnapshot, nil
}

// Helper function to enhance snapshot conversion with format info
func (s *Service) snapshotToVMSnapshotEnhanced(snapshot *libvirt.DomainSnapshot, snapshotType string, disks []DiskInfo) (*VMSnapshot, error) {
	name, err := snapshot.GetName()
	if err != nil {
		return nil, err
	}

	_, err = snapshot.GetXMLDesc(0)
	if err != nil {
		return nil, err
	}

	// Parse snapshot XML for more details
	// This is simplified - would need proper XML parsing
	vmSnapshot := &VMSnapshot{
		Name:        name,
		Type:        snapshotType,
		CreatedAt:   time.Now(), // Would be parsed from XML
		DiskFormats: []string{},
	}

	// Add disk formats
	for _, disk := range disks {
		vmSnapshot.DiskFormats = append(vmSnapshot.DiskFormats, string(disk.Format))
	}

	return vmSnapshot, nil
}

// Helper functions
func formatListToString(disks []DiskInfo) string {
	formats := []string{}
	for _, disk := range disks {
		formats = append(formats, string(disk.Format))
	}
	return strings.Join(formats, ",")
}

func formatDisksToJSON(disks []DiskInfo) string {
	items := []string{}
	for _, disk := range disks {
		items = append(items, fmt.Sprintf(`"%s": "%s"`, disk.Device, disk.Format))
	}
	return "{" + strings.Join(items, ", ") + "}"
}

func formatWarningsToJSON(warnings []string) string {
	if len(warnings) == 0 {
		return "[]"
	}
	quoted := []string{}
	for _, w := range warnings {
		quoted = append(quoted, fmt.Sprintf(`"%s"`, strings.ReplaceAll(w, `"`, `\"`)))
	}
	return "[" + strings.Join(quoted, ", ") + "]"
}

// ValidateSnapshotRequest validates if a snapshot request is feasible
func (s *Service) ValidateSnapshotRequest(ctx context.Context, nameOrUUID string, req *VMSnapshotRequest) error {
	capabilities, err := s.GetSnapshotCapabilities(ctx, nameOrUUID)
	if err != nil {
		return err
	}

	// Check if memory snapshot is requested but not supported
	if req.Memory && !capabilities.OverallCapabilities.MemorySnapshots {
		return fmt.Errorf("memory snapshots not supported for this VM: %v",
			strings.Join(capabilities.OverallCapabilities.Limitations, "; "))
	}

	// Check if internal snapshot is expected but not supported
	if !capabilities.OverallCapabilities.InternalSnapshots && !req.External {
		return fmt.Errorf("internal snapshots not supported for this VM: %v",
			strings.Join(capabilities.OverallCapabilities.Limitations, "; "))
	}

	// Warn about quiesce without guest agent
	if req.Quiesce {
		// This would ideally check for guest agent availability
		fmt.Printf("Warning: Quiesce requested - ensure guest agent is installed\n")
	}

	return nil
}

// GetSnapshotDetail retrieves detailed information about a specific snapshot
func (s *Service) GetSnapshotDetail(ctx context.Context, nameOrUUID string, snapshotName string) (*VMSnapshot, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	domain, err := s.lookupDomain(nameOrUUID)
	if err != nil {
		return nil, err
	}
	defer domain.Free()

	// Lookup the specific snapshot
	snapshot, err := domain.SnapshotLookupByName(snapshotName, 0)
	if err != nil {
		return nil, fmt.Errorf("snapshot not found: %w", err)
	}
	defer snapshot.Free()

	// Convert to VMSnapshot
	return s.snapshotToVMSnapshot(snapshot)
}
