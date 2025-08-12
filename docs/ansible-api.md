# Ansible API Documentation

## Base URL
All Ansible endpoints are prefixed with `/api/v1/ansible`

## Authentication
All endpoints require JWT authentication via the `Authorization: Bearer <token>` header.

---

## Playbook Management

### List All Playbooks
**GET** `/api/v1/ansible/playbooks`

Returns a list of all available playbooks.

**Response:**
```json
{
  "playbooks": [
    {
      "name": "update-packages.yml",
      "path": "playbooks/update-packages.yml",
      "size": 1024,
      "modified": "2024-01-15T10:30:00Z",
      "is_directory": false
    }
  ]
}
```

### Get Playbook Details
**GET** `/api/v1/ansible/playbooks/:name`

Returns detailed information about a specific playbook including its content.

**Parameters:**
- `name` (path) - Name of the playbook

**Response:**
```json
{
  "name": "update-packages.yml",
  "path": "playbooks/update-packages.yml",
  "content": "---\n- name: Update packages\n  hosts: all\n...",
  "size": 1024,
  "modified": "2024-01-15T10:30:00Z"
}
```

### Upload Playbook
**POST** `/api/v1/ansible/playbooks/upload`

Uploads a new playbook to the server.

**Request Body:**
```json
{
  "name": "my-playbook.yml",
  "content": "base64_encoded_content",
  "overwrite": false
}
```

**Response:**
```json
{
  "message": "playbook uploaded successfully"
}
```

### Delete Playbook
**DELETE** `/api/v1/ansible/playbooks/:name`

Deletes a playbook from the server.

**Parameters:**
- `name` (path) - Name of the playbook to delete

**Response:**
```json
{
  "message": "playbook deleted successfully"
}
```

### Validate Playbook
**POST** `/api/v1/ansible/playbooks/validate`

Validates playbook syntax using ansible-playbook --syntax-check.

**Request Body:**
```json
{
  "name": "my-playbook.yml"
}
```

**Response:**
```json
{
  "valid": true,
  "message": "playbook syntax is valid"
}
```

---

## Playbook Templates

### Get Templates
**GET** `/api/v1/ansible/playbooks/templates`

Returns a list of available playbook templates.

**Response:**
```json
{
  "templates": [
    {
      "id": "package-update",
      "name": "Package Update",
      "description": "Update system packages",
      "variables": ["target_hosts", "package_manager"]
    }
  ]
}
```

### Create from Template
**POST** `/api/v1/ansible/playbooks/from-template`

Creates a new playbook from a template.

**Request Body:**
```json
{
  "template_id": "package-update",
  "name": "update-prod-servers.yml",
  "variables": {
    "target_hosts": "production",
    "package_manager": "apt"
  }
}
```

**Response:**
```json
{
  "message": "playbook created from template"
}
```

---

## External Sources

### Sync from Git Repository
**POST** `/api/v1/ansible/playbooks/sync-git`

Syncs playbooks from a Git repository.

**Request Body:**
```json
{
  "url": "https://github.com/user/ansible-playbooks.git",
  "branch": "main",
  "path": "playbooks/",
  "auth_token": "optional_github_token",
  "ssh_key": "optional_ssh_private_key",
  "sync_as_symlink": false
}
```

**Response:**
```json
{
  "message": "playbooks synced from git repository"
}
```

### Install from Ansible Galaxy
**POST** `/api/v1/ansible/playbooks/from-galaxy`

Installs roles or collections from Ansible Galaxy.

**Request Body:**
```json
{
  "type": "role",
  "name": "geerlingguy.docker",
  "version": "latest",
  "requirements_file": "optional_requirements.yml_content"
}
```

**Response:**
```json
{
  "message": "roles/collections installed from galaxy"
}
```

### Download from URL
**POST** `/api/v1/ansible/playbooks/from-url`

Downloads a playbook from a URL.

**Request Body:**
```json
{
  "url": "https://example.com/playbooks/setup.yml",
  "name": "setup.yml"
}
```

**Response:**
```json
{
  "message": "playbook downloaded successfully"
}
```

---

## Playbook Execution

### Run Playbook
**POST** `/api/v1/ansible/playbooks/run`

Executes an Ansible playbook.

**Request Body:**
```json
{
  "playbook": "update-packages.yml",
  "inventory": "production",
  "extra_vars": {
    "package_state": "latest"
  },
  "tags": ["update"],
  "skip_tags": ["restart"],
  "limit": "web-servers",
  "forks": 10,
  "timeout": 3600,
  "verbosity": 2,
  "check": false,
  "diff": false,
  "become": true,
  "become_user": "root"
}
```

**Response:**
```json
{
  "id": "exec-123456",
  "status": "running",
  "type": "playbook",
  "playbook": "update-packages.yml",
  "start_time": "2024-01-15T10:30:00Z"
}
```

### Run Ad-hoc Command
**POST** `/api/v1/ansible/adhoc`

Executes an ad-hoc Ansible command.

**Request Body:**
```json
{
  "hosts": "all",
  "module": "shell",
  "args": "uptime",
  "inventory": "production",
  "extra_vars": {},
  "forks": 10,
  "timeout": 300,
  "verbosity": 1,
  "become": false
}
```

