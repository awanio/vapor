package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"time"

	"github.com/awanio/vapor/internal/database"
	"github.com/google/uuid"
)

// APIToken represents an API access token
type APIToken struct {
	ID         string     `json:"id"`
	Name       string     `json:"name"`
	Username   string     `json:"username"`
	CreatedAt  time.Time  `json:"created_at"`
	ExpiresAt  *time.Time `json:"expires_at,omitempty"`
	RevokedAt  *time.Time `json:"revoked_at,omitempty"`
	LastUsedAt *time.Time `json:"last_used_at,omitempty"`
}

// TokenService handles API token operations
type TokenService struct {
	db *database.DB
}

// NewTokenService creates a new TokenService
func NewTokenService() (*TokenService, error) {
	db, err := database.GetInstance()
	if err != nil {
		return nil, err
	}
	return &TokenService{db: db}, nil
}

// GenerateToken generates a secure random token and its hash
func GenerateToken() (string, string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", "", err
	}
	token := hex.EncodeToString(bytes)
	hash := sha256.Sum256([]byte(token))
	tokenHash := hex.EncodeToString(hash[:])
	return token, tokenHash, nil
}

// CreateToken creates a new API token for a user
func (s *TokenService) CreateToken(username, name string, expiresAt *time.Time) (*APIToken, string, error) {
	token, tokenHash, err := GenerateToken()
	if err != nil {
		return nil, "", err
	}

	id := uuid.New().String()
	now := time.Now()

	apiToken := &APIToken{
		ID:        id,
		Name:      name,
		Username:  username,
		CreatedAt: now,
		ExpiresAt: expiresAt,
	}

	query := `
INSERT INTO api_tokens (id, name, token_hash, username, created_at, expires_at)
VALUES (?, ?, ?, ?, ?, ?)
`

	err = s.db.Transaction(func(tx *sql.Tx) error {
		_, err := tx.Exec(query, id, name, tokenHash, username, now, expiresAt)
		return err
	})

	if err != nil {
		return nil, "", err
	}

	return apiToken, token, nil
}

// VerifyToken verifies a token and returns the token details
func (s *TokenService) VerifyToken(token string) (*APIToken, error) {
	hash := sha256.Sum256([]byte(token))
	tokenHash := hex.EncodeToString(hash[:])

	var apiToken APIToken
	query := `
SELECT id, name, username, created_at, expires_at, revoked_at, last_used_at
FROM api_tokens
WHERE token_hash = ?
`

	err := s.db.Transaction(func(tx *sql.Tx) error {
		row := tx.QueryRow(query, tokenHash)
		return row.Scan(&apiToken.ID, &apiToken.Name, &apiToken.Username, &apiToken.CreatedAt, &apiToken.ExpiresAt, &apiToken.RevokedAt, &apiToken.LastUsedAt)
	})

	if err != nil {
		return nil, err
	}

	// Check if revoked
	if apiToken.RevokedAt != nil {
		return nil, errors.New("token revoked")
	}

	// Check if expired
	if apiToken.ExpiresAt != nil && apiToken.ExpiresAt.Before(time.Now()) {
		return nil, errors.New("token expired")
	}

	// Update last used
	go s.updateLastUsed(apiToken.ID)

	return &apiToken, nil
}

func (s *TokenService) updateLastUsed(id string) {
	s.db.Transaction(func(tx *sql.Tx) error {
		_, err := tx.Exec("UPDATE api_tokens SET last_used_at = ? WHERE id = ?", time.Now(), id)
		return err
	})
}

// RevokeToken revokes a token
func (s *TokenService) RevokeToken(id, username string) error {
	return s.db.Transaction(func(tx *sql.Tx) error {
		// Ensure user owns the token
		var count int
		err := tx.QueryRow("SELECT count(*) FROM api_tokens WHERE id = ? AND username = ?", id, username).Scan(&count)
		if err != nil {
			return err
		}
		if count == 0 {
			return errors.New("token not found or not owned by user")
		}

		_, err = tx.Exec("UPDATE api_tokens SET revoked_at = ? WHERE id = ?", time.Now(), id)
		return err
	})
}

// ListTokens lists tokens for a user
func (s *TokenService) ListTokens(username string) ([]APIToken, error) {
	var tokens []APIToken
	err := s.db.Transaction(func(tx *sql.Tx) error {
		rows, err := tx.Query("SELECT id, name, username, created_at, expires_at, revoked_at, last_used_at FROM api_tokens WHERE username = ? AND revoked_at IS NULL ORDER BY created_at DESC", username)
		if err != nil {
			return err
		}
		defer rows.Close()

		for rows.Next() {
			var t APIToken
			if err := rows.Scan(&t.ID, &t.Name, &t.Username, &t.CreatedAt, &t.ExpiresAt, &t.RevokedAt, &t.LastUsedAt); err != nil {
				return err
			}
			tokens = append(tokens, t)
		}
		return nil
	})
	return tokens, err
}

// GetToken gets a specific token
func (s *TokenService) GetToken(id, username string) (*APIToken, error) {
	var t APIToken
	err := s.db.Transaction(func(tx *sql.Tx) error {
		row := tx.QueryRow("SELECT id, name, username, created_at, expires_at, revoked_at, last_used_at FROM api_tokens WHERE id = ? AND username = ?", id, username)
		return row.Scan(&t.ID, &t.Name, &t.Username, &t.CreatedAt, &t.ExpiresAt, &t.RevokedAt, &t.LastUsedAt)
	})
	if err != nil {
		return nil, err
	}
	return &t, nil
}
