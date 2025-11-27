package libvirt

import (
	"encoding/xml"
	"fmt"
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
