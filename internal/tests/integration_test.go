package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/vapor/system-api/internal/auth"
	"github.com/vapor/system-api/internal/common"
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

func TestLoginEndpoint(t *testing.T) {
	router := setupRouter()

	loginReq := auth.LoginRequest{
		Username: "admin",
		Password: "admin123",
	}
	body, _ := json.Marshal(loginReq)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/auth/login", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response struct {
		Status string `json:"status"`
		Data   struct {
			Token     string `json:"token"`
			ExpiresAt int64  `json:"expires_at"`
		} `json:"data"`
	}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "success", response.Status)
	assert.NotEmpty(t, response.Data.Token)
}
