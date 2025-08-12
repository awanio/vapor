# Vapor

Vapor is a comprehensive Linux system management platform inspired by [Cockpit](https://cockpit-project.org/) designed to simplify server administration through a modern web interface. With its clean and intuitive design, Vapor brings together traditional system administration tools with container orchestration and Kubernetes management capabilities.

## Features

- **Network Management**: Configure network interfaces, create bridges, bonds, and VLANs
- **Storage Management**: 
  - List disks, mount/unmount filesystems, format disks
  - LVM support: manage volume groups, logical volumes, and physical volumes
  - iSCSI support: discover targets, manage sessions, login/logout
  - Multipath support: list devices and paths
  - BTRFS support: manage subvolumes and snapshots
- **Ansible Integration**: 
  - Execute playbooks with full parameter support
  - Run ad-hoc commands across infrastructure
  - Generate dynamic inventories from system state
  - Real-time output streaming via WebSocket
  - Playbook validation and management
- **User Management**: Create, update, delete system users
- **Container Management**: List containers and images
  - Requires Docker or CRI-compatible runtime to be installed and running
- **Log Viewer**: Query and filter systemd logs (Linux only; sample data on non-Linux systems)
- **System Information**: View CPU, memory, hardware, and system details
- **JWT Authentication**: Secure API endpoints with token-based authentication
- **Embedded Web UI**: Single binary includes both API and web frontend (when available)

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
- **Linux ARM64**: Supported but less extensively tested

### Operating System
This application is **Linux-only** and will not run on macOS, Windows, or other operating systems. The application enforces this requirement at startup and will exit with an error if run on non-Linux systems.

### Build Requirements
The application must be built on a Linux system or cross-compiled for Linux:
```bash
# Build for Linux x86_64 (native or cross-compilation)
make build-linux
```

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/vapor/system-api.git
cd system-api

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

- `JWT_SECRET`: Secret key for JWT token signing (required for production)
- `SERVER_ADDR`: Server address and port (default: `:8080`)

## API Documentation

The complete OpenAPI 3.1.0 specification is available in `openapi.yaml`. 

### Authentication

The API uses **Linux system user authentication**:
- Any valid Linux user can authenticate with their system credentials
- The API uses the system's authentication mechanism (via `su` command)
- User must exist in `/etc/passwd`
- All authenticated users receive the "admin" role by default

Obtain a JWT token:

```bash
# Using Linux system user
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "your_linux_username", "password": "your_password"}'
```

Use the token in subsequent requests:

```bash
curl -H "Authorization: Bearer <token>" http://localhost:8080/api/v1/system/summary
```

### Example Endpoints

#### Network Management
- `GET /api/v1/network/interfaces` - List all network interfaces
- `PUT /api/v1/network/interfaces/{name}/up` - Bring interface up
- `PUT /api/v1/network/interfaces/{name}/down` - Bring interface down
- `POST /api/v1/network/interfaces/{name}/address` - Configure IP address
- `PUT /api/v1/network/interfaces/{name}/address` - Update IP address
- `DELETE /api/v1/network/interfaces/{name}/address?address=x.x.x.x` - Delete IP address
- `POST /api/v1/network/bridge` - Create network bridge
- `PUT /api/v1/network/bridge/{name}` - Update network bridge
- `DELETE /api/v1/network/bridge/{name}` - Delete network bridge
- `POST /api/v1/network/bond` - Create network bond
- `PUT /api/v1/network/bond/{name}` - Update network bond
- `DELETE /api/v1/network/bond/{name}` - Delete network bond
- `POST /api/v1/network/vlan` - Create VLAN
- `PUT /api/v1/network/vlan/{name}` - Update VLAN
- `DELETE /api/v1/network/vlan/{name}` - Delete VLAN

#### Storage Management
- `GET /api/v1/storage/disks` - List all disks
- `POST /api/v1/storage/mount` - Mount filesystem
- `POST /api/v1/storage/unmount` - Unmount filesystem
- `POST /api/v1/storage/format` - Format disk

##### LVM Operations
- `GET /api/v1/storage/lvm/vgs` - List volume groups
- `GET /api/v1/storage/lvm/lvs` - List logical volumes  
- `GET /api/v1/storage/lvm/pvs` - List physical volumes
- `POST /api/v1/storage/lvm/vg` - Create volume group
- `POST /api/v1/storage/lvm/lv` - Create logical volume

##### iSCSI Operations
- `POST /api/v1/storage/iscsi/discover` - Discover iSCSI targets
- `GET /api/v1/storage/iscsi/sessions` - List active sessions
- `POST /api/v1/storage/iscsi/login` - Login to target
- `POST /api/v1/storage/iscsi/logout` - Logout from target

##### Multipath Operations
- `GET /api/v1/storage/multipath/devices` - List multipath devices
- `GET /api/v1/storage/multipath/paths` - List multipath paths

##### BTRFS Operations  
- `GET /api/v1/storage/btrfs/subvolumes` - List subvolumes
- `POST /api/v1/storage/btrfs/subvolume` - Create subvolume
- `DELETE /api/v1/storage/btrfs/subvolume` - Delete subvolume
- `POST /api/v1/storage/btrfs/snapshot` - Create snapshot

#### User Management
- `GET /api/v1/users` - List all users
- `POST /api/v1/users` - Create user
- `PUT /api/v1/users/{username}` - Update user
- `DELETE /api/v1/users/{username}` - Delete user

#### System Information
- `GET /api/v1/system/summary` - Get system summary
- `GET /api/v1/system/hardware` - Get hardware information
- `GET /api/v1/system/memory` - Get memory information
- `GET /api/v1/system/cpu` - Get CPU information

#### Container Management
- `GET /api/v1/containers` - List containers (requires Docker or CRI runtime)
- `GET /api/v1/images` - List container images (requires Docker or CRI runtime)

#### Logs
- `GET /api/v1/logs` - Query system logs with filtering

#### Ansible Automation
- `POST /api/v1/ansible/playbooks/run` - Execute Ansible playbook
- `POST /api/v1/ansible/adhoc` - Run ad-hoc command
- `GET /api/v1/ansible/executions` - List all executions
- `GET /api/v1/ansible/executions/{id}` - Get execution details
- `WS /api/v1/ansible/executions/{id}/stream` - Stream execution output
- `GET /api/v1/ansible/inventory/dynamic` - Generate dynamic inventory
- `POST /api/v1/ansible/playbooks` - Save playbook
- `POST /api/v1/ansible/playbooks/validate` - Validate playbook syntax

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

#### Terminal WebSocket Protocol

1. Connect to `ws://localhost:8080/api/v1/ws/terminal`
2. Send authentication message:
   ```json
   {
     "type": "auth",
     "payload": {
       "token": "your-jwt-token"
     }
   }
   ```
3. After successful auth, send subscribe message with terminal size:
   ```json
   {
     "type": "subscribe",
     "payload": {
       "rows": 24,
       "cols": 80
     }
   }
   ```
4. Send input:
   ```json
   {
     "type": "input",
     "data": "ls -la\n"
   }
   ```
5. Resize terminal:
   ```json
   {
     "type": "resize",
     "rows": 40,
     "cols": 120
   }
   ```

### Other WebSocket Endpoints

- `/api/v1/ws/metrics` - Real-time system metrics
- `/api/v1/ws/logs` - Real-time log streaming

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

## Project Structure

```
.
├── cmd/system-api/        # Application entry point
├── internal/              # Internal packages
│   ├── auth/             # Authentication service
│   ├── common/           # Common utilities and types
│   ├── container/        # Container management service
│   ├── logs/             # Log management service
│   ├── network/          # Network management service
│   ├── storage/          # Storage management service
│   ├── system/           # System information service
│   └── users/            # User management service
├── openapi.yaml          # OpenAPI specification
├── system-api.service    # systemd unit file
└── Makefile             # Build automation
```

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
