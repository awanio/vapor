# Introduction to Vapor

## What is Vapor?

Vapor is a comprehensive Linux system management platform designed to simplify server administration through a modern web interface. With its clean and intuitive design, Vapor brings together traditional system administration tools with container orchestration and Kubernetes management capabilities.

## Key Features

### 🖥️ System Management
- **Real-time Monitoring**: Live CPU, memory, disk, and network metrics
- **System Information**: Detailed hardware and OS information
- **Process Management**: View and manage running processes
- **Service Control**: Start, stop, and manage system services

### 🌐 Network Administration
- **Interface Management**: Configure network interfaces, IP addresses, and routing
- **Advanced Networking**: Create and manage bridges, bonds, and VLANs
- **Traffic Monitoring**: Real-time network traffic visualization
- **Firewall Configuration**: Manage iptables rules and policies

### 💾 Storage Management
- **Disk Management**: View disk health, partitions, and usage
- **LVM Support**: Create and manage logical volumes
- **RAID Configuration**: Software RAID creation and monitoring
- **Advanced Features**: iSCSI, multipath, and BTRFS support

### 📦 Container Orchestration
- **Multi-Runtime Support**: Docker, containerd, and CRI-O
- **Container Management**: Start, stop, create, and delete containers
- **Image Management**: Pull, push, and manage container images
- **Network and Volume Management**: Docker networks and persistent storage

### ☸️ Kubernetes Integration
- **Workload Management**: Pods, Deployments, StatefulSets, and more
- **Helm Support**: Deploy and manage Helm charts
- **Resource Management**: Create, update, and delete Kubernetes resources
- **Log Streaming**: Real-time pod logs and events

### 👥 User Administration
- **User Management**: Create, modify, and delete system users
- **Group Management**: Manage user groups and permissions
- **Authentication**: Secure JWT-based authentication
- **Access Control**: Role-based access control (RBAC)

### 🛡️ Security Features
- **Secure Authentication**: JWT tokens with configurable expiration
- **HTTPS Support**: TLS encryption for all communications
- **Audit Logging**: Track all administrative actions
- **Session Management**: Secure session handling

### 🔧 Developer-Friendly
- **RESTful API**: Complete API for automation
- **WebSocket Support**: Real-time data streaming
- **API Documentation**: Built-in OpenAPI/Swagger documentation
- **Extensible Architecture**: Modular design for easy extension

## Why Choose Vapor?

### Single Binary Deployment
Vapor is distributed as a single executable file that includes both the backend API and frontend web interface. No complex installation procedures or dependencies to manage.

### Modern User Interface
The modern interface provides a familiar and intuitive experience with:
- Dark and light themes
- Responsive design for mobile devices
- Multi-language support (English and Indonesian)
- Keyboard shortcuts for power users

### Comprehensive Feature Set
Unlike traditional tools that focus on specific aspects of system administration, Vapor provides a unified interface for:
- System monitoring and management
- Network configuration
- Storage administration
- Container orchestration
- Kubernetes cluster management

### Real-Time Updates
WebSocket connections provide live updates for:
- System metrics (CPU, memory, disk, network)
- Log streaming
- Container events
- Kubernetes resource changes

### Enterprise-Ready
- High performance Go backend
- Scalable architecture
- Production-tested components
- Active development and support

## Use Cases

### System Administrators
- Manage multiple Linux servers from a single interface
- Monitor system health and performance
- Quickly diagnose and resolve issues
- Automate routine tasks via API

### DevOps Engineers
- Deploy and manage containerized applications
- Monitor Kubernetes clusters
- Streamline CI/CD workflows
- Integrate with existing automation tools

### Cloud Engineers
- Manage cloud infrastructure
- Monitor resource utilization
- Implement security policies
- Optimize costs through better visibility

### Development Teams
- Self-service container deployment
- Application monitoring and debugging
- Resource allocation and management
- Simplified access to logs and metrics

## Architecture Overview

Vapor follows a modern, modular architecture:

```
┌─────────────────────────────────────────┐
│           Web Browser                    │
│  ┌─────────────────────────────────┐   │
│  │    Vapor Web UI (LitElement)    │   │
│  └────────────┬────────────────────┘   │
└───────────────┼─────────────────────────┘
                │ HTTPS/WSS
┌───────────────▼─────────────────────────┐
│         Vapor API Server (Go)           │
│  ┌─────────────────────────────────┐   │
│  │     REST API + WebSocket        │   │
│  ├─────────────────────────────────┤   │
│  │   Authentication & Security     │   │
│  ├─────────────────────────────────┤   │
│  │      Service Layer              │   │
│  └────────────┬────────────────────┘   │
└───────────────┼─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│         System Resources                 │
│  ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  │  Linux   │ │  Docker  │ │  K8s   │  │
│  │  System  │ │  Engine  │ │ Cluster│  │
│  └──────────┘ └──────────┘ └────────┘  │
└─────────────────────────────────────────┘
```

## Getting Started

Ready to get started with Vapor? Continue to the [Installation Guide](02-installation.md) to learn how to set up Vapor on your system.

---

[← Back to Contents](README.md) | [Next: Installation →](02-installation.md)
