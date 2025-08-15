//go:build e2e
// +build e2e

package test

import (
"bytes"
"encoding/json"
"fmt"
"io"
"net/http"
"os"
"strings"
"testing"
"time"

"github.com/awanio/vapor/internal/ansible"
"github.com/gorilla/websocket"
"github.com/stretchr/testify/assert"
"github.com/stretchr/testify/require"
)

const (
ansibleBaseURL = "http://localhost:8080/api/v1/ansible"
testPlaybookPrefix = "test-playbook"
testInventoryPrefix = "test-inventory"
)

// TestE2EAnsibleWorkflow tests the complete Ansible automation workflow
func TestE2EAnsibleWorkflow(t *testing.T) {
// Skip if not in E2E mode
if os.Getenv("RUN_E2E_TESTS") != "true" {
t.Skip("Skipping E2E tests. Set RUN_E2E_TESTS=true to run")
}

// Ensure server is running
client := &http.Client{Timeout: 30 * time.Second}

// Test data cleanup tracking
var createdPlaybooks []string
var createdInventories []string
var createdSchedules []string

// Cleanup function
defer func() {
for _, name := range createdPlaybooks {
deletePlaybook(t, client, name)
}
for _, name := range createdInventories {
// Inventory cleanup if needed
_ = name
}
for _, id := range createdSchedules {
deleteSchedule(t, client, id)
}
}()

t.Run("1. Playbook Management", func(t *testing.T) {
t.Run("List Initial Playbooks", func(t *testing.T) {
playbooks := listPlaybooks(t, client)
t.Logf("Found %d existing playbooks", len(playbooks))
})

t.Run("Upload Playbook", func(t *testing.T) {
playbookName := fmt.Sprintf("%s-upload-%d.yml", testPlaybookPrefix, time.Now().Unix())
uploadReq := ansible.PlaybookUploadRequest{
Name: playbookName,
Content: `---
- name: Test Playbook
  hosts: localhost
  gather_facts: no
  tasks:
    - name: Test ping
      ping:
    - name: Echo message
      debug:
        msg: "E2E test playbook executed successfully"
`,
Description: "E2E test playbook",
Tags:        []string{"test", "e2e"},
}

resp := makeAnsibleRequest(t, client, "POST", "/playbooks/upload", uploadReq)
require.Equal(t, http.StatusCreated, resp.StatusCode, "Should upload playbook successfully")
createdPlaybooks = append(createdPlaybooks, playbookName)

// Verify playbook was uploaded
playbooks := listPlaybooks(t, client)
found := false
for _, pb := range playbooks {
if pb["name"] == playbookName {
found = true
break
}
}
assert.True(t, found, "Uploaded playbook should be in the list")
})

t.Run("Get Playbook Details", func(t *testing.T) {
if len(createdPlaybooks) == 0 {
t.Skip("No playbook created to get details")
}

playbookName := createdPlaybooks[0]
resp := makeAnsibleRequest(t, client, "GET", fmt.Sprintf("/playbooks/%s", playbookName), nil)
require.Equal(t, http.StatusOK, resp.StatusCode, "Should get playbook details")

var playbook ansible.PlaybookInfo
body, _ := io.ReadAll(resp.Body)
err := json.Unmarshal(body, &playbook)
require.NoError(t, err)
assert.Equal(t, playbookName, playbook.Name)
assert.NotEmpty(t, playbook.Content)
})

t.Run("Validate Playbook", func(t *testing.T) {
if len(createdPlaybooks) == 0 {
t.Skip("No playbook created to validate")
}

validateReq := map[string]string{
"name": createdPlaybooks[0],
}

resp := makeAnsibleRequest(t, client, "POST", "/playbooks/validate", validateReq)
require.Equal(t, http.StatusOK, resp.StatusCode, "Should validate playbook")

var result map[string]interface{}
body, _ := io.ReadAll(resp.Body)
err := json.Unmarshal(body, &result)
require.NoError(t, err)

// Check if ansible-playbook is available
if _, exists := result["error"]; exists && strings.Contains(result["error"].(string), "executable file not found") {
t.Log("ansible-playbook not available, skipping validation check")
} else {
assert.True(t, result["valid"].(bool), "Playbook should be valid")
}
})
})

t.Run("2. Template Operations", func(t *testing.T) {
t.Run("List Templates", func(t *testing.T) {
resp := makeAnsibleRequest(t, client, "GET", "/playbooks/templates", nil)
require.Equal(t, http.StatusOK, resp.StatusCode, "Should list templates")

var result map[string]interface{}
body, _ := io.ReadAll(resp.Body)
err := json.Unmarshal(body, &result)
require.NoError(t, err)

templates := result["templates"].([]interface{})
assert.NotEmpty(t, templates, "Should have at least one template")

// Verify template structure
for _, tmpl := range templates {
template := tmpl.(map[string]interface{})
assert.NotEmpty(t, template["id"], "Template should have ID")
assert.NotEmpty(t, template["name"], "Template should have name")
assert.NotEmpty(t, template["content"], "Template should have content")
}
})

t.Run("Create Playbook from Template", func(t *testing.T) {
playbookName := fmt.Sprintf("%s-from-template-%d.yml", testPlaybookPrefix, time.Now().Unix())
createReq := map[string]interface{}{
"template_id": "system-update",
"name":        playbookName,
"variables": map[string]interface{}{
"target_hosts": "webservers",
"update_cache": true,
},
}

resp := makeAnsibleRequest(t, client, "POST", "/playbooks/from-template", createReq)
require.Equal(t, http.StatusCreated, resp.StatusCode, "Should create playbook from template")
createdPlaybooks = append(createdPlaybooks, playbookName)
})
})

t.Run("3. Ad-hoc Commands", func(t *testing.T) {
t.Run("Run Ad-hoc Ping", func(t *testing.T) {
adhocReq := ansible.AdHocRequest{
Hosts:     "localhost",
Module:    "ping",
Inventory: "localhost,",
Timeout:   30,
}

resp := makeAnsibleRequest(t, client, "POST", "/adhoc", adhocReq)

// Check if ansible is available
if resp.StatusCode == http.StatusInternalServerError {
body, _ := io.ReadAll(resp.Body)
var result map[string]interface{}
json.Unmarshal(body, &result)
if err, ok := result["error"].(string); ok && strings.Contains(err, "executable file not found") {
t.Skip("ansible not available, skipping ad-hoc test")
}
}

require.Equal(t, http.StatusAccepted, resp.StatusCode, "Should accept ad-hoc command")

var result ansible.ExecutionResult
body, _ := io.ReadAll(resp.Body)
err := json.Unmarshal(body, &result)
require.NoError(t, err)
assert.NotEmpty(t, result.ID, "Should return execution ID")
})
})

t.Run("4. Playbook Execution", func(t *testing.T) {
if len(createdPlaybooks) == 0 {
t.Skip("No playbook created to execute")
}

t.Run("Run Playbook", func(t *testing.T) {
runReq := ansible.PlaybookRequest{
Playbook:  createdPlaybooks[0],
Inventory: "localhost,",
Timeout:   60,
}

resp := makeAnsibleRequest(t, client, "POST", "/playbooks/run", runReq)

// Check if ansible-playbook is available
if resp.StatusCode == http.StatusInternalServerError {
body, _ := io.ReadAll(resp.Body)
var result map[string]interface{}
json.Unmarshal(body, &result)
if err, ok := result["error"].(string); ok && strings.Contains(err, "executable file not found") {
t.Skip("ansible-playbook not available, skipping execution test")
}
}

require.Equal(t, http.StatusAccepted, resp.StatusCode, "Should accept playbook execution")

var result ansible.ExecutionResult
body, _ := io.ReadAll(resp.Body)
err := json.Unmarshal(body, &result)
require.NoError(t, err)
assert.NotEmpty(t, result.ID, "Should return execution ID")

// Store execution ID for later tests
t.Logf("Execution ID: %s", result.ID)

// Test execution retrieval
time.Sleep(2 * time.Second) // Wait for execution to complete

getResp := makeAnsibleRequest(t, client, "GET", fmt.Sprintf("/executions/%s", result.ID), nil)
require.Equal(t, http.StatusOK, getResp.StatusCode, "Should get execution details")
})
})

t.Run("5. Inventory Management", func(t *testing.T) {
t.Run("Generate Dynamic Inventory", func(t *testing.T) {
resp := makeAnsibleRequest(t, client, "GET", "/inventory/dynamic", nil)
require.Equal(t, http.StatusOK, resp.StatusCode, "Should generate dynamic inventory")

var inventory ansible.DynamicInventory
body, _ := io.ReadAll(resp.Body)
err := json.Unmarshal(body, &inventory)
require.NoError(t, err)

// Should at least have localhost
assert.NotEmpty(t, inventory.All.Hosts, "Should have hosts in inventory")
})

t.Run("Save Custom Inventory", func(t *testing.T) {
inventoryName := fmt.Sprintf("%s-%d", testInventoryPrefix, time.Now().Unix())
inventory := &ansible.DynamicInventory{
Groups: make(map[string]ansible.InventoryGroup),
}
inventory.All.Hosts = []string{"web1", "web2", "db1"}
inventory.All.Vars = map[string]interface{}{
"ansible_user": "ubuntu",
}
inventory.Meta.HostVars = map[string]map[string]interface{}{
"web1": {"ansible_host": "192.168.1.10"},
"web2": {"ansible_host": "192.168.1.11"},
"db1":  {"ansible_host": "192.168.1.20"},
}

saveReq := map[string]interface{}{
"name":      inventoryName,
"inventory": inventory,
}

resp := makeAnsibleRequest(t, client, "POST", "/inventory", saveReq)
require.Equal(t, http.StatusOK, resp.StatusCode, "Should save inventory")
createdInventories = append(createdInventories, inventoryName)

// Retrieve saved inventory
getResp := makeAnsibleRequest(t, client, "GET", fmt.Sprintf("/inventory/%s", inventoryName), nil)
if getResp.StatusCode == http.StatusOK {
var retrieved ansible.DynamicInventory
body, _ := io.ReadAll(getResp.Body)
err := json.Unmarshal(body, &retrieved)
require.NoError(t, err)
assert.Equal(t, 3, len(retrieved.All.Hosts), "Should have 3 hosts")
}
})
})

t.Run("6. Execution Management", func(t *testing.T) {
t.Run("List Executions", func(t *testing.T) {
resp := makeAnsibleRequest(t, client, "GET", "/executions", nil)
require.Equal(t, http.StatusOK, resp.StatusCode, "Should list executions")

var result map[string]interface{}
body, _ := io.ReadAll(resp.Body)
err := json.Unmarshal(body, &result)
require.NoError(t, err)

executions := result["executions"].([]interface{})
t.Logf("Found %d executions", len(executions))
})
})

t.Run("7. Scheduling", func(t *testing.T) {
t.Run("Create Schedule", func(t *testing.T) {
if len(createdPlaybooks) == 0 {
t.Skip("No playbook created to schedule")
}

scheduleReq := map[string]interface{}{
"name":     "E2E Test Schedule",
"schedule": "0 */6 * * *", // Every 6 hours
"playbook": ansible.PlaybookRequest{
Playbook:  createdPlaybooks[0],
Inventory: "localhost,",
Timeout:   300,
},
}

resp := makeAnsibleRequest(t, client, "POST", "/schedules", scheduleReq)
require.Equal(t, http.StatusCreated, resp.StatusCode, "Should create schedule")

var result map[string]interface{}
body, _ := io.ReadAll(resp.Body)
err := json.Unmarshal(body, &result)
require.NoError(t, err)

scheduleID := result["id"].(string)
assert.NotEmpty(t, scheduleID, "Should return schedule ID")
createdSchedules = append(createdSchedules, scheduleID)
})

t.Run("List Schedules", func(t *testing.T) {
resp := makeAnsibleRequest(t, client, "GET", "/schedules", nil)
require.Equal(t, http.StatusOK, resp.StatusCode, "Should list schedules")

var result map[string]interface{}
body, _ := io.ReadAll(resp.Body)
err := json.Unmarshal(body, &result)
require.NoError(t, err)

schedules := result["schedules"].([]interface{})
assert.NotEmpty(t, schedules, "Should have at least one schedule")
})
})

t.Run("8. External Source Integration", func(t *testing.T) {
t.Run("Download Playbook from URL", func(t *testing.T) {
// Skip if no internet connection
if !hasInternetConnection() {
t.Skip("No internet connection, skipping URL download test")
}

playbookName := fmt.Sprintf("%s-from-url-%d.yml", testPlaybookPrefix, time.Now().Unix())
downloadReq := map[string]string{
"url":  "https://raw.githubusercontent.com/ansible/ansible-examples/master/language_features/hello_world.yml",
"name": playbookName,
}

resp := makeAnsibleRequest(t, client, "POST", "/playbooks/from-url", downloadReq)
if resp.StatusCode == http.StatusOK {
createdPlaybooks = append(createdPlaybooks, playbookName)
t.Log("Successfully downloaded playbook from URL")
} else {
t.Log("Failed to download playbook from URL, might be network issue")
}
})
})

t.Run("9. WebSocket Streaming", func(t *testing.T) {
t.Run("Stream Execution Output", func(t *testing.T) {
// First, create an execution
runReq := ansible.PlaybookRequest{
Playbook:  "test.yml",
Inventory: "localhost,",
Timeout:   30,
}

resp := makeAnsibleRequest(t, client, "POST", "/playbooks/run", runReq)
if resp.StatusCode != http.StatusAccepted {
t.Skip("Cannot create execution for WebSocket test")
}

var result ansible.ExecutionResult
body, _ := io.ReadAll(resp.Body)
json.Unmarshal(body, &result)

// Connect to WebSocket
wsURL := fmt.Sprintf("ws://localhost:8080/api/v1/ansible/executions/%s/stream", result.ID)
ws, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
if err != nil {
t.Logf("Failed to connect to WebSocket: %v", err)
return
}
defer ws.Close()

// Read messages with timeout
done := make(chan struct{})
go func() {
defer close(done)
for {
var msg map[string]interface{}
err := ws.ReadJSON(&msg)
if err != nil {
return
}
t.Logf("WebSocket message: %v", msg)
if msg["type"] == "complete" {
return
}
}
}()

select {
case <-done:
t.Log("WebSocket streaming completed")
case <-time.After(5 * time.Second):
t.Log("WebSocket streaming timeout")
}
})
})

t.Run("10. Cleanup Operations", func(t *testing.T) {
t.Run("Delete Playbooks", func(t *testing.T) {
for _, name := range createdPlaybooks {
resp := makeAnsibleRequest(t, client, "DELETE", fmt.Sprintf("/playbooks/%s", name), nil)
if resp.StatusCode == http.StatusOK {
t.Logf("Deleted playbook: %s", name)
}
}
createdPlaybooks = nil // Clear to avoid double cleanup
})

t.Run("Delete Schedules", func(t *testing.T) {
for _, id := range createdSchedules {
resp := makeAnsibleRequest(t, client, "DELETE", fmt.Sprintf("/schedules/%s", id), nil)
if resp.StatusCode == http.StatusOK {
t.Logf("Deleted schedule: %s", id)
}
}
createdSchedules = nil // Clear to avoid double cleanup
})
})
}

