package libvirt

import "testing"

func TestParseDomainGraphics(t *testing.T) {
	xml := `
<domain type='kvm'>
  <name>vm-test</name>
  <devices>
    <graphics type='vnc' port='-1' autoport='yes' listen='0.0.0.0' passwd='secret'/>
    <graphics type='spice' port='5901' autoport='no' listen='127.0.0.1'/>
  </devices>
</domain>`

	graphics, err := parseDomainGraphics(xml)
	if err != nil {
		t.Fatalf("parseDomainGraphics returned error: %v", err)
	}
	if len(graphics) != 2 {
		t.Fatalf("expected 2 graphics devices, got %d", len(graphics))
	}

	if graphics[0].Type != "vnc" {
		t.Fatalf("expected graphics[0] type=vnc, got %q", graphics[0].Type)
	}
	if !graphics[0].AutoPort {
		t.Fatalf("expected graphics[0] autoport=true, got false")
	}
	if graphics[0].Port != 0 {
		t.Fatalf("expected graphics[0] port=0 for autoport, got %d", graphics[0].Port)
	}
	if graphics[0].Listen != "0.0.0.0" {
		t.Fatalf("expected graphics[0] listen=0.0.0.0, got %q", graphics[0].Listen)
	}
	if graphics[0].Password != "secret" {
		t.Fatalf("expected graphics[0] password=secret, got %q", graphics[0].Password)
	}

	if graphics[1].Type != "spice" {
		t.Fatalf("expected graphics[1] type=spice, got %q", graphics[1].Type)
	}
	if graphics[1].AutoPort {
		t.Fatalf("expected graphics[1] autoport=false, got true")
	}
	if graphics[1].Port != 5901 {
		t.Fatalf("expected graphics[1] port=5901, got %d", graphics[1].Port)
	}
	if graphics[1].Listen != "127.0.0.1" {
		t.Fatalf("expected graphics[1] listen=127.0.0.1, got %q", graphics[1].Listen)
	}
}

func TestNormalizeNetworkForKey(t *testing.T) {
	s := &Service{}

	ifaceType, source, model, mac, key, hadMAC, err := s.normalizeNetworkForKey(NetworkConfig{
		Type:   NetworkTypeNAT,
		Source: "default",
		MAC:    "52:54:00:11:22:33",
	})
	if err != nil {
		t.Fatalf("normalizeNetworkForKey returned error: %v", err)
	}
	if ifaceType != "network" {
		t.Fatalf("expected ifaceType=network, got %q", ifaceType)
	}
	if source != "default" {
		t.Fatalf("expected source=default, got %q", source)
	}
	if model != "virtio" {
		t.Fatalf("expected model=virtio, got %q", model)
	}
	if !hadMAC || mac != "52:54:00:11:22:33" {
		t.Fatalf("expected MAC to be set, got hadMAC=%v mac=%q", hadMAC, mac)
	}
	if key != "network|default|virtio" {
		t.Fatalf("expected key=network|default|virtio, got %q", key)
	}
}

func TestValidateUniqueNetworkMACs(t *testing.T) {
	if err := validateUniqueNetworkMACs([]NetworkConfig{{MAC: "52:54:00:11:22:33"}, {MAC: "52:54:00:11:22:33"}}); err == nil {
		t.Fatalf("expected duplicate MAC error, got nil")
	}
	if err := validateUniqueNetworkMACs([]NetworkConfig{{MAC: "52:54:00:11:22:33"}, {MAC: "52:54:00:11:22:34"}}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestValidateUniqueGraphicsTypes(t *testing.T) {
	if err := validateUniqueGraphicsTypes([]EnhancedGraphicsConfig{{Type: "vnc"}, {Type: "vnc"}}); err == nil {
		t.Fatalf("expected duplicate graphics type error, got nil")
	}
	if err := validateUniqueGraphicsTypes([]EnhancedGraphicsConfig{{Type: "vnc"}, {Type: "spice"}}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
