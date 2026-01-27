package libvirt

import (
	"fmt"
	"strings"
	"testing"
)

func TestModifyDomainXMLForBootOrder(t *testing.T) {
	// Original XML simulating the VM state from the bug report
	// VM has a disk at vda and a cdrom at hda with boot order 1
	initialXML := `<domain>
  <devices>
    <disk type='file' device='disk'>
      <target dev='vda' bus='virtio'/>
    </disk>
    <disk type='file' device='cdrom'>
      <source file='/old/image.iso'/>
      <target dev='hda' bus='ide'/>
      <boot order='1'/>
    </disk>
    <interface type='network'>
      <mac address='52:54:00:43:2d:15'/>
    </interface>
  </devices>
  <os>
    <type arch='x86_64' machine='pc-i440fx-focal'>hvm</type>
    <boot dev='hd'/>
  </os>
</domain>`

	// The update request: keeping vda, but changing hda to a new ISO, still boot order 1
	disks := []DiskCreateConfig{
		{
			Device: "disk",
			Target: "vda",
			Bus:    "virtio",
			Path:   "/var/lib/libvirt/images/disk0.qcow2",
			Format: "qcow2",
		},
		{
			Device:    "cdrom",
			Target:    "hda",
			Bus:       "ide",
			Path:      "/new/image.iso",
			Format:    "raw",
			BootOrder: 1,
		},
	}

	updatedXML, addedPaths, err := modifyDomainXMLForBootOrder(initialXML, disks)
	if err != nil {
		t.Fatalf("modifyDomainXMLForBootOrder failed: %v", err)
	}

	// 1. Verify that OS boot elements are removed
	if strings.Contains(updatedXML, "<boot dev=") {
		t.Errorf("OS boot elements were not removed")
	}

	// 2. Verify that the new ISO path is present
	if !strings.Contains(updatedXML, "/new/image.iso") {
		t.Errorf("New ISO image path not found in updated XML")
	}

	// 3. Verify that the OLD ISO path is GONE (This is the bug: typically it stays if not removed)
	if strings.Contains(updatedXML, "/old/image.iso") {
		t.Errorf("Old ISO image path still found in updated XML (failed to replace device)")
	}

	// 4. Verify no duplicate boot orders (heuristic check)
	// We expect exactly one "boot order='1'" string in the output for this specific case
	countBootOrder := strings.Count(updatedXML, "boot order='1'")
	if countBootOrder != 1 {
		t.Errorf("Expected exactly one boot order='1', found %d", countBootOrder)
	}

	_ = addedPaths
}

func TestModifyDomainXMLForBootOrder_SwapBootOrder(t *testing.T) {
	// Initial state: CDROM (hda) is boot order 1, Disk (vda) is boot order 2
	initialXML := `<domain>
  <devices>
    <disk type='file' device='cdrom'>
      <driver name='qemu' type='raw'/>
      <source file='/iso/image.iso'/>
      <target dev='hda' bus='ide'/>
      <boot order='1'/>
      <readonly/>
    </disk>
    <disk type='file' device='disk'>
      <driver name='qemu' type='qcow2'/>
      <source file='/images/disk.qcow2'/>
      <target dev='vda' bus='virtio'/>
      <boot order='2'/>
    </disk>
    <interface type='network'>
      <mac address='52:54:00:43:2d:15'/>
    </interface>
  </devices>
</domain>`

	// The update request: CDROM becomes order 2, Disk becomes order 1
	disks := []DiskCreateConfig{
		{
			Device:    "cdrom",
			Target:    "hda",
			Bus:       "ide",
			Path:      "/iso/image.iso", // Same path
			Format:    "raw",
			BootOrder: 2, // Changed from 1 to 2
			ReadOnly:  true,
		},
		{
			Device:    "disk",
			Target:    "vda",
			Bus:       "virtio",
			Path:      "/images/disk.qcow2", // Same path
			Format:    "qcow2",
			BootOrder: 1, // Changed from 2 to 1
		},
	}

	updatedXML, _, err := modifyDomainXMLForBootOrder(initialXML, disks)
	if err != nil {
		t.Fatalf("modifyDomainXMLForBootOrder failed: %v", err)
	}

	// 1. Verify duplicates are removed (should verify by count or absence of old order)
	// We can check if we can find the specific combination of target and boot order

	// Helper to check for existence of target+order
	checkOrder := func(target string, order int) {
		// This is a rough check. Ideally we'd parse XML, but for this string manipulation test,
		// ensuring the target is followed by the correct order (and not the wrong one) is a decent heuristic
		// given the function structure adds them sequentially.

		// More robust: Split into disks and check
		if !strings.Contains(updatedXML, fmt.Sprintf("<target dev='%s'", target)) {
			t.Errorf("Device %s missing from updated XML", target)
		}

		// We expect the NEW configuration to be present
		expectedFragment := fmt.Sprintf("<target dev='%s'", target)
		loc := strings.Index(updatedXML, expectedFragment)
		if loc == -1 {
			return
		}

		// Check the <boot order='X'/> following this target (within reasonable distance or until </disk>)
		diskBlockEnd := strings.Index(updatedXML[loc:], "</disk>")
		if diskBlockEnd == -1 {
			t.Errorf("Malformed XML, no closing disk tag for %s", target)
			return
		}
		diskBlock := updatedXML[loc : loc+diskBlockEnd]

		expectedBoot := fmt.Sprintf("<boot order='%d'/>", order)
		if !strings.Contains(diskBlock, expectedBoot) {
			t.Errorf("Device %s expected to have boot order %d, but XML block was: %s", target, order, diskBlock)
		}
	}

	checkOrder("vda", 1)
	checkOrder("hda", 2)

	// Verify we don't have multiple definitions for the same device
	if strings.Count(updatedXML, "dev='vda'") != 1 {
		t.Errorf("Expected exactly one definition for vda")
	}
	if strings.Count(updatedXML, "dev='hda'") != 1 {
		t.Errorf("Expected exactly one definition for hda")
	}
}

