//go:build e2e
// +build e2e

package test

import (
"bytes"
"context"
"encoding/json"
"fmt"
"io"
"net/http"
"os"
"testing"
"time"

"github.com/awanio/vapor/internal/libvirt"
"github.com/stretchr/testify/assert"
"github.com/stretchr/testify/require"
)

const (
baseURL = "http://localhost:8080/api/v1"
testVMPrefix = "vapor-test-vm"
)

// TestE2EVirtualizationWorkflow tests the complete virtualization workflow
func TestE2EVirtualizationWorkflow(t *testing.T) {
// Skip if not in E2E mode
if os.Getenv("RUN_E2E_TESTS") != "true" {
t.Skip("Skipping E2E tests. Set RUN_E2E_TESTS=true to run")
}

// Ensure server is running
client := &http.Client{Timeout: 30 * time.Second}

// Test VM name with timestamp to avoid conflicts
vmName := fmt.Sprintf("%s-%d", testVMPrefix, time.Now().Unix())
var vmID string

// Cleanup function
defer func() {
if vmID != "" {
deleteVM(t, client, vmID)
}
}()

t.Run("1. Storage Pool Operations", func(t *testing.T) {
// List storage pools
pools := listStoragePools(t, client)
require.NotEmpty(t, pools, "Should have at least one storage pool")

// Check for default pool
hasDefault := false
for _, pool := range pools {
if pool["name"] == "default" {
hasDefault = true
break
}
}
assert.True(t, hasDefault, "Should have 'default' storage pool")
})

t.Run("2. Network Operations", func(t *testing.T) {
// List networks
networks := listNetworks(t, client)
require.NotEmpty(t, networks, "Should have at least one network")

// Check for default network
hasDefault := false
for _, network := range networks {
if network["name"] == "default" {
hasDefault = true
break
}
}
assert.True(t, hasDefault, "Should have 'default' network")
})

t.Run("3. Create VM", func(t *testing.T) {
createReq := map[string]interface{}{
"name":      vmName,
"memory":    512,  // 512MB
"vcpus":     1,
"disk_size": 1,    // 1GB
"os_type":   "linux",
"network": map[string]string{
"type":   "network",
"source": "default",
"model":  "virtio",
},
"graphics": map[string]interface{}{
"type": "vnc",
"port": -1,  // Auto-assign
},
}

resp := makeRequest(t, client, "POST", "/virtualization/virtualmachines", createReq)
require.Equal(t, http.StatusCreated, resp.StatusCode, "Should create VM successfully")

var vm map[string]interface{}
decodeResponse(t, resp, &vm)

vmID = vm["uuid"].(string)
assert.Equal(t, vmName, vm["name"])
assert.Equal(t, "shutoff", vm["state"])
t.Logf("Created VM: %s (ID: %s)", vmName, vmID)
})

t.Run("4. Get VM Details", func(t *testing.T) {
resp := makeRequest(t, client, "GET", fmt.Sprintf("/virtualization/virtualmachines/%s", vmID), nil)
require.Equal(t, http.StatusOK, resp.StatusCode)

var vm map[string]interface{}
decodeResponse(t, resp, &vm)

assert.Equal(t, vmID, vm["uuid"])
assert.Equal(t, vmName, vm["name"])
assert.Equal(t, float64(512*1024), vm["memory"]) // Memory in KB
assert.Equal(t, float64(1), vm["vcpus"])
})

t.Run("5. Start VM", func(t *testing.T) {
actionReq := map[string]interface{}{
"action": "start",
}

resp := makeRequest(t, client, "POST", 
fmt.Sprintf("/virtualization/virtualmachines/%s/action", vmID), actionReq)
require.Equal(t, http.StatusOK, resp.StatusCode)

// Wait for VM to start
time.Sleep(2 * time.Second)

// Verify VM is running
vm := getVM(t, client, vmID)
assert.Equal(t, "running", vm["state"])
t.Log("VM started successfully")
})

t.Run("6. Check Snapshot Capabilities", func(t *testing.T) {
resp := makeRequest(t, client, "GET", 
fmt.Sprintf("/virtualization/virtualmachines/%s/snapshots/capabilities", vmID), nil)
require.Equal(t, http.StatusOK, resp.StatusCode)

var capabilities map[string]interface{}
decodeResponse(t, resp, &capabilities)

overall := capabilities["overall_capabilities"].(map[string]interface{})
assert.NotNil(t, overall["internal_snapshots"])
assert.NotNil(t, overall["external_snapshots"])
t.Logf("Snapshot capabilities: internal=%v, external=%v", 
overall["internal_snapshots"], overall["external_snapshots"])
})

t.Run("7. Create Snapshot", func(t *testing.T) {
snapshotReq := map[string]interface{}{
"name":        "test-snapshot-1",
"description": "E2E test snapshot",
"memory":      false, // Disk-only snapshot
}

resp := makeRequest(t, client, "POST", 
fmt.Sprintf("/virtualization/virtualmachines/%s/snapshots", vmID), snapshotReq)
require.Equal(t, http.StatusCreated, resp.StatusCode)

var snapshot map[string]interface{}
decodeResponse(t, resp, &snapshot)

assert.Equal(t, "test-snapshot-1", snapshot["name"])
t.Log("Snapshot created successfully")
})

t.Run("8. List Snapshots", func(t *testing.T) {
resp := makeRequest(t, client, "GET", 
fmt.Sprintf("/virtualization/virtualmachines/%s/snapshots", vmID), nil)
require.Equal(t, http.StatusOK, resp.StatusCode)

var result map[string]interface{}
decodeResponse(t, resp, &result)

snapshots := result["snapshots"].([]interface{})
require.Len(t, snapshots, 1, "Should have one snapshot")

snapshot := snapshots[0].(map[string]interface{})
assert.Equal(t, "test-snapshot-1", snapshot["name"])
})

t.Run("9. VM Metrics", func(t *testing.T) {
resp := makeRequest(t, client, "GET", 
fmt.Sprintf("/virtualization/virtualmachines/%s/metrics", vmID), nil)
require.Equal(t, http.StatusOK, resp.StatusCode)

var metrics map[string]interface{}
decodeResponse(t, resp, &metrics)

assert.NotNil(t, metrics["cpu_usage"])
assert.NotNil(t, metrics["memory_used"])
t.Logf("VM Metrics: CPU=%.2f%%, Memory=%v KB", 
metrics["cpu_usage"], metrics["memory_used"])
})

t.Run("10. Stop VM", func(t *testing.T) {
actionReq := map[string]interface{}{
"action": "shutdown",
}

resp := makeRequest(t, client, "POST", 
fmt.Sprintf("/virtualization/virtualmachines/%s/action", vmID), actionReq)
require.Equal(t, http.StatusOK, resp.StatusCode)

// Wait for VM to stop
time.Sleep(3 * time.Second)

// Force stop if still running
vm := getVM(t, client, vmID)
if vm["state"] != "shutoff" {
actionReq["action"] = "stop"
actionReq["force"] = true
makeRequest(t, client, "POST", 
fmt.Sprintf("/virtualization/virtualmachines/%s/action", vmID), actionReq)
time.Sleep(2 * time.Second)
}

vm = getVM(t, client, vmID)
assert.Equal(t, "shutoff", vm["state"])
t.Log("VM stopped successfully")
})

t.Run("11. Delete Snapshot", func(t *testing.T) {
resp := makeRequest(t, client, "DELETE", 
fmt.Sprintf("/virtualization/virtualmachines/%s/snapshots/test-snapshot-1", vmID), nil)
require.Equal(t, http.StatusNoContent, resp.StatusCode)
t.Log("Snapshot deleted successfully")
})

t.Run("12. Delete VM", func(t *testing.T) {
resp := makeRequest(t, client, "DELETE", 
fmt.Sprintf("/virtualization/virtualmachines/%s?remove_disks=true", vmID), nil)
require.Equal(t, http.StatusNoContent, resp.StatusCode)

// Verify VM is deleted
resp = makeRequest(t, client, "GET", 
fmt.Sprintf("/virtualization/virtualmachines/%s", vmID), nil)
assert.Equal(t, http.StatusNotFound, resp.StatusCode)

vmID = "" // Clear ID so cleanup doesn't try to delete again
t.Log("VM deleted successfully")
})
}

