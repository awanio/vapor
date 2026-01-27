# Installation Guide

This guide covers how to install Vapor on your Linux system.

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

Vapor requires **libvirt 8.0.0+** and **QEMU 6.2+** for full virtualization features including UEFI and Secure Boot support.

| Distribution | Version | QEMU | libvirt | Status |
|--------------|---------|------|---------|--------|
| **Ubuntu** | 24.04 LTS | 8.2.2 | 10.0.0 | ✅ Recommended |
| | 22.04 LTS | 6.2.0 | 8.0.0 | ✅ Supported |
| | 20.04 LTS | 4.2.1 | 6.0.0 | ❌ Not supported (QEMU too old) |
| **Debian** | 12 (Bookworm) | 7.2.0 | 9.0.0 | ✅ Supported |
| | 11 (Bullseye) | 5.2.0 | 7.0.0 | ❌ Not supported (QEMU/libvirt too old) |
| **RHEL/Rocky/Alma** | 9.x | 7.0+ | 9.0.0+ | ✅ Supported |
| | 8.x | 4.2.0 | 8.6.0 | ❌ Not supported (QEMU too old) |
| **Fedora** | 40+ | 8.2+ | 10.0.0+ | ✅ Supported |
| | 39 | 8.1.0 | 9.6.0 | ✅ Supported |
| **CentOS Stream** | 9 | 7.0+ | 9.0.0+ | ✅ Supported |

> **Important**: QEMU 6.2+ is required for proper UEFI display output. Older QEMU versions (like 4.2.x in Ubuntu 20.04) have display initialization issues with UEFI VMs.

## Pre-Installation Requirements

### Verifying Your System

Before installing, verify your QEMU and libvirt versions:

```bash
# Check QEMU version
qemu-system-x86_64 --version

# Check libvirt version
virsh version
```

**Minimum required versions:**
- QEMU: 6.2.0 or higher
- libvirt: 8.0.0 or higher

## Installation Methods

### Method 1: Quick Installation (Recommended)

The interactive installer uses Ansible to set up Vapor and optional components:

```bash
# Download the install script
curl -fsSL https://raw.githubusercontent.com/awanio/vapor/main/scripts/install.sh -o install.sh

# Make it executable
chmod +x install.sh

# Run the installer
sudo ./install.sh
```

The installer will guide you through selecting components:

1. **Ansible & Dependencies**: Automatically installed if not present
2. **Libvirt/KVM**: Virtual machine management (recommended)
3. **Container Runtime**: Choose Docker or Containerd
4. **Kubernetes**: Optional, with version selection (v1.29 - v1.34)
5. **Helm**: Kubernetes package manager (if K8s selected)

### Method 2: Non-Interactive Installation

For automated or scripted deployments:

```bash
# Set environment variables
export AUTO_INSTALL_DEPS=y
export INSTALL_LIBVIRT=y
export INSTALL_DOCKER=y
export INSTALL_K8S=y
export K8S_VERSION=1.30

# Run installer
curl -fsSL https://raw.githubusercontent.com/awanio/vapor/main/scripts/install.sh | sudo -E bash
```

#### Available Environment Variables

| Variable | Values | Description |
|----------|--------|-------------|
| `AUTO_INSTALL_DEPS` | y/n | Auto-install Ansible and dependencies |
| `INSTALL_LIBVIRT` | y/n | Install libvirt/KVM |
| `INSTALL_DOCKER` | y/n | Install Docker |
| `INSTALL_CONTAINERD` | y/n | Install Containerd (alternative to Docker) |
| `INSTALL_K8S` | y/n | Install Kubernetes |
| `K8S_VERSION` | 1.29-1.34 | Kubernetes version to install |
| `INSTALL_HELM` | y/n | Install Helm |

### Method 3: Building from Source

For development or custom builds:

```bash
# Prerequisites
# - Go 1.21+
# - Node.js 18+
# - libvirt-dev package (Ubuntu/Debian) or libvirt-devel (RHEL/Fedora)

# Clone the repository
git clone https://github.com/awanio/vapor.git
cd vapor

# Build
make build

# Install system-wide
sudo make install

# Or run directly
./bin/vapor
```

