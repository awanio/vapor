//go:build !linux
// +build !linux

package network

import (
	"net/http"
	"github.com/gin-gonic/gin"
	"github.com/awanio/vapor/internal/common"
)

// platformSpecificInit performs platform-specific initialization
func platformSpecificInit() error {
	// No specific initialization needed for non-Linux platforms
	return nil
}

// isNetlinkSupported returns false on non-Linux platforms
func isNetlinkSupported() bool {
	return false
}

// Stub implementations for non-Linux platforms
// These return appropriate error messages when called on non-Linux systems

func (s *Service) stubHandler(c *gin.Context) {
	common.SendError(c, http.StatusNotImplemented, common.ErrCodeNotImplemented, 
		"Network management features are only available on Linux systems")
}
