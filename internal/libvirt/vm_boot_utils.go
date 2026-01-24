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

	// Identify targets that are being replaced/updated with boot order
	targetsToReplace := make(map[string]bool)
	for _, d := range disks {
		if d.BootOrder > 0 && d.Target != "" {
			targetsToReplace[d.Target] = true
		} else if d.BootOrder > 0 {
			// If target is empty, we need to guess it based on bus just like buildDiskXMLForDefine does
			// This is a safety fallback
			bus := string(d.Bus)
			if bus == "" {
				if d.Device == "cdrom" {
					bus = "sata"
				} else {
					bus = "virtio"
				}
			}
			target := ""
			switch bus {
			case "virtio":
				target = "vda"
			case "sata", "scsi":
				target = "sda"
			case "ide":
				target = "hda"
			}
			if target != "" {
				targetsToReplace[target] = true
			}
		}
	}

	// Remove existing disks that are being replaced
	if len(targetsToReplace) > 0 {
		var err error
		xmlDesc, err = removeConflictingDisks(xmlDesc, targetsToReplace)
		if err != nil {
			return xmlDesc, nil, err
		}
	}

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

// removeConflictingDisks removes <disk> elements from XML that match the given targets.
func removeConflictingDisks(xmlDesc string, targets map[string]bool) (string, error) {
	// Simple regex parsing to find disk blocks
	// Matches <disk ...> ... </disk>
	// This is a basic implementation; for production robustness with complex XML, 
	// a full XML parser is often better, but libvirt XMLs are generally consistent enough for this.
	// We use strings.Index to find start/end of disks and check content.
	
	// Helper to find next disk block
	findNextDisk := func(startIdx int) (int, int, bool) {
		diskStart := strings.Index(xmlDesc[startIdx:], "<disk")
		if diskStart == -1 {
			return -1, -1, false
		}
		diskStart += startIdx
		
		// Find closing tag
		// We need to handle nested tags if any (unlikely for <disk> in libvirt valid output)
		// But simplistic search for </disk> should work for standard libvirt output
		diskEnd := strings.Index(xmlDesc[diskStart:], "</disk>")
		if diskEnd == -1 {
			return -1, -1, false
		}
		diskEnd += diskStart + 7 // include length of "</disk>"
		return diskStart, diskEnd, true
	}

	var newXML strings.Builder
	currentIdx := 0
	
	for {
		start, end, found := findNextDisk(currentIdx)
		if !found {
			// Append remainder
			newXML.WriteString(xmlDesc[currentIdx:])
			break
		}
		
		// Append everything before this disk
		newXML.WriteString(xmlDesc[currentIdx:start])
		
		// Check if this disk matches one of our targets
		diskContent := xmlDesc[start:end]
		shouldRemove := false
		
		for target := range targets {
			// Look for <target dev='target' ... />
			// Match exact target attribute
			targetPattern := fmt.Sprintf("dev='%s'", target)
			if strings.Contains(diskContent, targetPattern) {
				// Verify it's inside a <target> tag to be safe
				if strings.Contains(diskContent, "<target") {
					shouldRemove = true
					break
				}
			}
			// Also support double quotes
			targetPattern2 := fmt.Sprintf("dev=\"%s\"", target)
			if strings.Contains(diskContent, targetPattern2) {
				if strings.Contains(diskContent, "<target") {
					shouldRemove = true
					break
				}
			}
		}
		
		if !shouldRemove {
			// Keep it
			newXML.WriteString(diskContent)
		}
		
		currentIdx = end
	}
	
	return newXML.String(), nil
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
