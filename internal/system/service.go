package system

import (
	"runtime"

	"github.com/gin-gonic/gin"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/load"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/net"
	"github.com/awanio/vapor/internal/common"
)

// Service handles system operations
type Service struct{}

// NewService creates a new system service
func NewService() *Service {
	return &Service{}
}

// GetSummary returns system summary
func (s *Service) GetSummary(c *gin.Context) {
	info, _ := host.Info()
	uptime, _ := host.Uptime()
	platform, family, version, _ := host.PlatformInformation()

	response := gin.H{
		"hostname":             info.Hostname,
		"os":                   info.OS,
		"platform":             platform,
		"platform_family":      family,
		"platform_version":     version,
		"kernel_version":       info.KernelVersion,
		"uptime":               uptime,
		"boot_time":            info.BootTime,
		"cpu_count":            runtime.NumCPU(),
	}

	common.SendSuccess(c, response)
}

// GetHardware returns hardware information
func (s *Service) GetHardware(c *gin.Context) {
	info, _ := host.Info()

	response := gin.H{
		"hostname":         info.Hostname,
		"architecture":     info.KernelArch,
		"virtualization":   info.VirtualizationSystem,
		"role":             info.VirtualizationRole,
		"kernel_version":   info.KernelVersion,
	}

	common.SendSuccess(c, response)
}

// GetCPU returns CPU information
func (s *Service) GetCPU(c *gin.Context) {
	cpuInfo, _ := cpu.Info()
	loadAvg, _ := load.Avg()

	response := gin.H{
		"model_name":         cpuInfo[0].ModelName,
		"cores":              cpuInfo[0].Cores,
		"load1":              loadAvg.Load1,
		"load5":              loadAvg.Load5,
		"load15":             loadAvg.Load15,
	}

	common.SendSuccess(c, response)
}

// GetMemory returns memory information
func (s *Service) GetMemory(c *gin.Context) {
	virtualMem, _ := mem.VirtualMemory()

	response := gin.H{
		"total":              virtualMem.Total,
		"free":               virtualMem.Free,
		"used":               virtualMem.Used,
		"used_percent":       virtualMem.UsedPercent,
	}

	common.SendSuccess(c, response)
}

func (s *Service) GetNetwork(c *gin.Context) {
	netIO, _ := net.IOCounters(false)

	response := gin.H{
		"network_io":  netIO,
	}

	common.SendSuccess(c, response)
}

// GetDisk returns disk information
func (s *Service) GetDisk(c *gin.Context) {
	diskPartitions, _ := disk.Partitions(true)
	diskUsage := make([]gin.H, 0)

	for _, partition := range diskPartitions {
		usage, _ := disk.Usage(partition.Mountpoint)
		diskUsage = append(diskUsage, gin.H{
			"mountpoint": partition.Mountpoint,
			"fstype":     partition.Fstype,
			"total":      usage.Total,
			"free":       usage.Free,
			"used":       usage.Used,
			"used_percent": usage.UsedPercent,
		})
	}

	common.SendSuccess(c, gin.H{"disk": diskUsage})
}

