package storage

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/vapor/system-api/internal/common"
	"github.com/shirou/gopsutil/v3/disk"
)

// Service handles storage operations
type Service struct{}

// NewService creates a new storage service
func NewService() *Service {
	return &Service{}
}

// Disk represents a storage disk
type Disk struct {
	Name        string       `json:"name"`
	Path        string       `json:"path"`
	Size        uint64       `json:"size"`
	Model       string       `json:"model"`
	Serial      string       `json:"serial"`
	Type        string       `json:"type"`
	Removable   bool         `json:"removable"`
	Partitions  []Partition  `json:"partitions"`
}

// Partition represents a disk partition
type Partition struct {
	Name       string  `json:"name"`
	Path       string  `json:"path"`
	Size       uint64  `json:"size"`
	Type       string  `json:"type"`
	FileSystem string  `json:"filesystem"`
	MountPoint string  `json:"mount_point"`
	Used       uint64  `json:"used"`
	Available  uint64  `json:"available"`
	UsePercent float64 `json:"use_percent"`
}

// MountRequest represents mount request
type MountRequest struct {
	Device     string `json:"device" binding:"required"`
	MountPoint string `json:"mount_point" binding:"required"`
	FileSystem string `json:"filesystem"`
	Options    string `json:"options"`
}

// UnmountRequest represents unmount request
type UnmountRequest struct {
	MountPoint string `json:"mount_point" binding:"required"`
	Force      bool   `json:"force"`
}

// FormatRequest represents format request
type FormatRequest struct {
	Device     string `json:"device" binding:"required"`
	FileSystem string `json:"filesystem" binding:"required,oneof=ext4 ext3 ext2 xfs btrfs"`
	Label      string `json:"label"`
}

// GetDisks returns all storage disks
func (s *Service) GetDisks(c *gin.Context) {
	disks, err := s.listDisks()
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list disks", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{"disks": disks})
}

// Mount mounts a filesystem
func (s *Service) Mount(c *gin.Context) {
	var req MountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Invalid request", err.Error())
		return
	}

	// Check if device exists
	if _, err := os.Stat(req.Device); err != nil {
		common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "Device not found", err.Error())
		return
	}

	// Create mount point if it doesn't exist
	if err := os.MkdirAll(req.MountPoint, 0755); err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to create mount point", err.Error())
		return
	}

	// Build mount command
	args := []string{req.Device, req.MountPoint}
	
	if req.FileSystem != "" {
		args = append([]string{"-t", req.FileSystem}, args...)
	}
	
	if req.Options != "" {
		args = append([]string{"-o", req.Options}, args...)
	}

	// Execute mount
	cmd := exec.Command("mount", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to mount", string(output))
		return
	}

	common.SendSuccess(c, gin.H{"message": fmt.Sprintf("Successfully mounted %s to %s", req.Device, req.MountPoint)})
}

// Unmount unmounts a filesystem
func (s *Service) Unmount(c *gin.Context) {
	var req UnmountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Invalid request", err.Error())
		return
	}

	// Build unmount command
	args := []string{req.MountPoint}
	if req.Force {
		args = append([]string{"-f"}, args...)
	}

	// Execute unmount
	cmd := exec.Command("umount", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to unmount", string(output))
		return
	}

	common.SendSuccess(c, gin.H{"message": fmt.Sprintf("Successfully unmounted %s", req.MountPoint)})
}

// Format formats a disk with specified filesystem
func (s *Service) Format(c *gin.Context) {
	var req FormatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Invalid request", err.Error())
		return
	}

	// Check if device exists
	if _, err := os.Stat(req.Device); err != nil {
		common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "Device not found", err.Error())
		return
	}

	// Check if device is mounted
	mounts, _ := disk.Partitions(false)
	for _, mount := range mounts {
		if mount.Device == req.Device {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Device is mounted. Please unmount before formatting.")
			return
		}
	}

	// Build format command based on filesystem
	var cmd *exec.Cmd
	switch req.FileSystem {
	case "ext4", "ext3", "ext2":
		args := []string{"-F", req.Device}
		if req.Label != "" {
			args = append([]string{"-L", req.Label}, args...)
		}
		cmd = exec.Command(fmt.Sprintf("mkfs.%s", req.FileSystem), args...)
	case "xfs":
		args := []string{"-f", req.Device}
		if req.Label != "" {
			args = append([]string{"-L", req.Label}, args...)
		}
		cmd = exec.Command("mkfs.xfs", args...)
	case "btrfs":
		args := []string{"-f", req.Device}
		if req.Label != "" {
			args = append([]string{"-L", req.Label}, args...)
		}
		cmd = exec.Command("mkfs.btrfs", args...)
	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Unsupported filesystem")
		return
	}

	// Execute format
	output, err := cmd.CombinedOutput()
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to format", string(output))
		return
	}

	common.SendSuccess(c, gin.H{"message": fmt.Sprintf("Successfully formatted %s as %s", req.Device, req.FileSystem)})
}