// Helper functions

func makeAnsibleRequest(t *testing.T, client *http.Client, method, endpoint string, body interface{}) *http.Response {
url := ansibleBaseURL + endpoint

var reqBody io.Reader
if body != nil {
jsonBody, err := json.Marshal(body)
require.NoError(t, err)
reqBody = bytes.NewBuffer(jsonBody)
}

req, err := http.NewRequest(method, url, reqBody)
require.NoError(t, err)

if body != nil {
req.Header.Set("Content-Type", "application/json")
}

resp, err := client.Do(req)
require.NoError(t, err)

return resp
}

func listPlaybooks(t *testing.T, client *http.Client) []map[string]interface{} {
resp := makeAnsibleRequest(t, client, "GET", "/playbooks", nil)
require.Equal(t, http.StatusOK, resp.StatusCode)

var result map[string]interface{}
body, _ := io.ReadAll(resp.Body)
err := json.Unmarshal(body, &result)
require.NoError(t, err)

playbooks := []map[string]interface{}{}
if pbs, ok := result["playbooks"].([]interface{}); ok {
for _, pb := range pbs {
playbooks = append(playbooks, pb.(map[string]interface{}))
}
}

return playbooks
}

func deletePlaybook(t *testing.T, client *http.Client, name string) {
resp := makeAnsibleRequest(t, client, "DELETE", fmt.Sprintf("/playbooks/%s", name), nil)
if resp.StatusCode == http.StatusOK {
t.Logf("Cleaned up playbook: %s", name)
}
}

