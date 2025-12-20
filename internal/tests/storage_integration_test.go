package tests

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/awanio/vapor/internal/auth"
	"github.com/awanio/vapor/internal/storage"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStorageEndpoints(t *testing.T) {
	// Setup
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Add auth service
	authService := auth.NewService("test-secret")

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

	// Generate a valid JWT token (bypass OS-level login in tests)
	expirationTime := time.Now().Add(time.Hour)
	claims := &auth.Claims{
		Username: "testuser",
		Role:     "admin",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "system-api",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte("test-secret"))
	require.NoError(t, err)

	// Test LVM volume groups endpoint
	t.Run("LVM Volume Groups", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/api/v1/storage/lvm/vgs", nil)
		req.Header.Set("Authorization", "Bearer "+tokenString)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	// Test Multipath devices endpoint
	t.Run("Multipath Devices", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/api/v1/storage/multipath/devices", nil)
		req.Header.Set("Authorization", "Bearer "+tokenString)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	// Test BTRFS subvolumes endpoint
	t.Run("BTRFS Subvolumes", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/api/v1/storage/btrfs/subvolumes?mount_point=/mnt", nil)
		req.Header.Set("Authorization", "Bearer "+tokenString)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})
}