func TestGetDomainMachineType(t *testing.T) {
	xml := `<domain type='kvm'>
	<name>test</name>
	<os>
		<type arch='x86_64' machine='pc-q35-7.2'>hvm</type>
	</os>
	</domain>`
	if got := getDomainMachineType(xml); got != "pc-q35-7.2" {
		t.Fatalf("expected machine type pc-q35-7.2, got %q", got)
	}

	xmlNoMachine := `<domain><os><type arch='x86_64'>hvm</type></os></domain>`
	if got := getDomainMachineType(xmlNoMachine); got != "" {
		t.Fatalf("expected empty machine type, got %q", got)
	}
}

func TestEnsureMachineTypeXMLUpdatesPCIController(t *testing.T) {
	xml := `<domain type='kvm'>
  <name>test</name>
  <os>
    <type arch='x86_64' machine='pc-i440fx-focal'>hvm</type>
  </os>
  <devices>
    <controller type='pci' index='0' model='pci-root'/>
  </devices>
</domain>`

	updated, err := ensureMachineTypeXML(xml, "q35")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(updated, "machine='q35'") {
		t.Fatalf("expected machine type to be updated to q35, got: %s", updated)
	}
	if !strings.Contains(updated, "model='pcie-root'") {
		t.Fatalf("expected pci controller model to be pcie-root, got: %s", updated)
	}

	reverted, err := ensureMachineTypeXML(updated, "pc-i440fx-focal")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(reverted, "model='pci-root'") {
		t.Fatalf("expected pci controller model to be pci-root, got: %s", reverted)
	}
}

func TestEnsureMachineTypeXMLUpdatesControllersForQ35(t *testing.T) {
	// Test switching from i440fx to q35
	// IDE controller should be removed (libvirt recreates with Q35-compatible SATA)
	xml := `<domain type='kvm'>
  <name>test</name>
  <os>
    <type arch='x86_64' machine='pc-i440fx-focal'>hvm</type>
  </os>
  <devices>
    <controller type='pci' index='0' model='pci-root'/>
    <controller type='usb' index='0' model='piix3-uhci'/>
    <controller type='ide' index='0' model='piix3'/>
  </devices>
</domain>`

	updated, err := ensureMachineTypeXML(xml, "q35")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(updated, "model='pcie-root'") {
		t.Fatalf("expected pci controller model to be pcie-root, got: %s", updated)
	}
	if !strings.Contains(updated, "type='usb'") || !strings.Contains(updated, "model='qemu-xhci'") {
		t.Fatalf("expected usb controller model to be qemu-xhci, got: %s", updated)
	}
	// IDE controller should be removed for Q35 (libvirt adds correct SATA when defining)
	if strings.Contains(updated, "type='ide'") {
		t.Fatalf("expected ide controller to be removed, got: %s", updated)
	}
}

func TestEnsureMachineTypeXMLWithExistingSATA(t *testing.T) {
	// Test case: VM has both IDE and SATA controllers (like the reported bug)
	// When switching to Q35, both should be removed so libvirt can recreate
	// them with correct Q35-compatible PCI addresses
	xml := `<domain type='kvm'>
  <name>test</name>
  <os>
    <type arch='x86_64' machine='pc-i440fx-focal'>hvm</type>
  </os>
  <devices>
    <controller type='pci' index='0' model='pci-root'/>
    <controller type='usb' index='0' model='piix3-uhci'/>
    <controller type='sata' index='0'>
      <address type='pci' domain='0x0000' bus='0x00' slot='0x04' function='0x0'/>
    </controller>
    <controller type='ide' index='0'>
      <address type='pci' domain='0x0000' bus='0x00' slot='0x01' function='0x1'/>
    </controller>
  </devices>
</domain>`

	updated, err := ensureMachineTypeXML(xml, "q35")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify machine type is updated to q35
	if !strings.Contains(updated, "machine='q35'") {
		t.Errorf("expected machine type to be updated to q35, got: %s", updated)
	}

	// Verify both IDE and SATA controllers are removed
	// (libvirt will add Q35-compatible SATA controller when domain is defined)
	if strings.Contains(updated, "type='sata'") {
		t.Fatalf("expected SATA controller to be removed (libvirt recreates with correct address), but found in: %s", updated)
	}
	if strings.Contains(updated, "type='ide'") {
		t.Fatalf("expected IDE controller to be removed, but found in: %s", updated)
	}

	// Verify PCI controller model is pcie-root for q35
	if !strings.Contains(updated, "model='pcie-root'") {
		t.Errorf("expected pci controller model to be pcie-root, got: %s", updated)
	}
}
