//go:build !linux
// +build !linux

package auth

// authenticateLinuxUser is a stub for non-Linux platforms
func authenticateLinuxUser(username, password string) bool {
	// On non-Linux platforms, we can't authenticate against the system
	// Return false to indicate authentication failure
	return false
}
