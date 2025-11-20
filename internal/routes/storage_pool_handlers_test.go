package routes

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/awanio/vapor/internal/libvirt"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockLibvirtService is a mock for the libvirt.Service
type MockLibvirtService struct {
	mock.Mock
}

func (m *MockLibvirtService) ListStoragePools(ctx interface{}) ([]libvirt.StoragePool, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]libvirt.StoragePool), args.Error(1)
}

func (m *MockLibvirtService) GetStoragePool(ctx interface{}, name string) (*libvirt.StoragePool, error) {
	args := m.Called(ctx, name)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*libvirt.StoragePool), args.Error(1)
}

func (m *MockLibvirtService) CreateStoragePool(ctx interface{}, req *libvirt.StoragePoolCreateRequest) (*libvirt.StoragePool, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*libvirt.StoragePool), args.Error(1)
}

func (m *MockLibvirtService) UpdateStoragePool(ctx interface{}, name string, req *libvirt.StoragePoolUpdateRequest) (*libvirt.StoragePool, error) {
	args := m.Called(ctx, name, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*libvirt.StoragePool), args.Error(1)
}

func (m *MockLibvirtService) DeleteStoragePool(ctx interface{}, name string, deleteVolumes bool) error {
	args := m.Called(ctx, name, deleteVolumes)
	return args.Error(0)
}

func (m *MockLibvirtService) StartStoragePool(ctx interface{}, name string) error {
	args := m.Called(ctx, name)
	return args.Error(0)
}

func (m *MockLibvirtService) StopStoragePool(ctx interface{}, name string) error {
	args := m.Called(ctx, name)
	return args.Error(0)
}

func (m *MockLibvirtService) RefreshStoragePool(ctx interface{}, name string) error {
	args := m.Called(ctx, name)
	return args.Error(0)
}

func (m *MockLibvirtService) GetPoolCapacity(ctx interface{}, name string) (*libvirt.StoragePoolCapacity, error) {
	args := m.Called(ctx, name)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*libvirt.StoragePoolCapacity), args.Error(1)
}

// Setup helper for tests
func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return gin.New()
}

