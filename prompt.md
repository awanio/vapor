Go RESTful System Manager (Cockpit-like)

Create a modular Go-based RESTful API service in this directory. The app goal is to manage a Linux server, providing features equivalent to Cockpit Project — but built in Go and designed around JSON-based REST APIs.

APPLICATION REQUIREMENTS

1. Language & Frameworks

Language: Go (Golang)

REST Framework: Use gin

D-Bus: Use github.com/godbus/dbus

Netlink for low-level network: github.com/vishvananda/netlink

Systemd interaction: github.com/coreos/go-systemd

OS metrics: /proc, /sys, or github.com/shirou/gopsutil

Storage: Use lsblk, mount, or D-Bus UDisks2

User management: useradd, usermod, /etc/passwd, /etc/shadow

2. Features to Support (REST API Modules)

Network Management
List all interfaces

Enable/disable interfaces

Assign static IP / DHCP

Configure bonding, bridging

Create VLANs

View network traffic stats

Storage Management
List all disks and partitions

Mount/unmount disks

Format disks (ext4, xfs)

View disk usage

Create/delete partitions (optionally use parted)

User Management
List all users

Create user (with password, groups)

Delete user

Modify user (change password, lock, unlock)

View login history

Log Viewer
Query logs from journald (via D-Bus or journalctl)

Filter logs by service, priority, time

Paginated view of log lines

System Info
CPU details (model, cores, usage)

RAM usage

Disk usage

System uptime

Kernel version, OS version