func deleteSchedule(t *testing.T, client *http.Client, id string) {
resp := makeAnsibleRequest(t, client, "DELETE", fmt.Sprintf("/schedules/%s", id), nil)
if resp.StatusCode == http.StatusOK {
t.Logf("Cleaned up schedule: %s", id)
}
}

func hasInternetConnection() bool {
client := &http.Client{Timeout: 5 * time.Second}
resp, err := client.Get("https://www.google.com")
if err != nil {
return false
}
resp.Body.Close()
return resp.StatusCode == http.StatusOK
}

// TestE2EAnsiblePerformance tests performance characteristics
func TestE2EAnsiblePerformance(t *testing.T) {
if os.Getenv("RUN_E2E_TESTS") != "true" {
t.Skip("Skipping E2E tests. Set RUN_E2E_TESTS=true to run")
}

client := &http.Client{Timeout: 30 * time.Second}

t.Run("Playbook List Performance", func(t *testing.T) {
start := time.Now()
resp := makeAnsibleRequest(t, client, "GET", "/playbooks", nil)
duration := time.Since(start)

require.Equal(t, http.StatusOK, resp.StatusCode)
assert.Less(t, duration, 2*time.Second, "Listing playbooks should be fast")
t.Logf("Listed playbooks in %v", duration)
})

t.Run("Concurrent Requests", func(t *testing.T) {
concurrency := 10
done := make(chan bool, concurrency)

start := time.Now()
for i := 0; i < concurrency; i++ {
go func(id int) {
resp := makeAnsibleRequest(t, client, "GET", "/playbooks", nil)
assert.Equal(t, http.StatusOK, resp.StatusCode)
done <- true
}(i)
}

for i := 0; i < concurrency; i++ {
<-done
}
duration := time.Since(start)

assert.Less(t, duration, 5*time.Second, "Concurrent requests should complete quickly")
t.Logf("Handled %d concurrent requests in %v", concurrency, duration)
})

t.Run("Large Playbook Upload", func(t *testing.T) {
// Create a large playbook content
var tasks []string
for i := 0; i < 100; i++ {
tasks = append(tasks, fmt.Sprintf(`
    - name: Task %d
      debug:
        msg: "Task %d execution"`, i, i))
}

largeContent := fmt.Sprintf(`---
- name: Large Performance Test Playbook
  hosts: localhost
  gather_facts: no
  tasks:%s
`, strings.Join(tasks, ""))

uploadReq := ansible.PlaybookUploadRequest{
Name:        fmt.Sprintf("perf-test-%d.yml", time.Now().Unix()),
Content:     largeContent,
Description: "Performance test with many tasks",
}

start := time.Now()
resp := makeAnsibleRequest(t, client, "POST", "/playbooks/upload", uploadReq)
duration := time.Since(start)

require.Equal(t, http.StatusCreated, resp.StatusCode)
assert.Less(t, duration, 3*time.Second, "Large playbook upload should complete within 3 seconds")
t.Logf("Uploaded large playbook (%d bytes) in %v", len(largeContent), duration)

// Cleanup
deletePlaybook(t, client, uploadReq.Name)
})
}

