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
