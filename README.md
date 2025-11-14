# Vapor

Vapor is a comprehensive Linux system management platform inspired by [Cockpit](https://cockpit-project.org/) designed to simplify server administration through a modern web interface. With its clean and intuitive design, Vapor brings together traditional system administration tools with container orchestration and Kubernetes management capabilities.

## Key Features

1. System Management
    * User management (Linux system users)
    * Network configuration (interfaces, bridges, bonds, VLANs)
    * Storage management:
      * disks
      * LVM (upcoming)
      * iSCSI (upcoming)
      * BTRFS (upcoming)
      * multipath (upcoming)
    * System monitoring and metrics
2. Container Orchestration
    * Docker container management
    * CRI-compatible runtime support (containerd, CRI-O)
    * Container images management
    * Resumable image uploads
3. Virtualization (KVM/Libvirt) (upcoming)
    * VM creation with enhanced API
    * PCI device passthrough support
    * Storage pool management
    * Template-based VM creation
    * VNC/SPICE console access
    * Backup and snapshot management
4. Kubernetes Integration
    * Cluster management
    * Workload deployment
    * Helm chart management (upcoming)
    * Node and storage management
5. Ansible Automation (upcoming)
    * Playbook execution with parameter support
    * Ad-hoc commands
    * Dynamic inventory generation
    * Real-time output streaming
    * Execution history tracking in SQLite
6. Advanced Features
    * WebSocket-based terminal access (per-user sessions)
    * Real-time log streaming
    * Resumable file uploads (TUS protocol)
    * JWT authentication with refresh tokens
    * SSH key authentication support

## Prerequisites

- Go 1.21 or higher
- Linux operating system (primary target)
- Root privileges for system operations
- systemd for log management

### Required Linux Packages

The application requires the following system utilities to be installed on Linux:

- **Core utilities** (usually pre-installed):
  - `mount`, `umount` - For filesystem mounting operations
  - `lsblk` - For listing block devices
  - `useradd`, `usermod`, `userdel` - For user management
  - `ansible` - For otomation tasks

- **Filesystem tools** (install based on your needs):
  - `e2fsprogs` - For ext2/ext3/ext4 filesystem support (provides mkfs.ext2, mkfs.ext3, mkfs.ext4)
  - `xfsprogs` - For XFS filesystem support (provides mkfs.xfs)
  - `btrfs-progs` - For Btrfs filesystem support (provides mkfs.btrfs)

- **System logging**:
  - `systemd` - For journalctl log management

- **Advanced storage management** (optional):
  - `lvm2` - For LVM (Logical Volume Manager) support
  - `open-iscsi` or `iscsi-initiator-utils` - For iSCSI support
  - `multipath-tools` or `device-mapper-multipath` - For multipath support

#### Installing Required Packages

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y util-linux e2fsprogs xfsprogs btrfs-progs systemd lvm2 open-iscsi multipath-tools
```

**RHEL/CentOS/Fedora:**
```bash
sudo yum install -y util-linux e2fsprogs xfsprogs btrfs-progs systemd lvm2 iscsi-initiator-utils device-mapper-multipath
# or for newer versions:
sudo dnf install -y util-linux e2fsprogs xfsprogs btrfs-progs systemd lvm2 iscsi-initiator-utils device-mapper-multipath
```

**Arch Linux:**
```bash
sudo pacman -S util-linux e2fsprogs xfsprogs btrfs-progs systemd lvm2 open-iscsi multipath-tools
```

**Alpine Linux:**
```bash
sudo apk add util-linux e2fsprogs xfsprogs btrfs-progs lvm2 open-iscsi multipath-tools
```

## Platform Requirements

### Supported Platforms
- **Linux x86_64**: Primary platform with full functionality

### Operating System
This application is **Linux-only** and will not run on macOS, Windows, or other operating systems. The application enforces this requirement at startup and will exit with an error if run on non-Linux systems.

### Build Requirements
The application must be built on a Linux system or cross-compiled for Linux:
```bash
# Build for Linux x86_64 (native or cross-compilation)
make build-linux
```

## Installation

### From Script

```bash
# One-command installation
curl -fsSL https://raw.githubusercontent.com/awanio/vapor/main/scripts/install.sh | sudo bash

# Install specific version
VAPOR_VERSION=v0.0.1-rc.0 sudo ./scripts/install.sh

# Upgrade (preserves config)
sudo ./scripts/install.sh
```

### From Source

```bash
# Clone the repository
git clone https://github.com/awanio/vapor.git
cd vapor

# Install dependencies
make install-deps

# Build production binary
make build

# Build development binary
make build-dev

# Build specifically for Linux x86_64 (cross-compilation)
make build-linux

# Run tests
make test
```

### Development Environment

For a complete development environment with all dependencies, use the provided Docker Compose setup:

```bash
# Quick start using Make commands
make dev-up       # Start development environment
make dev-ps       # Check container status
make dev-exec     # Access container shell
make dev-logs     # View logs
make dev-down     # Stop environment
make dev-help     # Show all dev commands

# Or navigate to development folder for direct control
cd development
./compose.sh up -d
```

The development environment includes:
- Full Linux system with systemd
- Docker-in-Docker for container management
- K3s for Kubernetes testing
- iSCSI target for storage testing
- All required system utilities pre-installed

See [development/README.md](development/README.md) for detailed setup instructions.

### Deployment on Linux

```bash
# Build for Linux x86_64
make build-linux

# Copy binary and deploy script to Linux server
scp bin/system-api-linux-amd64 deploy.sh user@server:/tmp/

# On the Linux server, run deployment script
sudo bash /tmp/deploy.sh
```

### Using systemd

```bash
# Copy binary to system location
sudo cp bin/system-api /usr/local/bin/

# Copy systemd unit file
sudo cp system-api.service /etc/systemd/system/

# Reload systemd and start service
sudo systemctl daemon-reload
sudo systemctl enable system-api
sudo systemctl start system-api
```

## Configuration

The application can be configured using environment variables:

- `VAPOR_JWT_SECRET`: Secret key for JWT token signing (required for production)
- `VAPOR_PORT`: Server address and port (default: `:7770`)

## API Documentation

The complete OpenAPI 3.1.0 specification is available in `openapi.yaml`. 

### Authentication

The API uses **Linux system user authentication**:
- Any valid Linux user can authenticate with their system credentials
- The API uses the system's authentication mechanism (via `su` command)
- User must exist in `/etc/passwd`
- All authenticated users receive the "admin" role by default

## Web UI

The application includes an embedded web UI that is served from the root path (`/`). When you build the binary, any files in the `web/dist` directory are automatically embedded into the executable, creating a single self-contained binary.

### Building with Web UI

1. Place your web UI build artifacts in the `web/dist` directory
2. Run `make build` - this will automatically embed the web assets
3. The resulting binary will serve both the API and web UI

### Web UI Features

- Single Page Application (SPA) support with client-side routing
- Automatically serves `index.html` for unknown routes (SPA fallback)
- Static assets are served from the embedded filesystem
- No external web server required

### Accessing the Web UI

Once the server is running, you can access:
- Web UI: `http://localhost:8080/`
- API endpoints: `http://localhost:8080/api/v1/*`
- WebSocket endpoints: `ws://localhost:8080/api/v1/ws/*`
- OpenAPI docs: `http://localhost:8080/docs`

## WebSocket Features

### Terminal Access

The API provides WebSocket-based terminal access at `/api/v1/ws/terminal`. Key features:

- **User-based sessions**: Terminal sessions run as the authenticated Linux user
- **Security**: Requires valid JWT authentication before establishing terminal session
- **Audit logging**: All terminal sessions are logged with username and session details
- **User permissions**: Each user operates within their own Linux permissions

## Development

### Running in Development Mode

```bash
make dev
```

### Running Tests

```bash
# Run all tests
make test

# Run tests with coverage
make test-coverage
```

### Code Formatting

```bash
make fmt
```

### Linting

```bash
make lint
```

## Security Considerations

1. **Authentication**: Uses Linux system authentication - ensure strong user passwords.
2. **Privileges**: The service requires root privileges for system operations.
3. **JWT Secret**: Always use a strong, randomly generated secret in production.
4. **HTTPS**: Use HTTPS in production environments.
5. **Network**: Bind to localhost only or use proper firewall rules.
6. **Terminal Access**: The WebSocket terminal feature provides full shell access as the authenticated user:
   - Users get their own shell sessions with their Linux permissions
   - All terminal sessions are logged for audit purposes
   - Ensure proper authentication and network security when exposing this feature


## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on setting up your environment, coding standards, commit sign-off (DCO), and the PR process.

## Code of Conduct

Participation in this project is governed by our [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Security

Please report vulnerabilities privately as described in our [SECURITY.md](SECURITY.md).

## License

This project is licensed under the Apache License 2.0 — see the [LICENSE](LICENSE) file for details. Where required, third-party attributions are listed in the [NOTICE](NOTICE) file.

## Acknowledgments

- Inspired by the Cockpit Project
- Built with Gin Web Framework
- Uses gopsutil for system metrics
- netlink for network management
- Ansible for automation tasks
