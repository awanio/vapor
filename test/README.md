# Vapor API Test Suite

This directory contains various test scripts and programs for the Vapor API.

## Authentication Tests

### test_auth.sh
Basic authentication test script that tests password and SSH challenge-response authentication.

### test_ssh_auth.sh
Comprehensive SSH private key authentication test that:
- Tests direct SSH private key authentication
- Tests JWT token refresh functionality
- Retrieves user's authorized SSH keys
- Automatically sets up SSH keys if not present

### test_key_parse.go
Go program to debug SSH key parsing and verification.

## Running Authentication Tests

```bash
# Test SSH key authentication and JWT refresh
./test_ssh_auth.sh

# Test all authentication methods
./test_auth.sh

# Debug key parsing
go run test_key_parse.go
```

## Other Tests

- **ansible_integration_test.go** - Ansible integration tests
- **e2e_ansible_test.go** - End-to-end Ansible tests
- **e2e_libvirt_test.go** - End-to-end Libvirt tests
- **performance_test.sh** - Performance testing
- **smoke_test.sh** - Basic smoke tests
- **test_docker_endpoints.sh** - Docker API endpoint tests
- **test_websocket*.sh** - WebSocket functionality tests
- **test_terminal*.sh** - Terminal WebSocket tests

## Running All Tests

```bash
./run_all_tests.sh
```

## Setup Test Environment

```bash
./setup_test_environment.sh
```
