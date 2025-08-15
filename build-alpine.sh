#!/bin/sh
# Build script for Alpine Linux with libvirt support

set -e

echo "Building Vapor API for Alpine Linux with libvirt support..."

# Ensure required packages are installed
echo "Checking dependencies..."
which pkg-config > /dev/null 2>&1 || { echo "pkg-config is required. Please install: apk add pkgconfig"; exit 1; }
which gcc > /dev/null 2>&1 || { echo "gcc is required. Please install: apk add gcc"; exit 1; }

# Check for libvirt
pkg-config --exists libvirt || { echo "libvirt not found. Please install: apk add libvirt-dev"; exit 1; }

# Set CGO flags for libvirt
export CGO_ENABLED=1
export CGO_CFLAGS=$(pkg-config --cflags libvirt)
export CGO_LDFLAGS=$(pkg-config --libs libvirt)

echo "CGO_CFLAGS: $CGO_CFLAGS"
echo "CGO_LDFLAGS: $CGO_LDFLAGS"

# Build with proper tags
echo "Building with libvirt support..."
go build -o ./bin/vapor ./cmd/vapor/main.go

if [ $? -eq 0 ]; then
    echo "Build successful! Binary created at ./bin/vapor"
    ls -lh ./bin/vapor
else
    echo "Build failed!"
    exit 1
fi
