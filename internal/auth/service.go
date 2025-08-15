package auth

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/awanio/vapor/internal/common"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)


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

// RefreshResponse represents the token refresh response
type RefreshResponse struct {
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

	// Validate against Linux system authentication
	if !s.validateCredentials(req.Username, req.Password) {
		common.SendError(c, http.StatusUnauthorized, common.ErrCodeUnauthorized, "Invalid credentials")
		return
	}

	// Create token
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		Username: req.Username,
		Role:     "admin", // Default role for authenticated users
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

// validateCredentials validates username and password against Linux system
func (s *Service) validateCredentials(username, password string) bool {
	// Validate against Linux system authentication
	return authenticateLinuxUser(username, password)
}

// RefreshToken handles JWT token refresh
func (s *Service) RefreshToken(c *gin.Context) {
	// Get token from header
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		common.SendError(c, http.StatusUnauthorized, common.ErrCodeUnauthorized, "Missing authorization header")
		return
	}

	// Extract token
	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		common.SendError(c, http.StatusUnauthorized, common.ErrCodeUnauthorized, "Invalid authorization header format")
		return
	}

	tokenString := parts[1]

	// Parse and validate token
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return s.jwtSecret, nil
	})

	if err != nil {
		// Check if token is expired but was valid
		// In JWT v5, we check if the error contains the expired token error
		if errors.Is(err, jwt.ErrTokenExpired) {
			// Token is expired, but we can still extract claims to check if it was recently expired
			if claims.ExpiresAt != nil {
				expiredTime := claims.ExpiresAt.Time
				// Allow refresh if token expired within the last 7 days
				if time.Since(expiredTime) <= 7*24*time.Hour {
					// Create new token with same claims but new expiration
					newExpirationTime := time.Now().Add(24 * time.Hour)
					newClaims := &Claims{
						Username: claims.Username,
						Role:     claims.Role,
						RegisteredClaims: jwt.RegisteredClaims{
							ExpiresAt: jwt.NewNumericDate(newExpirationTime),
							IssuedAt:  jwt.NewNumericDate(time.Now()),
							Issuer:    claims.Issuer,
						},
					}

					newToken := jwt.NewWithClaims(jwt.SigningMethodHS256, newClaims)
					newTokenString, err := newToken.SignedString(s.jwtSecret)
					if err != nil {
						common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to generate new token")
						return
					}

					common.SendSuccess(c, RefreshResponse{
						Token:     newTokenString,
						ExpiresAt: newExpirationTime.Unix(),
					})
					return
				}
			}
			common.SendError(c, http.StatusUnauthorized, common.ErrCodeUnauthorized, "Token expired beyond refresh window")
			return
		}
		common.SendError(c, http.StatusUnauthorized, common.ErrCodeUnauthorized, "Invalid token")
		return
	}

	if !token.Valid {
		common.SendError(c, http.StatusUnauthorized, common.ErrCodeUnauthorized, "Invalid token")
		return
	}

	// Token is still valid, issue a new one with extended expiration
	newExpirationTime := time.Now().Add(24 * time.Hour)
	newClaims := &Claims{
		Username: claims.Username,
		Role:     claims.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(newExpirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    claims.Issuer,
		},
	}

	newToken := jwt.NewWithClaims(jwt.SigningMethodHS256, newClaims)
	newTokenString, err := newToken.SignedString(s.jwtSecret)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to generate new token")
		return
	}

	common.SendSuccess(c, RefreshResponse{
		Token:     newTokenString,
		ExpiresAt: newExpirationTime.Unix(),
	})
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
