package storage

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewService(t *testing.T) {
	service := NewService()
	assert.NotNil(t, service)
}

func TestParseSize(t *testing.T) {
	service := NewService()

	tests := []struct {
		name     string
		sizeStr  string
		expected uint64
	}{
		{
			name:     "empty string",
			sizeStr:  "",
			expected: 0,
		},
		{
			name:     "kilobytes",
			sizeStr:  "1024K",
			expected: 1024 * 1024,
		},
		{
			name:     "megabytes",
			sizeStr:  "100M",
			expected: 100 * 1024 * 1024,
		},
		{
			name:     "gigabytes",
			sizeStr:  "10G",
			expected: 10 * 1024 * 1024 * 1024,
		},
		{
			name:     "terabytes",
			sizeStr:  "1T",
			expected: 1024 * 1024 * 1024 * 1024,
		},
		{
			name:     "petabytes",
			sizeStr:  "1P",
			expected: 1024 * 1024 * 1024 * 1024 * 1024,
		},
		{
			name:     "lowercase unit",
			sizeStr:  "500mb",
			expected: 500 * 1024 * 1024,
		},
		{
			name:     "decimal value",
			sizeStr:  "1.5G",
			expected: uint64(1.5 * 1024 * 1024 * 1024),
		},
		{
			name:     "with spaces",
			sizeStr:  "  256M  ",
			expected: 256 * 1024 * 1024,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.parseSize(tt.sizeStr)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestLsblkToDisk(t *testing.T) {
	service := NewService()

	device := lsblkDevice{
		Name:      "sda",
		Path:      "/dev/sda",
		Size:      "500G",
		Type:      "disk",
		Removable: "0",
		Model:     "Samsung SSD 850",
		Serial:    "S1234567890",
		Children: []lsblkDevice{
			{
				Name:       "sda1",
				Path:       "/dev/sda1",
				Size:       "100G",
				Type:       "part",
				FSType:     "ext4",
				MountPoint: "/",
			},
			{
				Name:       "sda2",
				Path:       "/dev/sda2",
				Size:       "400G",
				Type:       "part",
				FSType:     "ext4",
				MountPoint: "/home",
			},
		},
	}

	disk := service.lsblkToDisk(device)

	assert.Equal(t, "sda", disk.Name)
	assert.Equal(t, "/dev/sda", disk.Path)
	assert.Equal(t, uint64(500*1024*1024*1024), disk.Size)
	assert.Equal(t, "Samsung SSD 850", disk.Model)
	assert.Equal(t, "S1234567890", disk.Serial)
	assert.Equal(t, "disk", disk.Type)
	assert.False(t, disk.Removable)
	assert.Len(t, disk.Partitions, 2)

	// Check partitions
	assert.Equal(t, "sda1", disk.Partitions[0].Name)
	assert.Equal(t, "/dev/sda1", disk.Partitions[0].Path)
	assert.Equal(t, uint64(100*1024*1024*1024), disk.Partitions[0].Size)
	assert.Equal(t, "ext4", disk.Partitions[0].FileSystem)
	assert.Equal(t, "/", disk.Partitions[0].MountPoint)

	assert.Equal(t, "sda2", disk.Partitions[1].Name)
	assert.Equal(t, "/dev/sda2", disk.Partitions[1].Path)
	assert.Equal(t, uint64(400*1024*1024*1024), disk.Partitions[1].Size)
	assert.Equal(t, "ext4", disk.Partitions[1].FileSystem)
	assert.Equal(t, "/home", disk.Partitions[1].MountPoint)
}

func TestLsblkToDiskRemovable(t *testing.T) {
	service := NewService()

	device := lsblkDevice{
		Name:      "sdb",
		Path:      "/dev/sdb",
		Size:      "32G",
		Type:      "disk",
		Removable: "1",
		Model:     "USB Flash Drive",
		Serial:    "USB123456",
	}

	disk := service.lsblkToDisk(device)

	assert.True(t, disk.Removable)
}

func TestReadSysFile(t *testing.T) {
	service := NewService()

	// Test with non-existent file
	result := service.readSysFile("/non/existent/file")
	assert.Empty(t, result)

	// Note: For a complete test, you would mock the file system
	// or use a test file. This is just testing the error handling.
}
