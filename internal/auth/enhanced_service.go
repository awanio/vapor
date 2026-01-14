package auth

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/pem"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/user"
	"path/filepath"
	"strings"
	"time"

	"github.com/awanio/vapor/internal/common"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/ssh"
)

// EnhancedService handles enhanced authentication with multiple methods
type EnhancedService struct {
	jwtSecret  []byte
	challenges map[string]*SSHChallenge // In-memory storage for challenges
}

// EnhancedLoginRequest supports multiple authentication methods
type EnhancedLoginRequest struct {
	Username   string `json:"username" binding:"required"`
	AuthType   string `json:"auth_type" binding:"required,oneof=password ssh_key"`
	Password   string `json:"password,omitempty"`
	PrivateKey string `json:"private_key,omitempty"`
	Passphrase string `json:"passphrase,omitempty"`
}

// EnhancedLoginResponse includes user information
type EnhancedLoginResponse struct {
	Token     string    `json:"token"`
	ExpiresAt int64     `json:"expires_at"`
	User      *UserInfo `json:"user"`
}

// UserInfo represents user information
type UserInfo struct {
	Username string `json:"username"`
	UID      int    `json:"uid"`
	GID      int    `json:"gid"`
	Home     string `json:"home"`
}

// SSHChallenge represents a challenge for SSH key authentication
type SSHChallenge struct {
	ID        string    `json:"id"`
	Challenge string    `json:"challenge"`
	Username  string    `json:"username"`
	ExpiresAt time.Time `json:"expires_at"`
}

// ChallengeRequest for SSH key authentication
type ChallengeRequest struct {
	Username string `json:"username" binding:"required"`
}

// ChallengeResponse contains the challenge data
type ChallengeResponse struct {
	Challenge   string `json:"challenge"`
	ChallengeID string `json:"challenge_id"`
	ExpiresAt   int64  `json:"expires_at"`
}

// VerifyRequest for SSH challenge verification
type VerifyRequest struct {
	Username    string `json:"username" binding:"required"`
	ChallengeID string `json:"challenge_id" binding:"required"`
	Signature   string `json:"signature" binding:"required"`
	PublicKey   string `json:"public_key,omitempty"`
}

// NewEnhancedService creates a new enhanced auth service
func NewEnhancedService(secret string) *EnhancedService {
	return &EnhancedService{
		jwtSecret:  []byte(secret),
		challenges: make(map[string]*SSHChallenge),
	}
}

// EnhancedLogin handles multi-method authentication
func (s *EnhancedService) EnhancedLogin(c *gin.Context) {
	var req EnhancedLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Invalid request", err.Error())
		return
	}

	var authenticated bool

	switch req.AuthType {
	case "password":
		authenticated = s.validatePasswordAuth(req.Username, req.Password)
		if !authenticated {
			common.SendError(c, http.StatusUnauthorized, common.ErrCodeUnauthorized, "Invalid username or password")
			return
		}

	case "ssh_key":
		authenticated = s.validateSSHKeyAuth(req.Username, req.PrivateKey, req.Passphrase)
		if !authenticated {
			common.SendError(c, http.StatusUnauthorized, common.ErrCodeUnauthorized, "SSH key authentication failed")
			return
		}

	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Invalid authentication type")
		return
	}

	// Get user information
	userInfo := s.getUserInfo(req.Username)
	if userInfo == nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get user information")
		return
	}

	// Create token
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		Username: req.Username,
		Role:     "admin",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "vapor-api",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(s.jwtSecret)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to generate token")
		return
	}

	common.SendSuccess(c, EnhancedLoginResponse{
		Token:     tokenString,
		ExpiresAt: expirationTime.Unix(),
		User:      userInfo,
	})
}

