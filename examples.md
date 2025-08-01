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

## Container Management

### List Containers

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://103.179.254.248:8080/api/v1/containers
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "containers": [
      {
        "id": "2309b08a1303d054769d3adba93ac148c6cc31748a6dbecda5b12156028b034c",
        "name": "reloader",
        "image": "sha256:5ea6cbf6dee9b4b67edbd108986d75c5958273e6f6faaf0c18e734572b6b8821",
        "state": "CONTAINER_RUNNING",
        "status": "CONTAINER_RUNNING",
        "created_at": "2025-07-25T09:38:51.086238448Z",
        "labels": {
          "io.kubernetes.container.name": "reloader"
        },
        "runtime": "containerd"
      }
    ],
    "count": 1,
    "runtime": "containerd"
  }
}
```

**Error Response (503) - No Container Runtime Available:**
```json
{
  "status": "error",
  "data": null,
  "error": {
    "code": "NO_RUNTIME_AVAILABLE",
    "message": "No container runtime found. Tried CRI sockets ([/run/containerd/containerd.sock /var/run/crio/crio.sock]) and Docker. Last error: Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?"
  }
}
```

### List Images

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://103.179.254.248:8080/api/v1/images
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "images": [
      {
        "id": "sha256:d12fc38c77e50eab23af17f302d5b94514173d9f84150b7662aecbfeb21f8717",
        "repo_tags": ["r.awan.app/library/remote-console-ipmi:2.0"],
        "repo_digests": ["quay.io/operatorhubio/catalog@sha256:096fa413e1b8dba2071020e5809597e7d86da5a2833ffdf97a20457af714e678"],
        "size": 109999465,
        "created_at": "2025-08-01T12:40:55.236465486Z",
        "runtime": "containerd"
      }
    ],
    "count": 1,
    "runtime": "containerd"
  }
}
```

**Error Response (503) - No Container Runtime Available:**
```json
{
  "status": "error",
  "data": null,
  "error": {
    "code": "NO_RUNTIME_AVAILABLE",
    "message": "No container runtime found. Tried CRI sockets ([/run/containerd/containerd.sock /var/run/crio/crio.sock]) and Docker. Last error: Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?"
  }
}
```

### Frontend Error Handling

When implementing frontend code to handle container endpoints, you should check for the 503 error response:

```javascript
// Example JavaScript error handling
fetch('/api/v1/containers', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(response => {
  if (!response.ok) {
    return response.json().then(data => {
      if (response.status === 503 && data.error?.code === 'NO_RUNTIME_AVAILABLE') {
        // Show user-friendly message
        showMessage('Container management features are not available. Please install Docker or a CRI-compatible container runtime.');
        // Optionally hide or disable container-related UI elements
        disableContainerFeatures();
      } else {
        // Handle other errors
        showError(data.error?.message || 'An error occurred');
      }
    });
  }
  return response.json();
})
.then(data => {
  // Handle successful response
  displayContainers(data.data.containers);
});
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


### WebSocket Logs Subscription Examples

Here are some examples for subscribing to logs via WebSocket:

1. **All logs from all services (most verbose):**

    ```json
    {
      "type": "subscribe",
      "payload": {
        "filters": {
          "follow": true
        }
      }
    }
    ```

2. **All priority levels from a specific service (e.g., systemd):**

    ```json
    {
      "type": "subscribe",
      "payload": {
        "filters": {
          "unit": "systemd",
          "follow": true
        }
      }
    }
    ```

3. **Info level and above (shows info, warning, error, critical):**

    ```json
    {
      "type": "subscribe",
      "payload": {
        "filters": {
          "priority": "info",
          "follow": true
        }
      }
    }
    ```

4. **Kernel messages (usually active):**

    ```json
    {
      "type": "subscribe",
      "payload": {
        "filters": {
          "unit": "kernel",
          "follow": true
        }
      }
    }
    ```

5. **SSH daemon logs at info level (shows connections, disconnections):**

    ```json
    {
      "type": "subscribe",
      "payload": {
        "filters": {
          "unit": "sshd",
          "priority": "info",
          "follow": true
        }
      }
    }
    ```

6. **NetworkManager logs (if using NetworkManager):**

    ```json
    {
      "type": "subscribe",
      "payload": {
        "filters": {
          "unit": "NetworkManager",
          "follow": true
        }
      }
    }
    ```

7. **Recent logs (last 10 minutes):**

    ```json
    {
      "type": "subscribe",
      "payload": {
        "filters": {
          "since": "10 minutes ago",
          "follow": true
        }
      }
    }
    ```

#### Example Response

When logs are found, the WebSocket will send messages like:

```json
{
  "type": "data",
  "payload": {
    "timestamp": "2024-01-15T10:30:00Z",
    "level": "info",
    "unit": "sshd.service",
    "message": "Accepted publickey for john from 192.168.1.100 port 52341 ssh2: RSA SHA256:xxx"
  }
}
```

Other example log entries:

```json
// Kernel message
{
  "type": "data",
  "payload": {
    "timestamp": "2024-01-15T10:31:15Z",
    "level": "info",
    "unit": "kernel",
    "message": "[UFW BLOCK] IN=eth0 OUT= MAC=xx:xx:xx:xx:xx:xx SRC=192.168.1.50 DST=192.168.1.10 LEN=40 TOS=0x00 PREC=0x00 TTL=255 ID=0 PROTO=TCP SPT=54321 DPT=22 WINDOW=1024 RES=0x00 SYN URGP=0"
  }
}

// SystemD service message
{
  "type": "data",
  "payload": {
    "timestamp": "2024-01-15T10:32:00Z",
    "level": "notice",
    "unit": "systemd",
    "message": "Started OpenBSD Secure Shell server."
  }
}

// Error message
{
  "type": "data",
  "payload": {
    "timestamp": "2024-01-15T10:33:45Z",
    "level": "error",
    "unit": "nginx.service",
    "message": "2024/01/15 10:33:45 [error] 1234#1234: *5678 connect() failed (111: Connection refused) while connecting to upstream"
  }
}
```

**Priority Levels:**
- `debug` - Debugging messages (most verbose)
- `info` - Informational messages
- `notice` - Normal but significant messages
- `warning` - Warning messages
- `error` - Error messages
- `critical` - Critical messages (most severe)

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
        
        # Resize terminal
        resize_msg = {
            "type": "resize",
            "payload": {
                "cols": 120,
                "rows": 40
            }
        }
        await websocket.send(json.dumps(resize_msg))

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
