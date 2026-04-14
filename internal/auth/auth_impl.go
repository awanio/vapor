package auth

import (
	"bufio"
	"os"
	"strings"

	"github.com/msteinert/pam/v2"
)

// authenticateLinuxUser validates a user against the Linux system
func authenticateLinuxUser(username, password string) bool {
	// First, check if the user exists
	if !userExists(username) {
		return false
	}

	// Authenticate using PAM
	return authenticateWithPAM(username, password)
}

// userExists checks if a user exists in the system
func userExists(username string) bool {
	file, err := os.Open("/etc/passwd")
	if err != nil {
		return false
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, username+":") {
			return true
		}
	}
	return false
}

// authenticateWithPAM authenticates a user via the Linux PAM (Pluggable Authentication Modules) system.
// This replaces the previous su-command based approach with a proper PAM conversation,
// which is more secure, efficient, and doesn't require spawning external processes.
func authenticateWithPAM(username, password string) bool {
	tx, err := pam.StartFunc("login", username, func(s pam.Style, msg string) (string, error) {
		switch s {
		case pam.PromptEchoOff:
			return password, nil
		}
		return "", nil
	})
	if err != nil {
		return false
	}

	if err := tx.Authenticate(0); err != nil {
		return false
	}

	if err := tx.AcctMgmt(0); err != nil {
		return false
	}

	return true
}
