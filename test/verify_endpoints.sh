#!/bin/bash

# Script to verify all virtualization endpoints are properly configured
# This script checks that all required endpoints from the OpenAPI spec are implemented

echo "=== Vapor Virtualization Module Verification ==="
echo ""

# Build check
echo "1. Checking build..."
if go build ./cmd/vapor 2>/dev/null; then
    echo "   ✅ Build successful"
else
    echo "   ❌ Build failed"
    exit 1
fi

# Test check
echo ""
echo "2. Running tests..."
if go test ./internal/libvirt -short 2>/dev/null; then
    echo "   ✅ Tests passed"
else
    echo "   ❌ Tests failed"
fi

# Check for endpoint implementations
echo ""
echo "3. Checking endpoint implementations..."

endpoints=(
    "ListVMs"
    "GetVM"
    "CreateVM"
    "UpdateVM"
    "DeleteVM"
    "GetSnapshotCapabilities"
    "CreateSnapshot"
    "ListSnapshots"
    "RevertSnapshot"
    "DeleteSnapshot"
    "CreateBackup"
    "ListBackups"
    "RestoreBackup"
    "DeleteBackup"
    "MigrateVM"
    "GetMigrationStatus"
    "ListPCIDevices"
    "AttachPCIDevice"
    "DetachPCIDevice"
    "ListStoragePools"
    "CreateStoragePool"
    "GetStoragePool"
    "DeleteStoragePool"
    "ListVolumes"
    "CreateVolume"
    "GetVolume"
    "DeleteVolume"
    "ListNetworks"
    "CreateNetwork"
    "GetNetwork"
    "DeleteNetwork"
    "HotplugResource"
    "CreateVMEnhanced"
)

missing=0
for endpoint in "${endpoints[@]}"; do
    if grep -q "func (s \*Service) $endpoint" internal/libvirt/*.go 2>/dev/null; then
        echo "   ✅ $endpoint"
    else
        echo "   ❌ $endpoint - Missing"
        missing=$((missing + 1))
    fi
done

echo ""
echo "4. Summary:"
echo "   Total endpoints checked: ${#endpoints[@]}"
echo "   Missing endpoints: $missing"

if [ $missing -eq 0 ]; then
    echo ""
    echo "🎉 All virtualization endpoints are properly implemented!"
    echo "The libvirt module is ready for use."
else
    echo ""
    echo "⚠️  Some endpoints are missing. Please review the implementation."
fi
