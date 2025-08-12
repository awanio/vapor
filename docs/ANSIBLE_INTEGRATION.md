# Vapor Ansible Integration

Vapor provides powerful Ansible integration capabilities, allowing you to orchestrate infrastructure automation directly through the Vapor API. This enables you to run playbooks, execute ad-hoc commands, manage inventories, and stream execution results in real-time.

## Features

- **Playbook Execution**: Run Ansible playbooks with full parameter support
- **Ad-hoc Commands**: Execute quick commands across your infrastructure
- **Dynamic Inventory**: Auto-generate inventory from containers, VMs, and system state
- **Real-time Streaming**: WebSocket-based output streaming for live execution monitoring
- **Vault Integration**: Secure handling of encrypted secrets
- **Execution History**: Track and review all automation runs
- **Scheduled Automation**: Schedule recurring playbook executions (coming soon)

## API Endpoints

### Playbook Operations

#### Run Playbook
```bash
POST /api/v1/ansible/playbooks/run
```

Request body:
```json
{
  "playbook": "site.yml",
  "inventory": "production",
  "limit": "webservers",
  "tags": ["deploy", "configure"],
  "skip_tags": ["test"],
  "extra_vars": {
    "app_version": "1.2.3",
    "environment": "production"
  },
  "become": true,
  "become_user": "root",
  "forks": 10,
  "verbosity": 2,
  "check": false,
  "diff": true,
  "vault_pass": "secret123",
  "private_key": "/path/to/key",
  "timeout": 3600
}
```

Response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "playbook",
  "status": "running",
  "start_time": "2024-01-12T10:30:00Z",
  "output": []
}
```

#### Save Playbook
```bash
POST /api/v1/ansible/playbooks
```

Request body:
```json
{
  "name": "deploy.yml",
  "content": "---\n- name: Deploy Application\n  hosts: all\n  tasks:\n    - name: Deploy\n      debug:\n        msg: \"Deploying...\""
}
```

#### Validate Playbook
```bash
POST /api/v1/ansible/playbooks/validate
```

Request body:
```json
{
  "name": "deploy.yml"
}
```

### Ad-hoc Commands

#### Run Ad-hoc Command
```bash
POST /api/v1/ansible/adhoc
```

Request body:
```json
{
  "hosts": "all",
  "module": "shell",
  "args": "uptime",
  "inventory": "production",
  "become": true,
  "forks": 5,
  "timeout": 300
}
```

### Execution Management

#### List Executions
```bash
GET /api/v1/ansible/executions
```

#### Get Execution Details
```bash
GET /api/v1/ansible/executions/{id}
```

Response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "playbook",
  "status": "success",
  "start_time": "2024-01-12T10:30:00Z",
  "end_time": "2024-01-12T10:35:00Z",
  "duration": 300,
  "exit_code": 0,
  "output": ["PLAY [Deploy Application]", "..."],
  "stats": {
    "host1": {"ok": 5, "changed": 2, "failed": 0},
    "host2": {"ok": 5, "changed": 2, "failed": 0}
  },
  "changed": true,
  "failed": [],
  "unreachable": []
}
```

#### Stream Execution Output (WebSocket)
```bash
WS /api/v1/ansible/executions/{id}/stream
```

WebSocket messages:
```json
{
  "type": "output",
  "content": "TASK [Deploy application]",
  "time": 1704975000
}
```

### Inventory Management

#### Generate Dynamic Inventory
```bash
GET /api/v1/ansible/inventory/dynamic
```

Response:
```json
{
  "all": {
    "hosts": ["web1", "web2", "db1"],
    "vars": {
      "ansible_python_interpreter": "/usr/bin/python3"
    },
    "children": ["webservers", "databases"]
  },
  "_meta": {
    "hostvars": {
      "web1": {
        "ansible_host": "192.168.1.10",
        "ansible_port": 22
      }
    }
  }
}
```

#### Save Inventory
```bash
POST /api/v1/ansible/inventory
```

Request body:
```json
{
  "name": "production",
  "inventory": {
    "all": {
      "hosts": ["web1", "web2"],
      "vars": {}
    },
    "_meta": {
      "hostvars": {}
    }
  }
}
```

## Example Playbooks

### 1. System Update
```yaml
---
- name: Update System Packages
  hosts: all
  become: yes
  tasks:
    - name: Update packages (Debian/Ubuntu)
      apt:
        upgrade: dist
        update_cache: yes
      when: ansible_os_family == "Debian"
```

### 2. Docker Deployment
```yaml
---
- name: Deploy Docker Application
  hosts: docker
  become: yes
  vars:
    app_name: "myapp"
    app_image: "nginx:latest"
    app_port: 8080
  tasks:
    - name: Deploy container
      docker_container:
        name: "{{ app_name }}"
        image: "{{ app_image }}"
        ports:
          - "{{ app_port }}:80"
        state: started
```

### 3. Monitoring Setup
```yaml
---
- name: Setup Monitoring
  hosts: monitoring
  become: yes
  tasks:
    - name: Install Prometheus
      unarchive:
        src: "https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz"
        dest: /opt
        remote_src: yes
```

## Usage Examples

### Running a Playbook with curl
```bash
curl -X POST http://localhost:8080/api/v1/ansible/playbooks/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "playbook": "system-update.yml",
    "inventory": "production",
    "become": true
  }'
```

