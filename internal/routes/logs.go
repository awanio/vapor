package routes

import (
	"github.com/awanio/vapor/internal/logs"
	"github.com/gin-gonic/gin"
)

// LogRoutes sets up log viewer routes
func LogRoutes(r *gin.RouterGroup, logService *logs.Service) {
	r.GET("/logs", logService.GetLogs)
}
