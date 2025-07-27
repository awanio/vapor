//go:build linux
// +build linux

package storage

// getPlatformSpecificMountOptions returns Linux-specific mount options
func getPlatformSpecificMountOptions() []string {
	return []string{
		"rw", "noatime", "nodiratime",
	}
}

// isCommandAvailable checks if a command is available on Linux
func isCommandAvailable(command string) bool {
	// On Linux, we rely on standard utilities
	switch command {
	case "lsblk", "mount", "umount", "mkfs.ext4", "mkfs.xfs", "mkfs.btrfs":
		return true
	default:
		return false
	}
}