Hardware info (/sys/class/*, dmidecode if available)

API Design Requirements
Use RESTful principles (GET, POST, PUT, DELETE)

All endpoints must return JSON

API versioning: /api/v1/

Apply consistent response structure:

```json
{
  "status": "success",
  "data": { ... },
  "error": null
}
```

Security

Use JWT token authentication or basic auth

Enforce RBAC for sensitive endpoints

Ensure privilege elevation (via sudo or run service as systemd unit)

TESTING REQUIREMENTS

Write unit tests for each core logic component

Write functional tests for REST endpoints (e.g., using httptest)

Use test doubles/mocks for system or D-Bus interaction where needed

Validate correct HTTP status codes, response shape, and side effects

DOCUMENTATION REQUIREMENTS

Generate OpenAPI 3.1.0 YAML specification for all REST endpoints

Include:

Endpoint descriptions

Request/response schema

Auth requirements

Error model

Export as openapi.yaml

STRUCTURE SUGGESTION

```
/cmd/system-api/main.go
/internal/
  ├─ network/
  ├─ storage/
  ├─ users/
  ├─ logs/
  ├─ system/
  └─ common/
  └─ tests/
```

Each internal package should encapsulate:

Business logic

System interaction

REST handlers

Unit tests

Example Endpoints to Implement
Network
GET /api/v1/network/interfaces

PUT /api/v1/network/interfaces/{name}/up

PUT /api/v1/network/interfaces/{name}/down

POST /api/v1/network/interfaces/{name}/address

POST /api/v1/network/bridge

POST /api/v1/network/bond

POST /api/v1/network/vlan

Storage
GET /api/v1/storage/disks

POST /api/v1/storage/mount

POST /api/v1/storage/unmount

POST /api/v1/storage/format

Users
GET /api/v1/users

POST /api/v1/users

PUT /api/v1/users/{username}

DELETE /api/v1/users/{username}

Logs
GET /api/v1/logs

GET /api/v1/logs?service=sshd&priority=error

System
GET /api/v1/system/summary

GET /api/v1/system/hardware

GET /api/v1/system/memory

GET /api/v1/system/cpu

Sample OpenAPI 3.1.0 Snippet

```yaml
openapi: 3.1.0
info:
  title: Go System API
  version: 1.0.0
paths:
  /api/v1/network/interfaces:
    get:
      summary: List network interfaces
      responses:
        '200':
          description: List of interfaces
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InterfacesResponse'
components:
  schemas:
    InterfacesResponse:
      type: object
      properties:
        status:
          type: string
        data:
          type: array
          items:
            type: object
            properties:
              name:
                type: string
              mac:
                type: string
              addresses:
                type: array
                items:
                  type: string
```
(Generate full YAML for all endpoints.)

DELIVERABLES
Go application source code

Unit and functional tests

openapi.yaml

Optional: systemd unit file to run the app as a privileged service

## Frontend

1. Theme & Design Aesthetics

I prefer a modern dashboard-style admin UI. Use Visual Studio Code as the main inspiration of the theme, layout and design

2. UI Framework / CSS

Would you like to use a specific CSS framework?
yes, use Tailwind CSS version 4

Should we use a component system like:
None — use HTML + raw CSS

3. JavaScript Stack

Language: TypeScript
Component Framework: LitElement for building lightweight, reactive Web Components
JavaScript Base: Vanilla JavaScript (no frontend SPA frameworks like React/Vue)
Build Tool: Vite (with TypeScript + Lit support)

4. Interaction with Backend

Call the Go backend REST API directly via Fetch API
it should support WebSocket for live metrics

5. Layout Preferences
Should it be:
* Tabbed views per module (Network, Storage, etc.) similar tabbed view in VS Code UI
* collapsible sidebar navigation
* Use tree menu in sidebar navigation. similar like VS Code present the file tree in the sidebar
* Use modal and drawer component if needed

6. Features to Include
All following features should be included in the UI

System dashboard summary (CPU, RAM, Disk, Uptime)
Real-time network and traffic monitor
Network interface editor (bond/bridge/VLAN config)
Storage mount/unmount and disk usage
Storage LVM CRUD management
Storage RAID CRUD management
User management (add/edit/delete users)
Journald log viewer with filters
Dark mode toggle
Responsive/mobile-friendly design
Localization/i18n support
Full terminal emulation over WebSocket
Support for input/output and terminal resizing
Secure shell access via WebSocket

7. Auth & Access
Use Login screen with JWT/session

## Vibe Frontend Code Prompt

### 🎯 GOAL

I have Go-based RESTful API service web app in this working directory. The app goal is to manage a Linux server, providing features equivalent to Cockpit Project — but built in Go and designed around JSON-based REST APIs. The API spec attached in openapi.yaml file.

Build a modern, responsive, VS Code-inspired web UI for a Go-based Linux system management application. This frontend web app must interact with a backend that exposes RESTful APIs (JSON-based) and WebSocket streams for real-time system data and shell access. Create new folder "web" in this working directory then store all the frontend files in it.

---

STACK & TOOLS
Language: TypeScript
Component Framework: LitElement for building lightweight, reactive Web Components
JavaScript Base: Vanilla JavaScript (no frontend SPA frameworks like React/Vue)
Build Tool: Vite (with TypeScript + Lit support)
CSS Framework: Tailwind CSS for styling

API Communication:
Use the Fetch API to communicate with the Go backend REST endpoints
Use WebSocket (with JWT in query params or headers) for:
Real-time system metrics (CPU, RAM, network)
Live logs from journald
Full terminal emulation (I/O, resizing)
Authentication: JWT stored in localStorage, included in request headers and WebSocket connection
Routing/Structure: Custom tab navigation and sidebar handled using LitElement components
State Management: Simple reactive properties within Lit components — no global state library

---

### 🧱 UI DESIGN & THEME

* Inspired by Visual Studio Code:

  * Dark-themed UI by default with light-mode toggle
  * Left collapsible sidebar with tree-view navigation (like VS Code Explorer)
  * Central tabbed view area: each tab is a management module (Network, Storage, etc.)
  * Status bar at bottom (optional) showing system status or login info
* Use modals, drawers, and panels as needed for editing and dialogs
* Sidebar tree menu must reflect real structure:

  * System
    * Dashboard
    * Logs
    * Terminal
  * Network
    * Interfaces
    * Bonding
    * VLANs
  * Storage
    * Disks
    * LVM
    * RAID
  * Containers
    * Containers
    * Images
  * Users

---

### 🧰 FEATURES TO INCLUDE

Each module in the UI corresponds to a RESTful API endpoint served by the backend.

#### 📊 System Dashboard (tab: "System > Dashboard")

* Fetch and display CPU, RAM, disk, uptime, kernel version
* Use WebSocket to stream real-time CPU and memory usage
* Display metric graphs with canvas or lightweight JS charting (Chart.js optional)

#### 🌐 Network Management (tab: "Network")

* Interfaces list: up/down status, IPs, traffic counters
* Interface config modals (edit static IP, DHCP, etc.)
* Bond/bridge/VLAN creation with form modals
* Real-time traffic updates via WebSocket

#### 💾 Storage Management (tab: "Storage")

* List all physical disks and partitions
* Show mount points and disk usage
* CRUD UI for:

  * LVM volumes
  * RAID arrays
* Mount/unmount buttons, format disk option with safety confirmation

#### 👤 User Management (tab: "Users")

* List of all system users
* Add/edit/delete users (modal forms)
* Toggle lock, password reset

#### 📜 Log Viewer (tab: "System > Logs")

* Query journald logs from backend
* Filter by service, priority, date
* Tail logs live with WebSocket updates

#### 🖥️ Terminal (tab: "System > Terminal")

* Full terminal emulation (Xterm.js or minimal canvas/text-based)
* Support input/output over WebSocket
* Resize-aware terminal backend
* Secure WebSocket shell access (authenticated via JWT)

#### 💾 Container Management (tab: "Container")

list, detail view, start, stop, restart, view logs, create and delete containers. It also to list, detail view and delete container images

Also evaluate the attached openapi.yaml spec to add unstated features
---

### 🌐 API Integration

* Use Fetch API for all REST calls
* Use WebSocket for:

  * Live CPU/RAM/Network metrics
  * Log streaming
  * Terminal shell access
* Store and manage JWT in `localStorage`
* Include JWT in all request headers

---

### 📱 Responsive & Internationalization

* Responsive layout using Tailwind breakpoints
* Tree sidebar collapses on mobile
* Modal dialogs scale to viewport
* Add simple i18n support using JSON translation files

  * English default, language switcher in top bar

---

### 🔐 Authentication Flow

* Login page:

  * Username/password form
  * Submit to `/api/v1/auth/login` (expects JWT)
  * Store token in `localStorage`
* Logout clears token
* Auth-guard routes: redirect to login if no valid JWT
* Protect WebSocket with JWT during handshake (`wss://host?token=...`)

---

### 🗂️ File Structure Suggestion

```
/web/
├── index.html                    # App entry point
├── vite.config.ts               # Vite configuration
├── tailwind.config.js           # Tailwind config
├── postcss.config.js            # Tailwind/PostCSS integration
├── tsconfig.json                # TypeScript config
├── /public/                     # Static assets (favicon, logo, etc.)
│
├── /src/
│   ├── main.ts                  # Main app bootstrapping
│   ├── app-root.ts              # <app-root> entry Lit component
│   ├── auth.ts                  # Login, JWT storage, auth helpers
│   ├── api.ts                   # REST and WebSocket fetch utilities
│   ├── i18n.ts                  # Simple language switcher logic
│   ├── styles/
│   │   └── tailwind.css         # Tailwind base style
│   │
│   ├── /components/             # Shared UI elements
│   │   ├── sidebar-tree.ts       # <sidebar-tree> — collapsible tree sidebar
│   │   ├── tab-bar.ts            # <tab-bar> — manages open tabs
│   │   ├── modal-dialog.ts       # <modal-dialog> — reusable modal
│   │   ├── drawer-panel.ts       # <drawer-panel> — sliding drawer UI
│   │   └── status-bar.ts         # <status-bar> — bottom status area
│   │
│   ├── /views/                  # Tabs/views for each management module
│   │   ├── dashboard-tab.ts      # <dashboard-tab> — system summary view
│   │   ├── network-tab.ts        # <network-tab> — network management
│   │   ├── storage-tab.ts        # <storage-tab> — LVM, RAID, disks
│   │   ├── users-tab.ts          # <users-tab> — user CRUD
│   │   ├── logs-tab.ts           # <logs-tab> — journald log viewer
│   │   └── terminal-tab.ts       # <terminal-tab> — WebSocket terminal
│   │
│   ├── /locales/                # i18n translation files
│   │   ├── en.json
│   │   └── id.json
│   │
│   └── /types/                  # Shared TypeScript interfaces/types
│       ├── api.d.ts             # Response and request type definitions
│       └── system.d.ts          # CPU, memory, disk type models
│
└── /tests/
    ├── network-tab.test.ts
    ├── users-tab.test.ts
    ├── auth.test.ts
    └── terminal.test.ts

```
---

### ✅ DELIVERABLES

Modern Admin Web UI

VS Code–style layout with collapsible tree sidebar, tabbed views, and modal/drawer usage.

Fully modular structure using LitElement and TypeScript.

Integrated REST API + WebSocket Client

Fetch-based communication with the Go backend.

Real-time metrics (CPU, RAM, disk, network) via WebSocket.

Secure WebSocket terminal emulation with support for resize and I/O.

System Modules (Full Feature Parity with Cockpit)

Dashboard: Uptime, CPU/RAM usage, system details.

Network: Interface/bond/VLAN editor, live traffic graphs.

Storage: Mount/unmount, LVM & RAID CRUD.

Containers: list, detail view, start, stop, restart, view logs, create and delete containers. It also to list, detail view and delete container images

Users: User management UI.

Logs: Journald viewer with filters, pagination.

Terminal: WebSocket-based shell terminal in the browser.

Authentication & Session Management

Login screen with JWT-based session storage.

Logout, session timeout, and auto-refresh on token expiration.

UI Features

Dark/light mode toggle.

Responsive layout for tablet/mobile support.

i18n with English and optional languages.

Tooling & Build Setup

Vite + Tailwind CSS integration.

Tailwind custom theme configuration.

Code-splitting and optimized production builds.

Live HMR during development.

Testing

Unit tests for core components and logic using Vitest.

Functional tests per module (Network, Logs, etc.).

WebSocket integration test stubs.

Documentation

README with local dev and build instructions.

Component and module directory documentation.

REST/WebSocket integration details.

OpenAPI 3.1.0 Spec available from backend.