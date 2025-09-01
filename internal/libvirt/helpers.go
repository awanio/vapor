package libvirt

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/xml"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"libvirt.org/go/libvirt"
)

// generateRandomID generates a random ID of specified length
func generateRandomID(length int) (string, error) {
	b := make([]byte, length)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// RestoreBackup restores a VM from a backup
func (s *Service) RestoreBackup(ctx context.Context, req *VMRestoreRequest) (*VM, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.db == nil {
		return nil, fmt.Errorf("database is not configured")
	}

	// Get backup information from database
	var backup VMBackup
	err := s.db.QueryRowContext(ctx, "SELECT id, vm_uuid, vm_name, destination_path, encryption FROM vm_backups WHERE id = ?", req.BackupID).Scan(
		&backup.ID, &backup.VMUUID, &backup.VMName, &backup.DestinationPath, &backup.Encryption,
	)
	if err != nil {
		return nil, fmt.Errorf("backup not found: %w", err)
	}

	// Check if VM already exists
	vmName := backup.VMName
	if req.NewVMName != "" {
		vmName = req.NewVMName
	}

	if !req.Overwrite {
		if _, err := s.lookupDomain(vmName); err == nil {
			return nil, fmt.Errorf("VM %s already exists, use overwrite flag to replace", vmName)
		}
	}

	// Restore the VM from backup files
	// This is a simplified implementation
	backupFile := filepath.Join(backup.DestinationPath, backup.ID+".qcow2")
	if _, err := os.Stat(backupFile); os.IsNotExist(err) {
		return nil, fmt.Errorf("backup file not found: %s", backupFile)
	}

	// Create a new VM with the restored disk
	createReq := &VMCreateRequest{
		Name:     vmName,
		Memory:   2048, // Default values, should be stored with backup
		VCPUs:    2,
		DiskPath: backupFile,
	}

	return s.CreateVM(ctx, createReq)
}

// DeleteBackup deletes a backup
func (s *Service) DeleteBackup(ctx context.Context, backupID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.db == nil {
		return fmt.Errorf("database is not configured")
	}

	// Get backup information
	var destPath string
	err := s.db.QueryRowContext(ctx, "SELECT destination_path FROM vm_backups WHERE id = ?", backupID).Scan(&destPath)
	if err != nil {
		return fmt.Errorf("backup not found: %w", err)
	}

	// Delete backup files
	backupFile := filepath.Join(destPath, backupID+".qcow2")
	if err := os.Remove(backupFile); err != nil && !os.IsNotExist(err) {
		// Log but don't fail if file doesn't exist
		fmt.Printf("Warning: failed to delete backup file %s: %v\n", backupFile, err)
	}

	// Update database record
	_, err = s.db.ExecContext(ctx, "UPDATE vm_backups SET status = ? WHERE id = ?", BackupStatusDeleted, backupID)
	if err != nil {
		return fmt.Errorf("failed to update backup status: %w", err)
	}

	return nil
}

// SetDatabase is defined in service.go

// GetVolume gets details of a specific volume in a pool
func (s *Service) GetVolume(ctx context.Context, poolName, volumeName string) (*StorageVolume, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	pool, err := s.conn.LookupStoragePoolByName(poolName)
	if err != nil {
		return nil, fmt.Errorf("storage pool not found: %w", err)
	}
	defer pool.Free()

	vol, err := pool.LookupStorageVolByName(volumeName)
	if err != nil {
		return nil, fmt.Errorf("volume not found: %w", err)
	}
	defer vol.Free()

	return s.storageVolumeToType(vol)
}

// createDisk creates a new disk in a storage pool
func (s *Service) createDisk(poolName, vmName string, sizeGB uint64) (string, error) {
	pool, err := s.conn.LookupStoragePoolByName(poolName)
	if err != nil {
		return "", fmt.Errorf("storage pool not found: %w", err)
	}
	defer pool.Free()

	volName := fmt.Sprintf("%s.qcow2", vmName)
	sizeBytes := sizeGB * 1024 * 1024 * 1024

	volXML := fmt.Sprintf(`
		<volume>
			<name>%s</name>
			<capacity>%d</capacity>
			<target>
				<format type='qcow2'/>
			</target>
		</volume>
	`, volName, sizeBytes)

	vol, err := pool.StorageVolCreateXML(volXML, 0)
	if err != nil {
		return "", fmt.Errorf("failed to create volume: %w", err)
	}
	defer vol.Free()

	return vol.GetPath()
}

// cloneDisk clones an existing disk
func (s *Service) cloneDisk(poolName, sourcePath, newVMName string) (string, error) {
	pool, err := s.conn.LookupStoragePoolByName(poolName)
	if err != nil {
		return "", fmt.Errorf("storage pool not found: %w", err)
	}
	defer pool.Free()

	// Create new volume name
	volName := fmt.Sprintf("%s-clone.qcow2", newVMName)

	// Get source volume to determine size
	sourceVol, err := s.conn.LookupStorageVolByPath(sourcePath)
	if err != nil {
		return "", fmt.Errorf("source volume not found: %w", err)
	}
	defer sourceVol.Free()

	sourceInfo, err := sourceVol.GetInfo()
	if err != nil {
		return "", fmt.Errorf("failed to get source volume info: %w", err)
	}

	// Create clone volume XML
	volXML := fmt.Sprintf(`
		<volume>
			<name>%s</name>
			<capacity>%d</capacity>
			<target>
				<format type='qcow2'/>
			</target>
		</volume>
	`, volName, sourceInfo.Capacity)

	// Create the new volume
	newVol, err := pool.StorageVolCreateXMLFrom(volXML, sourceVol, 0)
	if err != nil {
		return "", fmt.Errorf("failed to clone volume: %w", err)
	}
	defer newVol.Free()

	return newVol.GetPath()
}

// attachDisk attaches a disk to a domain
func (s *Service) attachDisk(domain *libvirt.Domain, diskPath, target string) error {
	diskXML := fmt.Sprintf(`
		<disk type='file' device='disk'>
			<driver name='qemu' type='qcow2'/>
			<source file='%s'/>
			<target dev='%s' bus='virtio'/>
		</disk>
	`, diskPath, target)

	return domain.AttachDeviceFlags(diskXML, libvirt.DOMAIN_DEVICE_MODIFY_CONFIG)
}

// applyTemplateToRequest applies template settings to a VM creation request
func (s *Service) applyTemplateToRequest(req *VMCreateRequest, template *VMTemplate) error {
	// Apply template OS settings if not set
	if req.OSType == "" {
		req.OSType = template.OSType
	}
	if req.Architecture == "" {
		req.Architecture = "x86_64" // Default architecture
	}

	// Apply memory settings (use template recommended if not specified)
	if req.Memory == 0 {
		if template.RecommendedMemory > 0 {
			req.Memory = template.RecommendedMemory
		} else {
			req.Memory = template.MinMemory
		}
	} else {
		// Validate against minimum requirements
		if req.Memory < template.MinMemory {
			return fmt.Errorf("memory %dMB is below template minimum of %dMB", req.Memory, template.MinMemory)
		}
	}

	// Apply vCPU settings
	if req.VCPUs == 0 {
		if template.RecommendedVCPUs > 0 {
			req.VCPUs = template.RecommendedVCPUs
		} else {
			req.VCPUs = template.MinVCPUs
		}
	} else {
		// Validate against minimum requirements
		if req.VCPUs < template.MinVCPUs {
			return fmt.Errorf("vCPUs %d is below template minimum of %d", req.VCPUs, template.MinVCPUs)
		}
	}

	// Apply disk settings if creating new disk
	if req.DiskSize == 0 && req.DiskPath == "" {
		if template.RecommendedDisk > 0 {
			req.DiskSize = template.RecommendedDisk
		} else {
			req.DiskSize = template.MinDisk
		}
	} else if req.DiskSize > 0 {
		// Validate against minimum requirements
		if req.DiskSize < template.MinDisk {
			return fmt.Errorf("disk size %dGB is below template minimum of %dGB", req.DiskSize, template.MinDisk)
		}
	}

	// Apply network settings if not specified
	if req.Network.Model == "" {
		req.Network.Model = template.NetworkModel
	}
	if req.Network.Type == "" {
		req.Network.Type = NetworkTypeBridge // Default to bridge
	}
	if req.Network.Source == "" {
		req.Network.Source = "virbr0" // Default bridge
	}

	// Apply graphics settings if not specified
	if req.Graphics.Type == "" {
		req.Graphics.Type = template.GraphicsType
	}
	if req.Graphics.Port == 0 {
		req.Graphics.Port = -1 // Auto-assign
	}

	// Apply cloud-init setting if template supports it and not already set
	if template.CloudInit && req.CloudInit == nil {
		// Set up basic cloud-init configuration
		req.CloudInit = &CloudInitConfig{
			Users: []CloudInitUser{
				{
					Name:   template.DefaultUser,
					Sudo:   "ALL=(ALL) NOPASSWD:ALL",
					Groups: "sudo",
					Shell:  "/bin/bash",
				},
			},
		}
	}

	// Store template metadata for reference
	if req.Metadata == nil {
		req.Metadata = make(map[string]string)
	}
	req.Metadata["template"] = template.Name
	req.Metadata["template_id"] = fmt.Sprintf("%d", template.ID)

	return nil
}

// generateDomainXML generates libvirt domain XML from a creation request
func (s *Service) generateDomainXML(req *VMCreateRequest) (string, error) {
	// Generate a UUID for the VM
	uuid, err := generateRandomID(16)
	if err != nil {
		return "", fmt.Errorf("failed to generate UUID: %w", err)
	}

	// Format UUID properly (8-4-4-4-12)
	formattedUUID := fmt.Sprintf("%s-%s-%s-%s-%s",
		uuid[0:8], uuid[8:12], uuid[12:16], uuid[16:20], uuid[20:32])

	// Default values
	if req.Architecture == "" {
		req.Architecture = "x86_64"
	}
	// Always use hvm for QEMU/KVM
	req.OSType = "hvm"

	xml := fmt.Sprintf(`
<domain type='kvm'>
	<name>%s</name>
	<uuid>%s</uuid>
	<memory unit='MiB'>%d</memory>
	<vcpu>%d</vcpu>
	<os>
		<type arch='%s'>%s</type>
		<boot dev='hd'/>
	</os>
	<features>
		<acpi/>
		<apic/>
	</features>
	<clock offset='utc'/>
	<devices>
		<emulator>/usr/bin/qemu-system-%s</emulator>
		<console type='pty'>
			<target type='serial' port='0'/>
		</console>
		<graphics type='%s' port='-1' autoport='yes' listen='0.0.0.0'/>
	</devices>
</domain>`,
		req.Name,
		formattedUUID,
		req.Memory,
		req.VCPUs,
		req.Architecture,
		req.OSType,
		req.Architecture,
		req.Graphics.Type)

	return xml, nil
}

// generateEnhancedDomainXML generates libvirt domain XML with enhanced options including OS metadata
func (s *Service) generateEnhancedDomainXML(req *VMCreateRequestEnhanced, diskConfigs []PreparedDisk) (string, error) {
	// Generate a UUID for the VM
	uuid, err := generateRandomID(16)
	if err != nil {
		return "", fmt.Errorf("failed to generate UUID: %w", err)
	}

	// Format UUID properly (8-4-4-4-12)
	formattedUUID := fmt.Sprintf("%s-%s-%s-%s-%s",
		uuid[0:8], uuid[8:12], uuid[12:16], uuid[16:20], uuid[20:32])

	// Default values
	if req.Architecture == "" {
		req.Architecture = "x86_64"
	}

	// Always use hvm for QEMU/KVM
	osType := "hvm"

	// Start building the XML
	xml := fmt.Sprintf(`<domain type='kvm'>
<name>%s</name>
<uuid>%s</uuid>
<memory unit='MiB'>%d</memory>
<vcpu>%d</vcpu>`, req.Name, formattedUUID, req.Memory, req.VCPUs)

	// Add metadata if OS info is provided
	if req.OSInfo != nil {
		xml += `
<metadata>`

		// Add libosinfo metadata if variant is specified
		if req.OSInfo.Variant != "" {
			// Construct the libosinfo ID based on the variant
			libosinfoID := ""
			if req.OSInfo.Distro == "ubuntu" {
				libosinfoID = fmt.Sprintf("http://ubuntu.com/ubuntu/%s", req.OSInfo.Version)
			} else if req.OSInfo.Distro == "fedora" {
				libosinfoID = fmt.Sprintf("http://fedoraproject.org/fedora/%s", req.OSInfo.Version)
			} else if req.OSInfo.Distro == "centos" {
				libosinfoID = fmt.Sprintf("http://centos.org/centos/%s", req.OSInfo.Version)
			} else if req.OSInfo.Family == "windows" {
				// Windows variants like win10, win11, win2k19, etc.
				libosinfoID = fmt.Sprintf("http://microsoft.com/win/%s", req.OSInfo.Variant)
			} else {
				// Generic format for other distros
				libosinfoID = fmt.Sprintf("http://%s.org/%s/%s", req.OSInfo.Distro, req.OSInfo.Distro, req.OSInfo.Version)
			}

			xml += fmt.Sprintf(`
<libosinfo:libosinfo xmlns:libosinfo="http://libosinfo.org/xmlns/libvirt/domain/1.0">
<libosinfo:os id="%s"/>
</libosinfo:libosinfo>`, libosinfoID)
		}

		// Add custom Vapor metadata
		xml += `
<vapor:os xmlns:vapor="http://vapor.io/xmlns/libvirt/domain/1.0">`

		if req.OSInfo.Family != "" {
			xml += fmt.Sprintf(`
<vapor:family>%s</vapor:family>`, req.OSInfo.Family)
		}
		if req.OSInfo.Distro != "" {
			xml += fmt.Sprintf(`
<vapor:distro>%s</vapor:distro>`, req.OSInfo.Distro)
		}
		if req.OSInfo.Version != "" {
			xml += fmt.Sprintf(`
<vapor:version>%s</vapor:version>`, req.OSInfo.Version)
		}
		if req.OSInfo.Codename != "" {
			xml += fmt.Sprintf(`
<vapor:codename>%s</vapor:codename>`, req.OSInfo.Codename)
		}
		if req.OSInfo.Variant != "" {
			xml += fmt.Sprintf(`
<vapor:variant>%s</vapor:variant>`, req.OSInfo.Variant)
		}

		xml += `
</vapor:os>`
		xml += `
</metadata>`
	}

	// OS configuration
	xml += fmt.Sprintf(`
<os>
<type arch='%s'>%s</type>`, req.Architecture, osType)

	// Add boot order based on disks
	for _, disk := range diskConfigs {
		if disk.Config.BootOrder > 0 {
			if disk.Config.Device == "cdrom" {
				xml += `
<boot dev='cdrom'/>`
			} else {
				xml += `
<boot dev='hd'/>`
			}
		}
	}

	// Default boot device if no specific boot order
	if len(diskConfigs) > 0 {
		hasBootOrder := false
		for _, disk := range diskConfigs {
			if disk.Config.BootOrder > 0 {
				hasBootOrder = true
				break
			}
		}
		if !hasBootOrder {
			xml += `
<boot dev='hd'/>`
		}
	}

	xml += `
</os>`

	// Features
	xml += `
<features>
<acpi/>
<apic/>`

	if req.UEFI {
		xml += `
<firmware>
<feature enabled='yes' name='efi'/>`
		if req.SecureBoot {
			xml += `
<feature enabled='yes' name='secure-boot'/>`
		}
		xml += `
</firmware>`
	}

	xml += `
</features>`

	// Clock
	xml += `
<clock offset='utc'/>`

	// Devices
	xml += `
<devices>
<emulator>/usr/bin/qemu-system-` + req.Architecture + `</emulator>`

	// Add disks
	for _, disk := range diskConfigs {
		deviceType := "disk"
		if disk.Config.Device != "" {
			deviceType = disk.Config.Device
		}

		busType := string(disk.Config.Bus)
		if busType == "" {
			busType = "virtio"
		}

		xml += fmt.Sprintf(`
<disk type='file' device='%s'>
<driver name='qemu' type='%s'/>
<source file='%s'/>
<target dev='%s' bus='%s'/>`,
			deviceType, disk.Config.Format, disk.Path, disk.Config.Target, busType)

		if disk.Config.ReadOnly {
			xml += `
<readonly/>`
		}

		if disk.Config.BootOrder > 0 {
			xml += fmt.Sprintf(`
<boot order='%d'/>`, disk.Config.BootOrder)
		}

		xml += `
</disk>`
	}

	// Add networks
	if len(req.Networks) > 0 {
		for _, net := range req.Networks {
			netType := string(net.Type)
			if netType == "" {
				netType = "network"
			}

			model := net.Model
			if model == "" {
				model = "virtio"
			}

			xml += fmt.Sprintf(`
<interface type='%s'>`, netType)

			if netType == "bridge" {
				xml += fmt.Sprintf(`
<source bridge='%s'/>`, net.Source)
			} else {
				xml += fmt.Sprintf(`
<source network='%s'/>`, net.Source)
			}

			xml += fmt.Sprintf(`
<model type='%s'/>
</interface>`, model)
		}
	}

	// Console
	xml += `
<console type='pty'>
<target type='serial' port='0'/>
</console>`

	// Graphics
	if len(req.Graphics) > 0 {
		for _, graphics := range req.Graphics {
			graphicsType := graphics.Type
			if graphicsType == "" {
				graphicsType = "vnc"
			}

			port := graphics.Port
			if port == 0 {
				port = -1
			}

			autoport := "yes"
			if !graphics.AutoPort && port > 0 {
				autoport = "no"
			}

			listen := graphics.Listen
			if listen == "" {
				listen = "0.0.0.0"
			}

			xml += fmt.Sprintf(`
<graphics type='%s' port='%d' autoport='%s' listen='%s'`,
				graphicsType, port, autoport, listen)

			if graphics.Password != "" {
				xml += fmt.Sprintf(` passwd='%s'`, graphics.Password)
			}

			xml += `/>`
		}
	} else {
		// Default graphics if none specified
		xml += `
<graphics type='vnc' port='-1' autoport='yes' listen='0.0.0.0'/>`
	}

	// TPM device if requested
	if req.TPM {
		xml += `
<tpm model='tpm-tis'>
<backend type='emulator' version='2.0'/>
</tpm>`
	}

	xml += `
</devices>
</domain>`

	return xml, nil
}

// generateEnhancedDomainXML generates libvirt domain XML with enhanced options including OS metadata

// generateStoragePoolXML generates libvirt storage pool XML
func (s *Service) generateStoragePoolXML(req *StoragePoolCreateRequest) string {
	switch req.Type {
	case "dir":
		return fmt.Sprintf(`
			<pool type='dir'>
				<name>%s</name>
				<target>
					<path>%s</path>
				</target>
			</pool>
		`, req.Name, req.Path)
	case "netfs":
		return fmt.Sprintf(`
			<pool type='netfs'>
				<name>%s</name>
				<source>
					<host name='%s'/>
					<dir path='%s'/>
				</source>
				<target>
					<path>%s</path>
				</target>
			</pool>
		`, req.Name, req.Source, req.Path, req.Target)
	default:
		// Default to dir type
		return fmt.Sprintf(`
			<pool type='dir'>
				<name>%s</name>
				<target>
					<path>%s</path>
				</target>
			</pool>
		`, req.Name, req.Path)
	}
}

// generateVolumeXML generates libvirt volume XML
func (s *Service) generateVolumeXML(req *VolumeCreateRequest) string {
	format := req.Format
	if format == "" {
		format = "qcow2"
	}

	return fmt.Sprintf(`
		<volume>
			<name>%s</name>
			<capacity unit='bytes'>%d</capacity>
			<target>
				<format type='%s'/>
			</target>
		</volume>
	`, req.Name, req.Capacity, format)
}

// generateNetworkXML generates libvirt network XML
func (s *Service) generateNetworkXML(req *NetworkCreateRequest) string {
	xml := fmt.Sprintf(`<network>
		<name>%s</name>`, req.Name)

	if req.Bridge != "" {
		xml += fmt.Sprintf(`
		<bridge name='%s'/>`, req.Bridge)
	}

	if req.Mode != "" {
		xml += fmt.Sprintf(`
		<forward mode='%s'/>`, req.Mode)
	}

	if req.IPRange != nil {
		xml += fmt.Sprintf(`
		<ip address='%s' netmask='%s'>`, req.IPRange.Address, req.IPRange.Netmask)

		if req.DHCP != nil {
			xml += fmt.Sprintf(`
			<dhcp>
				<range start='%s' end='%s'/>`, req.DHCP.Start, req.DHCP.End)

			for _, host := range req.DHCP.Hosts {
				xml += fmt.Sprintf(`
				<host mac='%s' ip='%s'`, host.MAC, host.IP)
				if host.Name != "" {
					xml += fmt.Sprintf(` name='%s'`, host.Name)
				}
				xml += `/>`
			}

			xml += `
			</dhcp>`
		}

		xml += `
		</ip>`
	}

	xml += `
</network>`

	return xml
}

// updatePCIDevicesInDB updates PCI device information in the database
func (s *Service) updatePCIDevicesInDB(ctx context.Context, devices []PCIDevice) {
	if s.db == nil {
		return
	}

	for _, device := range devices {
		_, err := s.db.ExecContext(ctx, `
			INSERT INTO pci_devices (device_id, vendor_id, product_id, vendor_name, product_name, device_type, pci_address, iommu_group, driver, is_available, last_seen)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(device_id) DO UPDATE SET
				vendor_name = excluded.vendor_name,
				product_name = excluded.product_name,
				driver = excluded.driver,
				last_seen = excluded.last_seen
		`, device.DeviceID, device.VendorID, device.ProductID, device.VendorName, device.ProductName,
			device.DeviceType, device.PCIAddress, device.IOMMUGroup, device.Driver, device.IsAvailable, device.LastSeen)
		if err != nil {
			fmt.Printf("Warning: failed to update PCI device %s in DB: %v\n", device.DeviceID, err)
		}
	}
}

// Helper functions for hot-plugging
func (s *Service) hotplugCPU(domain *libvirt.Domain, action string, config interface{}) error {
	cpuConfig, ok := config.(*HotplugCPUConfig)
	if !ok {
		return fmt.Errorf("invalid CPU configuration")
	}

	switch action {
	case "add":
		return domain.SetVcpus(cpuConfig.VCPUs)
	case "remove":
		return fmt.Errorf("CPU hot-unplug is not supported")
	default:
		return fmt.Errorf("unsupported action: %s", action)
	}
}

func (s *Service) hotplugMemory(domain *libvirt.Domain, action string, config interface{}) error {
	memConfig, ok := config.(*HotplugMemoryConfig)
	if !ok {
		return fmt.Errorf("invalid memory configuration")
	}

	switch action {
	case "add":
		memoryKB := memConfig.Memory * 1024
		return domain.SetMemory(memoryKB)
	case "remove":
		return fmt.Errorf("memory hot-unplug is not supported")
	default:
		return fmt.Errorf("unsupported action: %s", action)
	}
}

func (s *Service) hotplugDisk(domain *libvirt.Domain, action string, config interface{}) error {
	diskConfig, ok := config.(*HotplugDiskConfig)
	if !ok {
		return fmt.Errorf("invalid disk configuration")
	}

	switch action {
	case "add":
		target := diskConfig.Target
		if target == "" {
			target = generateDiskTarget()
		}
		diskXML := fmt.Sprintf(`
			<disk type='file' device='disk'>
				<driver name='qemu' type='qcow2'/>
				<source file='%s'/>
				<target dev='%s' bus='%s'/>
				<readonly/>
			</disk>
		`, diskConfig.Source, target, diskConfig.Bus)
		if !diskConfig.ReadOnly {
			diskXML = strings.Replace(diskXML, "<readonly/>", "", 1)
		}
		return domain.AttachDevice(diskXML)
	case "remove":
		diskXML := fmt.Sprintf(`
			<disk type='file' device='disk'>
				<target dev='%s'/>
			</disk>
		`, diskConfig.Target)
		return domain.DetachDevice(diskXML)
	default:
		return fmt.Errorf("unsupported action: %s", action)
	}
}

func (s *Service) hotplugNetwork(domain *libvirt.Domain, action string, config interface{}) error {
	netConfig, ok := config.(*HotplugNetworkConfig)
	if !ok {
		return fmt.Errorf("invalid network configuration")
	}

	switch action {
	case "add":
		mac := netConfig.MAC
		if mac == "" {
			mac = generateMAC()
		}
		model := netConfig.Model
		if model == "" {
			model = "virtio"
		}
		netXML := fmt.Sprintf(`
			<interface type='%s'>
				<source %s='%s'/>
				<model type='%s'/>
				<mac address='%s'/>
			</interface>
		`, netConfig.Type, getNetworkSourceAttr(netConfig.Type), netConfig.Source, model, mac)
		return domain.AttachDevice(netXML)
	case "remove":
		netXML := fmt.Sprintf(`
			<interface type='%s'>
				<mac address='%s'/>
			</interface>
		`, netConfig.Type, netConfig.MAC)
		return domain.DetachDevice(netXML)
	default:
		return fmt.Errorf("unsupported action: %s", action)
	}
}

func (s *Service) hotplugUSB(domain *libvirt.Domain, action string, config interface{}) error {
	usbConfig, ok := config.(*HotplugUSBConfig)
	if !ok {
		return fmt.Errorf("invalid USB configuration")
	}

	switch action {
	case "add":
		usbXML := fmt.Sprintf(`
			<hostdev mode='subsystem' type='usb'>
				<source>
					<vendor id='0x%s'/>
					<product id='0x%s'/>
				</source>
			</hostdev>
		`, usbConfig.VendorID, usbConfig.ProductID)
		return domain.AttachDevice(usbXML)
	case "remove":
		usbXML := fmt.Sprintf(`
			<hostdev mode='subsystem' type='usb'>
				<source>
					<vendor id='0x%s'/>
					<product id='0x%s'/>
				</source>
			</hostdev>
		`, usbConfig.VendorID, usbConfig.ProductID)
		return domain.DetachDevice(usbXML)
	default:
		return fmt.Errorf("unsupported action: %s", action)
	}
}

// Helper utility functions
func boolToYesNo(b bool) string {
	if b {
		return "yes"
	}
	return "no"
}

// PCI device XML structure
type PCIDeviceXML struct {
	XMLName    xml.Name `xml:"device"`
	Name       string   `xml:"name"`
	Parent     string   `xml:"parent"`
	IOMMUGroup struct {
		Number int `xml:"number,attr"`
	} `xml:"iommuGroup"`
	Capability struct {
		Type     string `xml:"type,attr"`
		Domain   int    `xml:"domain"`
		Bus      int    `xml:"bus"`
		Slot     int    `xml:"slot"`
		Function int    `xml:"function"`
		Product  struct {
			ID   string `xml:"id,attr"`
			Name string `xml:",chardata"`
		} `xml:"product"`
		Vendor struct {
			ID   string `xml:"id,attr"`
			Name string `xml:",chardata"`
		} `xml:"vendor"`
		Driver struct {
			Name string `xml:",chardata"`
		} `xml:"driver"`
	} `xml:"capability"`
}

// pciDeviceToType converts a libvirt node device to our PCI device type
func (s *Service) pciDeviceToType(dev libvirt.NodeDevice) (*PCIDevice, error) {
	xmlDesc, err := dev.GetXMLDesc(0)
	if err != nil {
		return nil, fmt.Errorf("failed to get device XML: %w", err)
	}

	var deviceXML PCIDeviceXML
	if err := xml.Unmarshal([]byte(xmlDesc), &deviceXML); err != nil {
		return nil, fmt.Errorf("failed to parse device XML: %w", err)
	}

	pciDevice := &PCIDevice{
		DeviceID:    deviceXML.Name,
		VendorName:  deviceXML.Capability.Vendor.Name,
		ProductName: deviceXML.Capability.Product.Name,
		PCIAddress:  fmt.Sprintf("%04x:%02x:%02x.%x", deviceXML.Capability.Domain, deviceXML.Capability.Bus, deviceXML.Capability.Slot, deviceXML.Capability.Function),
		IOMMUGroup:  deviceXML.IOMMUGroup.Number,
		Driver:      deviceXML.Capability.Driver.Name,
		IsAvailable: true, // Assumes available until assigned
	}

	// Determine device type
	pciDevice.DeviceType = determinePCIDeviceType(pciDevice.ProductName, pciDevice.VendorName)

	return pciDevice, nil
}

func determinePCIDeviceType(productName, vendorName string) PCIDeviceType {
	// Simplified determination based on class or vendor
	lowerProductName := strings.ToLower(productName)
	lowerVendorName := strings.ToLower(vendorName)

	if strings.Contains(lowerProductName, "vga") || strings.Contains(lowerProductName, "graphics") || strings.Contains(lowerVendorName, "nvidia") || strings.Contains(lowerVendorName, "amd") {
		return PCIDeviceTypeGPU
	}
	if strings.Contains(lowerProductName, "ethernet") || strings.Contains(lowerProductName, "network") {
		return PCIDeviceTypeNetwork
	}
	if strings.Contains(lowerProductName, "sata") || strings.Contains(lowerProductName, "storage") || strings.Contains(lowerProductName, "nvme") {
		return PCIDeviceTypeStorage
	}
	if strings.Contains(lowerProductName, "usb") {
		return PCIDeviceTypeUSB
	}
	return PCIDeviceTypeOther
}

func generateDiskTarget() string {
	// Generate a unique disk target name
	return fmt.Sprintf("vd%c", 'b'+time.Now().Unix()%24)
}

func generateMAC() string {
	// Generate a random MAC address
	buf := make([]byte, 6)
	rand.Read(buf)
	// Set local and unicast bits
	buf[0] = (buf[0] | 2) & 0xfe
	return fmt.Sprintf("%02x:%02x:%02x:%02x:%02x:%02x", buf[0], buf[1], buf[2], buf[3], buf[4], buf[5])
}

func getNetworkSourceAttr(netType NetworkType) string {
	switch netType {
	case NetworkTypeBridge:
		return "bridge"
	case NetworkTypeNAT, NetworkTypeDirect:
		return "network"
	default:
		return "network"
	}
}

// guessOSFromFilename attempts to guess the OS type and version from an ISO filename
func guessOSFromFilename(filename string) (osType string, osVersion string) {
	lower := strings.ToLower(filename)

	// Default values
	osType = "unknown"
	osVersion = ""

	// Check for common OS patterns
	switch {
	case strings.Contains(lower, "ubuntu"):
		osType = "linux"
		// Try to extract version
		if strings.Contains(lower, "22.04") || strings.Contains(lower, "2204") {
			osVersion = "ubuntu22.04"
		} else if strings.Contains(lower, "20.04") || strings.Contains(lower, "2004") {
			osVersion = "ubuntu20.04"
		} else if strings.Contains(lower, "18.04") || strings.Contains(lower, "1804") {
			osVersion = "ubuntu18.04"
		} else {
			osVersion = "ubuntu"
		}

	case strings.Contains(lower, "centos"):
		osType = "linux"
		if strings.Contains(lower, "9") {
			osVersion = "centos9"
		} else if strings.Contains(lower, "8") {
			osVersion = "centos8"
		} else if strings.Contains(lower, "7") {
			osVersion = "centos7"
		} else {
			osVersion = "centos"
		}

	case strings.Contains(lower, "rhel") || strings.Contains(lower, "redhat"):
		osType = "linux"
		if strings.Contains(lower, "9") {
			osVersion = "rhel9"
		} else if strings.Contains(lower, "8") {
			osVersion = "rhel8"
		} else if strings.Contains(lower, "7") {
			osVersion = "rhel7"
		} else {
			osVersion = "rhel"
		}

	case strings.Contains(lower, "debian"):
		osType = "linux"
		if strings.Contains(lower, "12") {
			osVersion = "debian12"
		} else if strings.Contains(lower, "11") {
			osVersion = "debian11"
		} else if strings.Contains(lower, "10") {
			osVersion = "debian10"
		} else {
			osVersion = "debian"
		}

	case strings.Contains(lower, "fedora"):
		osType = "linux"
		osVersion = "fedora"

	case strings.Contains(lower, "suse") || strings.Contains(lower, "sles"):
		osType = "linux"
		osVersion = "sles"

	case strings.Contains(lower, "windows"):
		osType = "windows"
		if strings.Contains(lower, "2022") {
			osVersion = "win2k22"
		} else if strings.Contains(lower, "2019") {
			osVersion = "win2k19"
		} else if strings.Contains(lower, "2016") {
			osVersion = "win2k16"
		} else if strings.Contains(lower, "11") {
			osVersion = "win11"
		} else if strings.Contains(lower, "10") {
			osVersion = "win10"
		} else {
			osVersion = "windows"
		}

	case strings.Contains(lower, "freebsd"):
		osType = "bsd"
		osVersion = "freebsd"

	case strings.Contains(lower, "openbsd"):
		osType = "bsd"
		osVersion = "openbsd"

	case strings.Contains(lower, "arch"):
		osType = "linux"
		osVersion = "archlinux"

	case strings.Contains(lower, "alpine"):
		osType = "linux"
		osVersion = "alpinelinux"

	default:
		// Generic Linux if contains common Linux indicators
		if strings.Contains(lower, "linux") || strings.Contains(lower, ".iso") {
			osType = "linux"
			osVersion = "generic"
		}
	}

	return osType, osVersion
}

// executeSystemCommandWithOutput executes a shell command and returns output
func (s *Service) executeSystemCommandWithOutput(command string) (string, error) {
	// This would be implemented using os/exec
	// For now, return a placeholder
	return "", fmt.Errorf("not implemented")
}

// generateNetworkXMLForUpdate generates libvirt network XML for updates, preserving UUID
func (s *Service) generateNetworkXMLForUpdate(name, uuid string, req *NetworkUpdateRequest) string {
	xml := fmt.Sprintf(`<network>
<name>%s</name>
<uuid>%s</uuid>`, name, uuid)

	if req.Bridge != nil && *req.Bridge != "" {
		xml += fmt.Sprintf(`
<bridge name='%s'/>`, *req.Bridge)
	}

	if req.Mode != nil && *req.Mode != "" {
		xml += fmt.Sprintf(`
<forward mode='%s'/>`, *req.Mode)
	}

	if req.IPRange != nil {
		xml += fmt.Sprintf(`
<ip address='%s' netmask='%s'>`, req.IPRange.Address, req.IPRange.Netmask)

		if req.DHCP != nil {
			xml += fmt.Sprintf(`
<dhcp>
<range start='%s' end='%s'/>`, req.DHCP.Start, req.DHCP.End)

			for _, host := range req.DHCP.Hosts {
				xml += fmt.Sprintf(`
<host mac='%s' ip='%s'`, host.MAC, host.IP)
				if host.Name != "" {
					xml += fmt.Sprintf(` name='%s'`, host.Name)
				}
				xml += `/>`
			}

			xml += `
</dhcp>`
		}

		xml += `
</ip>`
	}

	xml += `
</network>`

	return xml
}
