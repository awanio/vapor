package routes

import (
	"github.com/awanio/vapor/internal/users"
	"github.com/gin-gonic/gin"
)

// UserRoutes sets up user management routes
func UserRoutes(r *gin.RouterGroup, userService *users.Service) {
	r.GET("/users", userService.GetUsers)
	r.POST("/users", userService.CreateUser)
	r.PUT("/users/:username", userService.UpdateUser)
	r.DELETE("/users/:username", userService.DeleteUser)
	r.POST("/users/:username/reset-password", userService.ResetPassword)
}
