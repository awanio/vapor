# Vapor

Vapor is a comprehensive Linux OS management system, inspired by Cockpit, designed to provide a modern web interface for server administration, container orchestration, virtualization management, and Kubernetes management.

## Features

- **System Monitoring**: Real-time CPU, memory, disk, and network monitoring
- **Service Management**: SystemD service control and monitoring
- **Virtualization**: Full KVM/QEMU virtual machine management via libvirt
- **Container Management**: Docker container and image management
- **Kubernetes Integration**: Cluster management and workload deployment
- **Storage Management**: LVM, disk, and storage pool management
- **Network Configuration**: Network interface and firewall management
- **User Management**: System user and group administration
- **Web Terminal**: Browser-based SSH terminal access
- **Log Viewer**: Real-time system log monitoring

## System Requirements

### Minimum Hardware

| Component | Requirement |
|-----------|-------------|
| Architecture | x86_64 (amd64) |
| CPU | 2 cores |
| RAM | 2 GB |
| Disk | 1 GB free space |
| Network | Active network connection |

### Supported Operating Systems

Vapor requires **libvirt 8.0.0 or newer** for virtualization features.

| Distribution | Version | Default libvirt | Status |
|--------------|---------|-----------------|--------|
| **Ubuntu** | 24.04 LTS | 10.0.0 | ✅ Recommended |
| | 22.04 LTS | 8.0.0 | ✅ Supported |
| | 20.04 LTS | 6.0.0 | ⚠️ Requires [Ubuntu Cloud Archive](#ubuntu-2004---enable-ubuntu-cloud-archive) |
| **Debian** | 12 (Bookworm) | 9.0.0 | ✅ Supported |
| | 11 (Bullseye) | 7.0.0 | ❌ Not supported (libvirt too old) |
| **RHEL/Rocky/Alma** | 9.x | 9.0.0+ | ✅ Supported |
| | 8.x | 8.6.0 | ✅ Supported (8.6+) |
| **Fedora** | 40+ | 10.0.0+ | ✅ Supported |
| | 39 | 9.6.0 | ✅ Supported |
| **CentOS Stream** | 9 | 9.0.0+ | ✅ Supported |

### Ubuntu 20.04 - Enable Ubuntu Cloud Archive

Ubuntu 20.04 ships with libvirt 6.0.0 which is too old. To use Vapor on Ubuntu 20.04, enable the Ubuntu Cloud Archive to get libvirt 8.0.0:

```bash
# Add Ubuntu Cloud Archive - Yoga repository
sudo add-apt-repository cloud-archive:yoga

# Update and install libvirt
sudo apt update
sudo apt install -y libvirt-daemon-system libvirt-dev libvirt0 libvirt-clients

# Verify version
virsh version
# Should show: Using library: libvirt 8.0.0
```

## Installation

### Quick Installation (Recommended)

The interactive installer uses Ansible to set up Vapor and optional components:

```bash
# Download the install script
curl -fsSL https://raw.githubusercontent.com/awanio/vapor/main/scripts/install.sh -o install.sh

# Make it executable
chmod +x install.sh

# Run the installer (requires sudo)
sudo ./install.sh
```

The installer will prompt you to select which components to install:
- **Libvirt/KVM**: Virtual machine management
- **Container Runtime**: Docker or Containerd
- **Kubernetes**: With version selection (v1.29 - v1.34)
- **Helm**: Kubernetes package manager

### Non-Interactive Installation

For automated deployments, use environment variables:

```bash
# Set installation options
export AUTO_INSTALL_DEPS=y
export INSTALL_LIBVIRT=y
export INSTALL_DOCKER=y
export INSTALL_K8S=y
export K8S_VERSION=1.30

# Run installer
curl -fsSL https://raw.githubusercontent.com/awanio/vapor/main/scripts/install.sh | sudo -E bash
```

### Building from Source

```bash
# Clone the repository
git clone https://github.com/awanio/vapor.git
cd vapor

# Build (requires Go 1.21+ and Node.js 18+)
make build

# Install system-wide
sudo make install

# Or run directly
./bin/vapor
```

## Configuration

Configuration file is located at `/etc/vapor/vapor.conf`.

Default settings:
```ini
[server]
host = 0.0.0.0
port = 7770
tls = true

[auth]
session_timeout = 3600

[logging]
level = info
```

## Accessing the Web UI

After installation, access Vapor at:
```
https://<server-ip>:7770
```

Default credentials are your system's root or sudo user credentials (PAM authentication).

## API Documentation

- **Swagger UI**: Available at `/docs` endpoint (e.g., `https://localhost:7770/docs`)
- **OpenAPI Spec**: Located at `api/openapi.yaml`

## WebSocket Endpoints

- **Terminal**: `/ws/terminal` - Interactive shell sessions
- **Events**: `/ws/events` - Real-time system events
- **Logs**: `/ws/logs` - Live log streaming

## Development

### Prerequisites

- Go 1.21+
- Node.js 18+
- libvirt-dev (for virtualization support)

### Development Setup

```bash
# Clone repository
git clone https://github.com/awanio/vapor.git
cd vapor

# Install dependencies
make deps

# Run in development mode
make dev
```

### Project Structure

```
vapor/
├── api/           # OpenAPI specifications
├── cmd/           # Application entry points
├── internal/      # Internal packages
├── web/           # Frontend (Lit/TypeScript)
├── scripts/       # Installation and utility scripts
├── ansible/       # Ansible playbooks for installation
└── docs/          # Documentation
```

## Security Notes

- TLS is enabled by default
- Uses PAM for authentication
- Session tokens are JWT-based
- All API endpoints require authentication

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Inspired by [Cockpit](https://cockpit-project.org/)
- Built with [Go](https://golang.org/), [Lit](https://lit.dev/), and [libvirt](https://libvirt.org/)
