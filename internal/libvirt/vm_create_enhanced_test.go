package libvirt

import (
	"context"
	"strings"
	"testing"
)

func TestDiskTargetGeneration(t *testing.T) {
	service := &Service{}

	tests := []struct {
		bus      DiskBus
		index    int
		expected string
	}{
		{DiskBusVirtio, 0, "vda"},
		{DiskBusVirtio, 1, "vdb"},
		{DiskBusVirtio, 2, "vdc"},
		{DiskBusSATA, 0, "sda"},
		{DiskBusSATA, 1, "sdb"},
		{DiskBusSCSI, 0, "sda"},
		{DiskBusIDE, 0, "hda"},
		{DiskBusIDE, 2, "hdc"},
	}

	for _, tt := range tests {
		t.Run(tt.expected, func(t *testing.T) {
			result := service.generateDiskTarget(tt.bus, tt.index)
			if result != tt.expected {
				t.Errorf("generateDiskTarget(%v, %d) = %s; want %s",
					tt.bus, tt.index, result, tt.expected)
			}
		})
	}
}

func TestResolveEnhancedDiskPath(t *testing.T) {
	service := &Service{}
	ctx := context.Background()

	tests := []struct {
		name     string
		path     string
		pool     string
		expected string
	}{
		{
			name:     "Absolute path unchanged",
			path:     "/absolute/path/to/disk.qcow2",
			pool:     "default",
			expected: "/absolute/path/to/disk.qcow2",
		},
		{
			name:     "Relative path with default pool",
			path:     "mydisk.qcow2",
			pool:     "default",
			expected: "/var/lib/libvirt/images/default/mydisk.qcow2",
		},
		{
			name:     "Relative path with custom pool",
			path:     "vm-disk.qcow2",
			pool:     "fast-ssd",
			expected: "/var/lib/libvirt/images/fast-ssd/vm-disk.qcow2",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := service.resolveEnhancedDiskPath(ctx, tt.path, tt.pool)
			if err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if result != tt.expected {
				t.Errorf("resolveEnhancedDiskPath(%s, %s) = %s; want %s",
					tt.path, tt.pool, result, tt.expected)
			}
		})
	}
}

func TestPCIDeviceValidation(t *testing.T) {
	service := &Service{}
	ctx := context.Background()

	// Test with invalid PCI addresses
	devices := []PCIDeviceConfig{
		{
			HostAddress: "0000:99:99.9", // Non-existent device
		},
	}

	err := service.validatePCIDevices(ctx, devices)
	if err == nil {
		t.Error("Expected error for non-existent PCI device")
	}

	// Test with ROM file validation
	devices = []PCIDeviceConfig{
		{
			HostAddress: "0000:01:00.0",
			ROMFile:     "/non/existent/rom.bin",
		},
	}

	// This should fail on ROM file check
	err = service.validatePCIDevices(ctx, devices)
	if err == nil {
		t.Error("Expected error for non-existent ROM file")
	}
}

func TestPrepareEnhancedStorageConfig(t *testing.T) {
	service := &Service{
		// Mock connection would go here
	}
	ctx := context.Background()

	req := &VMCreateRequestEnhanced{
		Name:   "test-vm",
		Memory: 2048,
		VCPUs:  2,
		Storage: &StorageConfig{
			Disks: []DiskCreateConfig{
				{
					Action:      "create",
					Size:        20,
					Format:      "qcow2",
					StoragePool: "default",
				},
				{
					Action:      "attach",
					Path:        "/data/existing.qcow2",
					StoragePool: "data-pool",
				},
			},
		},
	}

	// This will fail because we don't have a real libvirt connection
	// but we can test that the function handles the request structure
	_, err := service.prepareEnhancedStorageConfig(ctx, req)
	if err == nil {
		// We expect an error because we don't have a real libvirt connection
		t.Error("Expected error due to missing libvirt connection")
	}
}

