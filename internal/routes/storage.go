package routes

import (
	"github.com/awanio/vapor/internal/storage"
	"github.com/gin-gonic/gin"
)

// StorageRoutes sets up storage-related routes
func StorageRoutes(r *gin.RouterGroup, storageService *storage.Service) {
	// Storage endpoints
	r.GET("/storage/disks", storageService.GetDisks)
	r.POST("/storage/mount", storageService.Mount)
	r.POST("/storage/unmount", storageService.Unmount)
	r.POST("/storage/format", storageService.Format)

	// LVM endpoints
	r.GET("/storage/lvm/vgs", storageService.GetVolumeGroups)
	r.GET("/storage/lvm/lvs", storageService.GetLogicalVolumes)
	r.GET("/storage/lvm/pvs", storageService.GetPhysicalVolumes)
	r.POST("/storage/lvm/vg", storageService.CreateVolumeGroup)
	r.POST("/storage/lvm/lv", storageService.CreateLogicalVolume)

	// iSCSI endpoints
	r.POST("/storage/iscsi/discover", storageService.DiscoverISCSITargets)
	r.GET("/storage/iscsi/sessions", storageService.GetISCSISessions)
	r.POST("/storage/iscsi/login", storageService.LoginISCSI)
	r.POST("/storage/iscsi/logout", storageService.LogoutISCSI)

	// Multipath endpoints
	r.GET("/storage/multipath/devices", storageService.GetMultipathDevices)
	r.GET("/storage/multipath/paths", storageService.GetMultipathPaths)

	// BTRFS endpoints
	r.GET("/storage/btrfs/subvolumes", storageService.GetBTRFSSubvolumes)
	r.POST("/storage/btrfs/subvolume", storageService.CreateBTRFSSubvolume)
	r.DELETE("/storage/btrfs/subvolume", storageService.DeleteBTRFSSubvolume)
	r.POST("/storage/btrfs/snapshot", storageService.CreateBTRFSSnapshot)

	// RAID endpoints
	r.GET("/storage/raid/devices", storageService.GetRAIDDevices)
	r.GET("/storage/raid/available-disks", storageService.GetRAIDAvailableDisks)
	r.POST("/storage/raid/create", storageService.CreateRAIDDevice)
	r.DELETE("/storage/raid/destroy", storageService.DestroyRAIDDevice)
}
