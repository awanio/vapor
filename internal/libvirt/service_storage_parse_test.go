package libvirt

import "testing"

func TestParseStorageConfiguration_DeviceTypes(t *testing.T) {
	s := &Service{}

	xml := `
<domain type='kvm'>
  <name>vm-test</name>
  <devices>
    <disk type='file' device='cdrom'>
      <driver name='qemu' type='raw'/>
      <source file='/var/lib/libvirt/images/iso/alpine.iso'/>
      <target dev='hdc' bus='ide'/>
      <readonly/>
    </disk>
    <disk type='file' device='disk'>
      <driver name='qemu' type='qcow2'/>
      <source file='/var/lib/libvirt/images/vm-test.qcow2'/>
      <target dev='vda' bus='virtio'/>
    </disk>
    <disk type='file' device='floppy'>
      <driver name='qemu' type='raw'/>
      <source file='/var/lib/libvirt/images/floppy.img'/>
      <target dev='fda' bus='fdc'/>
      <readonly/>
    </disk>
  </devices>
</domain>`

	storage, err := s.parseStorageConfiguration(xml)
	if err != nil {
		t.Fatalf("parseStorageConfiguration returned error: %v", err)
	}
	if len(storage.Disks) != 3 {
		t.Fatalf("expected 3 disks parsed, got %d", len(storage.Disks))
	}

	if storage.Disks[0].Device != "cdrom" {
		t.Fatalf("expected disk[0] device=cdrom, got %q", storage.Disks[0].Device)
	}
	if storage.Disks[1].Device != "disk" {
		t.Fatalf("expected disk[1] device=disk, got %q", storage.Disks[1].Device)
	}
	if storage.Disks[2].Device != "floppy" {
		t.Fatalf("expected disk[2] device=floppy, got %q", storage.Disks[2].Device)
	}
}

func TestParseDomainDiskAttachments(t *testing.T) {
	xml := `
<domain type='kvm'>
  <name>vm-test</name>
  <devices>
    <disk type='file' device='cdrom'>
      <source file='/isos/alpine.iso'/>
      <target dev='hdc' bus='ide'/>
    </disk>
    <disk type='file' device='disk'>
      <source file='/disks/vm.qcow2'/>
      <target dev='vda' bus='virtio'/>
    </disk>
  </devices>
</domain>`

	targets, sources, err := parseDomainDiskAttachments(xml)
	if err != nil {
		t.Fatalf("parseDomainDiskAttachments returned error: %v", err)
	}

	if !targets["hdc"] || !targets["vda"] {
		t.Fatalf("expected targets to include hdc and vda, got %#v", targets)
	}
	if !sources["/isos/alpine.iso"] || !sources["/disks/vm.qcow2"] {
		t.Fatalf("expected sources to include iso and qcow2 paths, got %#v", sources)
	}
}