// listDisks lists all block devices
func (s *Service) listDisks() ([]Disk, error) {
	// Use lsblk to get disk information
	cmd := exec.Command("lsblk", "-J", "-o", "NAME,PATH,SIZE,TYPE,RM,MODEL,SERIAL,FSTYPE,MOUNTPOINT")
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	var lsblkOutput struct {
		BlockDevices []lsblkDevice `json:"blockdevices"`
	}

	if err := json.Unmarshal(output, &lsblkOutput); err != nil {
		return nil, err
	}

	disks := make([]Disk, 0)
	for _, device := range lsblkOutput.BlockDevices {
		if device.Type == "disk" {
			disk := s.lsblkToDisk(device)
			disks = append(disks, disk)
		}
	}

	// Get usage information for mounted partitions
	partitions, _ := disk.Partitions(false)
	for i := range disks {
		for j := range disks[i].Partitions {
			for _, part := range partitions {
				if disks[i].Partitions[j].Path == part.Device {
					if usage, err := disk.Usage(part.Mountpoint); err == nil {
						disks[i].Partitions[j].Used = usage.Used
						disks[i].Partitions[j].Available = usage.Free
						disks[i].Partitions[j].UsePercent = usage.UsedPercent
					}
				}
			}
		}
	}

	return disks, nil
}

// lsblkDevice represents lsblk JSON output
type lsblkDevice struct {
	Name       string        `json:"name"`
	Path       string        `json:"path"`
	Size       string        `json:"size"`
	Type       string        `json:"type"`
	Removable  string        `json:"rm"`
	Model      string        `json:"model"`
	Serial     string        `json:"serial"`
	FSType     string        `json:"fstype"`
	MountPoint string        `json:"mountpoint"`
	Children   []lsblkDevice `json:"children"`
}

// lsblkToDisk converts lsblk device to Disk
func (s *Service) lsblkToDisk(device lsblkDevice) Disk {
	disk := Disk{
		Name:      device.Name,
		Path:      device.Path,
		Size:      s.parseSize(device.Size),
		Model:     strings.TrimSpace(device.Model),
		Serial:    strings.TrimSpace(device.Serial),
		Type:      device.Type,
		Removable: device.Removable == "1",
	}

	// Add partitions
	disk.Partitions = make([]Partition, 0, len(device.Children))
	for _, child := range device.Children {
		if child.Type == "part" {
			partition := Partition{
				Name:       child.Name,
				Path:       child.Path,
				Size:       s.parseSize(child.Size),
				Type:       child.Type,
				FileSystem: child.FSType,
				MountPoint: child.MountPoint,
			}
			disk.Partitions = append(disk.Partitions, partition)
		}
	}

	return disk
}

// parseSize parses size string from lsblk (e.g., "238.5G") to bytes
func (s *Service) parseSize(sizeStr string) uint64 {
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
	case "P", "PB":
		multiplier = 1024 * 1024 * 1024 * 1024 * 1024
	}

	return uint64(value * float64(multiplier))
}

// getBlockDevices reads block devices from /sys/block
func (s *Service) getBlockDevices() ([]string, error) {
	devices := []string{}
	
	entries, err := os.ReadDir("/sys/block")
	if err != nil {
		return nil, err
	}

	for _, entry := range entries {
		// Skip loop devices and ram disks
		name := entry.Name()
		if strings.HasPrefix(name, "loop") || strings.HasPrefix(name, "ram") {
			continue
		}
		
		devicePath := filepath.Join("/dev", name)
		if _, err := os.Stat(devicePath); err == nil {
			devices = append(devices, name)
		}
	}

	return devices, nil
}

// readSysFile reads a single line from a sysfs file
func (s *Service) readSysFile(path string) string {
	file, err := os.Open(path)
	if err != nil {
		return ""
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	if scanner.Scan() {
		return strings.TrimSpace(scanner.Text())
	}
	return ""
}
