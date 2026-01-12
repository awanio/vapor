package libvirt

import (
	"encoding/xml"
	"fmt"
	"strconv"
	"strings"
)

// domainDiskXML represents a <disk> device in libvirt domain XML.
// We only care about disk devices and their source paths (file or dev).
type domainDiskXML struct {
	Device string `xml:"device,attr"`
	Type   string `xml:"type,attr"`
	Source struct {
		File string `xml:"file,attr"`
		Dev  string `xml:"dev,attr"`
	} `xml:"source"`
}

type domainDevicesXML struct {
	Disks []domainDiskXML `xml:"disk"`
}

type domainXML struct {
	Devices domainDevicesXML `xml:"devices"`
}

// parseDomainDiskPaths parses libvirt domain XML and returns a list of
// disk source paths (file or dev) for device="disk" entries.
func parseDomainDiskPaths(xmlDesc string) ([]string, error) {
	var dom domainXML
	if err := xml.Unmarshal([]byte(xmlDesc), &dom); err != nil {
		return nil, fmt.Errorf("failed to parse domain XML: %w", err)
	}

	paths := make([]string, 0, len(dom.Devices.Disks))
	for _, d := range dom.Devices.Disks {
		if d.Device != "" && d.Device != "disk" {
			// Skip cdrom/floppy/lun, we only care about actual disks
			continue
		}

		// Prefer file attribute; fall back to dev
		if d.Source.File != "" {
			paths = append(paths, d.Source.File)
		} else if d.Source.Dev != "" {
			paths = append(paths, d.Source.Dev)
		}
	}

	return paths, nil
}

// domainDiskAttachmentXML represents a <disk> device in libvirt domain XML with
// source and target information.
type domainDiskAttachmentXML struct {
	Device string `xml:"device,attr"`
	Type   string `xml:"type,attr"`
	Source struct {
		File string `xml:"file,attr"`
		Dev  string `xml:"dev,attr"`
	} `xml:"source"`
	Target struct {
		Dev string `xml:"dev,attr"`
		Bus string `xml:"bus,attr"`
	} `xml:"target"`
}

type domainDevicesAttachmentXML struct {
	Disks []domainDiskAttachmentXML `xml:"disk"`
}

type domainAttachmentXML struct {
	Devices domainDevicesAttachmentXML `xml:"devices"`
}

// parseDomainDiskAttachments parses libvirt domain XML and returns maps of
// attached target devices and source paths (file/dev) across all <disk> devices.
func parseDomainDiskAttachments(xmlDesc string) (map[string]bool, map[string]bool, error) {
	var dom domainAttachmentXML
	if err := xml.Unmarshal([]byte(xmlDesc), &dom); err != nil {
		return nil, nil, fmt.Errorf("failed to parse domain XML: %w", err)
	}

	targets := make(map[string]bool)
	sources := make(map[string]bool)

	for _, d := range dom.Devices.Disks {
		if d.Target.Dev != "" {
			targets[d.Target.Dev] = true
		}
		if d.Source.File != "" {
			sources[d.Source.File] = true
		} else if d.Source.Dev != "" {
			sources[d.Source.Dev] = true
		}
	}

	return targets, sources, nil
}

// existingDiskInfo holds details about an existing disk attachment for reconciliation.
type existingDiskInfo struct {
	Target string // target device name (e.g., vda, sda)
	Source string // source path (file or dev)
	Device string // device type: disk, cdrom, floppy
	Bus    string // bus type: virtio, sata, scsi, ide
	Type   string // source type: file, block
}

// parseDomainDiskDetails parses libvirt domain XML and returns detailed info about
// all attached disk devices for reconciliation purposes.
func parseDomainDiskDetails(xmlDesc string) ([]existingDiskInfo, error) {
	var dom domainAttachmentXML
	if err := xml.Unmarshal([]byte(xmlDesc), &dom); err != nil {
		return nil, fmt.Errorf("failed to parse domain XML: %w", err)
	}

	var disks []existingDiskInfo
	for _, d := range dom.Devices.Disks {
		info := existingDiskInfo{
			Target: d.Target.Dev,
			Device: d.Device,
			Bus:    d.Target.Bus,
			Type:   d.Type,
		}
		if d.Source.File != "" {
			info.Source = d.Source.File
		} else if d.Source.Dev != "" {
			info.Source = d.Source.Dev
		}
		disks = append(disks, info)
	}

	return disks, nil
}

