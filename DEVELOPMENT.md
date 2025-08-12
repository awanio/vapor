# Vapor API Development Environment

This document describes how to set up and use the Docker-based development environment for the Vapor API.

## Overview

The development environment provides a complete Linux system with all necessary tools and services to test every feature of the Vapor API, including:

- **System Management**: Full systemd, networking, and storage capabilities
- **Container Management**: Docker and containerd runtimes
- **Kubernetes**: K3s lightweight Kubernetes for testing K8s features
- **Storage Testing**: iSCSI, NFS, SMB/CIFS, LVM, RAID capabilities
- **Hot Reload**: Automatic recompilation on code changes
- **Test Users**: Pre-configured Linux users for authentication testing

## Prerequisites

- Docker Engine 20.10+ 
- Docker Compose 2.0+
- 8GB+ RAM recommended
- 20GB+ free disk space

## Quick Start

1. **Start the development environment:**
   ```bash
   make dev-up
   ```

2. **Wait for services to be ready (about 30-60 seconds)**

3. **Test the environment:**
   ```bash
   chmod +x scripts/test_dev_env.sh
   ./scripts/test_dev_env.sh
   ```

4. **Access the services:**
   - Vapor API: http://localhost:8080
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379
   - K3s API: https://localhost:6443

## Available Make Commands

```bash
make dev-up        # Start the development environment
make dev-down      # Stop the development environment
make dev-restart   # Restart the Vapor API container
make dev-logs      # View logs from the Vapor API
make dev-exec      # Open a bash shell in the container
make dev-test      # Run tests in the container
make dev-clean     # Remove all containers and volumes
```

## Test Users

The following test users are created automatically:

| Username   | Password  | Privileges |
|------------|-----------|------------|
| vapor      | vapor123  | sudo       |
| admin      | admin789  | sudo       |
| testuser1  | test123   | normal     |
| testuser2  | test456   | normal     |

## Services in the Environment

### 1. Vapor API (vapor-api)
- **Container**: vapor-api-dev
- **Features**: 
  - Hot reload with Air
  - Full system privileges
  - Access to host Docker socket
  - Systemd enabled
  - All Linux system tools installed

### 2. PostgreSQL Database
- **Container**: vapor-postgres-dev
- **Port**: 5432
- **Credentials**: vapor/vapor123
- **Database**: vapor

### 3. Redis Cache
- **Container**: vapor-redis-dev
- **Port**: 6379
- **Persistence**: Enabled

### 4. K3s Kubernetes
- **Container**: vapor-k3s-dev
- **Port**: 6443
- **Token**: vapor-dev-token
- **Features**: Lightweight K8s for testing

### 5. iSCSI Target
- **Container**: vapor-iscsi-dev
- **Port**: 3260
- **IQN**: iqn.2024-01.io.vapor:storage.test
- **Credentials**: vapor/vapor123

### 6. NFS Server
- **Container**: vapor-nfs-dev
- **Port**: 2049
- **Export**: /nfs-share

### 7. Samba Server
- **Container**: vapor-samba-dev
- **Ports**: 139, 445
- **Share**: vapor
- **Credentials**: vapor/vapor123

## Development Workflow

### 1. Making Code Changes

The source code is mounted as read-only volumes in the container. When you make changes:

1. Edit your code locally
2. Air will detect changes and automatically rebuild
3. The API will restart with your changes

### 2. Testing Features

#### Network Management
```bash
# List network interfaces
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/network/interfaces

# The container has test bridges and VLANs pre-configured
```

#### Storage Management
```bash
# List disks (includes test loop devices)
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/storage/disks

# Test LVM (pre-configured volume group 'testvg')
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/storage/lvm/vgs
```

#### Container Management
```bash
# List Docker containers
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/docker/ps
```

#### User Management
```bash
# List system users
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/users
```

### 3. Debugging

To debug the application:

1. **View logs:**
   ```bash
   make dev-logs
   ```

2. **Access the container:**
   ```bash
   make dev-exec
   ```

3. **Use Delve debugger:**
   ```bash
   docker-compose exec vapor-api dlv debug ./cmd/vapor
   ```

### 4. Running Tests

```bash
# Run all tests in the container
make dev-test

# Run specific tests
docker-compose exec vapor-api go test -v ./internal/auth

# Run with coverage
docker-compose exec vapor-api go test -v -cover ./...
```

## Troubleshooting

### Container won't start
- Check Docker daemon is running
- Ensure ports 8080, 5432, 6379, 6443 are not in use
- Run `docker-compose logs vapor-api` for error details

### Permission denied errors
- The container runs with privileged mode
- Ensure Docker has proper permissions
- On Linux, you may need to run with sudo

### Hot reload not working
- Check Air logs: `docker-compose exec vapor-api cat build-errors.log`
- Ensure file watchers limit is sufficient: `echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf`

### Network features not working
- The container uses host networking mode
- Some features may conflict with host network configuration
- Try using bridge mode if host mode causes issues

### Storage features not working
- Loop devices are created automatically
- Check `/dev/loop*` devices exist in container
- Verify LVM tools are installed: `docker-compose exec vapor-api vgs`

## Advanced Configuration

### Custom Environment Variables

Create a `.env` file from the template:
```bash
cp .env.development .env
# Edit .env with your custom values
```

### Modifying Services

Edit `docker-compose.yml` to:
- Add new services
- Change port mappings
- Modify volume mounts
- Adjust resource limits

### Building Custom Image

To rebuild the development image:
```bash
docker-compose build --no-cache vapor-api
```

## Security Notes

⚠️ **This development environment is NOT secure for production use:**

- Uses default passwords
- Runs with privileged mode
- Disables security features
- Exposes all ports locally
- Has sudo access for test users

**Never use these configurations in production!**

## Additional Resources

- [Vapor API README](README.md)
- [API Documentation](openapi.yaml)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Air Hot Reload](https://github.com/cosmtrek/air)
