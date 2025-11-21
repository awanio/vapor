package libvirt

import (
"strings"
"testing"

"github.com/stretchr/testify/assert"
)

// TestIsValidVolumeName covers the name validation helper.
func TestIsValidVolumeName(t *testing.T) {
t.Run("valid names", func(t *testing.T) {
valid := []string{
"vol1",
"vol-01",
"vol_01",
strings.Repeat("a", 255), // max length
}

for _, name := range valid {
t.Run(name, func(t *testing.T) {
assert.True(t, isValidVolumeName(name), "expected %q to be valid", name)
})
}
})

t.Run("invalid names", func(t *testing.T) {
invalid := []string{
"",                                  // empty
strings.Repeat("a", 256),           // too long
"has space",                        // space
"has!bang",                         // special char
"has.dot",                          // dot
}

for _, name := range invalid {
t.Run(name, func(t *testing.T) {
assert.False(t, isValidVolumeName(name), "expected %q to be invalid", name)
})
}
})
}

// TestValidateVolumeCreateRequest_Success ensures a valid request passes.
func TestValidateVolumeCreateRequest_Success(t *testing.T) {
req := &VolumeCreateRequest{
Name:     "valid-volume",
Capacity: 10 * 1024 * 1024, // 10 MiB
Format:   "qcow2",
}

assert.NoError(t, validateVolumeCreateRequest(req))
}

// TestValidateVolumeCreateRequest_Errors ensures specific validation failures map
// to the expected error messages that route handlers rely on.
func TestValidateVolumeCreateRequest_Errors(t *testing.T) {
cases := []struct {
name    string
modify  func(*VolumeCreateRequest)
msgPart string
}{
{
name: "invalid name",
modify: func(r *VolumeCreateRequest) {
r.Name = "bad name" // contains space
},
msgPart: "invalid volume name",
},
{
name: "zero capacity",
modify: func(r *VolumeCreateRequest) {
r.Capacity = 0
},
msgPart: "volume capacity must be greater than 0",
},
{
name: "too small capacity",
modify: func(r *VolumeCreateRequest) {
r.Capacity = 512 * 1024 // 0.5 MiB
},
msgPart: "at least 1 MiB",
},
{
name: "invalid format",
modify: func(r *VolumeCreateRequest) {
r.Format = "invalid-format"
},
msgPart: "invalid format:",
},
}

for _, tc := range cases {
t.Run(tc.name, func(t *testing.T) {
req := &VolumeCreateRequest{
Name:     "valid-volume",
Capacity: 10 * 1024 * 1024, // 10 MiB (valid baseline)
Format:   "qcow2",
}

// Apply the case-specific mutation
if tc.modify != nil {
tc.modify(req)
}

err := validateVolumeCreateRequest(req)
if assert.Error(t, err) {
assert.Contains(t, err.Error(), tc.msgPart)
}
})
}
}

// TestVolumeResizeRequest_Struct ensures the resize request struct wiring is correct.
func TestVolumeResizeRequest_Struct(t *testing.T) {
req := VolumeResizeRequest{Capacity: 123456789}
assert.EqualValues(t, 123456789, req.Capacity)
}

// TestVolumeCloneRequest_Struct ensures the clone request struct wiring is correct.
func TestVolumeCloneRequest_Struct(t *testing.T) {
req := VolumeCloneRequest{
NewName:    "clone-01",
TargetPool: "other-pool",
}

assert.Equal(t, "clone-01", req.NewName)
assert.Equal(t, "other-pool", req.TargetPool)
}
