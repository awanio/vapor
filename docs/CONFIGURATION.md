# Vapor Configuration Guide

## Overview

Vapor supports multiple configuration methods with a clear priority hierarchy:

1. **Command-line flags** (highest priority)
2. **Environment variables**
3. **Configuration file** (vapor.conf)
4. **Default values** (lowest priority)

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `port` | `8080` | Server port for the API |
| `appdir` | `/var/lib/vapor` | Application data directory |

## Configuration Methods

### 1. Configuration File (vapor.conf)

Create a YAML configuration file:

```yaml
# vapor.conf
port: "8080"
appdir: "/var/lib/vapor"
```

The server searches for `vapor.conf` in these locations (in order):
1. Path specified by `--config` flag or `VAPOR_CONFIG` env var
2. `./vapor.conf` (current directory)
3. `./config/vapor.conf`
4. `/etc/vapor/vapor.conf`
5. `/usr/local/etc/vapor/vapor.conf`
6. `$HOME/.config/vapor/vapor.conf`
7. `$HOME/.vapor.conf`

### 2. Environment Variables

```bash
export VAPOR_CONFIG=/path/to/vapor.conf  # Path to config file
export VAPOR_PORT=8080                   # Server port
export VAPOR_APPDIR=/var/lib/vapor       # Application directory
export VAPOR_DEBUG=1                      # Enable debug output
export JWT_SECRET=your-secret-key        # JWT authentication secret
```

### 3. Command-Line Flags

```bash
vapor --config /path/to/vapor.conf  # Specify config file
vapor --port 9090                   # Override port
vapor --appdir /custom/path         # Override app directory
```

## Port Configuration

The port can be specified in multiple formats:
- Port only: `"8080"`
- With colon: `":8080"`
- Full address: `"0.0.0.0:8080"` or `"127.0.0.1:8080"`

## Application Directory Structure

The `appdir` contains all Vapor data:
```
/var/lib/vapor/
├── vapor.db              # SQLite database for execution history
├── ansible/              # Ansible playbooks and inventory
│   ├── playbooks/
│   ├── inventory/
│   └── logs/
└── ...
```

## Examples

### Generate Example Configuration
```bash
# Generate default config file
vapor --generate-config

# Generate to specific location
vapor --generate-config --output /etc/vapor/vapor.conf
```

### Running with Different Configurations

```bash
# Use default settings
vapor

# Use specific config file
vapor --config /etc/vapor/vapor.conf

# Override port via environment
VAPOR_PORT=9090 vapor

# Override via command-line flag (highest priority)
vapor --port 9090

# Multiple overrides (flag takes precedence)
VAPOR_PORT=8080 vapor --port 9090  # Uses port 9090
```

### Development Setup
```bash
# Create local config
cat > vapor.conf <<EOF
port: "8080"
appdir: "./data"
EOF

# Run with local config
vapor --config vapor.conf
```

### Production Setup
```bash
# Create system config
sudo vapor --generate-config --output /etc/vapor/vapor.conf

# Edit configuration
sudo vi /etc/vapor/vapor.conf

# Run as service
sudo vapor --config /etc/vapor/vapor.conf
```

## Priority Example

Given:
- Default: `port: "8080"`
- Config file: `port: "8081"`
- Environment: `VAPOR_PORT=8082`
- Command-line: `--port 8083`

The server will use port **8083** (command-line flag has highest priority).

## Debugging Configuration

Enable debug output to see which configuration is loaded:

```bash
VAPOR_DEBUG=1 vapor
```

This will print:
```
Loaded configuration from /etc/vapor/vapor.conf
Configuration:
  Port: 8080
  AppDir: /var/lib/vapor
  Server Address: :8080
  Ansible Directory: /var/lib/vapor/ansible
```
