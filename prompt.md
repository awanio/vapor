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

