# API Usage Examples

This document provides examples of how to use the System Management API.

## Authentication

The API supports two authentication methods:

### 1. Built-in Admin Account (for testing)

```bash
# Login with admin account
curl -X POST http://103.179.254.248:8080/api/v1/auth/login \
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

### 2. Linux System Users (for production)

```bash
# Login with Linux system user
curl -X POST http://103.179.254.248:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "password": "johns_linux_password"
  }'

# The API will authenticate against the Linux system
# using the same credentials you use for SSH or console login
```

Store the token and use it in subsequent requests:

```bash
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Network Management

### List Network Interfaces

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://103.179.254.248:8080/api/v1/network/interfaces
```

### Bring Interface Up

```bash
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  http://103.179.254.248:8080/api/v1/network/interfaces/eth0/up
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
  http://103.179.254.248:8080/api/v1/network/interfaces/eth0/address
```

### List Bridges

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://103.179.254.248:8080/api/v1/network/bridges
```

### Create Bridge

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "br0",
    "interfaces": ["eth0", "eth1"]
  }' \
  http://103.179.254.248:8080/api/v1/network/bridge
```

### List Bonds

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://103.179.254.248:8080/api/v1/network/bonds
```

### Create Bond

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "bond0",
    "mode": "active-backup",
    "interfaces": ["eth0", "eth1"]
  }' \
  http://103.179.254.248:8080/api/v1/network/bond
```

### List VLANs

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://103.179.254.248:8080/api/v1/network/vlans
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
  http://103.179.254.248:8080/api/v1/network/vlan
```

## Storage Management

### List Disks

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://103.179.254.248:8080/api/v1/storage/disks
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
  http://103.179.254.248:8080/api/v1/storage/mount
```

### Unmount Filesystem

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mount_point": "/mnt/data",
    "force": false
  }' \
  http://103.179.254.248:8080/api/v1/storage/unmount
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
  http://103.179.254.248:8080/api/v1/storage/format
```

## User Management

### List Users

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://103.179.254.248:8080/api/v1/users
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
  http://103.179.254.248:8080/api/v1/users
```

### Update User

```bash
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "newsecure456",
    "groups": "sudo,docker,admin"
  }' \
  http://103.179.254.248:8080/api/v1/users/john
```

### Delete User

```bash
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://103.179.254.248:8080/api/v1/users/john
```

## System Information

### Get System Summary

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://103.179.254.248:8080/api/v1/system/summary
```

### Get CPU Information

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://103.179.254.248:8080/api/v1/system/cpu
```

### Get Memory Information

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://103.179.254.248:8080/api/v1/system/memory
```

### Get Hardware Information

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://103.179.254.248:8080/api/v1/system/hardware
```

## Logs

### Query System Logs

```bash
# Get all logs
curl -H "Authorization: Bearer $TOKEN" \
  http://103.179.254.248:8080/api/v1/logs

# Filter by service
curl -H "Authorization: Bearer $TOKEN" \
  "http://103.179.254.248:8080/api/v1/logs?service=sshd"

# Filter by priority
curl -H "Authorization: Bearer $TOKEN" \
  "http://103.179.254.248:8080/api/v1/logs?priority=error"

# Paginate results
curl -H "Authorization: Bearer $TOKEN" \
  "http://103.179.254.248:8080/api/v1/logs?page=2&page_size=50"

# Combine filters
curl -H "Authorization: Bearer $TOKEN" \
  "http://103.179.254.248:8080/api/v1/logs?service=nginx&priority=warning&since=2024-01-01"
```

## Container Management

### List Containers

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://103.179.254.248:8080/api/v1/containers
```

### Get Container Details

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://103.179.254.248:8080/api/v1/containers/nginx-container
```

### Create Container

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "nginx-container",
    "image": "nginx:latest",
    "command": ["/usr/sbin/nginx", "-g", "daemon off;"],
    "env": {
      "NGINX_HOST": "example.com",
      "NGINX_PORT": "80"
    },
    "ports": [
      {
        "container_port": 80,
        "host_port": 8080,
        "protocol": "tcp"
      }
    ],
    "volumes": [
      {
        "host_path": "/data/nginx/html",
        "container_path": "/usr/share/nginx/html",
        "read_only": false
      }
    ],
    "labels": {
      "app": "web",
      "env": "production"
    }
  }' \
  http://103.179.254.248:8080/api/v1/containers
```

