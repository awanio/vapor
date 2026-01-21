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

Vapor requires **libvirt 8.0.0 or newer** for virtualization features.

| Distribution | Version | Default libvirt | Status |
|--------------|---------|-----------------|--------|
| **Ubuntu** | 24.04 LTS | 10.0.0 | ✅ Recommended |
| | 22.04 LTS | 8.0.0 | ✅ Supported |
| | 20.04 LTS | 6.0.0 | ⚠️ Requires Ubuntu Cloud Archive |
| **Debian** | 12 (Bookworm) | 9.0.0 | ✅ Supported |
| | 11 (Bullseye) | 7.0.0 | ❌ Not supported |
| **RHEL** | 9.x | 9.0.0+ | ✅ Supported |
| | 8.6+ | 8.6.0 | ✅ Supported |
| **Rocky Linux** | 9.x | 9.0.0+ | ✅ Supported |
| | 8.6+ | 8.6.0 | ✅ Supported |
| **AlmaLinux** | 9.x | 9.0.0+ | ✅ Supported |
| | 8.6+ | 8.6.0 | ✅ Supported |
| **Fedora** | 40+ | 10.0.0+ | ✅ Supported |
| | 39 | 9.6.0 | ✅ Supported |
| **CentOS Stream** | 9 | 9.0.0+ | ✅ Supported |

> **Note**: Debian 11 (Bullseye) ships with libvirt 7.0.0 which is not compatible. Consider upgrading to Debian 12 or using a different distribution.

## Pre-Installation Requirements

### Ubuntu 20.04 - Ubuntu Cloud Archive

Ubuntu 20.04 ships with libvirt 6.0.0, which is incompatible with Vapor. You must upgrade libvirt using the Ubuntu Cloud Archive (UCA) before installing Vapor.

#### What is Ubuntu Cloud Archive?

The Ubuntu Cloud Archive is an official repository maintained by Canonical that provides newer versions of OpenStack and related packages (including libvirt) backported to older Ubuntu LTS releases.

#### Upgrade Libvirt on Ubuntu 20.04

```bash
# Install software-properties-common if not present
sudo apt install -y software-properties-common

# Add Ubuntu Cloud Archive - Yoga repository
sudo add-apt-repository -y cloud-archive:yoga

# Update package lists
sudo apt update

# Upgrade libvirt packages
sudo apt install -y libvirt-daemon-system libvirt-dev libvirt0 libvirt-clients

# Restart libvirt service
sudo systemctl restart libvirtd
```

#### Verify Libvirt Version

```bash
virsh version
```

Expected output:
```
Compiled against library: libvirt 8.0.0
Using library: libvirt 8.0.0
Using API: QEMU 8.0.0
```

### RHEL/Rocky/Alma 8.x

For RHEL 8, Rocky Linux 8, or AlmaLinux 8, ensure you're running version 8.6 or later. Earlier 8.x versions have older libvirt that may not be fully compatible.

```bash
# Check your version
cat /etc/redhat-release

# Update to latest if needed
sudo dnf update -y
```

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
