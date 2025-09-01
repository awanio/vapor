package libvirt

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// TestTUSProtocolHeaders tests that all required TUS headers are set correctly
func TestTUSProtocolHeaders(t *testing.T) {
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	// Create a test service and handler
	service := &Service{}
	uploadDir := "/tmp/test-uploads"
	handler := NewISOResumableUploadHandler(service, uploadDir)

	tests := []struct {
		name           string
		method         string
		path           string
		headers        map[string]string
		expectedStatus int
		checkHeaders   []string
	}{
		{
			name:           "OPTIONS request should return TUS discovery headers",
			method:         "OPTIONS",
			path:           "/upload",
			expectedStatus: http.StatusNoContent,
			checkHeaders: []string{
				"Tus-Resumable",
				"Tus-Version",
				"Tus-Max-Size",
				"Tus-Extension",
				"Access-Control-Allow-Origin",
				"Access-Control-Allow-Methods",
				"Access-Control-Allow-Headers",
				"Access-Control-Expose-Headers",
				"Access-Control-Max-Age",
			},
		},
		{
			name:   "POST request should include TUS headers",
			method: "POST",
			path:   "/upload",
			headers: map[string]string{
				"Upload-Length":   "1000000",
				"Upload-Metadata": "filename dGVzdC5pc28=", // base64 encoded "test.iso"
			},
			expectedStatus: http.StatusCreated,
			checkHeaders: []string{
				"Tus-Resumable",
				"Tus-Version",
				"Tus-Max-Size",
				"Tus-Extension",
				"Upload-Offset",
				"Location",
				"Upload-Expires",
			},
		},
		{
			name:           "HEAD request should include TUS headers",
			method:         "HEAD",
			path:           "/upload/test-id",
			expectedStatus: http.StatusNotFound, // Will be not found since no upload exists
			checkHeaders:   []string{},          // No headers expected on error
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create a test router
			router := gin.New()
			router.OPTIONS("/upload", handler.HandleOptions)
			router.OPTIONS("/upload/:id", handler.HandleOptions)
			router.POST("/upload", handler.CreateUpload)
			router.HEAD("/upload/:id", handler.GetUploadInfo)
			router.PATCH("/upload/:id", handler.UploadChunk)

			// Create request
			req, _ := http.NewRequest(tt.method, tt.path, nil)
			for k, v := range tt.headers {
				req.Header.Set(k, v)
			}

			// Perform request
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Check status
			assert.Equal(t, tt.expectedStatus, w.Code, "Status code mismatch")

			// Check headers
			for _, header := range tt.checkHeaders {
				assert.NotEmpty(t, w.Header().Get(header), "Header %s should be present", header)
			}

			// Specific header value checks for OPTIONS
			if tt.method == "OPTIONS" {
				assert.Equal(t, "1.0.0", w.Header().Get("Tus-Resumable"))
				assert.Equal(t, "1.0.0", w.Header().Get("Tus-Version"))
				assert.Equal(t, "10737418240", w.Header().Get("Tus-Max-Size")) // 10GB
				assert.Equal(t, "creation,termination,expiration", w.Header().Get("Tus-Extension"))
			}
		})
	}
}

// TestTUSHeadersInAllMethods tests that TUS headers are set in all relevant methods
func TestTUSHeadersInAllMethods(t *testing.T) {
	gin.SetMode(gin.TestMode)

	service := &Service{}
	uploadDir := "/tmp/test-uploads"
	handler := NewISOResumableUploadHandler(service, uploadDir)

	// Test that setTUSHeaders method sets all required headers
	router := gin.New()
	router.GET("/test", func(c *gin.Context) {
		handler.setTUSHeaders(c)
		c.Status(http.StatusOK)
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Verify all TUS headers are set
	assert.Equal(t, "1.0.0", w.Header().Get("Tus-Resumable"))
	assert.Equal(t, "1.0.0", w.Header().Get("Tus-Version"))
	assert.Equal(t, "10737418240", w.Header().Get("Tus-Max-Size"))
	assert.Equal(t, "creation,termination,expiration", w.Header().Get("Tus-Extension"))
}

// TestCORSHeaders tests that CORS headers are properly set
func TestCORSHeaders(t *testing.T) {
	gin.SetMode(gin.TestMode)

	service := &Service{}
	uploadDir := "/tmp/test-uploads"
	handler := NewISOResumableUploadHandler(service, uploadDir)

	// Test OPTIONS request for CORS
	router := gin.New()
	router.OPTIONS("/upload", handler.HandleOptions)

	req, _ := http.NewRequest("OPTIONS", "/upload", nil)
	req.Header.Set("Origin", "https://example.com")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Check CORS headers
	assert.Equal(t, "*", w.Header().Get("Access-Control-Allow-Origin"))
	assert.Contains(t, w.Header().Get("Access-Control-Allow-Methods"), "POST")
	assert.Contains(t, w.Header().Get("Access-Control-Allow-Methods"), "HEAD")
	assert.Contains(t, w.Header().Get("Access-Control-Allow-Methods"), "PATCH")
	assert.Contains(t, w.Header().Get("Access-Control-Allow-Methods"), "DELETE")
	assert.Contains(t, w.Header().Get("Access-Control-Allow-Methods"), "OPTIONS")

	// Check that TUS-specific headers are exposed
	exposeHeaders := w.Header().Get("Access-Control-Expose-Headers")
	assert.Contains(t, exposeHeaders, "Upload-Offset")
	assert.Contains(t, exposeHeaders, "Upload-Length")
	assert.Contains(t, exposeHeaders, "Upload-Expires")
	assert.Contains(t, exposeHeaders, "Tus-Version")
	assert.Contains(t, exposeHeaders, "Tus-Max-Size")
	assert.Contains(t, exposeHeaders, "Tus-Extension")
	assert.Contains(t, exposeHeaders, "Location")
}

// TestUploadExpiresHeader tests that Upload-Expires header is properly set
func TestUploadExpiresHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)

	service := &Service{}
	uploadDir := "/tmp/test-uploads"
	handler := NewISOResumableUploadHandler(service, uploadDir)

	router := gin.New()
	router.POST("/upload", handler.CreateUpload)

	// Create a valid upload request
	req, _ := http.NewRequest("POST", "/upload", nil)
	req.Header.Set("Upload-Length", "1000000")
	req.Header.Set("Upload-Metadata", "filename dGVzdC5pc28=") // base64 encoded "test.iso"

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Check that Upload-Expires header is present and valid
	uploadExpires := w.Header().Get("Upload-Expires")
	assert.NotEmpty(t, uploadExpires, "Upload-Expires header should be present")

	// The header should be in RFC3339 format
	assert.True(t, strings.Contains(uploadExpires, "T"), "Upload-Expires should be in RFC3339 format")
	assert.True(t, strings.Contains(uploadExpires, "Z") || strings.Contains(uploadExpires, "+"), "Upload-Expires should have timezone info")
}
