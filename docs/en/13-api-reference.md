# API Reference

## Overview

Vapor provides a comprehensive RESTful API for system management, allowing programmatic access to all features available in the web interface. The API uses JWT authentication and supports both JSON and YAML formats for Kubernetes resources.

## Base URL

```
http://localhost:8080/api/v1
```

Replace `localhost:8080` with your server's address and port.

## Authentication

### JWT Token Authentication

All API endpoints (except `/auth/login`) require JWT authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Login Endpoint

**POST** `/auth/login`

Authenticate and receive a JWT token.

**Request Body:**
```json
{
  "username": "your-username",
  "password": "your-password"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_at": 1704067200
  }
}
```

**Authentication Method:**
- **Linux system users**: Any valid Linux user with system credentials
- Uses system authentication via `su` command for secure authentication

## API Endpoints

### Network Management

#### List Network Interfaces
**GET** `/network/interfaces`

Returns all network interfaces with their configuration and statistics.

**Response:**
```json
{
  "status": "success",
  "data": {
    "interfaces": [
      {
        "name": "eth0",
        "mac": "00:11:22:33:44:55",
        "mtu": 1500,
        "state": "up",
        "type": "ethernet",
        "addresses": ["192.168.1.100/24"],
        "statistics": {
          "rx_bytes": 1048576,
          "tx_bytes": 524288,
          "rx_packets": 1000,
          "tx_packets": 500
        }
      }
    ]
  }
}
```

#### Bring Interface Up
**PUT** `/network/interfaces/{name}/up`

Activates a network interface.

**Parameters:**
- `name` (path): Interface name

**Response:**
```json
{
  "status": "success",
  "data": {
    "message": "Interface eth0 brought up successfully"
  }
}
```

#### Bring Interface Down
**PUT** `/network/interfaces/{name}/down`

Deactivates a network interface.

#### Configure IP Address
**POST** `/network/interfaces/{name}/address`

Adds an IP address to an interface.

**Request Body:**
```json
{
  "address": "192.168.1.100",
  "netmask": 24,
  "gateway": "192.168.1.1"
}
```

### Storage Management

#### List Disks
**GET** `/storage/disks`

Returns information about all storage disks.

**Response:**
```json
{
  "status": "success",
  "data": {
    "disks": [
      {
        "name": "sda",
        "path": "/dev/sda",
        "size": 107374182400,
        "model": "Samsung SSD 860",
        "type": "ssd",
        "partitions": [
          {
            "name": "sda1",
            "path": "/dev/sda1",
            "size": 536870912,
            "filesystem": "ext4",
            "mount_point": "/boot",
            "used": 104857600,
            "available": 432013312
          }
        ]
      }
    ]
  }
}
```

#### Mount Filesystem
**POST** `/storage/mount`

Mounts a filesystem at specified mount point.

**Request Body:**
```json
{
  "device": "/dev/sdb1",
  "mount_point": "/mnt/data",
  "filesystem": "ext4",
  "options": "rw,noatime"
}
```

#### Format Disk
**POST** `/storage/format`

Formats a disk with specified filesystem.

**Request Body:**
```json
{
  "device": "/dev/sdb",
  "filesystem": "ext4",
  "label": "DATA"
}
```

### Container Management

#### List Containers
**GET** `/containers`

Returns all containers from available runtime (Docker, containerd, or CRI-O).

**Response:**
```json
{
  "status": "success",
  "data": {
    "containers": [
      {
        "id": "2309b08a1303...",
        "name": "nginx",
        "image": "nginx:latest",
        "state": "CONTAINER_RUNNING",
        "created_at": "2025-07-25T09:38:51Z",
        "runtime": "docker"
      }
    ],
    "count": 5,
    "runtime": "docker"
  }
}
```

#### Get Container Details
**GET** `/containers/{id}`

Returns detailed information about a specific container.

#### Get Container Logs
**GET** `/containers/{id}/logs`

Returns logs from a container.

**Response:**
```json
{
  "status": "success",
  "data": {
    "container_id": "abc123def456",
    "logs": "2025-08-02 09:00:00 Started application\n2025-08-02 09:00:01 Listening on port 8080\n",
    "runtime": "docker"
  }
}
```

### Docker Management

#### List Docker Containers
**GET** `/docker/ps`

Lists all Docker containers.

**Response:**
```json
{
  "status": "success",
  "data": {
    "containers": [
      {
        "id": "abc123",
        "names": ["/nginx"],
        "image": "nginx:latest",
        "state": "running",
        "status": "Up 2 hours",
        "ports": ["80/tcp->8080/tcp"]
      }
    ]
  }
}
```

