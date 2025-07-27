//go:build linux
// +build linux

package logs

import "os/exec"

// isJournalctlAvailable checks if journalctl is available on the system
func isJournalctlAvailable() bool {
	_, err := exec.LookPath("journalctl")
	return err == nil
}

// getJournalctlPath returns the path to journalctl command
func getJournalctlPath() string {
	return "journalctl"
}
