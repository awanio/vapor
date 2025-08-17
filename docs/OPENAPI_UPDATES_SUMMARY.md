# OpenAPI Specification Updates Summary

## Date: 2025-08-16

## Changes Made

### 1. Console Endpoints Added

#### New Endpoints:
- `GET /virtualization/virtualmachines/{id}/console` - Get console connection information
- `GET /virtualization/virtualmachines/{id}/console/ws` - WebSocket console connection
- `GET /virtualization/virtualmachines/{id}/console/stats` - Console connection statistics

#### Features:
- Secure token-based authentication for console access
- Support for both VNC and SPICE protocols
- WebSocket-based proxying for browser clients
- Connection statistics and monitoring

### 2. Console-Related Schemas Added

#### New Schemas:
- `ConsoleInfo` - Console connection information response
- `ConsoleError` - Console-specific error responses
- `ConsoleConfig` - Console proxy configuration
- `ConsoleStats` - Console connection statistics
- `ConsoleConnection` - Active connection details

### 3. Enhanced VM Creation API Updated (Breaking Change)

#### Updated Endpoint:
- `POST /virtualization/virtualmachines/create-enhanced` - Now uses v2 schema

#### New Schemas:
- `VMCreateRequestEnhancedV2` - New request structure with nested storage
- `StorageConfig` - Nested storage configuration
- `DiskCreateConfigV2` - Updated disk configuration
- `PCIDeviceConfig` - PCI device passthrough configuration
- `EnhancedGraphicsConfig` - Enhanced graphics configuration

#### Breaking Changes:
- Storage configuration now required under `storage` object
- Removed root-level fields: `storage_pool`, `iso_path`, `disks`
- Added required `storage.default_pool` and `storage.disks` fields
- Added PCI device passthrough support

### 4. Examples Added

Added comprehensive examples for VM creation:
- Simple VM with boot ISO
- VM with GPU passthrough
- Multi-disk VM with different storage pools

## API Version Impact

These changes represent a significant update to the API:
- Console endpoints are new additions (non-breaking)
- VM creation endpoint has breaking changes (v2)
- Backward compatibility removed as requested

## Usage Examples

### Getting Console Access:
```bash
# 1. Get console info and token
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/virtualization/virtualmachines/vm-123/console

# 2. Connect via WebSocket using the returned token
wscat -c "ws://localhost:8080/api/v1/virtualization/virtualmachines/vm-123/console/ws?token=..."
```

### Creating VM with New Structure:
```json
{
  "name": "test-vm",
  "memory": 4096,
  "vcpus": 2,
  "storage": {
    "default_pool": "default",
    "boot_iso": "ubuntu.iso",
    "disks": [
      {
        "action": "create",
        "size": 20
      }
    ]
  }
}
```

## Client Impact

Clients will need to:
1. Update VM creation requests to use new nested structure
2. Implement WebSocket handling for console access
3. Handle new console-specific error codes
4. Update any API documentation or code generation

## Testing Recommendations

1. Test console WebSocket connections with actual VNC/SPICE clients
2. Verify token expiration and one-time use enforcement
3. Test VM creation with various storage configurations
4. Validate PCI device passthrough configuration
5. Test connection limits and cleanup mechanisms

---

*OpenAPI Version: 3.0.0*
*Last Updated: 2025-08-16*
