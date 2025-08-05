package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/awanio/vapor/internal/auth"
	"github.com/awanio/vapor/internal/storage"
)

func TestStorageEndpoints(t *testing.T) {
	// Setup
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Add auth service
	authService := auth.NewService("test-secret")
	
	// Add routes
	router.POST("/api/v1/auth/login", authService.Login)
	
	// Protected routes
	api := router.Group("/api/v1")
	api.Use(authService.AuthMiddleware())
	{
		storageService := storage.NewService()
		api.GET("/storage/lvm/vgs", storageService.GetVolumeGroups)
		api.GET("/storage/lvm/lvs", storageService.GetLogicalVolumes)
		api.GET("/storage/multipath/devices", storageService.GetMultipathDevices)
		api.GET("/storage/btrfs/subvolumes", storageService.GetBTRFSSubvolumes)
	}

	// Login to get token
	loginReq := map[string]string{
		"username": "admin",
		"password": "admin123",
	}
	jsonData, _ := json.Marshal(loginReq)
	
	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)
	
	require.Equal(t, http.StatusOK, w.Code)
	
	var loginResp map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &loginResp)
	require.NoError(t, err)
	
	token := loginResp["data"].(map[string]interface{})["token"].(string)
	
	// Test LVM volume groups endpoint
	t.Run("LVM Volume Groups", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/api/v1/storage/lvm/vgs", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		router.ServeHTTP(w, req)
		
		assert.Equal(t, http.StatusOK, w.Code)
		
		var resp map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		require.NoError(t, err)
		
		assert.Equal(t, "success", resp["status"])
		assert.NotNil(t, resp["data"])
	})
	
	// Test Multipath devices endpoint
	t.Run("Multipath Devices", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/api/v1/storage/multipath/devices", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		router.ServeHTTP(w, req)
		
		assert.Equal(t, http.StatusOK, w.Code)
		
		var resp map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		require.NoError(t, err)
		
		assert.Equal(t, "success", resp["status"])
		assert.NotNil(t, resp["data"])
	})
	
	// Test BTRFS subvolumes endpoint
	t.Run("BTRFS Subvolumes", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/api/v1/storage/btrfs/subvolumes?mount_point=/mnt", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		router.ServeHTTP(w, req)
		
		assert.Equal(t, http.StatusOK, w.Code)
		
		var resp map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		require.NoError(t, err)
		
		assert.Equal(t, "success", resp["status"])
		assert.NotNil(t, resp["data"])
	})
}