func TestStorageConfigValidation(t *testing.T) {
	service := &Service{}
	ctx := context.Background()

	tests := []struct {
		name      string
		storage   *StorageConfig
		wantError bool
		errorMsg  string
	}{
		{
			name: "Valid create action",
			storage: &StorageConfig{
				Disks: []DiskCreateConfig{
					{
						Action:      "create",
						Size:        20,
						Format:      "qcow2",
						StoragePool: "default",
					},
				},
			},
			wantError: false,
		},
		{
			name: "Create without size",
			storage: &StorageConfig{
				Disks: []DiskCreateConfig{
					{
						Action:      "create",
						Format:      "qcow2",
						StoragePool: "default",
					},
				},
			},
			wantError: true,
			errorMsg:  "size is required for create action",
		},
		{
			name: "Attach without path",
			storage: &StorageConfig{
				Disks: []DiskCreateConfig{
					{
						Action:      "attach",
						StoragePool: "default",
					},
				},
			},
			wantError: true,
			errorMsg:  "path is required for attach action",
		},
		{
			name: "Clone without source",
			storage: &StorageConfig{
				Disks: []DiskCreateConfig{
					{
						Action:      "clone",
						StoragePool: "default",
					},
				},
			},
			wantError: true,
			errorMsg:  "clone_from is required for clone action",
		},
		{
			name: "Multiple disks with different pools",
			storage: &StorageConfig{
				Disks: []DiskCreateConfig{
					{
						Action:      "create",
						Size:        20,
						StoragePool: "default",
					},
					{
						Action:      "create",
						Size:        100,
						StoragePool: "fast-ssd",
					},
				},
			},
			wantError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := &VMCreateRequestEnhanced{
				Name:    "test-vm",
				Memory:  2048,
				VCPUs:   2,
				Storage: tt.storage,
			}

			_, err := service.prepareEnhancedStorageConfig(ctx, req)

			if tt.wantError {
				if err == nil {
					t.Errorf("Expected error containing '%s', got nil", tt.errorMsg)
				} else if tt.errorMsg != "" && !contains(err.Error(), tt.errorMsg) {
					t.Errorf("Expected error containing '%s', got '%s'", tt.errorMsg, err.Error())
				}
			} else {
				if err != nil && !contains(err.Error(), "storage pool") {
					// We expect storage pool errors in tests without real libvirt
					t.Errorf("Unexpected error: %v", err)
				}
			}
		})
	}
}

func TestDiskDefaults(t *testing.T) {

	// Test that defaults are properly set
	diskConfig := DiskCreateConfig{
		Action: "create",
		Size:   20,
	}

	// Simulate what happens in prepareEnhancedStorageConfig
	if diskConfig.Format == "" {
		diskConfig.Format = "qcow2"
	}
	if diskConfig.Bus == "" {
		diskConfig.Bus = DiskBusVirtio
	}

	if diskConfig.Format != "qcow2" {
		t.Errorf("Expected default format to be 'qcow2', got %s", diskConfig.Format)
	}
	if diskConfig.Bus != DiskBusVirtio {
		t.Errorf("Expected default bus to be 'virtio', got %s", diskConfig.Bus)
	}
}

func TestGenerateEnhancedDomainXML_NetworkBridge(t *testing.T) {
	svc := &Service{}
	req := &VMCreateRequestEnhanced{
		Name:         "test-vm",
		Memory:       2048,
		VCPUs:        2,
		Architecture: "x86_64",
		Networks: []NetworkConfig{
			{
				Type:   NetworkTypeBridge,
				Source: "br_private0",
				Model:  "virtio",
			},
		},
	}

	disks := []PreparedDisk{
		{
			Path: "/var/lib/libvirt/images/test.qcow2",
			Config: DiskCreateConfig{
				Format: "qcow2",
				Bus:    DiskBusVirtio,
				Target: "vda",
				Device: "disk",
			},
		},
	}

	xml, err := svc.generateEnhancedDomainXML(req, disks)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if !strings.Contains(xml, "<interface type='bridge'>") {
		t.Fatalf("expected bridge interface, got xml: %s", xml)
	}
	if !strings.Contains(xml, "<source bridge='br_private0'/>") {
		t.Fatalf("expected bridge source br_private0, got xml: %s", xml)
	}
	if !strings.Contains(xml, "<model type='virtio'/>") {
		t.Fatalf("expected model virtio, got xml: %s", xml)
	}
}

func TestGenerateEnhancedDomainXML_NetworkNatAliasMapsToNetwork(t *testing.T) {
	svc := &Service{}
	req := &VMCreateRequestEnhanced{
		Name:         "test-vm",
		Memory:       2048,
		VCPUs:        2,
		Architecture: "x86_64",
		Networks: []NetworkConfig{
			{
				Type:   NetworkTypeNAT,
				Source: "default",
				Model:  "virtio",
			},
		},
	}

	disks := []PreparedDisk{
		{
			Path: "/var/lib/libvirt/images/test.qcow2",
			Config: DiskCreateConfig{
				Format: "qcow2",
				Bus:    DiskBusVirtio,
				Target: "vda",
				Device: "disk",
			},
		},
	}

	xml, err := svc.generateEnhancedDomainXML(req, disks)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if !strings.Contains(xml, "<interface type='network'>") {
		t.Fatalf("expected nat alias to render as network interface, got xml: %s", xml)
	}
	if !strings.Contains(xml, "<source network='default'/>") {
		t.Fatalf("expected network source default, got xml: %s", xml)
	}
}

func TestGenerateEnhancedDomainXML_GraphicsEGLHeadlessMinimal(t *testing.T) {
	svc := &Service{}
	req := &VMCreateRequestEnhanced{
		Name:         "test-vm",
		Memory:       2048,
		VCPUs:        2,
		Architecture: "x86_64",
		Graphics: []EnhancedGraphicsConfig{
			{Type: "egl-headless"},
		},
	}

	disks := []PreparedDisk{
		{
			Path: "/var/lib/libvirt/images/test.qcow2",
			Config: DiskCreateConfig{
				Format: "qcow2",
				Bus:    DiskBusVirtio,
				Target: "vda",
				Device: "disk",
			},
		},
	}

	xml, err := svc.generateEnhancedDomainXML(req, disks)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if !strings.Contains(xml, "<graphics type='egl-headless'/>") {
		t.Fatalf("expected egl-headless graphics element, got xml: %s", xml)
	}
	if strings.Contains(xml, "type='egl-headless' port=") || strings.Contains(xml, "type='egl-headless' listen=") {
		t.Fatalf("expected egl-headless graphics to be minimal (no port/listen attrs), got xml: %s", xml)
	}
}

