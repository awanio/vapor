package storage

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
)

// RAIDService handles RAID operations
type RAIDService struct {
	executor CommandExecutor
}

// NewRAIDService creates a new RAID service
func NewRAIDService(executor CommandExecutor) *RAIDService {
	return &RAIDService{executor: executor}
}

// ListRAIDDevices lists all RAID arrays
func (s *RAIDService) ListRAIDDevices() ([]RAIDDevice, error) {
	// Use mdadm --detail --scan to get list of arrays
	output, err := s.executor.Execute("mdadm", "--detail", "--scan")
	if err != nil {
		// If no arrays exist, mdadm might return an error
		return []RAIDDevice{}, nil
	}

	devices := []RAIDDevice{}
	lines := strings.Split(string(output), "\n")
	
	for _, line := range lines {
		if strings.HasPrefix(line, "ARRAY") {
			// Parse the array line to get device path
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				devicePath := parts[1]
				
				// Get detailed info for this device
				if device, err := s.getRAIDDeviceDetails(devicePath); err == nil {
					devices = append(devices, device)
				}
			}
		}
	}

	return devices, nil
}

// GetRAIDDeviceDetails gets detailed information about a specific RAID device
func (s *RAIDService) getRAIDDeviceDetails(devicePath string) (RAIDDevice, error) {
	output, err := s.executor.Execute("mdadm", "--detail", devicePath)
	if err != nil {
		return RAIDDevice{}, fmt.Errorf("failed to get RAID device details: %w", err)
	}

	device := RAIDDevice{
		Path:    devicePath,
		Devices: []string{},
	}

	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		
		if strings.Contains(line, "Raid Level :") {
			device.Level = strings.TrimSpace(strings.Split(line, ":")[1])
		} else if strings.Contains(line, "Array Size :") {
			sizeStr := strings.Fields(strings.Split(line, ":")[1])[0]
			if size, err := strconv.ParseUint(sizeStr, 10, 64); err == nil {
				device.Size = size * 1024 // Convert to bytes
			}
		} else if strings.Contains(line, "State :") {
			device.State = strings.TrimSpace(strings.Split(line, ":")[1])
		} else if strings.Contains(line, "Name :") {
			nameParts := strings.Split(line, ":")
			if len(nameParts) >= 2 {
				// Extract just the array name (e.g., "md0" from "hostname:md0")
				fullName := strings.TrimSpace(nameParts[1])
				if parts := strings.Split(fullName, ":"); len(parts) > 1 {
					device.Name = parts[len(parts)-1]
				} else {
					device.Name = fullName
				}
			}
		} else if strings.Contains(line, "UUID :") {
			device.UUID = strings.TrimSpace(strings.Split(line, ":")[1])
		} else if strings.Contains(line, "Chunk Size :") {
			device.ChunkSize = strings.TrimSpace(strings.Split(line, ":")[1])
		} else if strings.Contains(line, "Raid Devices :") {
			if total, err := strconv.Atoi(strings.TrimSpace(strings.Split(line, ":")[1])); err == nil {
				device.TotalDisks = total
			}
		} else if strings.Contains(line, "Active Devices :") {
			if active, err := strconv.Atoi(strings.TrimSpace(strings.Split(line, ":")[1])); err == nil {
				device.ActiveDisks = active
			}
		} else if strings.Contains(line, "/dev/") && strings.Contains(line, "active sync") {
			// This is a device line
			fields := strings.Fields(line)
			for _, field := range fields {
				if strings.HasPrefix(field, "/dev/") {
					device.Devices = append(device.Devices, field)
					break
				}
			}
		}
	}

	return device, nil
}

// CreateRAID creates a new RAID array
func (s *RAIDService) CreateRAID(name string, level string, disks []string, chunkSize string) error {
	// Validate inputs
	if name == "" {
		return fmt.Errorf("RAID name is required")
	}
	
	// Build the mdadm command
	args := []string{"--create", "/dev/md/" + name, "--level=" + level, "--raid-devices=" + strconv.Itoa(len(disks))}
	
	// Add chunk size if specified
	if chunkSize != "" {
		args = append(args, "--chunk="+chunkSize)
	}
	
	// Add the disks
	args = append(args, disks...)
	
	// Add --run to avoid confirmation prompt
	args = append(args, "--run")
	
	// Execute mdadm
	output, err := s.executor.Execute("mdadm", args...)
	if err != nil {
		return fmt.Errorf("failed to create RAID array: %w\nOutput: %s", err, string(output))
	}

	return nil
}

