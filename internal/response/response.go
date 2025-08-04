package response

// Response represents a standard API response
type Response struct {
	Status string      `json:"status"`
	Data   interface{} `json:"data,omitempty"`
	Error  *Error     `json:"error,omitempty"`
}

// Error represents an API error
type Error struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

// Success creates a success response with data
func Data(data interface{}) Response {
	return Response{
		Status: "success",
		Data:   data,
	}
}

// Error creates an error response
func ErrorResponse(message string, err error) Response {
	return Response{
		Status: "error",
		Error: &Error{
			Code:    "INTERNAL_ERROR",
			Message: message,
			Details: err.Error(),
		},
	}
}