// buildDetachDiskXML builds a libvirt <disk> device XML snippet for DetachDeviceFlags.
func buildDetachDiskXML(disk existingDiskInfo) string {
	deviceType := disk.Device
	if deviceType == "" {
		deviceType = "disk"
	}

	sourceType := disk.Type
	if sourceType == "" {
		sourceType = "file"
	}

	busType := disk.Bus
	if busType == "" {
		busType = "virtio"
	}

	var sourceAttr string
	if sourceType == "block" {
		sourceAttr = fmt.Sprintf("<source dev='%s'/>", disk.Source)
	} else {
		sourceAttr = fmt.Sprintf("<source file='%s'/>", disk.Source)
	}

	return fmt.Sprintf(`<disk type='%s' device='%s'>
%s
<target dev='%s' bus='%s'/>
</disk>`, sourceType, deviceType, sourceAttr, disk.Target, busType)
}

// existingPCIDeviceInfo holds details about an existing PCI device for reconciliation.
type existingPCIDeviceInfo struct {
	HostAddress  string // host PCI address (e.g., 0000:01:00.0)
	GuestAddress string // guest PCI address if specified
}

// existingGraphicsInfo holds details about an existing graphics device for reconciliation.
type existingGraphicsInfo struct {
	Type     string
	Port     int
	AutoPort bool
	Listen   string
}

// domainHostdevXML represents a <hostdev> device in libvirt domain XML for PCI passthrough.
type domainHostdevXML struct {
	Mode   string `xml:"mode,attr"`
	Type   string `xml:"type,attr"`
	Source struct {
		Address struct {
			Domain   string `xml:"domain,attr"`
			Bus      string `xml:"bus,attr"`
			Slot     string `xml:"slot,attr"`
			Function string `xml:"function,attr"`
		} `xml:"address"`
	} `xml:"source"`
	Address struct {
		Type     string `xml:"type,attr"`
		Domain   string `xml:"domain,attr"`
		Bus      string `xml:"bus,attr"`
		Slot     string `xml:"slot,attr"`
		Function string `xml:"function,attr"`
	} `xml:"address"`
}

// domainGraphicsXML represents a <graphics> device in libvirt domain XML.
type domainGraphicsXML struct {
	Type     string `xml:"type,attr"`
	Port     string `xml:"port,attr"`
	AutoPort string `xml:"autoport,attr"`
	Listen   string `xml:"listen,attr"`
}

// domainDevicesFullXML extends domainDevicesAttachmentXML to include hostdevs and graphics.
type domainDevicesFullXML struct {
	Disks    []domainDiskAttachmentXML `xml:"disk"`
	Hostdevs []domainHostdevXML        `xml:"hostdev"`
	Graphics []domainGraphicsXML       `xml:"graphics"`
}

type domainFullXML struct {
	Devices domainDevicesFullXML `xml:"devices"`
}

// parseDomainPCIDevices parses libvirt domain XML and returns info about attached PCI devices.
func parseDomainPCIDevices(xmlDesc string) ([]existingPCIDeviceInfo, error) {
	var dom domainFullXML
	if err := xml.Unmarshal([]byte(xmlDesc), &dom); err != nil {
		return nil, fmt.Errorf("failed to parse domain XML: %w", err)
	}

	var devices []existingPCIDeviceInfo
	for _, hd := range dom.Devices.Hostdevs {
		if hd.Mode != "subsystem" || hd.Type != "pci" {
			continue
		}

		info := existingPCIDeviceInfo{}

		// Parse host address from source
		if hd.Source.Address.Domain != "" {
			domain := strings.TrimPrefix(hd.Source.Address.Domain, "0x")
			bus := strings.TrimPrefix(hd.Source.Address.Bus, "0x")
			slot := strings.TrimPrefix(hd.Source.Address.Slot, "0x")
			function := strings.TrimPrefix(hd.Source.Address.Function, "0x")
			info.HostAddress = fmt.Sprintf("%s:%s:%s.%s", domain, bus, slot, function)
		}

		// Parse guest address if present
		if hd.Address.Type == "pci" && hd.Address.Domain != "" {
			domain := strings.TrimPrefix(hd.Address.Domain, "0x")
			bus := strings.TrimPrefix(hd.Address.Bus, "0x")
			slot := strings.TrimPrefix(hd.Address.Slot, "0x")
			function := strings.TrimPrefix(hd.Address.Function, "0x")
			info.GuestAddress = fmt.Sprintf("%s:%s:%s.%s", domain, bus, slot, function)
		}

		devices = append(devices, info)
	}

	return devices, nil
}