### Executing Ad-hoc Command
```bash
curl -X POST http://localhost:8080/api/v1/ansible/adhoc \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "hosts": "webservers",
    "module": "service",
    "args": "name=nginx state=restarted",
    "inventory": "production",
    "become": true
  }'
```

### Streaming Output with WebSocket (JavaScript)
```javascript
const ws = new WebSocket('ws://localhost:8080/api/v1/ansible/executions/EXEC_ID/stream');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'output') {
    console.log(data.content);
  } else if (data.type === 'complete') {
    console.log('Execution completed:', data.result);
  }
};
```

### Python Client Example
```python
import requests
import websocket
import json

# Run playbook
response = requests.post(
    'http://localhost:8080/api/v1/ansible/playbooks/run',
    headers={'Authorization': 'Bearer YOUR_TOKEN'},
    json={
        'playbook': 'deploy.yml',
        'inventory': 'production',
        'extra_vars': {'version': '1.2.3'}
    }
)

execution = response.json()
exec_id = execution['id']

# Stream output
ws = websocket.WebSocket()
ws.connect(f'ws://localhost:8080/api/v1/ansible/executions/{exec_id}/stream')

while True:
    result = ws.recv()
    data = json.loads(result)
    if data['type'] == 'output':
        print(data['content'])
    elif data['type'] == 'complete':
        print(f"Completed with status: {data['result']['status']}")
        break

ws.close()
```

## Best Practices

### 1. Security
- Always use vault for sensitive data
- Implement proper RBAC for playbook execution
- Use SSH keys instead of passwords
- Limit sudo access appropriately

### 2. Playbook Design
- Keep playbooks idempotent
- Use tags for selective execution
- Implement proper error handling
- Use check mode for testing

### 3. Inventory Management
- Use dynamic inventory for cloud resources
- Group hosts logically
- Define group variables appropriately
- Keep inventory up-to-date

### 4. Performance
- Set appropriate fork levels
- Use async tasks for long-running operations
- Implement proper timeouts
- Cache facts when possible

## Integration with CI/CD

### GitLab CI Example
```yaml
deploy:
  stage: deploy
  script:
    - |
      curl -X POST $VAPOR_URL/api/v1/ansible/playbooks/run \
        -H "Authorization: Bearer $VAPOR_TOKEN" \
        -d '{
          "playbook": "deploy.yml",
          "inventory": "production",
          "extra_vars": {
            "version": "'$CI_COMMIT_TAG'",
            "environment": "production"
          }
        }'
```

### Jenkins Pipeline Example
```groovy
pipeline {
    agent any
    stages {
        stage('Deploy') {
            steps {
                script {
                    def response = httpRequest(
                        url: "${VAPOR_URL}/api/v1/ansible/playbooks/run",
                        httpMode: 'POST',
                        authentication: 'vapor-credentials',
                        contentType: 'APPLICATION_JSON',
                        requestBody: '''{
                            "playbook": "deploy.yml",
                            "inventory": "production"
                        }'''
                    )
                    echo "Execution ID: ${response.content}"
                }
            }
        }
    }
}
```

## Troubleshooting

### Common Issues

1. **Playbook not found**
   - Ensure playbook exists in the configured directory
   - Check file permissions

2. **Authentication failures**
   - Verify SSH keys are properly configured
   - Check vault passwords

3. **Timeout errors**
   - Increase timeout values for long-running tasks
   - Consider using async tasks

4. **Connection issues**
   - Verify network connectivity
   - Check firewall rules
   - Ensure SSH service is running

### Debug Mode

Enable verbose output for debugging:
```json
{
  "playbook": "debug.yml",
  "verbosity": 4  // Maximum verbosity
}
```

## Configuration

### Environment Variables

```bash
# Ansible configuration
export ANSIBLE_HOST_KEY_CHECKING=False
export ANSIBLE_RETRY_FILES_ENABLED=False
export ANSIBLE_TIMEOUT=30
export ANSIBLE_GATHERING=smart
```

### Vapor Configuration

```yaml
ansible:
  base_dir: /var/lib/vapor/ansible
  playbook_dir: /var/lib/vapor/ansible/playbooks
  inventory_dir: /var/lib/vapor/ansible/inventory
  log_dir: /var/log/vapor/ansible
  default_timeout: 3600
  max_forks: 50
  cleanup_age: 7d
```

## Limitations

- Scheduled execution not yet implemented
- Execution cancellation in development
- Role/collection management coming soon
- Ansible Tower/AWX integration planned

## Security Considerations

1. **Least Privilege**: Run Ansible with minimum required permissions
2. **Audit Logging**: All executions are logged for compliance
3. **Secret Management**: Use Vapor's built-in vault integration
4. **Network Isolation**: Consider network segmentation for sensitive environments
5. **Input Validation**: All playbook variables are sanitized

## Performance Tips

1. **Parallelism**: Increase forks for parallel execution
2. **Fact Caching**: Enable fact caching for frequently accessed hosts
3. **Pipelining**: Enable SSH pipelining for better performance
4. **Connection Reuse**: Use persistent connections

## Future Enhancements

- Ansible Tower/AWX integration
- Custom callback plugins
- Playbook templates marketplace
- AI-powered playbook generation
- Compliance scanning and remediation
- Cost optimization recommendations