// DestroyRAID stops and removes a RAID array
func (s *RAIDService) DestroyRAID(device string) error {
	// First, stop the array
	if _, err := s.executor.Execute("mdadm", "--stop", device); err != nil {
		return fmt.Errorf("failed to stop RAID array: %w", err)
	}

	// Remove the array
	if _, err := s.executor.Execute("mdadm", "--remove", device); err != nil {
		// This might fail if the device is already removed, which is okay
	}

	// Zero the superblocks on member devices to clean them up
	// This would require getting the member devices first
	
	return nil
}

// GetAvailableDisks returns disks that can be used for RAID
func (s *RAIDService) GetAvailableDisks() ([]RAIDDisk, error) {
	// Use lsblk to get block devices
	output, err := s.executor.Execute("lsblk", "-J", "-o", "NAME,PATH,SIZE,TYPE,FSTYPE,MOUNTPOINT,PARTTYPE")
	if err != nil {
		return nil, fmt.Errorf("failed to list block devices: %w", err)
	}

	var lsblkOutput struct {
		BlockDevices []struct {
			Name       string `json:"name"`
			Path       string `json:"path"`
			Size       string `json:"size"`
			Type       string `json:"type"`
			FSType     *string `json:"fstype"`
			MountPoint *string `json:"mountpoint"`
			PartType   *string `json:"parttype"`
			Children   []struct {
				Name       string `json:"name"`
				Path       string `json:"path"`
				Size       string `json:"size"`
				Type       string `json:"type"`
				FSType     *string `json:"fstype"`
				MountPoint *string `json:"mountpoint"`
				PartType   *string `json:"parttype"`
			} `json:"children"`
		} `json:"blockdevices"`
	}

	if err := json.Unmarshal(output, &lsblkOutput); err != nil {
		return nil, fmt.Errorf("failed to parse lsblk output: %w", err)
	}

	availableDisks := []RAIDDisk{}

	// Check each device and its partitions
	for _, device := range lsblkOutput.BlockDevices {
		// Check if main device is suitable
		if s.isDiskSuitableForRAID(device.Path, device.FSType, device.MountPoint) {
			disk := RAIDDisk{
				Path:      device.Path,
				Size:      s.parseSizeString(device.Size),
				Partition: false,
				Device:    device.Name,
			}
			availableDisks = append(availableDisks, disk)
		}

		// Check partitions
		for _, child := range device.Children {
			if child.Type == "part" && s.isDiskSuitableForRAID(child.Path, child.FSType, child.MountPoint) {
				disk := RAIDDisk{
					Path:      child.Path,
					Size:      s.parseSizeString(child.Size),
					Partition: true,
					Device:    child.Name,
				}
				availableDisks = append(availableDisks, disk)
			}
		}
	}

	return availableDisks, nil
}

// isDiskSuitableForRAID checks if a disk/partition can be used for RAID
func (s *RAIDService) isDiskSuitableForRAID(path string, fstype *string, mountpoint *string) bool {
	// Skip if already has a filesystem
	if fstype != nil && *fstype != "" {
		return false
	}
	
	// Skip if mounted
	if mountpoint != nil && *mountpoint != "" {
		return false
	}
	
	// Check if already part of a RAID array
	output, err := s.executor.Execute("mdadm", "--examine", path)
	if err == nil && strings.Contains(string(output), "UUID") {
		// Already has RAID metadata
		return false
	}
	
	return true
}

// parseSizeString converts size strings like "1G", "500M" to bytes
func (s *RAIDService) parseSizeString(sizeStr string) uint64 {
	if sizeStr == "" {
		return 0
	}

	// Remove any spaces
	sizeStr = strings.TrimSpace(sizeStr)

	// Extract numeric part and unit
	var value float64
	var unit string

	for i, ch := range sizeStr {
		if (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') {
			valueStr := sizeStr[:i]
			unit = sizeStr[i:]
			value, _ = strconv.ParseFloat(valueStr, 64)
			break
		}
	}

	// Convert to bytes based on unit
	multiplier := uint64(1)
	switch strings.ToUpper(unit) {
	case "K", "KB":
		multiplier = 1024
	case "M", "MB":
		multiplier = 1024 * 1024
	case "G", "GB":
		multiplier = 1024 * 1024 * 1024
	case "T", "TB":
		multiplier = 1024 * 1024 * 1024 * 1024
	}

	return uint64(value * float64(multiplier))
}
