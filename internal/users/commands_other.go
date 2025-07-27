//go:build !linux
// +build !linux

package users

// getUserCommands returns empty commands on non-Linux platforms
func getUserCommands() (useradd, usermod, userdel string) {
	return "", "", ""
}

// isUserCommandsAvailable always returns false on non-Linux platforms
func isUserCommandsAvailable() bool {
	return false
}

// getPasswordFile returns empty string on non-Linux platforms
func getPasswordFile() string {
	return ""
}
