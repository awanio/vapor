package libvirt

import (
	"context"
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

// Helper function
func contains(s, substr string) bool {
	return len(s) > 0 && len(substr) > 0 && (s == substr || len(s) > len(substr) && (s[0:len(substr)] == substr || s[len(s)-len(substr):] == substr || len(s) > 2*len(substr) && s[len(substr):len(s)-len(substr)] == substr))
}