### Start Container

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://103.179.254.248:8080/api/v1/containers/nginx-container/start
```

### Stop Container

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://103.179.254.248:8080/api/v1/containers/nginx-container/stop

# With timeout (in seconds)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"timeout": 30}' \
  http://103.179.254.248:8080/api/v1/containers/nginx-container/stop
```

### Restart Container

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://103.179.254.248:8080/api/v1/containers/nginx-container/restart
```

### Remove Container

```bash
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://103.179.254.248:8080/api/v1/containers/nginx-container

# Force remove (even if running)
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  "http://103.179.254.248:8080/api/v1/containers/nginx-container?force=true"
```

### Get Container Logs

```bash
# Get last 100 lines
curl -H "Authorization: Bearer $TOKEN" \
  "http://103.179.254.248:8080/api/v1/containers/nginx-container/logs?tail=100"

# Follow logs (streaming)
curl -H "Authorization: Bearer $TOKEN" \
  "http://103.179.254.248:8080/api/v1/containers/nginx-container/logs?follow=true"

# With timestamps
curl -H "Authorization: Bearer $TOKEN" \
  "http://103.179.254.248:8080/api/v1/containers/nginx-container/logs?timestamps=true"
```

### List Container Images

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://103.179.254.248:8080/api/v1/images
```

### Get Image Details

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://103.179.254.248:8080/api/v1/images/nginx:latest
```

### Pull Image

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"image": "nginx:latest"}' \
  http://103.179.254.248:8080/api/v1/images/pull
```

### Remove Image

```bash
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://103.179.254.248:8080/api/v1/images/nginx:latest

# Force remove
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  "http://103.179.254.248:8080/api/v1/images/nginx:latest?force=true"
```

## WebSocket Connections

### Real-time System Metrics

Connect to the WebSocket endpoint for real-time system metrics:

```bash
# Using websocat (install with: brew install websocat)
websocat -H "Authorization: Bearer $TOKEN" \
  ws://103.179.254.248:8080/ws/metrics/stream

# Using wscat (install with: npm install -g wscat)
wscat -H "Authorization: Bearer $TOKEN" \
  -c ws://103.179.254.248:8080/api/v1/metrics/stream

# Using curl (requires curl 7.77.0+)
curl --include \
  --no-buffer \
  --header "Connection: Upgrade" \
  --header "Upgrade: websocket" \
  --header "Sec-WebSocket-Key: SGVsbG8sIHdvcmxkIQ==" \
  --header "Sec-WebSocket-Version: 13" \
  --header "Authorization: Bearer $TOKEN" \
  http://103.179.254.248:8080/api/v1/metrics/stream
```

### Container Logs Streaming

Stream container logs via WebSocket:

```bash
# Using websocat
websocat -H "Authorization: Bearer $TOKEN" \
  ws://103.179.254.248:8080/api/v1/containers/nginx-container/logs/stream

# Using wscat
wscat -H "Authorization: Bearer $TOKEN" \
  -c ws://103.179.254.248:8080/api/v1/containers/nginx-container/logs/stream
```

### Interactive Container Terminal

Connect to a container's terminal via WebSocket:

```bash
# Using websocat with stdin/stdout
websocat -H "Authorization: Bearer $TOKEN" \
  --binary \
  ws://103.179.254.248:8080/api/v1/containers/nginx-container/exec

# Send commands after connection
# Type your commands and press Enter
# Use Ctrl+D or type 'exit' to close the connection
```

### WebSocket Message Format

The WebSocket endpoints use JSON messages:

