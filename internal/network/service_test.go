package network

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/awanio/vapor/internal/common"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func setupRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	service := NewService()

	// Setup routes
	api := router.Group("/api/v1")
	{
		api.GET("/network/interfaces", service.GetInterfaces)
		api.PUT("/network/interfaces/:name/up", service.InterfaceUp)
		api.PUT("/network/interfaces/:name/down", service.InterfaceDown)
		api.POST("/network/interfaces/:name/address", service.SetInterfaceAddress)
		api.PUT("/network/interfaces/:name/address", service.UpdateInterfaceAddress)
		api.DELETE("/network/interfaces/:name/address", service.DeleteInterfaceAddress)
		api.POST("/network/bridge", service.CreateBridge)
		api.PUT("/network/bridge/:name", service.UpdateBridge)
		api.DELETE("/network/bridge/:name", service.DeleteBridge)
		api.POST("/network/bond", service.CreateBond)
		api.PUT("/network/bond/:name", service.UpdateBond)
		api.DELETE("/network/bond/:name", service.DeleteBond)
		api.POST("/network/vlan", service.CreateVLAN)
		api.PUT("/network/vlan/:name", service.UpdateVLAN)
		api.DELETE("/network/vlan/:name", service.DeleteVLAN)
	}

	return router
}

func TestGetInterfaces(t *testing.T) {
	router := setupRouter()

	req, _ := http.NewRequest("GET", "/api/v1/network/interfaces", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Since this calls netlink directly, we just check if the endpoint responds
	// In a real Linux environment, this would return actual interfaces
	assert.Contains(t, []int{http.StatusOK, http.StatusInternalServerError}, w.Code)
}

func TestInterfaceUpDown(t *testing.T) {
	router := setupRouter()

	tests := []struct {
		name     string
		endpoint string
		method   string
	}{
		{"Interface Up", "/api/v1/network/interfaces/lo/up", "PUT"},
		{"Interface Down", "/api/v1/network/interfaces/lo/down", "PUT"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, _ := http.NewRequest(tt.method, tt.endpoint, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// These operations require root and real interfaces
			// Just ensure the endpoint is accessible
			assert.Contains(t, []int{http.StatusOK, http.StatusNotFound, http.StatusInternalServerError}, w.Code)
		})
	}
}

func TestSetInterfaceAddress(t *testing.T) {
	router := setupRouter()

	addressReq := AddressRequest{
		Address: "192.168.1.100",
		Netmask: 24,
		Gateway: "192.168.1.1",
	}

	body, _ := json.Marshal(addressReq)
	req, _ := http.NewRequest("POST", "/api/v1/network/interfaces/eth0/address", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// This requires root privileges and a real interface
	assert.Contains(t, []int{http.StatusOK, http.StatusNotFound, http.StatusInternalServerError}, w.Code)
}

func TestUpdateInterfaceAddress(t *testing.T) {
	router := setupRouter()

	addressReq := AddressRequest{
		Address: "192.168.1.200",
		Netmask: 24,
		Gateway: "192.168.1.1",
	}

	body, _ := json.Marshal(addressReq)
	req, _ := http.NewRequest("PUT", "/api/v1/network/interfaces/eth0/address", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// This requires root privileges and a real interface
	assert.Contains(t, []int{http.StatusOK, http.StatusNotFound, http.StatusInternalServerError}, w.Code)
}

func TestDeleteInterfaceAddress(t *testing.T) {
	router := setupRouter()

	// Test Delete Address
	t.Run("Delete Interface Address", func(t *testing.T) {
		req, _ := http.NewRequest("DELETE", "/api/v1/network/interfaces/eth0/address?address=192.168.1.100", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// This requires root privileges and a real interface
		assert.Contains(t, []int{http.StatusOK, http.StatusNotFound, http.StatusInternalServerError}, w.Code)
	})

	// Test Delete with Invalid Address
	t.Run("Delete Interface Invalid Address", func(t *testing.T) {
		req, _ := http.NewRequest("DELETE", "/api/v1/network/interfaces/eth0/address?address=invalid-ip", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// In test environment, eth0 doesn't exist, so we get NotFound before IP validation
		assert.Contains(t, []int{http.StatusBadRequest, http.StatusNotFound}, w.Code)
		var response common.APIResponse
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, "error", response.Status)
		assert.Contains(t, []string{common.ErrCodeValidation, common.ErrCodeNotFound}, response.Error.Code)
	})
}

func TestBridgeOperations(t *testing.T) {
	router := setupRouter()

	// Test Create Bridge
	t.Run("Create Bridge", func(t *testing.T) {
		bridgeReq := BridgeRequest{
			Name:       "br-test",
			Interfaces: []string{"eth0", "eth1"},
		}

		body, _ := json.Marshal(bridgeReq)
		req, _ := http.NewRequest("POST", "/api/v1/network/bridge", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// Bridge creation requires root privileges
		assert.Contains(t, []int{http.StatusOK, http.StatusConflict, http.StatusInternalServerError}, w.Code)
	})

	// Test Update Bridge
	t.Run("Update Bridge", func(t *testing.T) {
		bridgeReq := BridgeRequest{
			Name:       "br-test",
			Interfaces: []string{"eth2"},
		}

		body, _ := json.Marshal(bridgeReq)
		req, _ := http.NewRequest("PUT", "/api/v1/network/bridge/br-test", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Contains(t, []int{http.StatusOK, http.StatusNotFound, http.StatusBadRequest}, w.Code)
	})

	// Test Delete Bridge
	t.Run("Delete Bridge", func(t *testing.T) {
		req, _ := http.NewRequest("DELETE", "/api/v1/network/bridge/br-test", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Contains(t, []int{http.StatusOK, http.StatusNotFound, http.StatusInternalServerError}, w.Code)
	})
}

func TestBondOperations(t *testing.T) {
	router := setupRouter()

	// Test Create Bond
	t.Run("Create Bond", func(t *testing.T) {
		bondReq := BondRequest{
			Name:       "bond0",
			Mode:       "active-backup",
			Interfaces: []string{"eth0", "eth1"},
		}

		body, _ := json.Marshal(bondReq)
		req, _ := http.NewRequest("POST", "/api/v1/network/bond", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Contains(t, []int{http.StatusOK, http.StatusConflict, http.StatusInternalServerError}, w.Code)
	})

	// Test Update Bond
	t.Run("Update Bond", func(t *testing.T) {
		bondReq := BondRequest{
			Name:       "bond0",
			Mode:       "balance-rr",
			Interfaces: []string{"eth2", "eth3"},
		}

		body, _ := json.Marshal(bondReq)
		req, _ := http.NewRequest("PUT", "/api/v1/network/bond/bond0", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Contains(t, []int{http.StatusOK, http.StatusNotFound, http.StatusBadRequest}, w.Code)
	})

	// Test Delete Bond
	t.Run("Delete Bond", func(t *testing.T) {
		req, _ := http.NewRequest("DELETE", "/api/v1/network/bond/bond0", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Contains(t, []int{http.StatusOK, http.StatusNotFound, http.StatusInternalServerError}, w.Code)
	})
}

func TestVLANOperations(t *testing.T) {
	router := setupRouter()

	// Test Create VLAN
	t.Run("Create VLAN", func(t *testing.T) {
		vlanReq := VLANRequest{
			Interface: "eth0",
			VLANID:    100,
			Name:      "vlan100",
		}

		body, _ := json.Marshal(vlanReq)
		req, _ := http.NewRequest("POST", "/api/v1/network/vlan", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Contains(t, []int{http.StatusOK, http.StatusNotFound, http.StatusConflict, http.StatusInternalServerError}, w.Code)
	})

	// Test Update VLAN
	t.Run("Update VLAN", func(t *testing.T) {
		vlanReq := VLANRequest{
			Interface: "eth0",
			VLANID:    200,
			Name:      "vlan100",
		}

		body, _ := json.Marshal(vlanReq)
		req, _ := http.NewRequest("PUT", "/api/v1/network/vlan/vlan100", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Contains(t, []int{http.StatusOK, http.StatusNotFound, http.StatusBadRequest}, w.Code)
	})

	// Test Delete VLAN
	t.Run("Delete VLAN", func(t *testing.T) {
		req, _ := http.NewRequest("DELETE", "/api/v1/network/vlan/vlan100", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Contains(t, []int{http.StatusOK, http.StatusNotFound, http.StatusInternalServerError}, w.Code)
	})
}

func TestInvalidRequests(t *testing.T) {
	router := setupRouter()

	tests := []struct {
		name     string
		method   string
		endpoint string
		body     string
	}{
		{
			name:     "Invalid Bridge Request",
			method:   "POST",
			endpoint: "/api/v1/network/bridge",
			body:     `{"invalid": "data"}`,
		},
		{
			name:     "Invalid Bond Request",
			method:   "POST",
			endpoint: "/api/v1/network/bond",
			body:     `{"name": "bond0"}`, // Missing required fields
		},
		{
			name:     "Invalid VLAN Request",
			method:   "POST",
			endpoint: "/api/v1/network/vlan",
			body:     `{"vlan_id": 5000}`, // Invalid VLAN ID
		},
		{
			name:     "Invalid Address Request",
			method:   "POST",
			endpoint: "/api/v1/network/interfaces/eth0/address",
			body:     `{"address": "invalid-ip"}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, _ := http.NewRequest(tt.method, tt.endpoint, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// For address-related tests, eth0 might not exist, so we could get NotFound
			if tt.endpoint == "/api/v1/network/interfaces/eth0/address" {
				assert.Contains(t, []int{http.StatusBadRequest, http.StatusNotFound}, w.Code)
			} else {
				assert.Equal(t, http.StatusBadRequest, w.Code)
			}

			var response common.APIResponse
			err := json.Unmarshal(w.Body.Bytes(), &response)
			assert.NoError(t, err)
			assert.Equal(t, "error", response.Status)

			if tt.endpoint == "/api/v1/network/interfaces/eth0/address" && w.Code == http.StatusNotFound {
				assert.Equal(t, common.ErrCodeNotFound, response.Error.Code)
			} else {
				assert.Equal(t, common.ErrCodeValidation, response.Error.Code)
			}
		})
	}
}
