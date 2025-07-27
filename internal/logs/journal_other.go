//go:build !linux
// +build !linux

package logs

// isJournalctlAvailable always returns false on non-Linux platforms
func isJournalctlAvailable() bool {
	return false
}

// getJournalctlPath returns empty string on non-Linux platforms
func getJournalctlPath() string {
	return ""
}
