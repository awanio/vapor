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
type Service struct{
	containerSvc ContainerService
}

// NewService creates a new storage service
func NewService() *Service {
	// Determine which container service to use based on available tools
	var containerSvc ContainerService
	
	// Check if nerdctl is available
	if _, err := exec.LookPath("nerdctl"); err == nil {
		containerSvc = NewNerdctlContainerService(&RealCommandExecutor{})
	} else if _, err := exec.LookPath("crictl"); err == nil {
		// Fall back to crictl
		containerSvc = NewContainerService(&RealCommandExecutor{})
	} else {
		// If neither is available, use a mock for development
		containerSvc = NewContainerService(&MockCommandExecutor{})
	}
	
	return &Service{
		containerSvc: containerSvc,
	}
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

// Handler for LVM Volume Groups
func (s *Service) GetVolumeGroups(c *gin.Context) {
    // This is a stub. Implement LVM volume group retrieval logic here
    common.SendSuccess(c, gin.H{"volume_groups": []string{"vg1", "vg2"}})
}

// Handler for LVM Logical Volumes
func (s *Service) GetLogicalVolumes(c *gin.Context) {
    // This is a stub. Implement LVM logical volume retrieval logic here
    common.SendSuccess(c, gin.H{"logical_volumes": []string{"lv1", "lv2"}})
}

// Handler for LVM Physical Volumes
func (s *Service) GetPhysicalVolumes(c *gin.Context) {
    // This is a stub. Implement LVM physical volume retrieval logic here
    common.SendSuccess(c, gin.H{"physical_volumes": []string{"pv1", "pv2"}})
}

// Handler for creating LVM Volume Group
func (s *Service) CreateVolumeGroup(c *gin.Context) {
    // This is a stub. Implement volume group creation logic here
    common.SendSuccess(c, gin.H{"message": "Volume group created successfully"})
}

// Handler for creating LVM Logical Volume
func (s *Service) CreateLogicalVolume(c *gin.Context) {
    // This is a stub. Implement logical volume creation logic here
    common.SendSuccess(c, gin.H{"message": "Logical volume created successfully"})
}

// Handler for discovering iSCSI targets
func (s *Service) DiscoverISCSITargets(c *gin.Context) {
    // This is a stub. Implement discovery logic here
    common.SendSuccess(c, gin.H{"targets": []string{"iqn.2020-01.com.example:target1"}})
}

// Handler for retrieving iSCSI sessions
func (s *Service) GetISCSISessions(c *gin.Context) {
    // This is a stub. Implement session retrieval logic here
    common.SendSuccess(c, gin.H{"sessions": []string{"session1", "session2"}})
}

// Handler for logging into iSCSI target
func (s *Service) LoginISCSI(c *gin.Context) {
    // This is a stub. Implement login logic here
    common.SendSuccess(c, gin.H{"message": "Logged into iSCSI target successfully"})
}

// Handler for logging out from iSCSI target
func (s *Service) LogoutISCSI(c *gin.Context) {
    // This is a stub. Implement logout logic here
    common.SendSuccess(c, gin.H{"message": "Logged out from iSCSI target successfully"})
}

// Handler for retrieving Multipath devices
func (s *Service) GetMultipathDevices(c *gin.Context) {
    // This is a stub. Implement multipath device retrieval logic here
    common.SendSuccess(c, gin.H{"devices": []string{"device1", "device2"}})
}

// Handler for retrieving Multipath paths
func (s *Service) GetMultipathPaths(c *gin.Context) {
    // This is a stub. Implement multipath paths retrieval logic here
    common.SendSuccess(c, gin.H{"paths": []string{"path1", "path2"}})
}

// Handler for retrieving BTRFS subvolumes
func (s *Service) GetBTRFSSubvolumes(c *gin.Context) {
    // This is a stub. Implement BTRFS subvolumes retrieval logic here
    common.SendSuccess(c, gin.H{"subvolumes": []string{"subvol1", "subvol2"}})
}

// Handler for creating BTRFS subvolume
func (s *Service) CreateBTRFSSubvolume(c *gin.Context) {
    // This is a stub. Implement BTRFS subvolume creation logic here
    common.SendSuccess(c, gin.H{"message": "BTRFS subvolume created successfully"})
}

// Handler for deleting BTRFS subvolume
func (s *Service) DeleteBTRFSSubvolume(c *gin.Context) {
    // This is a stub. Implement BTRFS subvolume deletion logic here
    common.SendSuccess(c, gin.H{"message": "BTRFS subvolume deleted successfully"})
}

// Handler for creating BTRFS snapshot
func (s *Service) CreateBTRFSSnapshot(c *gin.Context) {
    // This is a stub. Implement BTRFS snapshot creation logic here
    common.SendSuccess(c, gin.H{"message": "BTRFS snapshot created successfully"})
}

// Handler for listing RAID devices
func (s *Service) GetRAIDDevices(c *gin.Context) {
    // This is a stub. Implement RAID device listing logic here
    common.SendSuccess(c, gin.H{"devices": []RAIDDevice{}})
}

// Handler for getting available disks for RAID
func (s *Service) GetRAIDAvailableDisks(c *gin.Context) {
    // This is a stub. Implement available disks logic here
    availableDisks := []RAIDDisk{
        {Path: "/dev/sda3", Size: 250 * 1024 * 1024 * 1024, Partition: true, Device: "sda3"},
        {Path: "/dev/sdb1", Size: 15 * 1024 * 1024 * 1024, Partition: true, Device: "sdb1"},
        {Path: "/dev/sdb", Size: 500 * 1024 * 1024 * 1024, Partition: false, Device: "sdb"},
    }
    common.SendSuccess(c, gin.H{"disks": availableDisks})
}

// ListContainers handles listing of all containers
func (s *Service) ListContainers(c *gin.Context) {
	containers, err := s.containerSvc.ListContainers()
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list containers", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"containers": containers})
}

// GetContainerDetails handles fetching details of a specific container
func (s *Service) GetContainerDetails(c *gin.Context) {
	containerID := c.Param("id")
	container, err := s.containerSvc.GetContainerDetails(containerID)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get container details", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"container": container})
}

// CreateContainer handles creation of a new container
func (s *Service) CreateContainer(c *gin.Context) {
	var req ContainerCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Invalid request", err.Error())
		return
	}

	container, err := s.containerSvc.CreateContainer(req)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to create container", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"container": container})
}

