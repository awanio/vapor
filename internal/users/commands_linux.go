//go:build linux
// +build linux

package users

import "os/exec"

// getUserCommands returns the commands available for user management on Linux
func getUserCommands() (useradd, usermod, userdel string) {
	return "useradd", "usermod", "userdel"
}

// isUserCommandsAvailable checks if user management commands are available
func isUserCommandsAvailable() bool {
	commands := []string{"useradd", "usermod", "userdel"}
	for _, cmd := range commands {
		if _, err := exec.LookPath(cmd); err != nil {
			return false
		}
	}
	return true
}

// getPasswordFile returns the path to the password file
func getPasswordFile() string {
	return "/etc/passwd"
}
