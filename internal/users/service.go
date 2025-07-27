package users

import (
	"bufio"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/vapor/system-api/internal/common"
	"golang.org/x/crypto/bcrypt"
)

// Service handles user management
type Service struct{}

// NewService creates a new user service
func NewService() *Service {
	return &Service{}
}

// User represents a system user
type User struct {
	Username string `json:"username"`
	UID      string `json:"uid"`
	GID      string `json:"gid"`
	HomeDir  string `json:"home"`
	Shell    string `json:"shell"`
}

// UserRequest represents user creation/modification request
type UserRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password"`
	Groups   string `json:"groups"`
}

// GetUsers lists all users
func (s *Service) GetUsers(c *gin.Context) {
	users, err := s.listUsers()
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to list users", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"users": users})
}

// CreateUser creates a new user
func (s *Service) CreateUser(c *gin.Context) {
	// Check if user commands are available
	if !isUserCommandsAvailable() {
		common.SendError(c, http.StatusNotImplemented, common.ErrCodeNotImplemented, 
			"User management commands are only available on Linux systems")
		return
	}

	var req UserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Invalid request", err.Error())
		return
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to hash password", err.Error())
		return
	}

	// useradd command
	cmdArgs := []string{"-m", "-p", string(hash), req.Username}
	if req.Groups != "" {
		cmdArgs = append(cmdArgs, "-G", req.Groups)
	}
	cmd := exec.Command("useradd", cmdArgs...)
	if output, err := cmd.CombinedOutput(); err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to create user", string(output))
		return
	}

	common.SendSuccess(c, gin.H{"message": fmt.Sprintf("User %s created", req.Username)})
}

// UpdateUser modifies an existing user
func (s *Service) UpdateUser(c *gin.Context) {
	username := c.Param("username")
	var req UserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeValidation, "Invalid request", err.Error())
		return
	}

	if req.Password != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to hash password", err.Error())
			return
		}

		cmd := exec.Command("usermod", "-p", string(hash), username)
		if output, err := cmd.CombinedOutput(); err != nil {
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to update user password", string(output))
			return
		}
	}

	if req.Groups != "" {
		cmd := exec.Command("usermod", "-G", req.Groups, username)
		if output, err := cmd.CombinedOutput(); err != nil {
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to update user groups", string(output))
			return
		}
	}

	common.SendSuccess(c, gin.H{"message": fmt.Sprintf("User %s updated", username)})
}

// DeleteUser deletes a user
func (s *Service) DeleteUser(c *gin.Context) {
	username := c.Param("username")
	cmd := exec.Command("userdel", "-r", username)
	if output, err := cmd.CombinedOutput(); err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to delete user", string(output))
		return
	}

	common.SendSuccess(c, gin.H{"message": fmt.Sprintf("User %s deleted", username)})
}

// listUsers retrieves all users from /etc/passwd
func (s *Service) listUsers() ([]User, error) {
	passwdFile := getPasswordFile()
	if passwdFile == "" {
		return []User{}, fmt.Errorf("password file not available on this platform")
	}
	file, err := os.Open(passwdFile)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var users []User
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "#") {
			continue // Skip comments
		}
		parts := strings.Split(line, ":")
		if len(parts) < 7 {
			continue
		}
		users = append(users, User{
			Username: parts[0],
			UID:      parts[2],
			GID:      parts[3],
			HomeDir:  parts[5],
			Shell:    parts[6],
		})
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}
	return users, nil
}