// CreateSSHChallenge creates a challenge for SSH key authentication
func (s *EnhancedService) CreateSSHChallenge(c *gin.Context) {
	var req ChallengeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Invalid request", err.Error())
		return
	}

	// Verify user exists
	if !s.userExists(req.Username) {
		common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "User not found")
		return
	}

	// Generate random challenge
	challengeBytes := make([]byte, 32)
	if _, err := rand.Read(challengeBytes); err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to generate challenge")
		return
	}

	challenge := &SSHChallenge{
		ID:        uuid.New().String(),
		Challenge: base64.StdEncoding.EncodeToString(challengeBytes),
		Username:  req.Username,
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}

	// Store challenge
	s.challenges[challenge.ID] = challenge

	// Clean up expired challenges
	go s.cleanupExpiredChallenges()

	common.SendSuccess(c, ChallengeResponse{
		Challenge:   challenge.Challenge,
		ChallengeID: challenge.ID,
		ExpiresAt:   challenge.ExpiresAt.Unix(),
	})
}

// VerifySSHChallenge verifies the signed challenge
func (s *EnhancedService) VerifySSHChallenge(c *gin.Context) {
	var req VerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Invalid request", err.Error())
		return
	}

	// Get challenge
	challenge, exists := s.challenges[req.ChallengeID]
	if !exists {
		common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "Challenge not found or expired")
		return
	}

	// Verify challenge hasn't expired
	if time.Now().After(challenge.ExpiresAt) {
		delete(s.challenges, req.ChallengeID)
		common.SendError(c, http.StatusUnauthorized, common.ErrCodeUnauthorized, "Challenge expired")
		return
	}

	// Verify username matches
	if challenge.Username != req.Username {
		common.SendError(c, http.StatusUnauthorized, common.ErrCodeUnauthorized, "Username mismatch")
		return
	}

	// Verify signature against user's authorized keys
	if !s.verifySSHSignature(req.Username, challenge.Challenge, req.Signature, req.PublicKey) {
		common.SendError(c, http.StatusUnauthorized, common.ErrCodeUnauthorized, "Invalid signature")
		return
	}

	// Remove used challenge
	delete(s.challenges, req.ChallengeID)

	// Get user information
	userInfo := s.getUserInfo(req.Username)
	if userInfo == nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get user information")
		return
	}

	// Create token
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		Username: req.Username,
		Role:     "admin",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "vapor-api",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(s.jwtSecret)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to generate token")
		return
	}

	common.SendSuccess(c, EnhancedLoginResponse{
		Token:     tokenString,
		ExpiresAt: expirationTime.Unix(),
		User:      userInfo,
	})
}

// GetUserKeys returns the user's authorized SSH keys
func (s *EnhancedService) GetUserKeys(c *gin.Context) {
	username := c.Param("username")

	// Verify user exists
	if !s.userExists(username) {
		common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "User not found")
		return
	}

	keys := s.getUserAuthorizedKeys(username)

	common.SendSuccess(c, gin.H{
		"username": username,
		"keys":     keys,
	})
}

// AuthMiddleware validates JWT tokens
func (s *EnhancedService) AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		var tokenString string

		// Get token from header
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			// Extract token from Bearer header
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				tokenString = parts[1]
			}
		}

		// If no header token, check query parameter (useful for downloads)
		if tokenString == "" {
			tokenString = c.Query("token")
		}

		// If still no token, error
		if tokenString == "" {
			common.SendError(c, http.StatusUnauthorized, common.ErrCodeUnauthorized, "Missing authorization token")
			c.Abort()
			return
		}

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

