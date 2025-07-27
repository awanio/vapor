//go:build !linux
// +build !linux

package storage

// getPlatformSpecificMountOptions returns empty options for non-Linux platforms
func getPlatformSpecificMountOptions() []string {
	return []string{}
}

// isCommandAvailable always returns false on non-Linux platforms
func isCommandAvailable(command string) bool {
	return false
}
