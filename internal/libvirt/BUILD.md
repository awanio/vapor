# Libvirt Module Build Configuration

## Build Requirements

This module requires:
- Linux operating system (development and deployment)
- libvirt-dev package installed
- Go 1.21 or higher

## File Structure

### Core Implementation Files
- `helpers.go` - Helper functions for libvirt operations
- `service.go` - Main service implementation
- `snapshot_enhanced.go` - Enhanced snapshot functionality
- `template_service.go` - VM template management
- `types.go` - Type definitions
- `vm_create_enhanced.go` - Enhanced VM creation features
- `iso_upload.go` - ISO upload handling

### Test Files
- `service_test.go` - Unit tests
- `integration_test.go` - Integration tests

## Building

Since this is a Linux-only application, no special build tags are required:

```bash
# Build the libvirt module
go build ./internal/libvirt

# Build the entire application
go build ./cmd/vapor

# Run tests
go test ./internal/libvirt

# Run integration tests (if needed)
go test ./internal/libvirt -tags=integration
```

## VS Code Configuration

The `.vscode/settings.json` file is configured for optimal Go development:
- Auto-formatting on save
- Automatic import organization
- Go language server (gopls) enabled
- GOOS set to linux

## Notes

- This application is designed to run on Linux systems only
- libvirt must be installed and configured on the system
- No build tags are required since we're targeting Linux exclusively
