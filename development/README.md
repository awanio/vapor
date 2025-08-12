# Vapor Development Environment

This folder contains all files related to the Vapor API development environment, including Docker configurations, compose files, and helper scripts.

## 📁 Structure

```
development/
├── docker-compose.yml      # Main compose configuration with all services
├── Dockerfile.dev          # Development container with full system capabilities
├── compose.sh              # Universal compose wrapper (works with Docker/nerdctl/Podman)
├── CONTAINER_RUNTIMES.md   # Documentation for different container runtimes
└── README.md               # This file
```

## 🚀 Quick Start

### Using Make commands (Recommended - from project root)
```bash
make dev-up       # Start all services
make dev-ps       # Check status
make dev-exec     # Open container shell
make dev-logs     # View logs
make dev-down     # Stop all services
make dev-help     # Show all available commands
```

### Using the wrapper script (from development folder)
```bash
cd development
./compose.sh up -d    # Start all services
./compose.sh ps       # Check status
./compose.sh down     # Stop all services
```

### Using Docker Compose directly
```bash
cd development
docker compose up -d
docker compose ps
docker compose down
```

### Using nerdctl (for Colima/containerd users)
```bash
cd development
nerdctl compose up -d
nerdctl compose ps
nerdctl compose down
```

## 🔧 Services

The development environment includes:

1. **vapor-api-dev** - Main API container with:
   - Full system management capabilities
   - Systemd support
   - Live code mounting
   - Development tools

2. **vapor-dind-dev** - Docker-in-Docker service:
   - Isolated Docker daemon
   - TLS-secured connection
   - Container management support

3. **vapor-k3s-dev** - Lightweight Kubernetes:
   - K3s server
   - API endpoint for testing
   - Kubernetes integration testing

4. **vapor-iscsi-dev** - iSCSI target:
   - Storage testing
   - iSCSI initiator testing
   - Block storage simulation

## 📝 Configuration

### Environment Variables
Default environment variables are set in docker-compose.yml:
- `JWT_SECRET`: Development JWT secret
- `SERVER_ADDR`: API server address (default :8080)
- `GO_ENV`: Set to development
- `DEBUG`: Enabled for verbose logging
- `TEST_USER/TEST_PASSWORD`: Test credentials

### Volumes
Persistent volumes for development data:
- `storage-test`: Test storage mount
- `journal`: Systemd journal logs
- `lvm-data`: LVM metadata
- `iscsi-config`: iSCSI configuration
- `dind-storage`: Docker daemon storage
- `dind-certs-*`: TLS certificates

### Network
Custom bridge network: `vapor-dev-network` (172.28.0.0/16)

## 🛠️ Common Tasks

### Access the API container
```bash
./compose.sh exec vapor-api bash
```

### View logs
```bash
./compose.sh logs -f vapor-api
```

### Rebuild after Dockerfile changes
```bash
./compose.sh build
./compose.sh up -d
```

### Clean up everything
```bash
./compose.sh down -v  # Also removes volumes
```

## 🔍 Testing

### Check API health
```bash
curl http://localhost:8080/health
```

### Test Docker connectivity (from inside container)
```bash
./compose.sh exec vapor-api docker version
```

### Test Kubernetes connectivity
```bash
kubectl --kubeconfig=../kubeconfig get nodes
```

## 📚 Additional Documentation

- [Libvirt Setup Guide](LIBVIRT_SETUP.md) - Complete guide for libvirt/KVM development environment
- [Container Runtime Support](CONTAINER_RUNTIMES.md) - Using with Colima, nerdctl, Podman
- [Parent README](../README.md) - Main project documentation

## ⚠️ Important Notes

1. **Privileged Mode**: The containers run in privileged mode for system management capabilities
2. **Host Requirements**: Requires Docker, Colima+nerdctl, or Podman installed
3. **Resource Usage**: Allocate at least 4 CPU cores and 8GB RAM for optimal performance
4. **Security**: This setup is for development only, not for production use

## 🐛 Troubleshooting

### Services won't start
```bash
# Check for port conflicts
lsof -i :8080  # API port
lsof -i :2376  # Docker daemon port
lsof -i :6443  # K3s port

# Check Docker/container runtime status
docker version
# or
nerdctl version
```

### Permission issues
```bash
# Ensure scripts are executable
chmod +x compose.sh
```

### Clean slate restart
```bash
./compose.sh down -v
docker system prune -a  # or nerdctl system prune -a
./compose.sh up -d
```