```javascript
// Incoming metrics data
{
  "type": "metrics",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "cpu": {
      "usage": 45.2,
      "cores": [12.3, 23.4, 34.5, 45.6]
    },
    "memory": {
      "used": 4294967296,
      "total": 8589934592,
      "percent": 50.0
    },
    "disk": {
      "read_bytes": 1024000,
      "write_bytes": 512000
    },
    "network": {
      "rx_bytes": 2048000,
      "tx_bytes": 1024000
    }
  }
}

// Container log message
{
  "type": "log",
  "timestamp": "2024-01-15T10:30:00Z",
  "stream": "stdout",
  "message": "127.0.0.1 - - [15/Jan/2024:10:30:00 +0000] \"GET / HTTP/1.1\" 200 612"
}

// Terminal I/O
{
  "type": "terminal",
  "data": "root@container:/# "
}
```

### Python WebSocket Client Example

```python
import asyncio
import websockets
import json

TOKEN = "your-jwt-token"

async def connect_metrics():
    uri = "ws://localhost:8080/ws/metrics"
    
    async with websockets.connect(uri) as websocket:
        # Authenticate
        auth_msg = {
            "type": "auth",
            "payload": {
                "token": TOKEN
            }
        }
        await websocket.send(json.dumps(auth_msg))
        
        # Wait for auth response
        response = await websocket.recv()
        auth_resp = json.loads(response)
        if auth_resp.get("type") == "error":
            print(f"Authentication failed: {auth_resp.get('error')}")
            return
        
        # Subscribe to metrics
        subscribe_msg = {
            "type": "subscribe"
        }
        await websocket.send(json.dumps(subscribe_msg))
        
        # Receive metrics
        while True:
            message = await websocket.recv()
            data = json.loads(message)
            if data.get("type") == "metric":
                print(f"Metric: {data['metric']}")
                print(f"Data: {data['data']}")
                print("---")

async def connect_terminal():
    uri = "ws://localhost:8080/ws/terminal"
    
    async with websockets.connect(uri) as websocket:
        # Authenticate
        auth_msg = {
            "type": "auth",
            "payload": {
                "token": TOKEN
            }
        }
        await websocket.send(json.dumps(auth_msg))
        
        # Wait for auth response
        response = await websocket.recv()
        auth_resp = json.loads(response)
        if auth_resp.get("type") == "error":
            print(f"Authentication failed: {auth_resp.get('error')}")
            return
        
        # Start terminal session
        start_msg = {
            "type": "subscribe",
            "payload": {
                "cols": 80,
                "rows": 24,
                "shell": "/bin/bash"
            }
        }
        await websocket.send(json.dumps(start_msg))
        
        # Send a command
        input_msg = {
            "type": "input",
            "data": "ls -la\n"
        }
        await websocket.send(json.dumps(input_msg))
        
        # Receive output
        while True:
            message = await websocket.recv()
            data = json.loads(message)
            if data.get("type") == "output":
                print(data.get("data"), end='')

# Run the metrics example
# asyncio.run(connect_metrics())

# Run the terminal example
# asyncio.run(connect_terminal())
```

### Node.js WebSocket Client Example

```javascript
const WebSocket = require('ws');

const TOKEN = 'your-jwt-token';
const ws = new WebSocket('ws://localhost:8080/ws/metrics');

ws.on('open', () => {
  console.log('Connected to metrics stream');
  
  // Authenticate
  ws.send(JSON.stringify({
    type: 'auth',
    payload: {
      token: TOKEN
    }
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  
  if (message.type === 'auth') {
    if (message.status === 'authenticated') {
      console.log('Authenticated successfully');
      
      // Subscribe to metrics
      ws.send(JSON.stringify({
        type: 'subscribe'
      }));
    } else {
      console.error('Authentication failed');
    }
  } else if (message.type === 'metric') {
    console.log(`${message.metric}: ${JSON.stringify(message.data)}`);
  } else if (message.type === 'error') {
    console.error('Error:', message.error);
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('Disconnected from metrics stream');
});
```

## Health Check

The health check endpoint doesn't require authentication:

```bash
curl http://103.179.254.248:8080/health
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
