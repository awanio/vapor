# Ansible Playbook Management Guide for Vapor

This guide explains how to manage Ansible playbooks in Vapor, making it easy for users who are new to Ansible to get started with infrastructure automation.

## What are Ansible Playbooks?

Ansible playbooks are YAML files that describe automation tasks. Think of them as recipes that tell Ansible what to do on your servers. They can:
- Install software
- Configure services
- Deploy applications
- Manage users
- And much more!

## How to Manage Playbooks in Vapor

Vapor provides multiple ways to add and manage playbooks:

### 1. 📋 List Available Playbooks

To see what playbooks are available:

```bash
GET /api/v1/ansible/playbooks
```

Response example:
```json
{
  "playbooks": [
    {
      "name": "system-update.yml",
      "description": "Update all system packages",
      "tags": ["maintenance", "security"],
      "source": "uploaded",
      "size": 1024,
      "modified_time": "2024-01-12T10:30:00Z",
      "is_valid": true
    }
  ]
}
```

### 2. 🎯 Use Pre-built Templates

Vapor comes with ready-to-use templates for common tasks:

```bash
# Get available templates
GET /api/v1/ansible/playbooks/templates
```

Available templates include:
- **System Update** - Keep servers up to date
- **Docker Deployment** - Deploy containerized applications
- **User Setup** - Create user accounts with SSH keys
- **Backup Configuration** - Set up automated backups
- **Monitoring Setup** - Install Prometheus & Grafana
- **Security Hardening** - Apply security best practices

To create a playbook from a template:

```bash
POST /api/v1/ansible/playbooks/from-template
{
  "template_id": "system-update",
  "name": "my-update-playbook.yml",
  "variables": {
    "reboot_if_required": true
  }
}
```

### 3. 📤 Upload Your Own Playbook

If you have an existing playbook:

```bash
POST /api/v1/ansible/playbooks/upload
{
  "name": "my-custom-playbook.yml",
  "content": "---\n- name: My Custom Task\n  hosts: all\n  tasks:\n    - name: Ping\n      ping:",
  "description": "My custom automation",
  "tags": ["custom", "test"]
}
```

For binary files or large playbooks, you can use base64 encoding:
```json
{
  "name": "complex-playbook.yml",
  "content": "LS0tCi0gbmFtZTogQ29tcGxleCBQbGF5Ym9vaw==",
  "is_base64": true
}
```

### 4. 🔗 Download from URL

Download playbooks directly from the internet:

```bash
POST /api/v1/ansible/playbooks/from-url
{
  "url": "https://raw.githubusercontent.com/ansible/ansible-examples/master/lamp_simple/site.yml",
  "name": "lamp-stack.yml"
}
```

### 5. 📦 Git Repository Integration

Sync playbooks from GitHub, GitLab, or any Git repository:

```bash
POST /api/v1/ansible/playbooks/sync-git
{
  "url": "https://github.com/ansible/ansible-examples.git",
  "branch": "master",
  "path": "lamp_simple"  # Optional: specific folder in the repo
}
```

For private repositories, include authentication:
```json
{
  "url": "https://github.com/myorg/private-playbooks.git",
  "token": "ghp_xxxxxxxxxxxx",  # GitHub personal access token
  "branch": "main"
}
```

### 6. 🌟 Ansible Galaxy Integration

Install community roles and collections from Ansible Galaxy:

```bash
# Install a specific role
POST /api/v1/ansible/playbooks/from-galaxy
{
  "name": "geerlingguy.nginx",
  "type": "role"
}

# Install multiple roles
POST /api/v1/ansible/playbooks/from-galaxy
{
  "roles": [
    "geerlingguy.docker",
    "geerlingguy.nodejs",
    "geerlingguy.mysql"
  ]
}

# Use a requirements file
POST /api/v1/ansible/playbooks/from-galaxy
{
  "requirements": "---\nroles:\n  - name: geerlingguy.nginx\n    version: 3.1.0\n  - name: geerlingguy.mysql"
}
```

## Running Playbooks

Once you have playbooks available, you can execute them:

```bash
POST /api/v1/ansible/playbooks/run
{
  "playbook": "system-update.yml",
  "inventory": "production",  # Or use "localhost" for local execution
  "become": true,  # Run with sudo privileges
  "extra_vars": {
    "custom_variable": "value"
  }
}
```

## Example Workflows

### Workflow 1: Quick System Update

1. Create playbook from template:
```bash
POST /api/v1/ansible/playbooks/from-template
{
  "template_id": "system-update",
  "name": "weekly-update.yml"
}
```

2. Run the playbook:
```bash
POST /api/v1/ansible/playbooks/run
{
  "playbook": "weekly-update.yml",
  "inventory": "localhost",
  "become": true
}
```

3. Monitor execution:
```bash
GET /api/v1/ansible/executions/{execution_id}
```

### Workflow 2: Deploy Docker Application