## Post-Installation

### Verify Installation

```bash
# Check service status
sudo systemctl status vapor

# Check logs
sudo journalctl -u vapor -f

# Test API endpoint
curl -k https://localhost:7770/api/health
```

Expected health response:
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

### Access Web Interface

Open your browser and navigate to:
```
https://<server-ip>:7770
```

Login with your system credentials (root or sudo user).

### Firewall Configuration

**Ubuntu/Debian (UFW):**
```bash
sudo ufw allow 7770/tcp
```

**RHEL/Rocky/Alma/Fedora (firewalld):**
```bash
sudo firewall-cmd --permanent --add-port=7770/tcp
sudo firewall-cmd --reload
```

## Configuration

The main configuration file is located at `/etc/vapor/vapor.conf`.

```ini
[server]
host = 0.0.0.0
port = 7770
tls = true

[auth]
session_timeout = 3600

[logging]
level = info
file = /var/log/vapor/vapor.log
```

### TLS Certificates

By default, Vapor generates self-signed certificates. For production, configure your own certificates:

```ini
[tls]
cert_file = /etc/vapor/certs/server.crt
key_file = /etc/vapor/certs/server.key
```

## Upgrading

### Using the Installer

```bash
curl -fsSL https://raw.githubusercontent.com/awanio/vapor/main/scripts/install.sh -o install.sh
chmod +x install.sh
sudo ./install.sh --upgrade
```

### Manual Upgrade

```bash
# Stop service
sudo systemctl stop vapor

# Download new binary
sudo curl -L https://github.com/awanio/vapor/releases/latest/download/vapor-linux-amd64 -o /usr/local/bin/vapor
sudo chmod +x /usr/local/bin/vapor

# Start service
sudo systemctl start vapor
```

## Uninstallation

```bash
# Stop and disable service
sudo systemctl stop vapor
sudo systemctl disable vapor

# Remove files
sudo rm -rf /usr/local/bin/vapor
sudo rm -rf /etc/vapor
sudo rm -rf /var/log/vapor
sudo rm /etc/systemd/system/vapor.service

# Reload systemd
sudo systemctl daemon-reload
```

## Troubleshooting

### Libvirt Version Error

If you see errors like:
```
/usr/local/bin/vapor: /lib/x86_64-linux-gnu/libvirt.so.0: version `LIBVIRT_8.0.0' not found
```

**Solutions by distribution:**

| Distribution | Solution |
|--------------|----------|
| Ubuntu 20.04 | Enable Ubuntu Cloud Archive (see above) |
| Ubuntu 22.04+ | Already compatible, try `sudo apt install libvirt-dev` |
| Debian 11 | Upgrade to Debian 12 |
| Debian 12 | Already compatible |
| RHEL/Rocky/Alma 8.x | Update to 8.6+ with `sudo dnf update` |
| RHEL/Rocky/Alma 9 | Already compatible |

### Service Won't Start

Check logs for errors:
```bash
sudo journalctl -u vapor -n 100 --no-pager
```

Common issues:
- Port 7770 already in use
- Missing libvirt (for virtualization features)
- Permission issues

### Cannot Connect to Web Interface

1. Verify service is running:
   ```bash
   sudo systemctl status vapor
   ```

2. Check firewall:
   ```bash
   sudo ufw status  # Ubuntu/Debian
   sudo firewall-cmd --list-all  # RHEL/Rocky/Fedora
   ```

3. Verify port is listening:
   ```bash
   sudo ss -tlnp | grep 7770
   ```

### Permission Denied Errors

Ensure the vapor user has necessary permissions:
```bash
# Add to libvirt group (for VM management)
sudo usermod -aG libvirt vapor

# Add to docker group (for container management)
sudo usermod -aG docker vapor
```

## Next Steps

After installation, see:
- [Quick Start Guide](03-quick-start.md) - First steps with Vapor
- [Configuration Guide](04-configuration.md) - Detailed configuration options
- [Virtualization Guide](05-virtualization.md) - Managing virtual machines
