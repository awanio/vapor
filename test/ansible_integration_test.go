//go:build integration
// +build integration

package test

import (
"bytes"
"encoding/json"
"net/http"
"net/http/httptest"
"testing"
"time"

"github.com/gin-gonic/gin"
"github.com/awanio/vapor/internal/ansible"
"github.com/awanio/vapor/internal/routes"
)

func setupAnsibleTestRouter() (*gin.Engine, *ansible.Executor) {
gin.SetMode(gin.TestMode)
router := gin.New()

// Create test executor
tempDir := "/tmp/ansible-test"
exec, _ := ansible.NewExecutor(tempDir)

// Setup routes
api := router.Group("/api/v1")
routes.AnsibleRoutes(api, exec)

return router, exec
}

// TestAnsibleIntegrationListPlaybooks tests the GET /ansible/playbooks endpoint
func TestAnsibleIntegrationListPlaybooks(t *testing.T) {
router, _ := setupAnsibleTestRouter()

req, _ := http.NewRequest("GET", "/api/v1/ansible/playbooks", nil)
w := httptest.NewRecorder()
router.ServeHTTP(w, req)

if w.Code != http.StatusOK {
t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
}

var response map[string]interface{}
if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
t.Fatalf("Failed to parse response: %v", err)
}

if _, ok := response["playbooks"]; !ok {
t.Error("Response should contain 'playbooks' field")
}
}

// TestAnsibleIntegrationRunPlaybook tests the POST /ansible/playbooks/run endpoint
func TestAnsibleIntegrationRunPlaybook(t *testing.T) {
router, _ := setupAnsibleTestRouter()

payload := ansible.PlaybookRequest{
Playbook:  "test.yml",
Inventory: "localhost",
Timeout:   300,
}

body, _ := json.Marshal(payload)
req, _ := http.NewRequest("POST", "/api/v1/ansible/playbooks/run", bytes.NewBuffer(body))
req.Header.Set("Content-Type", "application/json")

w := httptest.NewRecorder()
router.ServeHTTP(w, req)

// Should return 202 Accepted or error
if w.Code != http.StatusAccepted && w.Code != http.StatusInternalServerError {
t.Errorf("Expected status 202 or 500, got %d", w.Code)
}
}

// TestAnsibleIntegrationRunAdHoc tests the POST /ansible/adhoc endpoint
func TestAnsibleIntegrationRunAdHoc(t *testing.T) {
router, _ := setupAnsibleTestRouter()

tests := []struct {
name       string
payload    ansible.AdHocRequest
wantStatus int
}{
{
name: "valid request",
payload: ansible.AdHocRequest{
Hosts:     "localhost",
Module:    "ping",
Inventory: "localhost",
Timeout:   60,
},
wantStatus: http.StatusAccepted,
},
{
name: "missing hosts",
payload: ansible.AdHocRequest{
Module:    "ping",
Inventory: "localhost",
},
wantStatus: http.StatusBadRequest,
},
{
name: "missing module",
payload: ansible.AdHocRequest{
Hosts:     "localhost",
Inventory: "localhost",
},
wantStatus: http.StatusBadRequest,
},
}

for _, tt := range tests {
t.Run(tt.name, func(t *testing.T) {
body, _ := json.Marshal(tt.payload)
req, _ := http.NewRequest("POST", "/api/v1/ansible/adhoc", bytes.NewBuffer(body))
req.Header.Set("Content-Type", "application/json")

w := httptest.NewRecorder()
router.ServeHTTP(w, req)

// Check for expected status or server error
if w.Code != tt.wantStatus && w.Code != http.StatusInternalServerError {
t.Errorf("Expected status %d or 500, got %d", tt.wantStatus, w.Code)
}
})
}
}

// TestAnsibleIntegrationScheduledTasks tests schedule-related endpoints
func TestAnsibleIntegrationScheduledTasks(t *testing.T) {
router, _ := setupAnsibleTestRouter()

t.Run("CreateSchedule", func(t *testing.T) {
payload := map[string]interface{}{
"name":     "Daily Update",
"schedule": "0 2 * * *", // Daily at 2 AM
"playbook": ansible.PlaybookRequest{
Playbook:  "update.yml",
Inventory: "all",
Timeout:   3600,
},
}

body, _ := json.Marshal(payload)
req, _ := http.NewRequest("POST", "/api/v1/ansible/schedules", bytes.NewBuffer(body))
req.Header.Set("Content-Type", "application/json")

w := httptest.NewRecorder()
router.ServeHTTP(w, req)

if w.Code != http.StatusCreated {
t.Errorf("Expected status %d, got %d", http.StatusCreated, w.Code)
}

var response map[string]interface{}
if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
t.Fatalf("Failed to parse response: %v", err)
}

if _, ok := response["id"]; !ok {
t.Error("Response should contain schedule ID")
}
})

t.Run("ListSchedules", func(t *testing.T) {
req, _ := http.NewRequest("GET", "/api/v1/ansible/schedules", nil)
w := httptest.NewRecorder()
router.ServeHTTP(w, req)

if w.Code != http.StatusOK {
t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
}

var response map[string]interface{}
if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
t.Fatalf("Failed to parse response: %v", err)
}

if _, ok := response["schedules"]; !ok {
t.Error("Response should contain 'schedules' field")
}
})
}

// TestAnsibleIntegrationExecutions tests execution-related endpoints
func TestAnsibleIntegrationExecutions(t *testing.T) {
router, exec := setupAnsibleTestRouter()

// Create a test execution
testExec := &ansible.ExecutionResult{
ID:        "test-exec-001",
Type:      "playbook",
Status:    "success",
StartTime: time.Now(),
Output:    []string{"Test output"},
ExitCode:  0,
}

// Store the execution (we need to add this method to executor)
exec.StoreExecution(testExec)

t.Run("ListExecutions", func(t *testing.T) {
req, _ := http.NewRequest("GET", "/api/v1/ansible/executions", nil)
w := httptest.NewRecorder()
router.ServeHTTP(w, req)

if w.Code != http.StatusOK {
t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
}

var response map[string]interface{}
if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
t.Fatalf("Failed to parse response: %v", err)
}

if _, ok := response["executions"]; !ok {
t.Error("Response should contain 'executions' field")
}
})

t.Run("GetExecution", func(t *testing.T) {
req, _ := http.NewRequest("GET", "/api/v1/ansible/executions/test-exec-001", nil)
w := httptest.NewRecorder()
router.ServeHTTP(w, req)

if w.Code != http.StatusOK {
t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
}

var response ansible.ExecutionResult
if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
t.Fatalf("Failed to parse response: %v", err)
}

if response.ID != "test-exec-001" {
t.Errorf("Expected execution ID 'test-exec-001', got '%s'", response.ID)
}
})

t.Run("GetNonExistentExecution", func(t *testing.T) {
req, _ := http.NewRequest("GET", "/api/v1/ansible/executions/non-existent", nil)
w := httptest.NewRecorder()
router.ServeHTTP(w, req)

if w.Code != http.StatusNotFound {
t.Errorf("Expected status %d, got %d", http.StatusNotFound, w.Code)
}
})
}