#### Create Docker Container
**POST** `/docker/containers`

Creates a new Docker container.

**Request Body:**
```json
{
  "name": "my-nginx",
  "image": "nginx:latest",
  "env": ["ENV=production"],
  "portBindings": {
    "80/tcp": [{"hostPort": "8080"}]
  }
}
```

#### Start Container
**POST** `/docker/containers/{id}/start`

Starts a stopped container.

#### Stop Container
**POST** `/docker/containers/{id}/stop`

Stops a running container.

#### Remove Container
**DELETE** `/docker/containers/{id}`

Removes a container (must be stopped first).

#### Pull Docker Image
**POST** `/docker/images/pull`

Pulls an image from Docker Hub or other registry.

**Request Body:**
```json
{
  "imageName": "nginx",
  "tag": "latest"
}
```

### Kubernetes Management

#### List Pods
**GET** `/kubernetes/pods`

Lists all pods across all namespaces.

**Response:**
```json
{
  "status": "success",
  "data": {
    "pods": [
      {
        "name": "nginx-deployment-5d59d67564-abc12",
        "namespace": "default",
        "status": "Running",
        "ready": "1/1",
        "restarts": 0,
        "age": "2d",
        "ip": "10.244.1.5",
        "node": "worker-1"
      }
    ]
  }
}
```

#### Create/Update Pod
**POST** `/kubernetes/pods`

Creates or updates a pod using Kubernetes apply semantics.

**Headers:**
- `Content-Type`: `application/json`, `application/yaml`, or `text/yaml`

**Request Body (JSON):**
```json
{
  "apiVersion": "v1",
  "kind": "Pod",
  "metadata": {
    "name": "nginx-pod",
    "namespace": "default"
  },
  "spec": {
    "containers": [
      {
        "name": "nginx",
        "image": "nginx:latest",
        "ports": [{"containerPort": 80}]
      }
    ]
  }
}
```

**Request Body (YAML):**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
  namespace: default
spec:
  containers:
  - name: nginx
    image: nginx:latest
    ports:
    - containerPort: 80
```

#### List Deployments
**GET** `/kubernetes/deployments`

Lists all deployments across all namespaces.

#### Create/Update Deployment
**POST** `/kubernetes/deployments`

Creates or updates a deployment.

#### List Services
**GET** `/kubernetes/services`

Lists all Kubernetes services.

#### Create/Update Service
**POST** `/kubernetes/services`

Creates or updates a Kubernetes service.

#### List Custom Resource Definitions
**GET** `/kubernetes/crds`

Lists all CRDs in the cluster.

**Response:**
```json
{
  "status": "success",
  "data": {
    "crds": [
      {
        "name": "certificates.cert-manager.io",
        "group": "cert-manager.io",
        "version": "v1",
        "kind": "Certificate",
        "scope": "Namespaced",
        "age": "30d"
      }
    ]
  }
}
```

### User Management

#### List Users
**GET** `/users`

Lists all system users.

**Response:**
```json
{
  "status": "success",
  "data": {
    "users": [
      {
        "username": "john",
        "uid": "1000",
        "gid": "1000",
        "home": "/home/john",
        "shell": "/bin/bash"
      }
    ]
  }
}
```

#### Create User
**POST** `/users`

Creates a new system user.

**Request Body:**
```json
{
  "username": "newuser",
  "password": "securepassword",
  "groups": "wheel,docker"
}
```

#### Reset Password
**POST** `/users/{username}/reset-password`

Resets a user's password.

**Request Body:**
```json
{
  "password": "newSecurePassword123"
}
```

### System Monitoring

#### Get System Summary
**GET** `/system/summary`

Returns comprehensive system information.

**Response:**
```json
{
  "status": "success",
  "data": {
    "hostname": "server1",
    "os": "Ubuntu 22.04 LTS",
    "kernel": "5.15.0-58-generic",
    "uptime": 8640000,
    "load_average": [1.5, 1.2, 0.9]
  }
}
```

#### Get CPU Information
**GET** `/system/cpu`

Returns detailed CPU information.

#### Get Memory Information
**GET** `/system/memory`

Returns memory usage statistics.

### System Logs

#### Query Logs
**GET** `/logs`

Queries system logs with filtering options.

**Query Parameters:**
- `service`: Filter by service name
- `priority`: Filter by priority (debug, info, warning, error, critical)
- `since`: Show logs since timestamp
- `until`: Show logs until timestamp
- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 100, max: 1000)

**Response:**
```json
{
  "status": "success",
  "data": {
    "logs": [
      {
        "timestamp": "2025-08-01T10:30:00Z",
        "priority": "info",
        "unit": "sshd",
        "message": "Accepted publickey for user",
        "hostname": "server1",
        "pid": 1234
      }
    ],
    "total_count": 500,
    "page": 1,
    "page_size": 100
  }
}
```

## WebSocket Endpoints

### Live System Metrics
**WebSocket** `/ws/metrics`

Real-time system metrics streaming.

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:8080/ws/metrics');

// Authenticate
ws.send(JSON.stringify({
  type: 'auth',
  payload: { token: 'your-jwt-token' }
}));

// Subscribe to metrics
ws.send(JSON.stringify({ type: 'subscribe' }));

// Receive metrics
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // { type: 'metric', metric: 'cpu', timestamp: '...', data: {...} }
};
```

