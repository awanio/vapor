# Vapor Project - AI Collaboration Guide

## Project Overview
Vapor is an open-source Linux OS management system built with Go, inspired by Cockpit. It provides a modern web interface for comprehensive server administration, container orchestration, and Kubernetes management.

**Tech Stack:**
- Backend: Go 1.24.0, Gin Framework
- Database: SQLite with migrations
- Container Support: Docker SDK, CRI (containerd/CRI-O)
- Additional: Ansible, Libvirt, Kubernetes client-go
- Frontend: Web UI (embedded in binary)

## Architecture Philosophy

### Core Principles
1. **Clear Separation of Concerns**: Each package has a single, well-defined responsibility
2. **Interface-Driven Design**: Use interfaces for extensibility and testing
3. **No Code Duplication**: Shared types go in `internal/common`
4. **Runtime Agnostic**: Support multiple container runtimes through common interfaces

### Package Structure
```
internal/
├── common/          # Shared types and interfaces
│   └── runtime_client.go  # Common container runtime interface
├── container/       # CRI-only (containerd, CRI-O) operations
│   ├── service.go         # CRI service layer
│   └── cri_client.go      # CRI implementation
├── docker/          # Docker-specific operations
│   ├── service.go         # Docker service layer
│   ├── client.go          # Docker SDK client
│   └── runtime_client.go  # Docker RuntimeClient implementation
├── auth/            # JWT authentication
├── network/         # Network management (netlink)
├── storage/         # Storage operations (LVM, iSCSI, BTRFS)
├── ansible/         # Ansible integration
├── kubernetes/      # K8s management
├── libvirt/         # VM management
└── routes/          # HTTP route definitions
```

## Container Management Architecture

### Recent Refactoring (2024-08-16)
We separated Docker and CRI implementations for cleaner architecture:

**Before:** Mixed Docker and CRI code in container package
**After:** 
- `container/` - Pure CRI implementation (containerd, CRI-O)
- `docker/` - Pure Docker SDK implementation
- `common/runtime_client.go` - Shared interface and types

### Runtime Detection Priority
1. CRI sockets checked first (`/run/containerd/containerd.sock`, `/var/run/crio/crio.sock`)
2. Docker checked if CRI unavailable
3. Service continues with error state if no runtime found

## API Endpoints Structure

### Container/Docker Endpoints
- `/api/v1/containers/*` - CRI-based container operations
- `/api/v1/docker/*` - Docker-specific operations
- Both implement the same `common.RuntimeClient` interface

### Authentication
- Linux system users authenticate with system credentials
- JWT tokens for API access
- SSH key authentication support
- All authenticated users get "admin" role by default

## Coding Conventions

### Error Handling
```go
// Always wrap errors with context
return nil, fmt.Errorf("failed to connect to CRI socket %s: %w", socketPath, err)

// Use common.SendError for HTTP responses
common.SendError(c, 503, "NO_RUNTIME_AVAILABLE", errorMessage)
```

### Service Pattern
```go
type Service struct {
    client SomeClient
    errorMessage string  // Store init errors for runtime reporting
}

// Always check client availability
if s.client == nil {
    common.SendError(c, 503, "SERVICE_UNAVAILABLE", s.errorMessage)
    return
}
```

### Interface Design
```go
// Define in common package for shared use
type RuntimeClient interface {
    ListContainers() ([]Container, error)
    GetContainer(id string) (*ContainerDetail, error)
    // ... minimal, essential methods only
}
```

## Development Environment

### Build Commands
```bash
make build          # Production build
make build-dev      # Development build
make build-linux    # Linux x86_64 build
make test          # Run tests
make dev           # Run in development mode
```

### Testing on macOS
- Development allowed on macOS (runtime.GOOS check commented out)
- Some features require Linux (systemd, netlink operations)
- Use Docker Compose dev environment for full Linux testing

### Docker Compose Dev Environment
```bash
cd development
./compose.sh up -d  # Full Linux environment with systemd, Docker-in-Docker, K3s
```

## Common Tasks and Solutions

### Adding a New Container Runtime
1. Implement `common.RuntimeClient` interface
2. Add socket detection in `container.NewService()`
3. Create route registration in `routes/`