// Helper functions

func makeRequest(t *testing.T, client *http.Client, method, path string, body interface{}) *http.Response {
var bodyReader io.Reader
if body != nil {
jsonBody, err := json.Marshal(body)
require.NoError(t, err)
bodyReader = bytes.NewReader(jsonBody)
}

req, err := http.NewRequest(method, baseURL+path, bodyReader)
require.NoError(t, err)

if body != nil {
req.Header.Set("Content-Type", "application/json")
}
req.Header.Set("Accept", "application/json")

resp, err := client.Do(req)
require.NoError(t, err)

return resp
}

func decodeResponse(t *testing.T, resp *http.Response, v interface{}) {
defer resp.Body.Close()
body, err := io.ReadAll(resp.Body)
require.NoError(t, err)

if resp.StatusCode >= 400 {
t.Logf("Error response: %s", string(body))
}

err = json.Unmarshal(body, v)
require.NoError(t, err)
}

func listStoragePools(t *testing.T, client *http.Client) []map[string]interface{} {
resp := makeRequest(t, client, "GET", "/virtualization/storages/pools", nil)
require.Equal(t, http.StatusOK, resp.StatusCode)

var result map[string]interface{}
decodeResponse(t, resp, &result)

pools, ok := result["pools"].([]interface{})
require.True(t, ok, "Should have pools array")

var poolMaps []map[string]interface{}
for _, pool := range pools {
poolMaps = append(poolMaps, pool.(map[string]interface{}))
}
return poolMaps
}

func listNetworks(t *testing.T, client *http.Client) []map[string]interface{} {
resp := makeRequest(t, client, "GET", "/virtualization/networks", nil)
require.Equal(t, http.StatusOK, resp.StatusCode)

var result map[string]interface{}
decodeResponse(t, resp, &result)

networks, ok := result["networks"].([]interface{})
require.True(t, ok, "Should have networks array")

var networkMaps []map[string]interface{}
for _, network := range networks {
networkMaps = append(networkMaps, network.(map[string]interface{}))
}
return networkMaps
}

func getVM(t *testing.T, client *http.Client, vmID string) map[string]interface{} {
resp := makeRequest(t, client, "GET", 
fmt.Sprintf("/virtualization/virtualmachines/%s", vmID), nil)
require.Equal(t, http.StatusOK, resp.StatusCode)

var vm map[string]interface{}
decodeResponse(t, resp, &vm)
return vm
}

func deleteVM(t *testing.T, client *http.Client, vmID string) {
// Try to stop VM first
actionReq := map[string]interface{}{
"action": "stop",
"force":  true,
}
makeRequest(t, client, "POST", 
fmt.Sprintf("/virtualization/virtualmachines/%s/action", vmID), actionReq)

time.Sleep(2 * time.Second)

// Delete VM
makeRequest(t, client, "DELETE", 
fmt.Sprintf("/virtualization/virtualmachines/%s?remove_disks=true", vmID), nil)
}
