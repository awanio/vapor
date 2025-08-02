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
        "created_at": "2025-08-01T12:40:55.236465486Z",
        "labels": {
          "io.kubernetes.container.name": "reloader"
        },
        "runtime": "docker"
      }
    ],
    "count": 1,
    "runtime": "docker"
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

### Get Container Details

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://103.179.254.248:8080/api/v1/containers/2309b08a1303
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "container": {
      "id": "2309b08a1303",
      "name": "nginx-web",
      "image": "nginx:latest",
      "state": "running",
      "status": "Up 2 hours",
      "created_at": "2025-08-01T10:00:00Z",
      "started_at": "2025-08-01T10:00:05Z",
      "image_id": "sha256:3f8a00f137a0",
      "command": ["nginx", "-g", "daemon off;"],
      "env": [
        "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
        "NGINX_VERSION=1.25.3"
      ],
      "pid": 12345,
      "user": "root",
      "working_dir": "/",
      "hostname": "2309b08a1303",
      "labels": {
        "maintainer": "NGINX Docker Maintainers <docker-maint@nginx.com>"
      },
      "runtime": "docker",
      "mounts": [
        {
          "source": "/var/lib/docker/volumes/nginx-data/_data",
          "destination": "/usr/share/nginx/html",
          "mode": "rw",
          "type": "volume",
          "read_only": false
        }
      ],
      "ports": [
        {
          "container_port": 80,
          "host_port": 8080,
          "protocol": "tcp",
          "host_ip": "0.0.0.0"
        }
      ],
      "networks": [
        {
          "name": "bridge",
          "id": "7b369a8b4f3a",
          "ip_address": "172.17.0.2",
          "ip_prefix_len": 16,
          "gateway": "172.17.0.1",
          "mac_address": "02:42:ac:11:00:02"
        }
      ],
      "resources": {
        "cpu_shares": 1024,
        "memory_limit": 536870912,
        "memory_usage": 12345678,
        "cpu_usage_percent": 0.5
      }
    },
    "runtime": "docker",
    "execution_context": {
      "directory_state": {
        "pwd": "/Users/kandar/Workspaces/vapor/api",
        "home": "/Users/kandar"
      },
      "operating_system": {
        "platform": "MacOS"
      },
      "current_time": "2025-08-02T06:33:19Z",
      "shell": {
        "name": "zsh",
        "version": "5.9"
      }
    }
  }
}
```

**Error Response (400) - Invalid Container ID:**
```json
{
  "status": "error",
  "data": null,
  "error": {
    "code": "INVALID_CONTAINER_ID",
    "message": "Container ID cannot be empty"
  }
}
```

**Error Response (500) - Container Not Found:**
```json
{
  "status": "error",
  "data": null,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to get container details: Error response from daemon: No such container: 2309b08a1303"
  }
}
```

### Get Container Logs

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/containers/2309b08a1303/logs
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "container_id": "2309b08a1303",
    "logs": "2025-08-02T09:00:00.123456789Z [notice] 1#1: using the \"epoll\" event method\n2025-08-02T09:00:00.123556789Z [notice] 1#1: nginx/1.25.3\n2025-08-02T09:00:00.123656789Z [notice] 1#1: built by gcc 12.2.0 (Debian 12.2.0-14)\n2025-08-02T09:00:00.123756789Z [notice] 1#1: OS: Linux 5.15.0-91-generic\n2025-08-02T09:00:00.123856789Z [notice] 1#1: getrlimit(RLIMIT_NOFILE): 1048576:1048576\n2025-08-02T09:00:00.123956789Z [notice] 1#1: start worker processes\n2025-08-02T09:00:00.124056789Z [notice] 1#1: start worker process 29\n2025-08-02T09:00:00.124156789Z [notice] 1#1: start worker process 30\n2025-08-02T09:00:15.432156789Z 192.168.1.100 - - [02/Aug/2025:09:00:15 +0000] \"GET / HTTP/1.1\" 200 615 \"-\" \"curl/7.81.0\"\n",
    "runtime": "docker"
  }
}
```

**Error Response (400) - Invalid Container ID:**
```json
{
  "status": "error",
  "data": null,
  "error": {
    "code": "INVALID_ID",
    "message": "Container ID is required"
  }
}
```

**Error Response (500) - Failed to Get Logs:**
```json
{
  "status": "error",
  "data": null,
  "error": {
    "code": "CONTAINER_LOGS_ERROR",
    "message": "failed to get container logs: Error response from daemon: No such container: invalid_id"
  }
}
```

**Error Response (503) - No Container Runtime:**
```json
{
  "status": "error",
  "data": null,
  "error": {
    "code": "NO_RUNTIME_AVAILABLE",
    "message": "No container runtime found. Tried CRI sockets ([/run/containerd/containerd.sock /var/run/crio/crio.sock]) and Docker. Last error: Cannot connect to the Docker daemon"
  }
}
```

### Get Image Details

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://103.179.254.248:8080/api/v1/images/d12fc38c77e5
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "image": {
      "id": "d12fc38c77e5",
      "repo_tags": ["nginx:latest", "nginx:1.25.3"],
      "repo_digests": ["nginx@sha256:4c0fdaa8b6341bfdeca5f18f7837462c80cff90527ee35ef185571e1c327beac"],
      "size": 187697974,
      "created_at": "2023-10-24T22:44:45Z",
      "parent": "",
      "author": "",
      "architecture": "amd64",
      "os": "linux",
      "labels": {
        "maintainer": "NGINX Docker Maintainers <docker-maint@nginx.com>"
      },
      "runtime": "docker",
      "config": {
        "user": "",
        "exposed_ports": ["80/tcp"],
        "env": [
          "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
          "NGINX_VERSION=1.25.3",
          "PKG_RELEASE=1"
        ],
        "cmd": ["nginx", "-g", "daemon off;"],
        "entrypoint": ["/docker-entrypoint.sh"],
        "volumes": ["/var/cache/nginx"],
        "working_dir": "",
        "stop_signal": "SIGQUIT",
        "labels": {
          "maintainer": "NGINX Docker Maintainers <docker-maint@nginx.com>"
        }
      },
      "layers": [
        {
          "id": "96526aa774ef",
          "size": 29150479,
          "created_at": "2023-10-24T20:12:31Z",
          "created_by": "/bin/sh -c #(nop) ADD file:7..."
        },
        {
          "id": "<missing>",
          "size": 0,
          "created_at": "2023-10-24T22:44:43Z",
          "created_by": "/bin/sh -c #(nop)  CMD [\"nginx\" \"-g\" \"daemon off;\"]"
        }
      ]
    },
    "runtime": "docker"
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