// parseDomainGraphics parses libvirt domain XML and returns info about graphics devices.
func parseDomainGraphics(xmlDesc string) ([]existingGraphicsInfo, error) {
	var dom domainFullXML
	if err := xml.Unmarshal([]byte(xmlDesc), &dom); err != nil {
		return nil, fmt.Errorf("failed to parse domain XML: %w", err)
	}

	var graphics []existingGraphicsInfo
	for _, g := range dom.Devices.Graphics {
		info := existingGraphicsInfo{
			Type:   g.Type,
			Listen: g.Listen,
		}

		if g.Port != "" && g.Port != "-1" {
			if port, err := strconv.Atoi(g.Port); err == nil {
				info.Port = port
			}
		}

		info.AutoPort = g.AutoPort == "yes"
		graphics = append(graphics, info)
	}

	return graphics, nil
}

// buildDetachPCIDeviceXML builds a libvirt <hostdev> device XML snippet for DetachDeviceFlags.
func buildDetachPCIDeviceXML(pci existingPCIDeviceInfo) string {
	// Parse host address components
	parts := strings.Split(pci.HostAddress, ":")
	if len(parts) < 3 {
		return ""
	}
	domain := parts[0]
	bus := parts[1]
	slotFunc := strings.Split(parts[2], ".")
	if len(slotFunc) < 2 {
		return ""
	}
	slot := slotFunc[0]
	function := slotFunc[1]

	return fmt.Sprintf(`<hostdev mode='subsystem' type='pci' managed='yes'>
<source>
<address domain='0x%s' bus='0x%s' slot='0x%s' function='0x%s'/>
</source>
</hostdev>`, domain, bus, slot, function)
}

// buildAttachPCIDeviceXML builds a libvirt <hostdev> device XML snippet for AttachDeviceFlags.
func buildAttachPCIDeviceXML(hostAddress string, guestAddress string, romFile string, multifunction bool) string {
	// Parse host address components
	parts := strings.Split(hostAddress, ":")
	if len(parts) < 3 {
		return ""
	}
	domain := parts[0]
	bus := parts[1]
	slotFunc := strings.Split(parts[2], ".")
	if len(slotFunc) < 2 {
		return ""
	}
	slot := slotFunc[0]
	function := slotFunc[1]

	xml := fmt.Sprintf(`<hostdev mode='subsystem' type='pci' managed='yes'>
<source>
<address domain='0x%s' bus='0x%s' slot='0x%s' function='0x%s'/>
</source>`, domain, bus, slot, function)

	if romFile != "" {
		xml += fmt.Sprintf("\n<rom file='%s'/>", romFile)
	}

	xml += "\n</hostdev>"
	return xml
}

// buildDetachGraphicsXML builds a libvirt <graphics> device XML snippet for DetachDeviceFlags.
func buildDetachGraphicsXML(g existingGraphicsInfo) string {
	if g.Type == "" {
		return ""
	}

	xml := fmt.Sprintf("<graphics type='%s'", g.Type)

	if g.Port > 0 {
		xml += fmt.Sprintf(" port='%d'", g.Port)
	}

	if g.Listen != "" {
		xml += fmt.Sprintf(" listen='%s'", g.Listen)
	}

	xml += "/>"
	return xml
}

// buildAttachGraphicsXML builds a libvirt <graphics> device XML snippet for AttachDeviceFlags.
func buildAttachGraphicsXML(graphicsType string, port int, autoport bool, listen string, password string) string {
	if graphicsType == "" || graphicsType == "none" {
		return ""
	}

	if graphicsType == "egl-headless" {
		return "<graphics type='egl-headless'/>"
	}

	portVal := port
	if portVal == 0 {
		portVal = -1
	}

	autoportStr := "yes"
	if !autoport && portVal > 0 {
		autoportStr = "no"
	}

	if listen == "" {
		listen = "0.0.0.0"
	}

	xml := fmt.Sprintf("<graphics type='%s' port='%d' autoport='%s' listen='%s'",
		graphicsType, portVal, autoportStr, listen)

	if password != "" {
		xml += fmt.Sprintf(" passwd='%s'", password)
	}

	xml += "/>"
	return xml
}
