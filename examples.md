# API Usage Examples

This document provides examples of how to use the System Management API.

## Authentication

First, you need to authenticate to get a JWT token:

```bash
# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'

# Response:
# {
#   "status": "success",
#   "data": {
#     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#     "expires_at": 1735689600
#   },
#   "error": null
# }
```

Store the token and use it in subsequent requests:

```bash
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Network Management

### List Network Interfaces

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/network/interfaces
```

### Bring Interface Up

```bash
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/network/interfaces/eth0/up
```

### Configure IP Address

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "192.168.1.10",
    "netmask": 24,
    "gateway": "192.168.1.1"
  }' \
  http://localhost:8080/api/v1/network/interfaces/eth0/address
```

### Create Bridge

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "br0",
    "interfaces": ["eth0", "eth1"]
  }' \
  http://localhost:8080/api/v1/network/bridge
```

### Create VLAN

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "interface": "eth0",
    "vlan_id": 100,
    "name": "eth0.100"
  }' \
  http://localhost:8080/api/v1/network/vlan
```

## Storage Management

### List Disks

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/storage/disks
```

### Mount Filesystem

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device": "/dev/sdb1",
    "mount_point": "/mnt/data",
    "filesystem": "ext4"
  }' \
  http://localhost:8080/api/v1/storage/mount
```

### Unmount Filesystem

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mount_point": "/mnt/data",
    "force": false
  }' \
  http://localhost:8080/api/v1/storage/unmount
```

### Format Disk

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device": "/dev/sdb1",
    "filesystem": "ext4",
    "label": "DATA"
  }' \
  http://localhost:8080/api/v1/storage/format
```

## User Management

### List Users

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/users
```

### Create User

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "password": "secure123",
    "groups": "sudo,docker"
  }' \
  http://localhost:8080/api/v1/users
```

### Update User

```bash
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "newsecure456",
    "groups": "sudo,docker,admin"
  }' \
  http://localhost:8080/api/v1/users/john
```

### Delete User

```bash
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/users/john
```

## System Information

### Get System Summary

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/system/summary
```

### Get CPU Information

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/system/cpu
```

### Get Memory Information

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/system/memory
```

### Get Hardware Information

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/system/hardware
```

## Logs

### Query System Logs

```bash
# Get all logs
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/logs

# Filter by service
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/logs?service=sshd"

# Filter by priority
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/logs?priority=error"

# Paginate results
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/logs?page=2&page_size=50"

# Combine filters
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/logs?service=nginx&priority=warning&since=2024-01-01"
```

## Health Check

The health check endpoint doesn't require authentication:

```bash
curl http://localhost:8080/health
```

## Error Handling

All endpoints return a consistent error format:

```json
{
  "status": "error",
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": "Field 'address' is required"
  }
}
```

Common error codes:
- `VALIDATION_ERROR`: Invalid request data
- `UNAUTHORIZED`: Missing or invalid authentication
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `INTERNAL_ERROR`: Server error
- `CONFLICT`: Resource already exists
