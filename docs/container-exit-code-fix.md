# Container Exit Code Handling Fix

## Overview
Fixed issues with container detail endpoints returning HTTP 500 errors for exited/stopped containers in both Docker and CRI-based container engines (containerd, CRI-O).

## Issues Identified

### 1. Docker Client Issues
- **Stats Collection Error**: `ContainerStatsOneShot` was called for all containers, but it fails for non-running containers
- **Exit Code Handling**: Exit codes were only included when non-zero, missing exit code 0 for successfully exited containers

### 2. CRI Client Issues  
- **Stats Collection**: Already handled gracefully (sets `statsResp = nil` on error)
- **Exit Code Handling**: Same issue as Docker - only included non-zero exit codes

## Fixes Applied

### Docker Client (`internal/container/docker_client.go`)

1. **Container Stats Fix** (lines 137-143):
   ```go
   // Only get stats for running containers
   if containerJSON.State.Running {
       stats, err := d.client.ContainerStatsOneShot(ctx, id)
       if err != nil {
           return nil, fmt.Errorf("failed to get container stats: %w", err)
       }
       defer stats.Body.Close()
   }
   ```

2. **Exit Code Fix** (lines 177-180):
   ```go
   // Always include exit code for stopped/exited containers
   if containerJSON.State.Status == "exited" || 
      containerJSON.State.Status == "stopped" || 
      containerJSON.State.Status == "dead" {
       exitCode := int32(containerJSON.State.ExitCode)
       detail.ExitCode = &exitCode
   }
   ```

### CRI Client (`internal/container/cri_client.go`)

1. **Exit Code Fix** (lines 177-180):
   ```go
   // Always include exit code for stopped/exited containers
   // Check if container is not running (CONTAINER_EXITED state = 1)
   if status.State == criapi.ContainerState_CONTAINER_EXITED {
       detail.ExitCode = &status.ExitCode
   }
   ```

## Testing

To test the fixes:

1. Create and stop a container:
   ```bash
   # Docker
   docker run --name test-container alpine echo "test"
   
   # Containerd (using nerdctl)
   nerdctl run --name test-container alpine echo "test"
   ```

2. Get container details via API:
   ```bash
   # Get auth token
   TOKEN=$(curl -s http://localhost:8080/api/v1/login \
     -d '{"username":"admin","password":"admin123"}' \
     -H "Content-Type: application/json" | jq -r '.data.token')
   
   # Get container details
   curl -s http://localhost:8080/api/v1/containers/test-container \
     -H "Authorization: Bearer $TOKEN" | jq
   ```

3. Verify response includes:
   - No 500 error
   - Exit code field (should be 0 for successful exit)
   - Finished timestamp
   - No stats data (as expected for stopped containers)

## Expected Behavior

### Running Containers
- Stats are collected and included in response
- No exit code field
- Resource usage metrics available

### Exited/Stopped Containers  
- No stats collection attempted
- Exit code always included (0 for success, non-zero for failure)
- Finished timestamp present
- Resource limits shown but no usage metrics

## Compatibility

These fixes ensure consistent behavior across:
- Docker Engine
- Containerd (via CRI)
- CRI-O (via CRI)
- Any other CRI-compliant container runtime