### Live Logs Streaming
**WebSocket** `/ws/logs`

Real-time log streaming with filtering.

**Subscribe Example:**
```javascript
ws.send(JSON.stringify({
  type: 'subscribe',
  payload: {
    filters: {
      unit: 'sshd',
      priority: 'info',
      follow: true
    }
  }
}));
```

### Terminal Session
**WebSocket** `/ws/terminal`

Interactive terminal session via WebSocket.

**Start Terminal:**
```javascript
ws.send(JSON.stringify({
  type: 'subscribe',
  payload: {
    cols: 80,
    rows: 24,
    shell: '/bin/bash'
  }
}));

// Send input
ws.send(JSON.stringify({
  type: 'input',
  data: 'ls -la\n'
}));
```

## Error Handling

All error responses follow this format:

```json
{
  "status": "error",
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Additional error details"
  }
}
```

### Common Error Codes

| Code | Description |
|------| ----------- |
| `UNAUTHORIZED` | Missing or invalid JWT token |
| `INVALID_INPUT` | Invalid request parameters |
| `NOT_FOUND` | Resource not found |
| `DOCKER_ERROR` | Docker daemon error |
| `KUBERNETES_NOT_INSTALLED` | Kubernetes not available |
| `NO_RUNTIME_AVAILABLE` | No container runtime found |
| `PERMISSION_DENIED` | Insufficient permissions |

## Rate Limiting

The API implements rate limiting to prevent abuse:
- **Default limit**: 100 requests per minute per IP
- **WebSocket connections**: Maximum 10 concurrent connections per client
- **File uploads**: Maximum 100MB per file

## Best Practices

1. **Token Management**
   - Store tokens securely
   - Implement token refresh before expiration
   - Never expose tokens in URLs or logs

2. **Error Handling**
   - Always check the `status` field
   - Implement exponential backoff for retries
   - Log errors for debugging

3. **WebSocket Connections**
   - Implement reconnection logic
   - Handle connection drops gracefully
   - Clean up connections when done

4. **Resource Creation**
   - Use apply semantics for idempotent operations
   - Validate YAML/JSON before sending
   - Include proper metadata and labels

## SDK and Examples

### JavaScript/TypeScript Example

```javascript
class VaporAPI {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async request(method, path, body = null) {
    const response = await fetch(`${this.baseURL}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : null
    });

    const data = await response.json();
    if (data.status === 'error') {
      throw new Error(data.error.message);
    }
    return data.data;
  }

  async getContainers() {
    return this.request('GET', '/containers');
  }

  async createPod(podSpec) {
    return this.request('POST', '/kubernetes/pods', podSpec);
  }
}
```

### Python Example

```python
import requests
import json

class VaporAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def get_containers(self):
        response = requests.get(
            f'{self.base_url}/containers',
            headers=self.headers
        )
        return response.json()
    
    def create_pod(self, pod_spec):
        response = requests.post(
            f'{self.base_url}/kubernetes/pods',
            headers=self.headers,
            json=pod_spec
        )
        return response.json()
```

### cURL Examples

```bash
# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your-username","password":"your-password"}'

# Get containers
curl -X GET http://localhost:8080/api/v1/containers \
  -H "Authorization: Bearer <token>"

# Create Kubernetes pod
curl -X POST http://localhost:8080/api/v1/kubernetes/pods \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/yaml" \
  --data-binary @pod.yaml
```

## API Versioning

The API uses URL-based versioning:
- Current version: `v1`
- Base path: `/api/v1`

Future versions will be available at `/api/v2`, etc., with backward compatibility maintained for at least 6 months after a new version release.

## Support

For API support and questions:
- GitHub Issues: [github.com/vapor/issues](https://github.com/vapor/issues)
- API Documentation: Available at `/docs` endpoint
- Community Forum: [community.vapor.io](https://community.vapor.io)

---

[← Previous: Terminal Access](12-terminal-access.md) | [Next: Security Best Practices →](14-security.md)
