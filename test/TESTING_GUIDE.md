# Vapor Virtualization Testing Guide

## Overview

This guide explains how to thoroughly test the virtualization endpoints to ensure they work in real-world scenarios.

## Testing Levels

### 1. Unit Tests
**Purpose**: Test individual functions in isolation  
**Location**: `internal/libvirt/service_test.go`  
**Run**: `go test ./internal/libvirt`

Tests:
- VM state conversions
- Request validation
- Data structure operations
- Error handling

### 2. Integration Tests
**Purpose**: Test component interactions  
**Location**: `internal/libvirt/integration_test.go`  
**Run**: `go test -tags=integration ./internal/libvirt`

Tests:
- Service initialization
- Libvirt connection handling
- Database interactions
- API compliance

### 3. End-to-End Tests
**Purpose**: Test complete workflows with real libvirt  
**Location**: `test/e2e_libvirt_test.go`  
**Run**: `RUN_E2E_TESTS=true go test -tags=e2e ./test -v`

Tests:
- Complete VM lifecycle (create → start → stop → delete)
- Snapshot operations
- Storage pool management
- Network management
- Metrics collection

### 4. Smoke Tests
**Purpose**: Quick validation of basic functionality  
**Location**: `test/smoke_test.sh`  
**Run**: `./test/smoke_test.sh`

Tests:
- Server connectivity
- Basic CRUD operations
- Critical endpoints availability

### 5. Performance Tests
**Purpose**: Test system under load  
**Location**: `test/performance_test.sh`  
**Run**: `./test/performance_test.sh`

Tests:
- Concurrent VM creation
- Rapid sequential operations
- Listing performance with many VMs
- Snapshot operation performance
- Resource usage monitoring

## Test Environment Setup

### Prerequisites
```bash
# 1. Install libvirt
sudo apt-get install -y qemu-kvm libvirt-daemon-system libvirt-clients bridge-utils

# 2. Add user to libvirt group
sudo usermod -aG libvirt $USER
# Logout and login again

# 3. Verify libvirt
virsh list --all
```

### Automated Setup
```bash
# Run the setup script
./test/setup_test_environment.sh
```

This will:
- Install libvirt if needed
- Configure storage pools
- Setup networks
- Download test images
- Create test configuration
- Build Vapor

## Running Tests

### Quick Test (5 minutes)
```bash
# 1. Start Vapor server
./bin/vapor -c /tmp/vapor-test.conf &

# 2. Run smoke test
./test/smoke_test.sh

# 3. Stop server
kill %1
```

### Comprehensive Test (30 minutes)
```bash
# 1. Setup environment
./test/setup_test_environment.sh

# 2. Start server
./bin/vapor -c /tmp/vapor-test.conf &
SERVER_PID=$!

# 3. Run all tests
./test/smoke_test.sh
RUN_E2E_TESTS=true go test -tags=e2e ./test -v
./test/performance_test.sh

# 4. Stop server
kill $SERVER_PID
```

### Continuous Testing
```bash
# Use the test runner
./test/run_all_tests.sh
```

## Test Coverage Matrix

| Endpoint | Unit | Integration | E2E | Smoke | Performance |
|----------|------|-------------|-----|-------|-------------|
| List VMs | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create VM | ✓ | ✓ | ✓ | ✓ | ✓ |
| Get VM | ✓ | ✓ | ✓ | ✓ | ✓ |
| Update VM | ✓ | ✓ | ✓ | - | - |
| Delete VM | ✓ | ✓ | ✓ | ✓ | ✓ |
| VM Actions | ✓ | ✓ | ✓ | - | - |
| Snapshots | ✓ | ✓ | ✓ | ✓ | ✓ |
| Snapshot Capabilities | ✓ | ✓ | ✓ | ✓ | - |
| Backups | ✓ | ✓ | - | - | - |
| Migration | ✓ | - | - | - | - |
| PCI Devices | ✓ | ✓ | - | ✓ | - |
| Storage Pools | ✓ | ✓ | ✓ | ✓ | - |
| Networks | ✓ | ✓ | ✓ | ✓ | - |
| Metrics | ✓ | ✓ | ✓ | - | ✓ |

