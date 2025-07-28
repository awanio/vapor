# Go System Management API

A RESTful API service for Linux system management, providing functionality similar to Cockpit Project but built in Go with JSON-based REST APIs.

## Features

- **Network Management**: Configure network interfaces, create bridges, bonds, and VLANs
- **Storage Management**: 
  - List disks, mount/unmount filesystems, format disks
  - LVM support: manage volume groups, logical volumes, and physical volumes
  - iSCSI support: discover targets, manage sessions, login/logout
  - Multipath support: list devices and paths
  - BTRFS support: manage subvolumes and snapshots
- **User Management**: Create, update, delete system users
- **Log Viewer**: Query and filter systemd logs
- **System Information**: View CPU, memory, hardware, and system details
- **JWT Authentication**: Secure API endpoints with token-based authentication

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

## Platform Compatibility

### Primary Target
- **Linux x86_64**: Full functionality with all features supported
- **Linux ARM64**: Should work but not extensively tested

### Development Platforms
- **macOS**: Can build and run with limited functionality (system info only)
- **Windows**: Can build but most features will return "not implemented"

### Cross-Compilation
The application can be built on any platform that supports Go 1.21+ and cross-compiled for Linux x86_64:
```bash
# On macOS/Windows, build for Linux x86_64
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

# Build the binary for current platform
make build

# Build specifically for Linux x86_64 (cross-compilation)
make build-linux

# Run tests
make test
```

### Deployment on Linux

```bash
# Build for Linux x86_64
make build-linux

# Copy binary and deploy script to Linux server
scp bin/system-api-linux-amd64 deploy.sh user@server:/tmp/

# On the Linux server, run deployment script
sudo bash /tmp/deploy.sh
```

### Using Docker

```bash
# Build Docker image
make docker-build

# Run container
make docker-run
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

First, obtain a JWT token:

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
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
- `POST /api/v1/network/bridge` - Create network bridge
- `POST /api/v1/network/bond` - Create network bond
- `POST /api/v1/network/vlan` - Create VLAN

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

#### Logs
- `GET /api/v1/logs` - Query system logs with filtering

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

1. **Authentication**: Default credentials are for demo only. Change them in production.
2. **Privileges**: The service requires root privileges for system operations.
3. **JWT Secret**: Always use a strong, randomly generated secret in production.
4. **HTTPS**: Use HTTPS in production environments.
5. **Network**: Bind to localhost only or use proper firewall rules.

## Project Structure

```
.
├── cmd/system-api/        # Application entry point
├── internal/              # Internal packages
│   ├── auth/             # Authentication service
│   ├── common/           # Common utilities and types
│   ├── logs/             # Log management service
│   ├── network/          # Network management service
│   ├── storage/          # Storage management service
│   ├── system/           # System information service
│   └── users/            # User management service
├── openapi.yaml          # OpenAPI specification
├── Dockerfile            # Docker build file
├── system-api.service    # systemd unit file
└── Makefile             # Build automation
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by the Cockpit Project
- Built with Gin Web Framework
- Uses gopsutil for system metrics
- netlink for network management
