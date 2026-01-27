package libvirt

import (
	"fmt"
	"os"
	"path/filepath"
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
	driverAttrs := []string{fmt.Sprintf("name='qemu'"), fmt.Sprintf("type='%s'", format)}
	if cache := strings.TrimSpace(d.Cache); cache != "" {
		driverAttrs = append(driverAttrs, fmt.Sprintf("cache='%s'", cache))
	}
	if ioMode := strings.TrimSpace(d.IOMode); ioMode != "" {
		driverAttrs = append(driverAttrs, fmt.Sprintf("io='%s'", ioMode))
	}
	driverXML := fmt.Sprintf("<driver %s/>", strings.Join(driverAttrs, " "))

	xml := fmt.Sprintf(`    <disk type='%s' device='%s'>
      %s
      %s
      <target dev='%s' bus='%s'/>`, sourceType, deviceType, driverXML, sourceAttr, target, bus)

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

// ensureFirmwareFeatures ensures <features><firmware> contains requested UEFI/secure-boot flags.
// It returns updated XML or an error if the features section is missing.
func ensureFirmwareFeatures(xmlDesc string, enableEFI bool, enableSecureBoot bool) (string, error) {
	if !enableEFI && !enableSecureBoot {
		return xmlDesc, nil
	}

	// Secure boot implies EFI.
	if enableSecureBoot {
		enableEFI = true
	}

	firmwareRe := regexp.MustCompile(`(?s)<firmware>.*?</firmware>`)
	if firmwareRe.MatchString(xmlDesc) {
		firmware := firmwareRe.FindString(xmlDesc)
		updated := firmware

		needsEFI := enableEFI && !regexp.MustCompile(`name=['"]efi['"]`).MatchString(firmware)
		needsSecure := enableSecureBoot && !regexp.MustCompile(`name=['"]secure-boot['"]`).MatchString(firmware)

		if needsEFI || needsSecure {
			insert := ""
			if needsEFI {
				insert += "\n<feature enabled='yes' name='efi'/>"
			}
			if needsSecure {
				insert += "\n<feature enabled='yes' name='secure-boot'/>"
			}
			updated = strings.Replace(updated, "</firmware>", insert+"\n</firmware>", 1)
		}

		if updated != firmware {
			xmlDesc = strings.Replace(xmlDesc, firmware, updated, 1)
		}

		return xmlDesc, nil
	}

	// No firmware block yet - add under <features>.
	featuresRe := regexp.MustCompile(`(?s)<features>.*?</features>`)
	if !featuresRe.MatchString(xmlDesc) {
		return xmlDesc, fmt.Errorf("features section not found in domain XML")
	}

	features := featuresRe.FindString(xmlDesc)
	firmware := "\n<firmware>\n<feature enabled='yes' name='efi'/>"
	if enableSecureBoot {
		firmware += "\n<feature enabled='yes' name='secure-boot'/>"
	}
	firmware += "\n</firmware>"

	updated := strings.Replace(features, "</features>", firmware+"\n</features>", 1)
	if updated != features {
		xmlDesc = strings.Replace(xmlDesc, features, updated, 1)
	}

	return xmlDesc, nil
}

// ensureTPMDevice ensures a TPM device exists in the domain XML.
func ensureTPMDevice(xmlDesc string) (string, error) {
	if strings.Contains(xmlDesc, "<tpm") {
		return xmlDesc, nil
	}

	devicesEnd := strings.LastIndex(xmlDesc, "</devices>")
	if devicesEnd == -1 {
		return xmlDesc, fmt.Errorf("devices section not found in domain XML")
	}

	tpmXML := `
<tpm model='tpm-tis'>
<backend type='emulator' version='2.0'/>
</tpm>
`
	xmlDesc = xmlDesc[:devicesEnd] + tpmXML + xmlDesc[devicesEnd:]

	return xmlDesc, nil
}

func findOVMFPaths(secureBoot bool) (string, string, error) {
	// Env overrides for testing/custom installations.
	if secureBoot {
		code := strings.TrimSpace(os.Getenv("VAPOR_OVMF_CODE_SECURE"))
		vars := strings.TrimSpace(os.Getenv("VAPOR_OVMF_VARS_SECURE"))
		if code != "" && vars != "" {
			if _, err := os.Stat(code); err == nil {
				if _, err := os.Stat(vars); err == nil {
					return code, vars, nil
				}
			}
		}
	} else {
		code := strings.TrimSpace(os.Getenv("VAPOR_OVMF_CODE"))
		vars := strings.TrimSpace(os.Getenv("VAPOR_OVMF_VARS"))
		if code != "" && vars != "" {
			if _, err := os.Stat(code); err == nil {
				if _, err := os.Stat(vars); err == nil {
					return code, vars, nil
				}
			}
		}
	}

	nonSecure := [][2]string{
		{"/usr/share/OVMF/OVMF_CODE.fd", "/usr/share/OVMF/OVMF_VARS.fd"},
		{"/usr/share/edk2/ovmf/OVMF_CODE.fd", "/usr/share/edk2/ovmf/OVMF_VARS.fd"},
		{"/usr/share/edk2/ovmf/OVMF_CODE_4M.fd", "/usr/share/edk2/ovmf/OVMF_VARS_4M.fd"},
	}
	secure := [][2]string{
		{"/usr/share/OVMF/OVMF_CODE.secboot.fd", "/usr/share/OVMF/OVMF_VARS.secboot.fd"},
		{"/usr/share/OVMF/OVMF_CODE.secboot.fd", "/usr/share/OVMF/OVMF_VARS.ms.fd"},
		{"/usr/share/OVMF/OVMF_CODE.secboot.fd", "/usr/share/OVMF/OVMF_VARS.fd"},
		{"/usr/share/OVMF/OVMF_CODE_4M.secboot.fd", "/usr/share/OVMF/OVMF_VARS_4M.secboot.fd"},
		{"/usr/share/OVMF/OVMF_CODE_4M.secboot.fd", "/usr/share/OVMF/OVMF_VARS_4M.ms.fd"},
		{"/usr/share/OVMF/OVMF_CODE_4M.secboot.fd", "/usr/share/OVMF/OVMF_VARS_4M.fd"},
		{"/usr/share/edk2/ovmf/OVMF_CODE.secboot.fd", "/usr/share/edk2/ovmf/OVMF_VARS.secboot.fd"},
		{"/usr/share/edk2/ovmf/OVMF_CODE.secboot.fd", "/usr/share/edk2/ovmf/OVMF_VARS.ms.fd"},
		{"/usr/share/edk2/ovmf/OVMF_CODE.secboot.fd", "/usr/share/edk2/ovmf/OVMF_VARS.fd"},
		{"/usr/share/edk2/ovmf/OVMF_CODE_4M.secboot.fd", "/usr/share/edk2/ovmf/OVMF_VARS_4M.secboot.fd"},
		{"/usr/share/edk2/ovmf/OVMF_CODE_4M.secboot.fd", "/usr/share/edk2/ovmf/OVMF_VARS_4M.ms.fd"},
		{"/usr/share/edk2/ovmf/OVMF_CODE_4M.secboot.fd", "/usr/share/edk2/ovmf/OVMF_VARS_4M.fd"},
	}

	if secureBoot {
		for _, pair := range secure {
			if _, err := os.Stat(pair[0]); err == nil {
				if _, err := os.Stat(pair[1]); err == nil {
					return pair[0], pair[1], nil
				}
			}
		}
		return "", "", fmt.Errorf("secure boot firmware not found (OVMF)")
	}

	for _, pair := range nonSecure {
		if _, err := os.Stat(pair[0]); err == nil {
			if _, err := os.Stat(pair[1]); err == nil {
				return pair[0], pair[1], nil
			}
		}
	}
	// Fallback to secure firmware if non-secure not found.
	for _, pair := range secure {
		if _, err := os.Stat(pair[0]); err == nil {
			if _, err := os.Stat(pair[1]); err == nil {
				return pair[0], pair[1], nil
			}
		}
	}

	return "", "", fmt.Errorf("UEFI firmware not found (OVMF)")
}

func sanitizeVMNameForNVRAM(name string) string {
	if name == "" {
		return "vm"
	}
	re := regexp.MustCompile(`[^a-zA-Z0-9._-]`)
	return re.ReplaceAllString(name, "_")
}

// ensureUEFIBootXML ensures the domain XML has loader/nvram entries for UEFI (and secure boot if requested).

// getDomainMachineType extracts the machine type from the domain XML (os/type machine attribute).
func getDomainMachineType(xmlDesc string) string {
	// Find the <type ...> tag within <os> block
	reType := regexp.MustCompile(`(?s)<os[^>]*>.*?<type[^>]*>`) // non-greedy to first type
	match := reType.FindString(xmlDesc)
	if match == "" {
		return ""
	}
	reMachine := regexp.MustCompile(`machine=['"]([^'"]+)['"]`)
	parts := reMachine.FindStringSubmatch(match)
	if len(parts) > 1 {
		return strings.TrimSpace(parts[1])
	}
	return ""
}

// ensureMachineTypeXML updates/sets the machine attribute on the OS type element.

func isQ35MachineType(machineType string) bool {
	mt := strings.ToLower(strings.TrimSpace(machineType))
	return strings.Contains(mt, "q35")
}

func updateControllerModel(xmlDesc string, controllerType string, desiredModel string, shouldReplace func(current string, hasModel bool) bool) string {
	if strings.TrimSpace(desiredModel) == "" {
		return xmlDesc
	}
	re := regexp.MustCompile(`(?s)<controller[^>]*type=['"]` + regexp.QuoteMeta(controllerType) + `['"][^>]*>`)
	reModel := regexp.MustCompile(`model=['"]([^'"]*)['"]`)
	return re.ReplaceAllStringFunc(xmlDesc, func(tag string) string {
		current := ""
		hasModel := false
		if m := reModel.FindStringSubmatch(tag); len(m) > 1 {
			current = strings.TrimSpace(m[1])
			hasModel = true
		}
		if !shouldReplace(current, hasModel) {
			return tag
		}
		if hasModel {
			return reModel.ReplaceAllString(tag, fmt.Sprintf("model='%s'", desiredModel))
		}
		if strings.HasSuffix(tag, "/>") {
			return strings.TrimSuffix(tag, "/>") + fmt.Sprintf(" model='%s'/>", desiredModel)
		}
		if strings.HasSuffix(tag, ">") {
			return strings.TrimSuffix(tag, ">") + fmt.Sprintf(" model='%s'>", desiredModel)
		}
		return tag
	})
}

func replaceControllerTypeAndModel(xmlDesc string, fromType string, toType string, toModel string) string {
	if strings.TrimSpace(fromType) == "" || strings.TrimSpace(toType) == "" {
		return xmlDesc
	}
	re := regexp.MustCompile(`(?s)<controller[^>]*type=['"]` + regexp.QuoteMeta(fromType) + `['"][^>]*>`)
	reType := regexp.MustCompile(`type=['"][^'"]*['"]`)
	// Match model attribute with optional leading whitespace
	reModel := regexp.MustCompile(`\s*model=['"][^'"]*['"]`)

	return re.ReplaceAllStringFunc(xmlDesc, func(tag string) string {
		tag = reType.ReplaceAllString(tag, fmt.Sprintf("type='%s'", toType))
		if strings.TrimSpace(toModel) != "" {
			if reModel.MatchString(tag) {
				tag = reModel.ReplaceAllString(tag, fmt.Sprintf(" model='%s'", toModel))
			} else if strings.HasSuffix(tag, "/>") {
				tag = strings.TrimSuffix(tag, "/>") + fmt.Sprintf(" model='%s'/>", toModel)
			} else if strings.HasSuffix(tag, ">") {
				tag = strings.TrimSuffix(tag, ">") + fmt.Sprintf(" model='%s'>", toModel)
			}
		} else {
			// Remove model attribute if it exists (requested removal)
			tag = reModel.ReplaceAllString(tag, "")
		}
		return tag
	})
}

func ensurePCIControllerModel(xmlDesc string, model string) (string, error) {
	if strings.TrimSpace(model) == "" {
		return xmlDesc, nil
	}

	re := regexp.MustCompile(`(?s)<controller[^>]*type=['"]pci['"][^>]*index=['"]0['"][^>]*>`)
	tag := re.FindString(xmlDesc)
	if tag == "" {
		return xmlDesc, nil
	}

	updated := tag
	if strings.Contains(tag, "model=") {
		reModel := regexp.MustCompile(`model=['"][^'"]*['"]`)
		updated = reModel.ReplaceAllString(tag, fmt.Sprintf("model='%s'", model))
	} else {
		if strings.HasSuffix(tag, "/>") {
			updated = strings.TrimSuffix(tag, "/>") + fmt.Sprintf(" model='%s'/>", model)
		} else if strings.HasSuffix(tag, ">") {
			updated = strings.TrimSuffix(tag, ">") + fmt.Sprintf(" model='%s'>", model)
		}
	}

	if updated == tag {
		return xmlDesc, nil
	}

	return strings.Replace(xmlDesc, tag, updated, 1), nil
}

// controllerExists checks if a controller of the given type exists in the domain XML.
func controllerExists(xmlDesc string, controllerType string) bool {
	re := regexp.MustCompile(`<controller[^>]*type=['"]` + regexp.QuoteMeta(controllerType) + `['"][^>]*>`)
	return re.MatchString(xmlDesc)
}

// removeController removes all controllers of the given type from the domain XML.
func removeController(xmlDesc string, controllerType string) string {
	// Match both self-closing <controller ... /> and <controller ...>...</controller>
	// Self-closing pattern
	reSelfClosing := regexp.MustCompile(`\s*<controller[^>]*type=['"]` + regexp.QuoteMeta(controllerType) + `['"][^>]*/>\s*`)
	xmlDesc = reSelfClosing.ReplaceAllString(xmlDesc, "\n")

	// Full tag pattern <controller ...>...</controller>
	reFull := regexp.MustCompile(`(?s)\s*<controller[^>]*type=['"]` + regexp.QuoteMeta(controllerType) + `['"][^>]*>.*?</controller>\s*`)
	xmlDesc = reFull.ReplaceAllString(xmlDesc, "\n")

	return xmlDesc
}

func ensureMachineTypeXML(xmlDesc string, machineType string) (string, error) {
	if strings.TrimSpace(machineType) == "" {
		return xmlDesc, nil
	}
	osRe := regexp.MustCompile(`(?s)<os[^>]*>.*?</os>`)
	osBlock := osRe.FindString(xmlDesc)
	if osBlock == "" {
		return xmlDesc, fmt.Errorf("os section not found in domain XML")
	}
	typeRe := regexp.MustCompile(`(?s)<type[^>]*>`) // opening <type ...>
	typeOpen := typeRe.FindString(osBlock)
	if typeOpen == "" {
		return xmlDesc, fmt.Errorf("os type tag not found in domain XML")
	}
	updated := typeOpen
	if strings.Contains(typeOpen, "machine=") {
		reMachine := regexp.MustCompile(`machine=['"]([^'"]*)['"]`)
		updated = reMachine.ReplaceAllString(typeOpen, fmt.Sprintf("machine='%s'", machineType))
	} else {
		updated = strings.TrimSuffix(typeOpen, ">") + fmt.Sprintf(" machine='%s'>", machineType)
	}
	osBlockUpdated := strings.Replace(osBlock, typeOpen, updated, 1)
	updatedXML := strings.Replace(xmlDesc, osBlock, osBlockUpdated, 1)

	desiredControllerModel := "pci-root"
	if isQ35MachineType(machineType) {
		desiredControllerModel = "pcie-root"
	}

	updatedXML, _ = ensurePCIControllerModel(updatedXML, desiredControllerModel)

	if isQ35MachineType(machineType) {
		shouldReplace := func(current string, hasModel bool) bool {
			if !hasModel {
				return true
			}
			return strings.Contains(strings.ToLower(current), "piix")
		}
		updatedXML = updateControllerModel(updatedXML, "usb", "qemu-xhci", shouldReplace)
		// Convert IDE to SATA only if no SATA controller already exists
		// Otherwise, just remove the IDE controller to avoid duplicate SATA controllers
		if controllerExists(updatedXML, "sata") {
			updatedXML = removeController(updatedXML, "ide")
		} else {
			updatedXML = replaceControllerTypeAndModel(updatedXML, "ide", "sata", "")
		}
	}
	return updatedXML, nil
}

func ensureUEFIBootXML(xmlDesc string, vmName string, secureBoot bool) (string, error) {
	codePath, varsTemplate, err := findOVMFPaths(secureBoot)
	if err != nil {
		return xmlDesc, err
	}

	osRe := regexp.MustCompile(`(?s)<os[^>]*>.*?</os>`)
	osBlock := osRe.FindString(xmlDesc)
	if osBlock == "" {
		return xmlDesc, fmt.Errorf("os section not found in domain XML")
	}

	// Ensure <os> has firmware='efi'
	osOpenRe := regexp.MustCompile(`(?s)<os([^>]*)>`)
	osOpen := osOpenRe.FindString(osBlock)
	if osOpen == "" {
		return xmlDesc, fmt.Errorf("os opening tag not found")
	}
	if !strings.Contains(osOpen, "firmware=") {
		osOpenUpdated := strings.TrimSuffix(osOpen, ">") + " firmware='efi'>"
		osBlock = strings.Replace(osBlock, osOpen, osOpenUpdated, 1)
	}

	secureAttr := ""
	if secureBoot {
		secureAttr = " secure='yes'"
	}
	loaderXML := fmt.Sprintf("<loader readonly='yes' type='pflash'%s>%s</loader>", secureAttr, codePath)

	// Keep existing nvram path if present; otherwise create one.
	nvramPath := filepath.Join("/var/lib/libvirt/qemu/nvram", fmt.Sprintf("%s_VARS.fd", sanitizeVMNameForNVRAM(vmName)))
	nvramRe := regexp.MustCompile(`(?s)<nvram[^>]*>.*?</nvram>`)
	if nvramRe.MatchString(osBlock) {
		current := nvramRe.FindString(osBlock)
		pathRe := regexp.MustCompile(`(?s)<nvram[^>]*>([^<]*)</nvram>`)
		if m := pathRe.FindStringSubmatch(current); len(m) > 1 {
			p := strings.TrimSpace(m[1])
			if p != "" {
				nvramPath = p
			}
		}
	}
	nvramXML := fmt.Sprintf("<nvram template='%s'>%s</nvram>", varsTemplate, nvramPath)

	loaderRe := regexp.MustCompile(`(?s)<loader[^>]*>.*?</loader>`)
	if loaderRe.MatchString(osBlock) {
		osBlock = loaderRe.ReplaceAllString(osBlock, loaderXML)
	} else {
		typeRe := regexp.MustCompile(`(?s)<type[^>]*>.*?</type>`)
		if typeRe.MatchString(osBlock) {
			typeBlock := typeRe.FindString(osBlock)
			osBlock = strings.Replace(osBlock, typeBlock, typeBlock+"\n"+loaderXML, 1)
		} else {
			// Fallback: insert loader right after <os>
			osBlock = strings.Replace(osBlock, osOpenRe.FindString(osBlock), osOpenRe.FindString(osBlock)+"\n"+loaderXML, 1)
		}
	}

	if nvramRe.MatchString(osBlock) {
		osBlock = nvramRe.ReplaceAllString(osBlock, nvramXML)
	} else {
		// Insert nvram right after loader.
		if loaderRe.MatchString(osBlock) {
			lb := loaderRe.FindString(osBlock)
			osBlock = strings.Replace(osBlock, lb, lb+"\n"+nvramXML, 1)
		} else {
			osBlock = strings.Replace(osBlock, loaderXML, loaderXML+"\n"+nvramXML, 1)
		}
	}

	// Replace in the full XML.
	xmlDesc = strings.Replace(xmlDesc, osRe.FindString(xmlDesc), osBlock, 1)
	return xmlDesc, nil
}