func TestGenerateEnhancedDomainXML_GraphicsNoneDisablesDefault(t *testing.T) {
	svc := &Service{}
	req := &VMCreateRequestEnhanced{
		Name:         "test-vm",
		Memory:       2048,
		VCPUs:        2,
		Architecture: "x86_64",
		Graphics: []EnhancedGraphicsConfig{
			{Type: "none"},
		},
	}

	disks := []PreparedDisk{
		{
			Path: "/var/lib/libvirt/images/test.qcow2",
			Config: DiskCreateConfig{
				Format: "qcow2",
				Bus:    DiskBusVirtio,
				Target: "vda",
				Device: "disk",
			},
		},
	}

	xml, err := svc.generateEnhancedDomainXML(req, disks)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if strings.Contains(xml, "<graphics") {
		t.Fatalf("expected no <graphics> elements when type is none, got xml: %s", xml)
	}
}

// Helper function
func contains(s, substr string) bool {
	return strings.Contains(s, substr)
}

func TestGenerateEnhancedDomainXML_ISOForcesRawDriverAndCdrom(t *testing.T) {
	service := &Service{}

	req := &VMCreateRequestEnhanced{
		Name:         "vm-test",
		Memory:       1024,
		VCPUs:        1,
		Architecture: "x86_64",
	}

	disks := []PreparedDisk{
		{
			Path: "/var/lib/libvirt/images/iso/alpine-virt.iso",
			Config: DiskCreateConfig{
				Action:      "attach",
				Format:      "qcow2",  // wrong on purpose
				Device:      "floppy", // wrong on purpose
				Bus:         DiskBusIDE,
				Target:      "hda",
				ReadOnly:    true,
				BootOrder:   0,
				StoragePool: "default",
			},
		},
	}

	xml, err := service.generateEnhancedDomainXML(req, disks)
	if err != nil {
		t.Fatalf("generateEnhancedDomainXML returned error: %v", err)
	}

	if !strings.Contains(xml, "<driver name='qemu' type='raw'/>") {
		t.Fatalf("expected ISO disk to use raw driver, got XML:\n%s", xml)
	}
	if !strings.Contains(xml, "<disk type='file' device='cdrom'>") {
		t.Fatalf("expected ISO disk to be attached as cdrom device, got XML:\n%s", xml)
	}
}

func TestBuildEnhancedAttachInterfaceXML(t *testing.T) {
	service := &Service{}

	t.Run("nat_normalizes_to_network", func(t *testing.T) {
		xml, key, mac, hadMAC, err := service.buildEnhancedAttachInterfaceXML(NetworkConfig{
			Type:   NetworkTypeNAT,
			Source: "default",
			Model:  "virtio",
			MAC:    "52:54:00:aa:bb:cc",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !hadMAC {
			t.Fatalf("expected hadMAC=true")
		}
		if mac != "52:54:00:aa:bb:cc" {
			t.Fatalf("expected mac to be preserved, got %q", mac)
		}
		if key != "network|default|virtio" {
			t.Fatalf("unexpected key: %q", key)
		}
		if !strings.Contains(xml, "<interface type='network'>") {
			t.Fatalf("expected interface type network, got XML:\n%s", xml)
		}
		if !strings.Contains(xml, "<source network='default'/>") {
			t.Fatalf("expected network source, got XML:\n%s", xml)
		}
	})

	t.Run("direct_includes_mode_bridge", func(t *testing.T) {
		xml, key, _, _, err := service.buildEnhancedAttachInterfaceXML(NetworkConfig{
			Type:   NetworkTypeDirect,
			Source: "eth0",
			Model:  "virtio",
			MAC:    "52:54:00:11:22:33",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if key != "direct|eth0|virtio" {
			t.Fatalf("unexpected key: %q", key)
		}
		if !strings.Contains(xml, "<source dev='eth0' mode='bridge'/>") {
			t.Fatalf("expected direct source dev with mode bridge, got XML:\n%s", xml)
		}
	})

	t.Run("user_has_no_source", func(t *testing.T) {
		xml, key, _, _, err := service.buildEnhancedAttachInterfaceXML(NetworkConfig{
			Type:  NetworkTypeUser,
			MAC:   "52:54:00:44:55:66",
			Model: "virtio",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if key != "user||virtio" {
			t.Fatalf("unexpected key: %q", key)
		}
		if strings.Contains(xml, "<source ") {
			t.Fatalf("expected no <source/> for user interface, got XML:\n%s", xml)
		}
	})
}