**Response:**
```json
{
  "id": "exec-789012",
  "status": "running",
  "type": "adhoc",
  "module": "shell",
  "start_time": "2024-01-15T10:35:00Z"
}
```

---

## Execution Management

### List Executions
**GET** `/api/v1/ansible/executions`

Returns a list of all execution results.

**Response:**
```json
{
  "executions": [
    {
      "id": "exec-123456",
      "status": "success",
      "type": "playbook",
      "playbook": "update-packages.yml",
      "start_time": "2024-01-15T10:30:00Z",
      "end_time": "2024-01-15T10:35:00Z",
      "duration": 300,
      "exit_code": 0,
      "changed": true
    }
  ]
}
```

### Get Execution Details
**GET** `/api/v1/ansible/executions/:id`

Returns detailed information about a specific execution.

**Parameters:**
- `id` (path) - Execution ID

**Response:**
```json
{
  "id": "exec-123456",
  "status": "success",
  "type": "playbook",
  "playbook": "update-packages.yml",
  "start_time": "2024-01-15T10:30:00Z",
  "end_time": "2024-01-15T10:35:00Z",
  "duration": 300,
  "exit_code": 0,
  "changed": true,
  "output": [
    "PLAY [Update packages] *****",
    "TASK [Gathering Facts] *****",
    "ok: [server1]"
  ],
  "stats": {
    "server1": {
      "ok": 5,
      "changed": 2,
      "unreachable": 0,
      "failed": 0,
      "skipped": 0
    }
  },
  "failed": [],
  "unreachable": []
}
```

### Stream Execution Output
**WebSocket** `/api/v1/ansible/executions/:id/stream`

Streams real-time execution output via WebSocket.

**Parameters:**
- `id` (path) - Execution ID

**WebSocket Messages:**
```json
{
  "type": "output",
  "content": "TASK [Update packages] *****",
  "time": 1705315800
}
```

```json
{
  "type": "complete",
  "result": {
    "id": "exec-123456",
    "status": "success",
    "exit_code": 0
  }
}
```

### Cancel Execution
**DELETE** `/api/v1/ansible/executions/:id`

Cancels a running execution (not yet implemented).

**Parameters:**
- `id` (path) - Execution ID

**Response:**
```json
{
  "error": "cancellation not yet implemented"
}
```

---

## Inventory Management

### Generate Dynamic Inventory
**GET** `/api/v1/ansible/inventory/dynamic`

Generates a dynamic inventory from current system state.

**Response:**
```json
{
  "_meta": {
    "hostvars": {
      "localhost": {
        "ansible_connection": "local"
      }
    }
  },
  "all": {
    "hosts": ["localhost"],
    "children": []
  },
  "localhost": {
    "hosts": ["localhost"]
  }
}
```

### Save Inventory
**POST** `/api/v1/ansible/inventory`

Saves an inventory configuration.

**Request Body:**
```json
{
  "name": "production",
  "inventory": {
    "_meta": {
      "hostvars": {}
    },
    "all": {
      "hosts": ["server1", "server2"],
      "children": ["web", "db"]
    }
  }
}
```

**Response:**
```json
{
  "message": "inventory saved successfully"
}
```

### Get Inventory
**GET** `/api/v1/ansible/inventory/:name`

Retrieves a saved inventory (not yet implemented).

**Parameters:**
- `name` (path) - Inventory name

---

## Scheduled Tasks (Not Yet Implemented)

### Create Schedule
**POST** `/api/v1/ansible/schedules`

Creates a scheduled playbook execution.

**Request Body:**
```json
{
  "name": "nightly-updates",
  "schedule": "0 2 * * *",
  "playbook": {
    "playbook": "update-packages.yml",
    "inventory": "production"
  }
}
```

### List Schedules
**GET** `/api/v1/ansible/schedules`

Returns all scheduled tasks.

### Delete Schedule
**DELETE** `/api/v1/ansible/schedules/:id`

Deletes a scheduled task.

---

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "error": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `200 OK` - Successful GET request
- `201 Created` - Successful POST request that created a resource
- `202 Accepted` - Request accepted for processing (async operations)
- `400 Bad Request` - Invalid request parameters or body
- `401 Unauthorized` - Missing or invalid authentication
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Example Usage

### Complete Workflow Example

1. **Upload a playbook:**
```bash
curl -X POST http://localhost:8081/api/v1/ansible/playbooks/upload \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "setup-web.yml",
    "content": "'$(base64 < setup-web.yml)'"
  }'
```

2. **Validate the playbook:**
```bash
curl -X POST http://localhost:8081/api/v1/ansible/playbooks/validate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "setup-web.yml"}'
```

3. **Run the playbook:**
```bash
curl -X POST http://localhost:8081/api/v1/ansible/playbooks/run \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "playbook": "setup-web.yml",
    "inventory": "production",
    "become": true
  }'
```

4. **Check execution status:**
```bash
curl -X GET http://localhost:8081/api/v1/ansible/executions/exec-123456 \
  -H "Authorization: Bearer $TOKEN"
```

5. **Stream output via WebSocket:**
```javascript
const ws = new WebSocket('ws://localhost:8081/api/v1/ansible/executions/exec-123456/stream');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'output') {
    console.log(data.content);
  } else if (data.type === 'complete') {
    console.log('Execution completed:', data.result);
  }
};
```
