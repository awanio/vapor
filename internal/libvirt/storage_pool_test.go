package libvirt

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

// Helper for pointer bool
func boolPtr(b bool) *bool { return &b }

// Test StoragePoolCreateRequest basic validation-related logic (struct usage)
func TestStoragePoolCreateRequest_BasicFields(t *testing.T) {
	req := StoragePoolCreateRequest{
		Name:      "test-pool",
		Type:      "dir",
		Path:      "/var/lib/libvirt/images/test",
		Source:    "",
		Target:    "",
		AutoStart: true,
	}

	assert.Equal(t, "test-pool", req.Name)
	assert.Equal(t, "dir", req.Type)
	assert.Equal(t, "/var/lib/libvirt/images/test", req.Path)
	assert.True(t, req.AutoStart)
}

// Test StoragePoolUpdateRequest autostart pointer semantics
func TestStoragePoolUpdateRequest_Autostart(t *testing.T) {
	cases := []struct {
		name      string
		value     *bool
		expectSet bool
	}{
		{"nil (no change)", nil, false},
		{"enable", boolPtr(true), true},
		{"disable", boolPtr(false), true},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := StoragePoolUpdateRequest{Autostart: tc.value}
			if tc.expectSet {
				if assert.NotNil(t, req.Autostart) {
					assert.Equal(t, *tc.value, *req.Autostart)
				}
			} else {
				assert.Nil(t, req.Autostart)
			}
		})
	}
}

// Test StoragePoolCapacity usage percentage calculation logic
func TestStoragePoolCapacity_UsagePercent(t *testing.T) {
	cases := []struct {
		name      string
		capacity  uint64
		available uint64
		expected  float64
	}{
		{"zero capacity", 0, 0, 0},
		{"50% used", 1000, 500, 50},
		{"0% used", 1000, 1000, 0},
		{"100% used", 1000, 0, 100},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			cap := StoragePoolCapacity{
				Name:      "test-pool",
				State:     "active",
				Capacity:  tc.capacity,
				Available: tc.available,
			}

			// Emulate the logic used in service layer to populate Used and UsagePercent
			if cap.Capacity == 0 {
				cap.Used = 0
				cap.UsagePercent = 0
			} else {
				cap.Used = cap.Capacity - cap.Available
				cap.UsagePercent = float64(cap.Used) / float64(cap.Capacity) * 100
			}

			assert.InDelta(t, tc.expected, cap.UsagePercent, 0.01)
		})
	}
}

// Test StoragePool struct basic field wiring
func TestStoragePool_StructFields(t *testing.T) {
	pool := StoragePool{
		Name:       "default",
		Type:       "dir",
		State:      "running",
		Capacity:   100,
		Allocation: 60,
		Available:  40,
		Path:       "/var/lib/libvirt/images",
		AutoStart:  true,
	}

	assert.Equal(t, "default", pool.Name)
	assert.Equal(t, "dir", pool.Type)
	assert.Equal(t, "running", pool.State)
	assert.EqualValues(t, 100, pool.Capacity)
	assert.EqualValues(t, 60, pool.Allocation)
	assert.EqualValues(t, 40, pool.Available)
	assert.Equal(t, "/var/lib/libvirt/images", pool.Path)
	assert.True(t, pool.AutoStart)
}

// Simple tests for filtering & pagination-style logic using StoragePool
func TestStoragePool_FilteringAndPaginationLikeLogic(t *testing.T) {
	pools := []StoragePool{
		{Name: "p1", State: "active", Type: "dir"},
		{Name: "p2", State: "inactive", Type: "logical"},
		{Name: "p3", State: "active", Type: "logical"},
	}

	// Filter active
	var active []StoragePool
	for _, p := range pools {
		if p.State == "active" {
			active = append(active, p)
		}
	}
	assert.Len(t, active, 2)

	// Filter type logical
	var logical []StoragePool
	for _, p := range pools {
		if p.Type == "logical" {
			logical = append(logical, p)
		}
	}
	assert.Len(t, logical, 2)

	// Simulate pagination: page 1, size 2
	pageNum, pageSize := 1, 2
	start := (pageNum - 1) * pageSize
	end := start + pageSize
	if end > len(pools) {
		end = len(pools)
	}
	page := pools[start:end]
	assert.Len(t, page, 2)
}
