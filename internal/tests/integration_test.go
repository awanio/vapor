package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/awanio/vapor/internal/auth"
	"github.com/awanio/vapor/internal/common"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func setupRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.Default()

	authService := auth.NewService("test-secret")

	// Public endpoints
	router.POST("/api/v1/auth/login", authService.Login)

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, common.SuccessResponse(gin.H{
			"status": "healthy",
		}))
	})

	return router
}

func TestHealthEndpoint(t *testing.T) {
	router := setupRouter()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/health", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response common.APIResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "success", response.Status)
}

func TestLoginEndpoint_InvalidCredentials(t *testing.T) {
	router := setupRouter()

	// Auth service validates against the host OS (Linux users). In unit/integration
	// tests we do not assume any system users exist, so we validate the error path.
	loginReq := auth.LoginRequest{
		Username: "nonexistentuser",
		Password: "wrong-password",
	}
	body, _ := json.Marshal(loginReq)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/auth/login", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}
