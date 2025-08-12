# Container Runtime Support for Vapor Development

This document explains how to use the Vapor development environment with different container runtimes, particularly for macOS users who prefer alternatives to Docker Desktop.

## Supported Container Runtimes

### 1. Docker Desktop (Default)
The standard option with full Docker and Docker Compose support.

```bash
# Standard Docker Compose commands work as usual
docker compose up -d
docker compose down
```

### 2. Colima with containerd + nerdctl
Popular open-source alternative for macOS users.

#### Setup:
```bash
# Install Colima and nerdctl
brew install colima nerdctl

# Start Colima with containerd runtime (recommended for better performance)
colima start --runtime containerd --cpu 4 --memory 8 --disk 100

# Verify setup
colima status
nerdctl version
```

#### Usage:
```bash
# Use nerdctl compose instead of docker compose
nerdctl compose up -d
nerdctl compose down
nerdctl compose ps
nerdctl compose logs -f vapor-api

# Or use the universal wrapper script
./compose.sh up -d
./compose.sh down
```

### 3. Rancher Desktop
Another Docker Desktop alternative with containerd support.

#### Setup:
```bash
# Install Rancher Desktop
brew install --cask rancher

# Configure to use containerd (in Rancher Desktop preferences)
# Container Engine: containerd
# Enable: nerdctl CLI
```

#### Usage:
Same as Colima - use `nerdctl compose` commands.

### 4. Podman with podman-compose
Red Hat's daemonless container runtime.

#### Setup:
```bash
# Install Podman and podman-compose
brew install podman podman-compose

# Initialize and start Podman machine
podman machine init
podman machine start
```

#### Usage:
```bash
# Use podman-compose
podman-compose up -d
podman-compose down

# Or use the wrapper
COMPOSE_BACKEND=podman ./compose.sh up -d
```

## Universal Compose Wrapper

We provide a `compose.sh` wrapper script that automatically detects and uses the appropriate compose tool:

```bash
# Make it executable (one time)
chmod +x compose.sh

# Use it like docker-compose
./compose.sh up -d
./compose.sh down
./compose.sh ps
./compose.sh logs -f vapor-api
./compose.sh exec vapor-api bash
```

The wrapper automatically detects:
1. Colima with containerd → uses `nerdctl compose`
2. Docker Desktop → uses `docker compose` or `docker-compose`
3. Podman → uses `podman-compose`
4. Standalone nerdctl → uses `nerdctl compose`

### Force a Specific Backend

```bash
# Force using nerdctl even if Docker is available
COMPOSE_BACKEND=nerdctl ./compose.sh up -d

# Force using Docker
COMPOSE_BACKEND=docker ./compose.sh up -d

# Force using Podman
COMPOSE_BACKEND=podman ./compose.sh up -d
```

## Container Runtime Considerations

### For Colima/containerd Users

1. **Networking**: Colima creates its own network bridge. Services are accessible through:
   - `localhost` on macOS
   - Container names within the compose network

2. **Volume Mounts**: Colima automatically handles volume mounts from macOS to the VM. By default, it mounts:
   - `$HOME`
   - `/tmp/colima`

3. **Performance**: containerd runtime generally offers better performance than Docker runtime on macOS.

4. **Docker Compatibility**: While nerdctl aims for Docker compatibility, some advanced Docker features might not be available.

### For Docker-in-Docker (DinD) Setup

Our development environment uses Docker-in-Docker for isolation. When using alternative runtimes:

- **nerdctl**: Supports running Docker daemon inside containers (privileged mode required)
- **Podman**: Can run in rootless mode but may need adjustments for DinD functionality

## Troubleshooting

### Colima Issues

```bash
# Check Colima status
colima status

# View Colima logs
colima logs

# Restart Colima
colima stop
colima start --runtime containerd

# SSH into Colima VM for debugging
colima ssh
```

### nerdctl Compose Issues

```bash
# Check nerdctl configuration
nerdctl info

# List namespaces (nerdctl uses namespaces for isolation)
nerdctl namespace ls

# Use specific namespace
nerdctl --namespace default compose up
```

### Permission Issues

If you encounter permission issues with containerd:

```bash
# Ensure your user is in the appropriate group
sudo usermod -aG docker $USER  # For Docker
# Log out and back in for group changes to take effect
```

### Network Connectivity

Test connectivity between services:

```bash
# From host to services
curl http://localhost:8080/health  # Vapor API
curl http://localhost:6443  # K3s API

# Between containers (exec into one container)
nerdctl compose exec vapor-api sh
# Then test from inside
ping dind
ping k3s
```

## Best Practices

1. **Choose One Runtime**: Stick to one container runtime to avoid conflicts.

2. **Resource Allocation**: Ensure adequate resources for your VM:
   ```bash
   # For Colima (adjust based on your needs)
   colima start --cpu 4 --memory 8 --disk 100
   ```

3. **Clean Up**: Regularly clean up unused resources:
   ```bash
   # For nerdctl
   nerdctl system prune -a
   
   # For Docker
   docker system prune -a
   
   # For Podman
   podman system prune -a
   ```

4. **Use the Wrapper**: The `compose.sh` wrapper handles runtime detection automatically and provides a consistent interface.

## Additional Resources

- [Colima Documentation](https://github.com/abiosoft/colima)
- [nerdctl Documentation](https://github.com/containerd/nerdctl)
- [containerd Documentation](https://containerd.io/)
- [Podman Documentation](https://podman.io/)
- [Rancher Desktop Documentation](https://docs.rancherdesktop.io/)
