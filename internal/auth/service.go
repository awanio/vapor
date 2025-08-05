package auth

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/awanio/vapor/internal/common"
	"golang.org/x/crypto/bcrypt"
)

// Version is injected at build time using -ldflags
// Empty value means development mode, non-empty means production
var Version string

// Service handles authentication
type Service struct {
	jwtSecret []byte
}

// Claims represents JWT claims
type Claims struct {
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

// LoginRequest represents login credentials
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse represents the login response
type LoginResponse struct {
	Token     string `json:"token"`
	ExpiresAt int64  `json:"expires_at"`
}

// NewService creates a new auth service
func NewService(secret string) *Service {
	return &Service{
		jwtSecret: []byte(secret),
	}
}

// Login handles user authentication
func (s *Service) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Invalid request", err.Error())
		return
	}

	// TODO: In production, fetch user from database
	// For demo, using hardcoded admin user
	if !s.validateCredentials(req.Username, req.Password) {
		common.SendError(c, http.StatusUnauthorized, common.ErrCodeUnauthorized, "Invalid credentials")
		return
	}

	// Create token
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		Username: req.Username,
		Role:     "admin", // TODO: Get role from database
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "system-api",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(s.jwtSecret)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to generate token")
		return
	}

	common.SendSuccess(c, LoginResponse{
		Token:     tokenString,
		ExpiresAt: expirationTime.Unix(),
	})
}

// AuthMiddleware validates JWT tokens
func (s *Service) AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get token from header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			common.SendError(c, http.StatusUnauthorized, common.ErrCodeUnauthorized, "Missing authorization header")
			c.Abort()
			return
		}

		// Extract token
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			common.SendError(c, http.StatusUnauthorized, common.ErrCodeUnauthorized, "Invalid authorization header format")
			c.Abort()
			return
		}

		tokenString := parts[1]

		// Parse and validate token
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return s.jwtSecret, nil
		})

		if err != nil || !token.Valid {
			common.SendError(c, http.StatusUnauthorized, common.ErrCodeUnauthorized, "Invalid or expired token")
			c.Abort()
			return
		}

		// Store claims in context
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)
		c.Next()
	}
}

// validateCredentials validates username and password
func (s *Service) validateCredentials(username, password string) bool {
	// Check if it's the admin user
	if username == "admin" {
		// Only allow hardcoded admin credentials in development mode (when Version is empty)
		if Version != "" {
			// Production mode - do not allow hardcoded admin
			return false
		}
		// Hash for "admin123" - only available in development/testing mode
		hashedPassword := "$2a$10$TfAKWyGmr368MNVwiu3kaugi2Tax5MhB0XhlJjJAHFi1EOSTr061G"
		err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
		return err == nil
	} else {
		// For non-admin users, validate against Linux system authentication
		return authenticateLinuxUser(username, password)
	}
}

// RequireRole checks if user has required role
func RequireRole(requiredRole string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists || role != requiredRole {
			common.SendError(c, http.StatusForbidden, common.ErrCodeForbidden, "Insufficient permissions")
			c.Abort()
			return
		}
		c.Next()
	}
}
