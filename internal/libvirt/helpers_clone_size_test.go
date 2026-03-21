package libvirt

import (
	"strings"
	"testing"
)

func TestResolveCloneCapacityBytes(t *testing.T) {
	const gib = uint64(1024 * 1024 * 1024)
	overflowSizeGB := ^uint64(0)/gib + 1

	tests := []struct {
		name            string
		sourceCapacity  uint64
		requestedSizeGB uint64
		wantCapacity    uint64
		wantErrContains string
	}{
		{
			name:            "uses source capacity when size not provided",
			sourceCapacity:  3 * gib,
			requestedSizeGB: 0,
			wantCapacity:    3 * gib,
		},
		{
			name:            "uses requested capacity when larger than source",
			sourceCapacity:  3 * gib,
			requestedSizeGB: 10,
			wantCapacity:    10 * gib,
		},
		{
			name:            "accepts requested capacity equal to source",
			sourceCapacity:  3 * gib,
			requestedSizeGB: 3,
			wantCapacity:    3 * gib,
		},
		{
			name:            "rejects requested capacity smaller than source",
			sourceCapacity:  3 * gib,
			requestedSizeGB: 2,
			wantErrContains: "smaller than source disk size",
		},
		{
			name:            "rejects zero source capacity",
			sourceCapacity:  0,
			requestedSizeGB: 5,
			wantErrContains: "source volume capacity is zero",
		},
		{
			name:            "rejects overflowing requested capacity",
			sourceCapacity:  3 * gib,
			requestedSizeGB: overflowSizeGB,
			wantErrContains: "exceeds supported limit",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := resolveCloneCapacityBytes(tt.sourceCapacity, tt.requestedSizeGB)

			if tt.wantErrContains != "" {
				if err == nil {
					t.Fatalf("expected error containing %q, got nil", tt.wantErrContains)
				}
				if !strings.Contains(err.Error(), tt.wantErrContains) {
					t.Fatalf("expected error containing %q, got %q", tt.wantErrContains, err.Error())
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.wantCapacity {
				t.Fatalf("resolveCloneCapacityBytes(%d, %d) = %d, want %d", tt.sourceCapacity, tt.requestedSizeGB, got, tt.wantCapacity)
			}
		})
	}
}
