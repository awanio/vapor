package libvirt

import (
	"fmt"
	"regexp"
	"strings"
)

// modifyDomainXMLForBootOrder modifies domain XML to support per-device boot order.
// It removes OS-level boot elements and adds disks with boot order directly into the XML.
// Returns the modified XML and a list of disk paths that were added to the XML.
func modifyDomainXMLForBootOrder(xmlDesc string, disks []DiskCreateConfig) (string, []string, error) {
	// Check if any disk has boot order
	hasBootOrder := false
	for _, d := range disks {
		if d.BootOrder > 0 {
			hasBootOrder = true
			break
		}
	}

	if !hasBootOrder {
		return xmlDesc, nil, nil
	}

	// Remove OS-level boot elements
	xmlDesc = removeOSBootElements(xmlDesc)

	// Build disk XML elements for disks with boot order
	var addedPaths []string
	var diskXMLs []string

	for _, d := range disks {
		if d.BootOrder <= 0 {
			continue
		}

		// Build disk XML
		diskXML := buildDiskXMLForDefine(d)
		if diskXML != "" {
			diskXMLs = append(diskXMLs, diskXML)
			if d.Path != "" {
				addedPaths = append(addedPaths, d.Path)
			}
		}
	}

	if len(diskXMLs) == 0 {
		return xmlDesc, nil, nil
	}

	// Insert disk XMLs into the <devices> section
	// Find </devices> and insert before it
	devicesEndIdx := strings.LastIndex(xmlDesc, "</devices>")
	if devicesEndIdx == -1 {
		return xmlDesc, nil, fmt.Errorf("could not find </devices> in domain XML")
	}

	// Insert the disk XMLs
	insertXML := strings.Join(diskXMLs, "\n")
	xmlDesc = xmlDesc[:devicesEndIdx] + insertXML + "\n" + xmlDesc[devicesEndIdx:]

	return xmlDesc, addedPaths, nil
}

// buildDiskXMLForDefine builds a disk XML element for domain definition (not attach).
func buildDiskXMLForDefine(d DiskCreateConfig) string {
	if d.Path == "" {
		return ""
	}

	deviceType := d.Device
	if deviceType == "" {
		deviceType = "disk"
	}

	// Determine source type
	sourceType := "file"
	if strings.HasPrefix(d.Path, "/dev/") {
		sourceType = "block"
	}

	// Determine format
	format := string(d.Format)
	if format == "" {
		if strings.HasSuffix(strings.ToLower(d.Path), ".iso") {
			format = "raw"
		} else {
			format = "qcow2"
		}
	}

	// Determine bus
	bus := string(d.Bus)
	if bus == "" {
		if deviceType == "cdrom" {
			bus = "sata"
		} else {
			bus = "virtio"
		}
	}

	// Target
	target := d.Target
	if target == "" {
		// Auto-generate based on bus
		switch bus {
		case "virtio":
			target = "vda"
		case "sata", "scsi":
			target = "sda"
		case "ide":
			target = "hda"
		}
	}

	// Build source element
	var sourceAttr string
	if sourceType == "block" {
		sourceAttr = fmt.Sprintf("<source dev='%s'/>", d.Path)
	} else {
		sourceAttr = fmt.Sprintf("<source file='%s'/>", d.Path)
	}

	// Build the disk XML
	xml := fmt.Sprintf(`    <disk type='%s' device='%s'>
      <driver name='qemu' type='%s'/>
      %s
      <target dev='%s' bus='%s'/>`, sourceType, deviceType, format, sourceAttr, target, bus)

	// Add boot order if specified
	if d.BootOrder > 0 {
		xml += fmt.Sprintf("\n      <boot order='%d'/>", d.BootOrder)
	}

	// Add readonly if specified
	if d.ReadOnly {
		xml += "\n      <readonly/>"
	}

	xml += "\n    </disk>"

	return xml
}

// removeOSBootElements removes <boot dev='...'> elements from the <os> section of domain XML.
// This is necessary when using per-device boot order (boot order='N') because libvirt
// doesn't allow mixing OS-level boot devices with per-device boot order.
func removeOSBootElements(xmlDesc string) string {
	// Use regex to remove <boot dev='...'> elements from within <os>...</os>
	// This pattern matches <boot dev='anything'/> including optional whitespace
	re := regexp.MustCompile(`(?s)(<os[^>]*>)(.*?)(</os>)`)
	return re.ReplaceAllStringFunc(xmlDesc, func(match string) string {
		// Remove <boot dev='...'> or <boot dev='...'/> within the os section
		bootRe := regexp.MustCompile(`\s*<boot\s+dev=['"][^'"]*['"]\s*/?>`)
		return bootRe.ReplaceAllString(match, "")
	})
}
