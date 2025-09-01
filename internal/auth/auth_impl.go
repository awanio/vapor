package auth

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"strings"
)

// authenticateLinuxUser validates a user against the Linux system
func authenticateLinuxUser(username, password string) bool {
	// First, check if the user exists
	if !userExists(username) {
		return false
	}

	// Use a simple approach that works without root access
	// Try to authenticate using the 'su' command
	return authenticateWithSu(username, password)
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

// authenticateWithSu tries to authenticate using the su command
func authenticateWithSu(username, password string) bool {
	// Use 'su' with a simple command to test authentication
	// The -c flag runs a command, and we just echo a success message
	cmd := exec.Command("su", "-", username, "-c", "echo auth_success")

	// Create pipes for stdin and stdout
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return false
	}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return false
	}

	// Start the command
	if err := cmd.Start(); err != nil {
		return false
	}

	// Write the password to stdin
	fmt.Fprintf(stdin, "%s\n", password)
	stdin.Close()

	// Read the output
	scanner := bufio.NewScanner(stdout)
	var output string
	if scanner.Scan() {
		output = scanner.Text()
	}

	// Wait for the command to complete
	err = cmd.Wait()

	// Check if authentication was successful
	// If authentication succeeds, su will execute the command and output "auth_success"
	// If it fails, su will exit with an error
	return err == nil && strings.TrimSpace(output) == "auth_success"
}