1. Get the Docker deployment template:
```bash
GET /api/v1/ansible/playbooks/templates
# Find the docker-deploy template
```

2. Create customized playbook:
```bash
POST /api/v1/ansible/playbooks/from-template
{
  "template_id": "docker-deploy",
  "name": "deploy-nginx.yml",
  "variables": {
    "app_name": "my-nginx",
    "app_image": "nginx:alpine",
    "app_port": 8080
  }
}
```

3. Execute deployment:
```bash
POST /api/v1/ansible/playbooks/run
{
  "playbook": "deploy-nginx.yml",
  "inventory": "webservers",
  "become": true
}
```

### Workflow 3: Set Up Monitoring Stack

1. Download from URL:
```bash
POST /api/v1/ansible/playbooks/from-url
{
  "url": "https://example.com/monitoring-setup.yml",
  "name": "monitoring.yml"
}
```

2. Or use the built-in template:
```bash
POST /api/v1/ansible/playbooks/from-template
{
  "template_id": "monitoring-setup",
  "name": "setup-monitoring.yml",
  "variables": {
    "prometheus_port": 9090,
    "grafana_port": 3000
  }
}
```

3. Run the setup:
```bash
POST /api/v1/ansible/playbooks/run
{
  "playbook": "setup-monitoring.yml",
  "inventory": "monitoring-servers",
  "become": true
}
```

## Managing Existing Playbooks

### View Playbook Content
```bash
GET /api/v1/ansible/playbooks/my-playbook.yml
```

### Validate Playbook Syntax
```bash
POST /api/v1/ansible/playbooks/validate
{
  "name": "my-playbook.yml"
}
```

### Delete a Playbook
```bash
DELETE /api/v1/ansible/playbooks/my-playbook.yml
```

## Best Practices

1. **Start with Templates**: If you're new to Ansible, start with the pre-built templates and customize them.

2. **Test First**: Always test playbooks on a development environment before running on production.

3. **Use Version Control**: Sync playbooks from Git repositories for better version control.

4. **Validate Before Running**: Always validate playbook syntax before execution.

5. **Use Variables**: Make playbooks reusable by using variables instead of hardcoded values.

## Common Playbook Examples

### Simple Package Installation
```yaml
---
- name: Install essential packages
  hosts: all
  become: yes
  tasks:
    - name: Install packages
      package:
        name:
          - git
          - vim
          - htop
        state: present
```

### Create User with SSH Key
```yaml
---
- name: Create admin user
  hosts: all
  become: yes
  tasks:
    - name: Create user
      user:
        name: admin
        groups: sudo
        shell: /bin/bash
        
    - name: Add SSH key
      authorized_key:
        user: admin
        key: "ssh-rsa AAAAB3NzaC1yc2... admin@example.com"
```

### Docker Container Deployment
```yaml
---
- name: Deploy web application
  hosts: webservers
  become: yes
  tasks:
    - name: Pull Docker image
      docker_image:
        name: nginx:latest
        source: pull
        
    - name: Run container
      docker_container:
        name: webserver
        image: nginx:latest
        ports:
          - "80:80"
        state: started
```

## Troubleshooting

### Playbook Not Found
- Ensure the playbook name includes the `.yml` or `.yaml` extension
- Check if the playbook was successfully uploaded/synced
- Use `GET /api/v1/ansible/playbooks` to list available playbooks

### Validation Errors
- Check YAML syntax (proper indentation, no tabs)
- Ensure all required modules are available
- Validate using `POST /api/v1/ansible/playbooks/validate`

### Execution Failures
- Check if target hosts are reachable
- Verify SSH access and credentials
- Ensure required privileges (use `become: true` for admin tasks)
- Check execution logs via WebSocket streaming

## Popular Ansible Galaxy Roles

Here are some popular roles you can install from Galaxy:

- **geerlingguy.nginx** - Nginx web server
- **geerlingguy.docker** - Docker installation
- **geerlingguy.mysql** - MySQL database
- **geerlingguy.postgresql** - PostgreSQL database
- **geerlingguy.redis** - Redis cache
- **geerlingguy.nodejs** - Node.js runtime
- **geerlingguy.java** - Java runtime
- **geerlingguy.elasticsearch** - Elasticsearch
- **anxs.kubernetes** - Kubernetes cluster
- **cloudalchemy.prometheus** - Prometheus monitoring

Install any of these with:
```bash
POST /api/v1/ansible/playbooks/from-galaxy
{
  "name": "geerlingguy.nginx",
  "type": "role"
}
```

## Next Steps

1. **Explore Templates**: Start by exploring the available templates
2. **Create Simple Playbooks**: Begin with simple tasks like package installation
3. **Use Galaxy Roles**: Leverage community roles for complex setups
4. **Automate Everything**: Gradually automate more of your infrastructure tasks
5. **Schedule Playbooks**: Set up recurring automation (coming soon)

Remember: Ansible playbooks are just YAML files describing tasks. Start simple and build complexity as you learn!
