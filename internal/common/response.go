package common

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
)

// APIResponse represents the standard API response format
type APIResponse struct {
	Status string      `json:"status"`
	Data   interface{} `json:"data"`
	Error  *APIError   `json:"error"`
}

// APIError represents error details in the response
type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

// SuccessResponse creates a successful API response
func SuccessResponse(data interface{}) APIResponse {
	return APIResponse{
		Status: "success",
		Data:   data,
		Error:  nil,
	}
}

// ErrorResponse creates an error API response
func ErrorResponse(code, message string, details ...string) APIResponse {
	err := &APIError{
		Code:    code,
		Message: message,
	}
	if len(details) > 0 {
		err.Details = details[0]
	}
	return APIResponse{
		Status: "error",
		Data:   nil,
		Error:  err,
	}
}

// SendSuccess sends a successful response
func SendSuccess(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, SuccessResponse(data))
}

// SendError sends an error response with appropriate status code
func SendError(c *gin.Context, statusCode int, code, message string, details ...string) {
	c.JSON(statusCode, ErrorResponse(code, message, details...))
}

// Common error codes
const (
	ErrCodeValidation    = "VALIDATION_ERROR"
	ErrCodeUnauthorized  = "UNAUTHORIZED"
	ErrCodeForbidden     = "FORBIDDEN"
	ErrCodeNotFound      = "NOT_FOUND"
	ErrCodeInternal      = "INTERNAL_ERROR"
	ErrCodeBadRequest    = "BAD_REQUEST"
	ErrCodeConflict      = "CONFLICT"
	ErrCodeNotImplemented = "NOT_IMPLEMENTED"
)

// RespondSuccess writes a successful response to http.ResponseWriter
func RespondSuccess(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(SuccessResponse(data))
}

// RespondError writes an error response to http.ResponseWriter
func RespondError(w http.ResponseWriter, statusCode int, code, message string, details ...string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(ErrorResponse(code, message, details...))
}