### Adding New API Endpoints
1. Define types in appropriate package or `common/`
2. Implement service methods
3. Add Gin handlers
4. Register routes in `routes/` package
5. Update OpenAPI spec if needed

### Database Migrations
- Located in `internal/database/migrations/`
- Use `GetAllMigrations()` for centralized migration management
- Migrations run automatically on startup

## Current Limitations & TODOs

### Known Issues
1. CRI logs/import use placeholder implementations
2. Upload handlers temporarily disabled (TUS protocol)
3. Some Docker client type assertions need refinement
4. Terminal WebSocket feature needs security review

### Planned Improvements
- [ ] Implement container restart, pause/unpause, exec
- [ ] Add structured logging with levels
- [ ] Create comprehensive test suite
- [ ] Implement Docker-specific upload handler
- [ ] Add metrics and monitoring endpoints
- [ ] Improve error types and messages

## Important Design Decisions

### Why Separate Docker and CRI?
- **Different APIs**: Docker SDK vs gRPC CRI
- **Different capabilities**: Docker has more features, CRI is k8s-focused
- **Maintenance**: Changes to one don't affect the other
- **User choice**: Some environments have only one runtime

### Why Common Interface?
- **Consistency**: Same API structure regardless of runtime
- **Flexibility**: Easy to switch runtimes
- **Testing**: Can mock interface for testing
- **Future-proof**: Easy to add new runtimes

### Why SQLite?
- **Simplicity**: No external database required
- **Portability**: Single file database
- **Sufficient**: Adequate for system management workload
- **Reliable**: Battle-tested, stable

## Collaboration Tips

### When Making Changes
1. **Check existing patterns** - Follow established conventions
2. **Update tests** - Maintain or improve coverage
3. **Document breaking changes** - Update this file and commit messages
4. **Consider Linux compatibility** - Primary target is Linux
5. **Think about errors** - How will failures be reported?

### Commit Message Format
```
type: short description

- Detailed change 1
- Detailed change 2

BREAKING CHANGE: Description (if applicable)
```

Types: feat, fix, refactor, docs, test, chore

### Code Review Focus Areas
- Error handling completeness
- Resource cleanup (defer Close())
- Context usage and timeouts
- Interface segregation
- Linux compatibility

## Security Considerations

### Authentication
- System users only (via /etc/passwd)
- JWT secrets must be strong in production
- SSH key auth for enhanced security

### Privileged Operations
- Requires root for many operations
- Validate all inputs before system calls
- Never expose raw errors to users
- Audit log sensitive operations

### Container Security
- Validate image sources
- Limit resource consumption
- Network isolation options
- Volume mount restrictions

## Performance Considerations

### Timeouts
- Default context timeout: 10 seconds for most operations
- Image operations: 5-10 minutes
- Use context.WithTimeout consistently

### Resource Management
- Close all connections (defer client.Close())
- Limit concurrent operations
- Stream large responses (logs, metrics)
- Paginate list operations

## Debugging Tips

### Common Issues
1. **"No runtime available"** - Check Docker daemon or CRI socket
2. **Permission denied** - Need root or docker group
3. **Context deadline exceeded** - Increase timeout or check connectivity
4. **Nil pointer** - Check client initialization

### Useful Commands
```bash
# Check Docker
docker version
docker info

# Check containerd
crictl version
crictl info

# Check CRI-O
crictl --runtime-endpoint unix:///var/run/crio/crio.sock version

# Debug build
VAPOR_DEBUG=1 ./bin/vapor

# Check API
curl -H "Authorization: Bearer $TOKEN" localhost:8080/api/v1/system/summary
```

## Contact & Resources

### Documentation
- README.md - User-facing documentation
- openapi.yaml - API specification
- development/README.md - Dev environment setup

### Key Files to Understand
1. `cmd/vapor/main.go` - Entry point, initialization
2. `internal/routes/*.go` - API endpoint mapping
3. `internal/common/runtime_client.go` - Core interfaces
4. `internal/auth/enhanced_service.go` - Authentication logic

---

*Last Updated: 2024-08-16*
*Major Refactor: Separated Docker and CRI implementations*
