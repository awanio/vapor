## Project Overview: Vapor WebUI

**Vapor** is an open-source Linux OS management system, similar to Cockpit, that provides a comprehensive web interface for managing:

### Core Features:
- **System Management**: Users, network, storage management
- **Container Orchestration**: Docker and CRI-compatible runtime support
- **Kubernetes Management**: Full K8s cluster management with workload deployment and Helm management
- **Virtualization**: KVM/Libvirt support for VM management
- **Automation**: Ansible integration for playbooks and ad-hoc commands
- **Configuration Management**: Helm chart management

### Technology Stack:
- **Frontend**: 
  - TypeScript/JavaScript
  - Lit (LitElement) for web components
  - Vite as build tool
  - Tailwind CSS for styling
  - VS Code-inspired dark theme UI
  - Internationalization support (English, Indonesian)

- **Backend**: 
  - Go-based API server (running on port 8080)
  - Gin as HTTP handler
  - Sqlite as local db
  - JWT authentication using Linux system users
  - WebSocket support for real-time features (metrics, logs, terminal)
  - TUS protocol support for resumable file uploads
  - RESTful API with OpenAPI 3.1.0 specification

### Project Structure:
- `/web` - Frontend application
  - `/src/components` - Reusable UI components (drawers, modals, tables)
  - `/src/views` - Page/tab components for different features
  - `/src/types` - TypeScript definitions
  - `/src/locales` - Translation files

### UI/UX Guidelines:
1. **Tables** for listing content
2. **Right drawer** for content details
3. **Search input** on top-left of tables
4. **Filters** (dropdowns) left of search
5. **Client-side search** (unless API supports server-side)
6. **Create/Add buttons** on right side aligned with search
7. **Right drawer** for create/edit forms
8. **Action column** on right with three-dots menu
9. **Confirmation dialogs** for destructive actions

### Key Features Implementation:
- Real-time monitoring via WebSocket
- Terminal emulation in browser
- Comprehensive management interfaces for:
  - Network (interfaces, bridges, bonds, VLANs)
  - Storage (disks, LVM, iSCSI, multipath, BTRFS)
  - Containers and Docker
  - Kubernetes workloads, nodes, storage, networking
  - Virtual machines with KVM
  - Ansible playbooks and inventory
  - System logs viewer

The project is designed to be a single-binary deployment where the Go backend serves both the API and the embedded web frontend, making it easy to deploy and manage Linux infrastructure through a modern web interface.