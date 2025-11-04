package network

import (
	"bufio"
	"os"
	"os/exec"
	"strconv"
	"strings"
)

// DetectNetworkBackend automatically detects the appropriate network backend
// based on the operating system and installed network management tools
func DetectNetworkBackend() NetworkBackendType {
	osRelease := readOSRelease()

	// Check for RHEL 8+, Rocky, AlmaLinux, Fedora - prefer NetworkManager
	if isRHEL8Plus(osRelease) || isFedora(osRelease) {
		if hasNetworkManager() {
			return BackendNetworkManager
		}
	}

	// Check for RHEL/CentOS 7 - network-scripts
	if isRHEL7(osRelease) {
		if _, err := os.Stat("/etc/sysconfig/network-scripts"); err == nil {
			return BackendNetworkScripts
		}
	}

	// Check for Ubuntu/Debian - netplan
	if _, err := os.Stat("/etc/netplan"); err == nil {
		// Verify netplan is actually installed
		if _, err := exec.LookPath("netplan"); err == nil {
			return BackendNetplan
		}
	}

	// Check for Debian/Ubuntu old - ifupdown
	if _, err := os.Stat("/etc/network/interfaces"); err == nil {
		return BackendIfupdown
	}

	// No backend detected
	return BackendNone
}

// readOSRelease reads and parses /etc/os-release file
func readOSRelease() map[string]string {
	result := make(map[string]string)

	file, err := os.Open("/etc/os-release")
	if err != nil {
		// Try alternative location
		file, err = os.Open("/usr/lib/os-release")
		if err != nil {
			return result
		}
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}

		key := parts[0]
		value := strings.Trim(parts[1], "\"")
		result[key] = value
	}

	return result
}

// isRHEL8Plus checks if the system is RHEL 8+, Rocky, or AlmaLinux
func isRHEL8Plus(osRelease map[string]string) bool {
	id := strings.ToLower(osRelease["ID"])
	idLike := strings.ToLower(osRelease["ID_LIKE"])
	versionID := osRelease["VERSION_ID"]

	// Check for Rocky Linux or AlmaLinux
	if id == "rocky" || id == "almalinux" {
		return true
	}

	// Check for RHEL 8+
	if id == "rhel" || strings.Contains(idLike, "rhel") {
		if versionID != "" {
			// Parse major version
			parts := strings.Split(versionID, ".")
			if len(parts) > 0 {
				major, err := strconv.Atoi(parts[0])
				if err == nil && major >= 8 {
					return true
				}
			}
		}
	}

	// Check for CentOS 8+ (Stream or regular)
	if id == "centos" || strings.Contains(idLike, "centos") {
		if versionID != "" {
			parts := strings.Split(versionID, ".")
			if len(parts) > 0 {
				major, err := strconv.Atoi(parts[0])
				if err == nil && major >= 8 {
					return true
				}
			}
		}
	}

	return false
}

// isRHEL7 checks if the system is RHEL 7 or CentOS 7
func isRHEL7(osRelease map[string]string) bool {
	id := strings.ToLower(osRelease["ID"])
	idLike := strings.ToLower(osRelease["ID_LIKE"])
	versionID := osRelease["VERSION_ID"]

	// Check for RHEL/CentOS 7
	if id == "rhel" || id == "centos" || strings.Contains(idLike, "rhel") || strings.Contains(idLike, "centos") {
		if strings.HasPrefix(versionID, "7.") || versionID == "7" {
			return true
		}
	}

	return false
}

// isFedora checks if the system is Fedora
func isFedora(osRelease map[string]string) bool {
	id := strings.ToLower(osRelease["ID"])
	return id == "fedora"
}

// hasNetworkManager checks if NetworkManager is installed and running
func hasNetworkManager() bool {
	// Check if systemctl is available
	if !hasSystemd() {
		return false
	}

	// Check if NetworkManager is active
	cmd := exec.Command("systemctl", "is-active", "NetworkManager")
	err := cmd.Run()
	return err == nil
}

// hasSystemd checks if systemd is available
func hasSystemd() bool {
	_, err := exec.LookPath("systemctl")
	return err == nil
}
