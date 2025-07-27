package common

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestSuccessResponse(t *testing.T) {
	data := map[string]string{"message": "success"}
	response := SuccessResponse(data)

	assert.Equal(t, "success", response.Status)
	assert.Equal(t, data, response.Data)
	assert.Nil(t, response.Error)
}

func TestErrorResponse(t *testing.T) {
	tests := []struct {
		name    string
		code    string
		message string
		details []string
		want    APIError
	}{
		{
			name:    "error without details",
			code:    ErrCodeInternal,
			message: "Something went wrong",
			details: []string{},
			want: APIError{
				Code:    ErrCodeInternal,
				Message: "Something went wrong",
				Details: "",
			},
		},
		{
			name:    "error with details",
			code:    ErrCodeValidation,
			message: "Validation failed",
			details: []string{"Field 'name' is required"},
			want: APIError{
				Code:    ErrCodeValidation,
				Message: "Validation failed",
				Details: "Field 'name' is required",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			response := ErrorResponse(tt.code, tt.message, tt.details...)
			
			assert.Equal(t, "error", response.Status)
			assert.Nil(t, response.Data)
			assert.NotNil(t, response.Error)
			assert.Equal(t, tt.want.Code, response.Error.Code)
			assert.Equal(t, tt.want.Message, response.Error.Message)
			assert.Equal(t, tt.want.Details, response.Error.Details)
		})
	}
}

func TestSendSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	data := map[string]interface{}{"test": "data"}
	SendSuccess(c, data)

	assert.Equal(t, http.StatusOK, w.Code)

	var response APIResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "success", response.Status)
	assert.Nil(t, response.Error)
}

func TestSendError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	SendError(c, http.StatusBadRequest, ErrCodeValidation, "Invalid input", "Missing field")

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response APIResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "error", response.Status)
	assert.NotNil(t, response.Error)
	assert.Equal(t, ErrCodeValidation, response.Error.Code)
	assert.Equal(t, "Invalid input", response.Error.Message)
	assert.Equal(t, "Missing field", response.Error.Details)
}
