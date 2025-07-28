package storage

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
)

// LVMService handles LVM operations
type LVMService struct {
	executor CommandExecutor
}

// NewLVMService creates a new LVM service
func NewLVMService(executor CommandExecutor) *LVMService {
	return &LVMService{executor: executor}
}

// GetVolumeGroups returns all volume groups
func (s *LVMService) GetVolumeGroups() ([]VolumeGroup, error) {
	// Use vgs command with JSON output
	output, err := s.executor.Execute("vgs", "--reportformat", "json", "--units", "b", "--nosuffix")
	if err != nil {
		return nil, fmt.Errorf("failed to get volume groups: %w", err)
	}

	var result struct {
		Report []struct {
			VG []struct {
				VGName   string `json:"vg_name"`
				VGUUID   string `json:"vg_uuid"`
				VGSize   string `json:"vg_size"`
				VGFree   string `json:"vg_free"`
				PVCount  string `json:"pv_count"`
				LVCount  string `json:"lv_count"`
				VGTags   string `json:"vg_tags"`
			} `json:"vg"`
		} `json:"report"`
	}

	if err := json.Unmarshal(output, &result); err != nil {
		return nil, fmt.Errorf("failed to parse vgs output: %w", err)
	}

	vgs := make([]VolumeGroup, 0)
	for _, report := range result.Report {
		for _, vg := range report.VG {
			size, _ := strconv.ParseUint(vg.VGSize, 10, 64)
			free, _ := strconv.ParseUint(vg.VGFree, 10, 64)
			pvCount, _ := strconv.Atoi(vg.PVCount)
			lvCount, _ := strconv.Atoi(vg.LVCount)

			volumeGroup := VolumeGroup{
				Name:    vg.VGName,
				UUID:    vg.VGUUID,
				Size:    size,
				Free:    free,
				PVCount: pvCount,
				LVCount: lvCount,
				VGTags:  vg.VGTags,
			}

			// Get logical volumes for this VG
			lvs, _ := s.GetLogicalVolumes(vg.VGName)
			volumeGroup.Volumes = lvs

			vgs = append(vgs, volumeGroup)
		}
	}

	return vgs, nil
}

// GetLogicalVolumes returns logical volumes for a volume group
func (s *LVMService) GetLogicalVolumes(vgName string) ([]LogicalVolume, error) {
	args := []string{"--reportformat", "json", "--units", "b", "--nosuffix"}
	if vgName != "" {
		args = append(args, vgName)
	}

	output, err := s.executor.Execute("lvs", args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get logical volumes: %w", err)
	}

	var result struct {
		Report []struct {
			LV []struct {
				LVName   string `json:"lv_name"`
				VGName   string `json:"vg_name"`
				LVUUID   string `json:"lv_uuid"`
				LVSize   string `json:"lv_size"`
				LVPath   string `json:"lv_path"`
				LVTags   string `json:"lv_tags"`
				LVActive string `json:"lv_active"`
			} `json:"lv"`
		} `json:"report"`
	}

	if err := json.Unmarshal(output, &result); err != nil {
		return nil, fmt.Errorf("failed to parse lvs output: %w", err)
	}

	lvs := make([]LogicalVolume, 0)
	for _, report := range result.Report {
		for _, lv := range report.LV {
			size, _ := strconv.ParseUint(lv.LVSize, 10, 64)
			
			logicalVolume := LogicalVolume{
				Name:       lv.LVName,
				VGName:     lv.VGName,
				UUID:       lv.LVUUID,
				Size:       size,
				LVPath:     lv.LVPath,
				LVTags:     lv.LVTags,
				Active:     lv.LVActive == "active",
				DevicePath: fmt.Sprintf("/dev/%s/%s", lv.VGName, lv.LVName),
			}

			lvs = append(lvs, logicalVolume)
		}
	}

	return lvs, nil
}