// RefreshToken handles JWT token refresh
func (s *EnhancedService) RefreshToken(c *gin.Context) {
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
			// Token is expired, but we can still extract claims
			if claims.ExpiresAt != nil {
				expiredTime := claims.ExpiresAt.Time
				// Allow refresh if token expired within the last 7 days
				if time.Since(expiredTime) <= 7*24*time.Hour {
					// Get user info
					userInfo := s.getUserInfo(claims.Username)
					if userInfo == nil {
						common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get user information")
						return
					}

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

					common.SendSuccess(c, EnhancedLoginResponse{
						Token:     newTokenString,
						ExpiresAt: newExpirationTime.Unix(),
						User:      userInfo,
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

	// Get user info
	userInfo := s.getUserInfo(claims.Username)
	if userInfo == nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get user information")
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

	common.SendSuccess(c, EnhancedLoginResponse{
		Token:     newTokenString,
		ExpiresAt: newExpirationTime.Unix(),
		User:      userInfo,
	})
}

// Helper methods

func (s *EnhancedService) validatePasswordAuth(username, password string) bool {
	return authenticateLinuxUser(username, password)
}

func (s *EnhancedService) validateSSHKeyAuth(username, privateKeyStr, passphrase string) bool {
	// Parse the private key
	var signer ssh.Signer
	var err error

	block, _ := pem.Decode([]byte(privateKeyStr))
	if block == nil {
		return false
	}

	// Try to parse with passphrase if provided
	if passphrase != "" {
		signer, err = ssh.ParsePrivateKeyWithPassphrase([]byte(privateKeyStr), []byte(passphrase))
	} else {
		signer, err = ssh.ParsePrivateKey([]byte(privateKeyStr))
	}

	if err != nil {
		return false
	}

	// Get the public key from the private key
	publicKey := signer.PublicKey()
	publicKeyStr := string(ssh.MarshalAuthorizedKey(publicKey))

	// Check against user's authorized_keys
	authorizedKeys := s.getUserAuthorizedKeys(username)
	for _, authorizedKey := range authorizedKeys {
		// Parse the authorized key to compare just the key part (ignoring comments)
		parsedKey, _, _, _, err := ssh.ParseAuthorizedKey([]byte(authorizedKey))
		if err != nil {
			continue
		}
		// Compare the marshalled forms to ensure they're the same key
		authorizedKeyStr := string(ssh.MarshalAuthorizedKey(parsedKey))
		if strings.TrimSpace(authorizedKeyStr) == strings.TrimSpace(publicKeyStr) {
			return true
		}
	}

	return false
}

func (s *EnhancedService) verifySSHSignature(username, challenge, signatureStr, publicKeyStr string) bool {
	// Decode the challenge and signature
	challengeBytes, err := base64.StdEncoding.DecodeString(challenge)
	if err != nil {
		return false
	}

	signatureBytes, err := base64.StdEncoding.DecodeString(signatureStr)
	if err != nil {
		return false
	}

	// If public key is provided, verify against it
	if publicKeyStr != "" {
		publicKey, _, _, _, err := ssh.ParseAuthorizedKey([]byte(publicKeyStr))
		if err != nil {
			return false
		}

		// Create SSH signature
		sig := &ssh.Signature{
			Format: publicKey.Type(),
			Blob:   signatureBytes,
		}

		// Verify signature
		err = publicKey.Verify(challengeBytes, sig)
		return err == nil
	}

	// Otherwise check against user's authorized_keys
	authorizedKeys := s.getUserAuthorizedKeys(username)
	for _, authorizedKeyStr := range authorizedKeys {
		publicKey, _, _, _, err := ssh.ParseAuthorizedKey([]byte(authorizedKeyStr))
		if err != nil {
			continue
		}

		// Create SSH signature
		sig := &ssh.Signature{
			Format: publicKey.Type(),
			Blob:   signatureBytes,
		}

		// Verify signature
		if err := publicKey.Verify(challengeBytes, sig); err == nil {
			return true
		}
	}

	return false
}

func (s *EnhancedService) getUserAuthorizedKeys(username string) []string {
	u, err := user.Lookup(username)
	if err != nil {
		return []string{}
	}

	authorizedKeysPath := filepath.Join(u.HomeDir, ".ssh", "authorized_keys")
	content, err := os.ReadFile(authorizedKeysPath)
	if err != nil {
		return []string{}
	}

	lines := strings.Split(string(content), "\n")
	var keys []string
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" && !strings.HasPrefix(line, "#") {
			keys = append(keys, line)
		}
	}

	return keys
}

func (s *EnhancedService) userExists(username string) bool {
	_, err := user.Lookup(username)
	return err == nil
}

func (s *EnhancedService) getUserInfo(username string) *UserInfo {
	u, err := user.Lookup(username)
	if err != nil {
		return nil
	}

	uid := 0
	gid := 0
	fmt.Sscanf(u.Uid, "%d", &uid)
	fmt.Sscanf(u.Gid, "%d", &gid)

	return &UserInfo{
		Username: u.Username,
		UID:      uid,
		GID:      gid,
		Home:     u.HomeDir,
	}
}

func (s *EnhancedService) cleanupExpiredChallenges() {
	now := time.Now()
	for id, challenge := range s.challenges {
		if now.After(challenge.ExpiresAt) {
			delete(s.challenges, id)
		}
	}
}