// TestE2EAnsibleErrorHandling tests error scenarios
func TestE2EAnsibleErrorHandling(t *testing.T) {
if os.Getenv("RUN_E2E_TESTS") != "true" {
t.Skip("Skipping E2E tests. Set RUN_E2E_TESTS=true to run")
}

client := &http.Client{Timeout: 30 * time.Second}

t.Run("Invalid Playbook Validation", func(t *testing.T) {
validateReq := map[string]string{
"content": "invalid yaml content {{}",
}

resp := makeAnsibleRequest(t, client, "POST", "/playbooks/validate", validateReq)
if resp.StatusCode == http.StatusOK {
var result map[string]interface{}
body, _ := io.ReadAll(resp.Body)
json.Unmarshal(body, &result)

// Should be invalid
if valid, ok := result["valid"].(bool); ok {
assert.False(t, valid, "Invalid YAML should not validate")
}
}
})

t.Run("Non-existent Playbook", func(t *testing.T) {
resp := makeAnsibleRequest(t, client, "GET", "/playbooks/non-existent-playbook.yml", nil)
assert.Equal(t, http.StatusNotFound, resp.StatusCode, "Should return 404 for non-existent playbook")
})

t.Run("Invalid Ad-hoc Request", func(t *testing.T) {
// Missing required fields
invalidReq := map[string]string{
"module": "ping",
// Missing hosts and inventory
}

resp := makeAnsibleRequest(t, client, "POST", "/adhoc", invalidReq)
assert.Equal(t, http.StatusBadRequest, resp.StatusCode, "Should return 400 for invalid request")
})

t.Run("Invalid Schedule Cron Expression", func(t *testing.T) {
scheduleReq := map[string]interface{}{
"name":     "Invalid Schedule",
"schedule": "invalid cron expression",
"playbook": ansible.PlaybookRequest{
Playbook:  "test.yml",
Inventory: "localhost,",
},
}

resp := makeAnsibleRequest(t, client, "POST", "/schedules", scheduleReq)
assert.Equal(t, http.StatusBadRequest, resp.StatusCode, "Should reject invalid cron expression")
})
}
