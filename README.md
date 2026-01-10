# Vapor

Vapor is a comprehensive Linux OS management system, inspired by Cockpit, designed to provide a modern web interface for server administration, container orchestration, and Kubernetes management.

## Features

- **System Management**: Monitor CPU, memory, disk, network usage, and system logs.
- **Container Management**: Manage Docker containers and images (CRI support included).
- **Kubernetes Management**: View and manage Pods, Deployments, Services, and more.
- **Virtualization**: Manage KVM/Libvirt virtual machines.
- **Web Terminal**: Access server terminal directly from the browser.
- **File Manager**: Browse and manage files on the server.
- **Authentication**: Secure JWT-based authentication using Linux system users.

## Prerequisites

- Linux OS (Ubuntu, Debian, CentOS, Fedora, Arch Linux supported)
- Systemd
- Root privileges

## Platform Requirements

- **OS**: Linux
- **Architecture**: x86_64 (amd64)

## Installation

### Quick Install (Script)

The easiest way to install Vapor is using the installation script.

**Standard Installation (Interactive):**
```bash
# Download and run the script interactively
curl -fsSL https://raw.githubusercontent.com/awanio/vapor/main/scripts/install.sh -o install.sh
chmod +x install.sh
sudo ./install.sh
```

**Non-Interactive / CI Installation:**
You can pre-configure installation options using environment variables. This is useful for automated deployments or when piping to bash.

```bash
# Install with default options (no optional components)
curl -fsSL https://raw.githubusercontent.com/awanio/vapor/main/scripts/install.sh | sudo bash

# Install with specific components enabled
curl -fsSL https://raw.githubusercontent.com/awanio/vapor/main/scripts/install.sh | \
  INSTALL_DOCKER=true \
  INSTALL_K8S_TOOLS=true \
  INSTALL_LIBVIRT=true \
  sudo -E bash
```

**Available Environment Variables:**
- `INSTALL_LIBVIRT_CLIENT`: Install libvirt client libraries (Default: prompt or no)
- `INSTALL_DOCKER`: Install Docker engine (Default: prompt or no)
- `INSTALL_K8S_TOOLS`: Install kubectl (Default: prompt or no)
- `INSTALL_LIBVIRT`: Install/Enable KVM & Libvirt (Default: prompt or no)

### From Source

If you prefer to build from source:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/awanio/vapor.git
    cd vapor
    ```

2.  **Build the project:**
    ```bash
    make build
    ```

3.  **Run:**
    ```bash
    ./bin/vapor
    ```

## Development Environment

For development, we provide a Docker Compose environment that simulates a full Linux system with systemd, Docker-in-Docker, and K3s.

1.  **Start the environment:**
    ```bash
    cd development
    ./compose.sh up -d
    ```

2.  **Access the shell:**
    ```bash
    ./compose.sh shell
    ```

3.  **Run Vapor inside the container:**
    ```bash
    # Inside the container shell
    cd /app
    make dev
    ```

## Deployment on Linux

Vapor is designed to be deployed as a systemd service.

### Using systemd

1.  **Copy binary to /usr/local/bin:**
    ```bash
    sudo cp bin/vapor /usr/local/bin/
    ```

2.  **Create configuration directory:**
    ```bash
    sudo mkdir -p /etc/vapor
    ```

3.  **Install systemd service:**
    The installation script automatically handles this. If installing manually, refer to the service file creation in `scripts/install.sh`.

4.  **Start the service:**
    ```bash
    sudo systemctl enable --now vapor
    ```

## Configuration

Configuration is located at `/etc/vapor/vapor.conf`.

```yaml
server:
  port: 7770
  tls:
    enabled: true
    cert_file: "" # Auto-generated if empty
    key_file: ""

jwt:
  secret: "CHANGE_ME"
```

## API Documentation

The API documentation is available at `/docs` endpoint when running the server (e.g., `https://localhost:7770/docs`).

OpenAPI spec is located at `api/openapi.yaml`.

## Web UI

The Web UI is built with Lit (Web Components) and Vite. It is embedded into the Go binary during build.

- **Source**: `web/`
- **Development**: Run `cd web && npm run dev` for frontend-only dev.

## WebSocket Features

Vapor uses WebSockets for real-time features:
- **Terminal**: `/ws/terminal` - Full TTY access
- **Events**: `/ws/events` - System events and metrics push
- **Logs**: `/ws/logs` - Real-time log streaming

## Development

- **Backend**: Go 1.24+
- **Frontend**: Node.js 20+
- **Database**: SQLite (embedded)

See `CONTRIBUTING.md` for more details.

## Security

Vapor runs with root privileges to manage the system. Ensure:
- It is not exposed to the public internet without a VPN/Firewall.
- Use strong passwords for system users.
- Keep the `JWT_SECRET` secure.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## Code of Conduct

Please note that this project is released with a Contributor Code of Conduct. By participating in this project you agree to abide by its terms.

## License

[MIT](LICENSE)

## Acknowledgments

- [Cockpit Project](https://cockpit-project.org/) - Major inspiration for this project.
