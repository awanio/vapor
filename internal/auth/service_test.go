package auth

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
)

func TestNewService(t *testing.T) {
	secret := "test-secret"
	service := NewService(secret)
	
	assert.NotNil(t, service)
	assert.Equal(t, []byte(secret), service.jwtSecret)
}

func TestLogin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := NewService("test-secret")

	tests := []struct {
		name       string
		request    LoginRequest
		wantStatus int
		wantToken  bool
	}{
		// Note: For actual testing, you would need to either:
		// 1. Mock the authenticateLinuxUser function
		// 2. Use a test Linux user with known credentials
		// 3. Skip these tests in non-Linux environments
		{
			name: "invalid username",
			request: LoginRequest{
				Username: "nonexistentuser",
				Password: "somepassword",
			},
			wantStatus: http.StatusUnauthorized,
			wantToken:  false,
		},
		{
			name:       "missing credentials",
			request:    LoginRequest{},
			wantStatus: http.StatusBadRequest,
			wantToken:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			body, _ := json.Marshal(tt.request)
			c.Request = httptest.NewRequest("POST", "/login", bytes.NewBuffer(body))
			c.Request.Header.Set("Content-Type", "application/json")

			service.Login(c)

			assert.Equal(t, tt.wantStatus, w.Code)

			if tt.wantToken {
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
				assert.Greater(t, response.Data.ExpiresAt, time.Now().Unix())
			}
		})
	}
}

func TestAuthMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := NewService("test-secret")

	// Generate a valid token
	claims := &Claims{
		Username: "testuser",
		Role:     "admin",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "system-api",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	validToken, _ := token.SignedString(service.jwtSecret)

	// Generate an expired token
	expiredClaims := &Claims{
		Username: "testuser",
		Role:     "admin",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
			Issuer:    "system-api",
		},
	}
	expiredToken := jwt.NewWithClaims(jwt.SigningMethodHS256, expiredClaims)
	expiredTokenString, _ := expiredToken.SignedString(service.jwtSecret)

	tests := []struct {
		name         string
		authHeader   string
		wantStatus   int
		wantUsername string
		wantRole     string
	}{
		{
			name:         "valid token",
			authHeader:   "Bearer " + validToken,
			wantStatus:   http.StatusOK,
			wantUsername: "testuser",
			wantRole:     "admin",
		},
		{
			name:       "missing header",
			authHeader: "",
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "invalid header format",
			authHeader: "InvalidFormat " + validToken,
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "invalid token",
			authHeader: "Bearer invalid.token.here",
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "expired token",
			authHeader: "Bearer " + expiredTokenString,
			wantStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("GET", "/test", nil)
			
			if tt.authHeader != "" {
				c.Request.Header.Set("Authorization", tt.authHeader)
			}

			middleware := service.AuthMiddleware()
			middleware(c)

			if tt.wantStatus == http.StatusOK {
				assert.False(t, c.IsAborted())
				username, _ := c.Get("username")
				role, _ := c.Get("role")
				assert.Equal(t, tt.wantUsername, username)
				assert.Equal(t, tt.wantRole, role)
			} else {
				assert.True(t, c.IsAborted())
				assert.Equal(t, tt.wantStatus, w.Code)
			}
		})
	}
}

func TestRequireRole(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name         string
		requiredRole string
		userRole     string
		hasRole      bool
		wantAborted  bool
	}{
		{
			name:         "user has required role",
			requiredRole: "admin",
			userRole:     "admin",
			hasRole:      true,
			wantAborted:  false,
		},
		{
			name:         "user lacks required role",
			requiredRole: "admin",
			userRole:     "user",
			hasRole:      true,
			wantAborted:  true,
		},
		{
			name:         "role not set in context",
			requiredRole: "admin",
			hasRole:      false,
			wantAborted:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			if tt.hasRole {
				c.Set("role", tt.userRole)
			}

			middleware := RequireRole(tt.requiredRole)
			middleware(c)

			assert.Equal(t, tt.wantAborted, c.IsAborted())
			if tt.wantAborted {
				assert.Equal(t, http.StatusForbidden, w.Code)
			}
		})
	}
}

func TestValidateCredentials(t *testing.T) {
	service := NewService("test-secret")

	tests := []struct {
		name     string
		username string
		password string
		want     bool
	}{
		// Note: These tests will only work on Linux with actual system users
		// In a real testing environment, you would mock authenticateLinuxUser
		{
			name:     "invalid username",
			username: "nonexistentuser",
			password: "somepassword",
			want:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := service.validateCredentials(tt.username, tt.password)
			assert.Equal(t, tt.want, got)
		})
	}
}