// StartContainer handles starting a container
func (s *Service) StartContainer(c *gin.Context) {
	containerID := c.Param("id")
	if err := s.containerSvc.StartContainer(containerID); err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to start container", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"message": "Container started successfully"})
}

// StopContainer handles stopping a container
func (s *Service) StopContainer(c *gin.Context) {
	containerID := c.Param("id")
	var req ContainerActionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Invalid request", err.Error())
		return
	}

	if err := s.containerSvc.StopContainer(containerID, req.Timeout); err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to stop container", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"message": "Container stopped successfully"})
}

// RestartContainer handles restarting a container
func (s *Service) RestartContainer(c *gin.Context) {
	containerID := c.Param("id")
	if err := s.containerSvc.RestartContainer(containerID); err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to restart container", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"message": "Container restarted successfully"})
}

// RemoveContainer handles removing a container
func (s *Service) RemoveContainer(c *gin.Context) {
	containerID := c.Param("id")
	if err := s.containerSvc.RemoveContainer(containerID); err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to remove container", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"message": "Container removed successfully"})
}

// GetContainerLogs handles fetching logs of a container
func (s *Service) GetContainerLogs(c *gin.Context) {
	containerID := c.Param("id")
	var req ContainerLogsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Invalid request", err.Error())
		return
	}

	logs, err := s.containerSvc.GetContainerLogs(containerID, req)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get container logs", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"logs": logs})
}

// ListImages handles listing of container images
func (s *Service) ListImages(c *gin.Context) {
	images, err := s.containerSvc.ListImages()
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list images", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"images": images})
}

// GetImageDetails handles fetching details of a specific image
func (s *Service) GetImageDetails(c *gin.Context) {
	imageID := c.Param("id")
	image, err := s.containerSvc.GetImageDetails(imageID)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get image details", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"image": image})
}

// PullImage handles pulling a container image
func (s *Service) PullImage(c *gin.Context) {
	var req struct {
		ImageName string `json:"image_name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Invalid request", err.Error())
		return
	}

	if err := s.containerSvc.PullImage(req.ImageName); err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to pull image", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"message": "Image pulled successfully"})
}

// RemoveImage handles removing a container image
func (s *Service) RemoveImage(c *gin.Context) {
	imageID := c.Param("id")
	if err := s.containerSvc.RemoveImage(imageID); err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to remove image", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"message": "Image removed successfully"})
}



// Handler for creating RAID device
func (s *Service) CreateRAIDDevice(c *gin.Context) {
    var req CreateRAIDRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Invalid request", err.Error())
        return
    }

    // Validate minimum disk requirements based on RAID level
    minDisks := map[string]int{
        "0": 2,
        "1": 2,
        "5": 3,
        "6": 4,
        "10": 4,
    }

    if min, ok := minDisks[req.Level]; ok && len(req.Disks) < min {
        common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
            fmt.Sprintf("RAID %s requires at least %d disks", req.Level, min))
        return
    }

    // Set default chunk size if not specified
    chunkSize := req.ChunkSize
    if chunkSize == "" {
        chunkSize = "512K"
    }

    // This is a stub. In production, you would use the RAIDService here
    common.SendSuccess(c, gin.H{"message": fmt.Sprintf("RAID device %s created successfully", req.Name)})
}

// Handler for destroying RAID device
func (s *Service) DestroyRAIDDevice(c *gin.Context) {
    var req DestroyRAIDRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Invalid request", err.Error())
        return
    }

    // This is a stub. Implement RAID device destruction logic here
    common.SendSuccess(c, gin.H{"message": fmt.Sprintf("RAID device %s destroyed successfully", req.Device)})
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