// GetPhysicalVolumes returns all physical volumes
func (s *LVMService) GetPhysicalVolumes() ([]PhysicalVolume, error) {
	output, err := s.executor.Execute("pvs", "--reportformat", "json", "--units", "b", "--nosuffix")
	if err != nil {
		return nil, fmt.Errorf("failed to get physical volumes: %w", err)
	}

	var result struct {
		Report []struct {
			PV []struct {
				PVName string `json:"pv_name"`
				VGName string `json:"vg_name"`
				PVUUID string `json:"pv_uuid"`
				PVSize string `json:"pv_size"`
				PVFree string `json:"pv_free"`
			} `json:"pv"`
		} `json:"report"`
	}

	if err := json.Unmarshal(output, &result); err != nil {
		return nil, fmt.Errorf("failed to parse pvs output: %w", err)
	}

	pvs := make([]PhysicalVolume, 0)
	for _, report := range result.Report {
		for _, pv := range report.PV {
			size, _ := strconv.ParseUint(pv.PVSize, 10, 64)
			free, _ := strconv.ParseUint(pv.PVFree, 10, 64)

			physicalVolume := PhysicalVolume{
				Name:    pv.PVName,
				VGName:  pv.VGName,
				UUID:    pv.PVUUID,
				Size:    size,
				Free:    free,
				DevPath: pv.PVName,
			}

			pvs = append(pvs, physicalVolume)
		}
	}

	return pvs, nil
}

// CreateVolumeGroup creates a new volume group
func (s *LVMService) CreateVolumeGroup(name string, devices []string) error {
	// First create physical volumes
	for _, device := range devices {
		if _, err := s.executor.Execute("pvcreate", device); err != nil {
			return fmt.Errorf("failed to create physical volume on %s: %w", device, err)
		}
	}

	// Create volume group
	args := append([]string{name}, devices...)
	if _, err := s.executor.Execute("vgcreate", args...); err != nil {
		return fmt.Errorf("failed to create volume group: %w", err)
	}

	return nil
}

// CreateLogicalVolume creates a new logical volume
func (s *LVMService) CreateLogicalVolume(vgName, lvName, size string) error {
	args := []string{"-n", lvName, "-L", size, vgName}
	
	if _, err := s.executor.Execute("lvcreate", args...); err != nil {
		return fmt.Errorf("failed to create logical volume: %w", err)
	}

	return nil
}

// ResizeLogicalVolume resizes a logical volume
func (s *LVMService) ResizeLogicalVolume(vgName, lvName, size string) error {
	lvPath := fmt.Sprintf("/dev/%s/%s", vgName, lvName)
	args := []string{"-L", size, lvPath}
	
	// Check if we need to resize filesystem first (for shrinking)
	if strings.HasPrefix(size, "-") {
		// For shrinking, we need to resize filesystem first
		// This is simplified - in production, you'd need to check filesystem type
		// and handle each appropriately
		if _, err := s.executor.Execute("resize2fs", lvPath); err != nil {
			// Try xfs_growfs for XFS
			s.executor.Execute("xfs_growfs", lvPath)
		}
	}

	if _, err := s.executor.Execute("lvresize", args...); err != nil {
		return fmt.Errorf("failed to resize logical volume: %w", err)
	}

	// For growing, resize filesystem after
	if !strings.HasPrefix(size, "-") {
		if _, err := s.executor.Execute("resize2fs", lvPath); err != nil {
			// Try xfs_growfs for XFS
			s.executor.Execute("xfs_growfs", lvPath)
		}
	}

	return nil
}

// RemoveLogicalVolume removes a logical volume
func (s *LVMService) RemoveLogicalVolume(vgName, lvName string) error {
	lvPath := fmt.Sprintf("/dev/%s/%s", vgName, lvName)
	
	if _, err := s.executor.Execute("lvremove", "-f", lvPath); err != nil {
		return fmt.Errorf("failed to remove logical volume: %w", err)
	}

	return nil
}

// RemoveVolumeGroup removes a volume group
func (s *LVMService) RemoveVolumeGroup(name string) error {
	if _, err := s.executor.Execute("vgremove", "-f", name); err != nil {
		return fmt.Errorf("failed to remove volume group: %w", err)
	}

	return nil
}