## Verification Checklist

### Basic Functionality
- [ ] Server starts without errors
- [ ] Can connect to libvirt
- [ ] Database initializes correctly
- [ ] API responds to health checks

### VM Operations
- [ ] Create VM with minimal config
- [ ] Create VM with full config (network, storage, graphics)
- [ ] Start/stop/restart VM
- [ ] Update VM configuration
- [ ] Delete VM with disk cleanup
- [ ] List VMs with filtering

### Snapshot Operations
- [ ] Check capabilities for different disk formats
- [ ] Create disk-only snapshot
- [ ] Create memory snapshot (if supported)
- [ ] List snapshots
- [ ] Revert to snapshot
- [ ] Delete snapshot

### Storage Operations
- [ ] List storage pools
- [ ] Create storage pool
- [ ] List volumes in pool
- [ ] Create volume
- [ ] Delete volume
- [ ] Delete pool

### Network Operations
- [ ] List networks
- [ ] Create network
- [ ] Get network details
- [ ] Delete network

### Advanced Features
- [ ] Live migration (requires multiple hosts)
- [ ] PCI passthrough (requires IOMMU)
- [ ] Resource hotplug
- [ ] VM templates
- [ ] ISO management

## Troubleshooting Tests

### Common Issues

1. **Permission Denied**
   ```bash
   # Fix: Add user to libvirt group
   sudo usermod -aG libvirt $USER
   # Logout and login
   ```

2. **Connection Refused**
   ```bash
   # Fix: Ensure libvirtd is running
   sudo systemctl start libvirtd
   ```

3. **Storage Pool Not Found**
   ```bash
   # Fix: Create default pool
   virsh pool-define-as default dir --target /var/lib/libvirt/images
   virsh pool-start default
   virsh pool-autostart default
   ```

4. **Network Not Found**
   ```bash
   # Fix: Create default network
   virsh net-start default
   virsh net-autostart default
   ```

## Performance Benchmarks

Expected performance on standard hardware:

| Operation | Target | Acceptable |
|-----------|--------|------------|
| VM Creation | < 500ms | < 1s |
| VM Start | < 2s | < 5s |
| VM Stop | < 1s | < 3s |
| Snapshot Create | < 1s | < 3s |
| List 100 VMs | < 100ms | < 500ms |
| Get VM Details | < 50ms | < 200ms |

## Monitoring During Tests

### System Metrics
```bash
# CPU usage
top -p $(pgrep vapor)

# Memory usage
free -h

# Disk I/O
iotop

# Network connections
netstat -tunlp | grep vapor
```

### Libvirt Metrics
```bash
# Active VMs
virsh list --all

# Storage usage
virsh pool-info default

# Network status
virsh net-list --all
```

### Application Logs
```bash
# Vapor logs
tail -f /var/log/vapor.log

# Libvirt logs
journalctl -u libvirtd -f
```

## Reporting Test Results

When reporting test results, include:

1. **Environment**:
   - OS version
   - Libvirt version
   - Go version
   - Hardware specs

2. **Test Summary**:
   - Tests run
   - Pass/fail rate
   - Performance metrics

3. **Issues Found**:
   - Description
   - Steps to reproduce
   - Expected vs actual behavior
   - Logs/screenshots

4. **Recommendations**:
   - Performance improvements
   - Bug fixes needed
   - Feature suggestions

## Continuous Integration

For CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
name: Virtualization Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Go
        uses: actions/setup-go@v2
        with:
          go-version: 1.21
      
      - name: Install libvirt
        run: |
          sudo apt-get update
          sudo apt-get install -y libvirt-daemon-system
      
      - name: Run tests
        run: |
          go test ./internal/libvirt
          ./test/smoke_test.sh
```

## Conclusion

Comprehensive testing ensures:
- All endpoints work as specified
- System handles real-world scenarios
- Performance meets requirements
- Edge cases are handled
- System is production-ready

Regular testing should be performed:
- After code changes
- Before releases
- During deployment
- As part of monitoring