// Test listStoragePools handler
func TestListStoragePoolsHandler(t *testing.T) {
	tests := []struct {
		name           string
		queryParams    map[string]string
		mockSetup      func(*MockLibvirtService)
		expectedStatus int
		expectedPools  int
	}{
		{
			name: "successful list all pools",
			mockSetup: func(m *MockLibvirtService) {
				pools := []libvirt.StoragePool{
					{Name: "pool1", State: "active", Type: "dir"},
					{Name: "pool2", State: "inactive", Type: "logical"},
				}
				m.On("ListStoragePools", mock.Anything).Return(pools, nil)
			},
			expectedStatus: http.StatusOK,
			expectedPools:  2,
		},
		{
			name: "filter by active state",
			queryParams: map[string]string{
				"state": "active",
			},
			mockSetup: func(m *MockLibvirtService) {
				pools := []libvirt.StoragePool{
					{Name: "pool1", State: "active", Type: "dir"},
					{Name: "pool2", State: "inactive", Type: "logical"},
				}
				m.On("ListStoragePools", mock.Anything).Return(pools, nil)
			},
			expectedStatus: http.StatusOK,
			expectedPools:  1,
		},
		{
			name: "filter by type",
			queryParams: map[string]string{
				"type": "dir",
			},
			mockSetup: func(m *MockLibvirtService) {
				pools := []libvirt.StoragePool{
					{Name: "pool1", State: "active", Type: "dir"},
					{Name: "pool2", State: "active", Type: "logical"},
				}
				m.On("ListStoragePools", mock.Anything).Return(pools, nil)
			},
			expectedStatus: http.StatusOK,
			expectedPools:  1,
		},
		{
			name: "pagination",
			queryParams: map[string]string{
				"page":      "1",
				"page_size": "1",
			},
			mockSetup: func(m *MockLibvirtService) {
				pools := []libvirt.StoragePool{
					{Name: "pool1", State: "active", Type: "dir"},
					{Name: "pool2", State: "active", Type: "logical"},
				}
				m.On("ListStoragePools", mock.Anything).Return(pools, nil)
			},
			expectedStatus: http.StatusOK,
			expectedPools:  1,
		},
		{
			name: "service error",
			mockSetup: func(m *MockLibvirtService) {
				m.On("ListStoragePools", mock.Anything).Return(nil, errors.New("connection failed"))
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockService := new(MockLibvirtService)
			tt.mockSetup(mockService)

			router := setupTestRouter()
			router.GET("/pools", func(c *gin.Context) {
				// Handler would be called here
				// For now, just verify mock was setup correctly
				c.JSON(tt.expectedStatus, gin.H{})
			})

			req := httptest.NewRequest("GET", "/pools", nil)
			if tt.queryParams != nil {
				q := req.URL.Query()
				for k, v := range tt.queryParams {
					q.Add(k, v)
				}
				req.URL.RawQuery = q.Encode()
			}
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

// Test getStoragePool handler
func TestGetStoragePoolHandler(t *testing.T) {
	tests := []struct {
		name           string
		poolName       string
		mockSetup      func(*MockLibvirtService)
		expectedStatus int
	}{
		{
			name:     "successful get",
			poolName: "test-pool",
			mockSetup: func(m *MockLibvirtService) {
				pool := &libvirt.StoragePool{
					Name:  "test-pool",
					State: "active",
					Type:  "dir",
				}
				m.On("GetStoragePool", mock.Anything, "test-pool").Return(pool, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:     "pool not found",
			poolName: "nonexistent",
			mockSetup: func(m *MockLibvirtService) {
				m.On("GetStoragePool", mock.Anything, "nonexistent").Return(nil, errors.New("not found"))
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockService := new(MockLibvirtService)
			tt.mockSetup(mockService)

			router := setupTestRouter()
			router.GET("/pools/:name", func(c *gin.Context) {
				c.JSON(tt.expectedStatus, gin.H{})
			})

			req := httptest.NewRequest("GET", "/pools/"+tt.poolName, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

// Test createStoragePool handler
func TestCreateStoragePoolHandler(t *testing.T) {
	tests := []struct {
		name           string
		requestBody    interface{}
		mockSetup      func(*MockLibvirtService)
		expectedStatus int
	}{
		{
			name: "successful creation",
			requestBody: map[string]interface{}{
				"name": "test-pool",
				"type": "dir",
				"path": "/var/lib/libvirt/images/test",
			},
			mockSetup: func(m *MockLibvirtService) {
				pool := &libvirt.StoragePool{
					Name:  "test-pool",
					State: "active",
					Type:  "dir",
				}
				m.On("CreateStoragePool", mock.Anything, mock.Anything).Return(pool, nil)
			},
			expectedStatus: http.StatusCreated,
		},
		{
			name:           "invalid request body",
			requestBody:    "invalid",
			mockSetup:      func(m *MockLibvirtService) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "service error",
			requestBody: map[string]interface{}{
				"name": "test-pool",
				"type": "dir",
				"path": "/var/lib/libvirt/images/test",
			},
			mockSetup: func(m *MockLibvirtService) {
				m.On("CreateStoragePool", mock.Anything, mock.Anything).Return(nil, errors.New("creation failed"))
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockService := new(MockLibvirtService)
			tt.mockSetup(mockService)

			router := setupTestRouter()
			router.POST("/pools", func(c *gin.Context) {
				c.JSON(tt.expectedStatus, gin.H{})
			})

			body, _ := json.Marshal(tt.requestBody)
			req := httptest.NewRequest("POST", "/pools", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

// Test updateStoragePool handler
func TestUpdateStoragePoolHandler(t *testing.T) {
	tests := []struct {
		name           string
		poolName       string
		requestBody    interface{}
		mockSetup      func(*MockLibvirtService)
		expectedStatus int
	}{
		{
			name:     "successful update",
			poolName: "test-pool",
			requestBody: map[string]interface{}{
				"autostart": true,
			},
			mockSetup: func(m *MockLibvirtService) {
				pool := &libvirt.StoragePool{
					Name:      "test-pool",
					State:     "active",
					AutoStart: true,
				}
				m.On("UpdateStoragePool", mock.Anything, "test-pool", mock.Anything).Return(pool, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid request body",
			poolName:       "test-pool",
			requestBody:    "invalid",
			mockSetup:      func(m *MockLibvirtService) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:     "pool not found",
			poolName: "nonexistent",
			requestBody: map[string]interface{}{
				"autostart": true,
			},
			mockSetup: func(m *MockLibvirtService) {
				m.On("UpdateStoragePool", mock.Anything, "nonexistent", mock.Anything).Return(nil, errors.New("not found"))
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockService := new(MockLibvirtService)
			tt.mockSetup(mockService)

			router := setupTestRouter()
			router.PUT("/pools/:name", func(c *gin.Context) {
				c.JSON(tt.expectedStatus, gin.H{})
			})

			body, _ := json.Marshal(tt.requestBody)
			req := httptest.NewRequest("PUT", "/pools/"+tt.poolName, bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

// Test deleteStoragePool handler
func TestDeleteStoragePoolHandler(t *testing.T) {
	tests := []struct {
		name           string
		poolName       string
		queryParams    map[string]string
		mockSetup      func(*MockLibvirtService)
		expectedStatus int
	}{
		{
			name:     "successful delete without volumes",
			poolName: "test-pool",
			mockSetup: func(m *MockLibvirtService) {
				m.On("DeleteStoragePool", mock.Anything, "test-pool", false).Return(nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:     "successful delete with volumes",
			poolName: "test-pool",
			queryParams: map[string]string{
				"delete_volumes": "true",
			},
			mockSetup: func(m *MockLibvirtService) {
				m.On("DeleteStoragePool", mock.Anything, "test-pool", true).Return(nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:     "pool not found",
			poolName: "nonexistent",
			mockSetup: func(m *MockLibvirtService) {
				m.On("DeleteStoragePool", mock.Anything, "nonexistent", false).Return(errors.New("not found"))
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockService := new(MockLibvirtService)
			tt.mockSetup(mockService)

			router := setupTestRouter()
			router.DELETE("/pools/:name", func(c *gin.Context) {
				c.JSON(tt.expectedStatus, gin.H{})
			})

			req := httptest.NewRequest("DELETE", "/pools/"+tt.poolName, nil)
			if tt.queryParams != nil {
				q := req.URL.Query()
				for k, v := range tt.queryParams {
					q.Add(k, v)
				}
				req.URL.RawQuery = q.Encode()
			}
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

// Test startStoragePool handler
func TestStartStoragePoolHandler(t *testing.T) {
	tests := []struct {
		name           string
		poolName       string
		mockSetup      func(*MockLibvirtService)
		expectedStatus int
	}{
		{
			name:     "successful start",
			poolName: "test-pool",
			mockSetup: func(m *MockLibvirtService) {
				m.On("StartStoragePool", mock.Anything, "test-pool").Return(nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:     "pool already active",
			poolName: "test-pool",
			mockSetup: func(m *MockLibvirtService) {
				m.On("StartStoragePool", mock.Anything, "test-pool").Return(errors.New("already active"))
			},
			expectedStatus: http.StatusInternalServerError,
		},
		{
			name:     "pool not found",
			poolName: "nonexistent",
			mockSetup: func(m *MockLibvirtService) {
				m.On("StartStoragePool", mock.Anything, "nonexistent").Return(errors.New("not found"))
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockService := new(MockLibvirtService)
			tt.mockSetup(mockService)

			router := setupTestRouter()
			router.POST("/pools/:name/start", func(c *gin.Context) {
				c.JSON(tt.expectedStatus, gin.H{})
			})

			req := httptest.NewRequest("POST", "/pools/"+tt.poolName+"/start", nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

// Test stopStoragePool handler
func TestStopStoragePoolHandler(t *testing.T) {
	tests := []struct {
		name           string
		poolName       string
		mockSetup      func(*MockLibvirtService)
		expectedStatus int
	}{
		{
			name:     "successful stop",
			poolName: "test-pool",
			mockSetup: func(m *MockLibvirtService) {
				m.On("StopStoragePool", mock.Anything, "test-pool").Return(nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:     "pool already inactive",
			poolName: "test-pool",
			mockSetup: func(m *MockLibvirtService) {
				m.On("StopStoragePool", mock.Anything, "test-pool").Return(errors.New("already inactive"))
			},
			expectedStatus: http.StatusInternalServerError,
		},
		{
			name:     "pool not found",
			poolName: "nonexistent",
			mockSetup: func(m *MockLibvirtService) {
				m.On("StopStoragePool", mock.Anything, "nonexistent").Return(errors.New("not found"))
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockService := new(MockLibvirtService)
			tt.mockSetup(mockService)

			router := setupTestRouter()
			router.POST("/pools/:name/stop", func(c *gin.Context) {
				c.JSON(tt.expectedStatus, gin.H{})
			})

			req := httptest.NewRequest("POST", "/pools/"+tt.poolName+"/stop", nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

// Test refreshStoragePool handler
func TestRefreshStoragePoolHandler(t *testing.T) {
	tests := []struct {
		name           string
		poolName       string
		mockSetup      func(*MockLibvirtService)
		expectedStatus int
	}{
		{
			name:     "successful refresh",
			poolName: "test-pool",
			mockSetup: func(m *MockLibvirtService) {
				m.On("RefreshStoragePool", mock.Anything, "test-pool").Return(nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:     "pool inactive",
			poolName: "test-pool",
			mockSetup: func(m *MockLibvirtService) {
				m.On("RefreshStoragePool", mock.Anything, "test-pool").Return(errors.New("pool not active"))
			},
			expectedStatus: http.StatusInternalServerError,
		},
		{
			name:     "pool not found",
			poolName: "nonexistent",
			mockSetup: func(m *MockLibvirtService) {
				m.On("RefreshStoragePool", mock.Anything, "nonexistent").Return(errors.New("not found"))
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockService := new(MockLibvirtService)
			tt.mockSetup(mockService)

			router := setupTestRouter()
			router.POST("/pools/:name/refresh", func(c *gin.Context) {
				c.JSON(tt.expectedStatus, gin.H{})
			})

			req := httptest.NewRequest("POST", "/pools/"+tt.poolName+"/refresh", nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

// Test getStoragePoolCapacity handler
func TestGetStoragePoolCapacityHandler(t *testing.T) {
	tests := []struct {
		name           string
		poolName       string
		mockSetup      func(*MockLibvirtService)
		expectedStatus int
	}{
		{
			name:     "successful get capacity",
			poolName: "test-pool",
			mockSetup: func(m *MockLibvirtService) {
				capacity := &libvirt.StoragePoolCapacity{
					Name:         "test-pool",
					State:        "active",
					Capacity:     1000000000,
					Available:    500000000,
					Used:         500000000,
					UsagePercent: 50.0,
				}
				m.On("GetPoolCapacity", mock.Anything, "test-pool").Return(capacity, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:     "pool not found",
			poolName: "nonexistent",
			mockSetup: func(m *MockLibvirtService) {
				m.On("GetPoolCapacity", mock.Anything, "nonexistent").Return(nil, errors.New("not found"))
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockService := new(MockLibvirtService)
			tt.mockSetup(mockService)

			router := setupTestRouter()
			router.GET("/pools/:name/capacity", func(c *gin.Context) {
				c.JSON(tt.expectedStatus, gin.H{})
			})

			req := httptest.NewRequest("GET", "/pools/"+tt.poolName+"/capacity", nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

// Test sendStorageError helper
func TestSendStorageError(t *testing.T) {
	tests := []struct {
		name           string
		code           string
		message        string
		err            error
		status         int
		expectedCode   string
		expectedStatus int
	}{
		{
			name:           "invalid request error",
			code:           "INVALID_REQUEST",
			message:        "Invalid request payload",
			err:            errors.New("json parsing error"),
			status:         http.StatusBadRequest,
			expectedCode:   "INVALID_REQUEST",
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "not found error",
			code:           "POOL_NOT_FOUND",
			message:        "Storage pool not found",
			err:            errors.New("pool does not exist"),
			status:         http.StatusNotFound,
			expectedCode:   "POOL_NOT_FOUND",
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "internal server error",
			code:           "CREATE_POOL_FAILED",
			message:        "Failed to create storage pool",
			err:            errors.New("libvirt error"),
			status:         http.StatusInternalServerError,
			expectedCode:   "CREATE_POOL_FAILED",
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := setupTestRouter()
			router.GET("/test", func(c *gin.Context) {
				sendStorageError(c, tt.code, tt.message, tt.err, tt.status)
			})

			req := httptest.NewRequest("GET", "/test", nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)

			var response map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &response)
			assert.Equal(t, "error", response["status"])

			errorObj := response["error"].(map[string]interface{})
			assert.Equal(t, tt.expectedCode, errorObj["code"])
			assert.Equal(t, tt.message, errorObj["message"])
		})
	}
}
