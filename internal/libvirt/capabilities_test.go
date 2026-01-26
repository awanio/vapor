package libvirt

import "testing"

func TestParseDomainCapabilitiesXML(t *testing.T) {
	xml := `<domainCapabilities>
  <path>/usr/bin/qemu-system-x86_64</path>
  <arch>x86_64</arch>
  <domain>kvm</domain>
  <os>
    <enum name='machine'>
      <value>q35</value>
      <value>pc-i440fx-7.2</value>
    </enum>
    <enum name='firmware'>
      <value>efi</value>
      <value>bios</value>
    </enum>
  </os>
</domainCapabilities>`

	caps := parseDomainCapabilitiesXML(xml)
	if caps.Emulator != "/usr/bin/qemu-system-x86_64" {
		t.Fatalf("expected emulator path, got %q", caps.Emulator)
	}
	if caps.Arch != "x86_64" {
		t.Fatalf("expected arch x86_64, got %q", caps.Arch)
	}
	if caps.Domain != "kvm" {
		t.Fatalf("expected domain kvm, got %q", caps.Domain)
	}
	if len(caps.MachineTypes) != 2 || caps.MachineTypes[0] != "q35" || caps.MachineTypes[1] != "pc-i440fx-7.2" {
		t.Fatalf("unexpected machine types: %#v", caps.MachineTypes)
	}
	if len(caps.Enums["firmware"]) != 2 || caps.Enums["firmware"][0] != "efi" {
		t.Fatalf("unexpected firmware enums: %#v", caps.Enums["firmware"])
	}
}

func TestParseHostCapabilitiesMachineTypes(t *testing.T) {
	xml := `<capabilities>
  <guest>
    <arch name='x86_64'>
      <machine canonical='pc-i440fx-focal'>pc</machine>
      <machine canonical='pc-q35-focal'>q35</machine>
      <domain type='kvm'>
        <machine>pc-i440fx-focal</machine>
        <machine>pc-q35-focal</machine>
      </domain>
      <domain type='qemu'>
        <machine>pc-q35-2.12</machine>
      </domain>
    </arch>
  </guest>
</capabilities>`

	machines := parseHostCapabilitiesMachineTypes(xml, "x86_64", "kvm")
	want := []string{"pc", "q35", "pc-i440fx-focal", "pc-q35-focal"}
	for _, w := range want {
		found := false
		for _, got := range machines {
			if got == w {
				found = true
				break
			}
		}
		if !found {
			t.Fatalf("expected machine %q in %v", w, machines)
		}
	}

	for _, got := range machines {
		if got == "pc-q35-2.12" {
			t.Fatalf("did not expect qemu machine %q in %v", got, machines)
		}
	}
}
