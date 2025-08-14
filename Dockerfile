# Build stage
FROM --platform=linux/amd64 golang:1.24-alpine AS builder

# Install build dependencies (git is needed for version injection)
RUN apk add --no-cache git
RUN apk add gcc musl-dev libvirt-dev pkgconfig

RUN pkg-config --exists libvirt || { echo "libvirt not found. Please install: apk add libvirt-dev"; exit 1; }

# Set CGO flags for libvirt
ENV CGO_ENABLED=1
ENV CGO_CFLAGS=$(pkg-config --cflags libvirt)
ENV CGO_LDFLAGS=$(pkg-config --libs libvirt)

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Create embed directory and copy web assets if they exist
RUN mkdir -p internal/web/dist && \
    if [ -d "web/dist" ] && [ "$(ls -A web/dist 2>/dev/null | grep -v '^\.')" ]; then \
        cp -R web/dist/* internal/web/dist/; \
    else \
        touch internal/web/dist/.keep; \
    fi

# Build the binary specifically for Linux x86_64
# RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build  -tags "linux,libvirt" -a -installsuffix cgo -o vapor ./cmd/vapor
RUN go build -tags "libvirt,linux" -o ./bin/vapor ./cmd/vapor/main.go
# RUN CGO_ENABLED=1 GOOS=linux go build -tags libvirt -o vapor ./cmd/vapor

# Final stage
FROM --platform=linux/amd64 alpine:latest

# Install runtime dependencies
RUN apk --no-cache add ca-certificates \
    util-linux \
    lsblk \
    e2fsprogs \
    xfsprogs \
    btrfs-progs \
    shadow \
    sudo

WORKDIR /root/

# Copy the binary from builder
COPY --from=builder /app/vapor .
COPY --from=builder /app/openapi.yaml .

# Create docs directory
RUN mkdir -p /root/docs
COPY --from=builder /app/openapi.yaml /root/docs/

# Expose port
EXPOSE 8080

# Run as root to access system functions
USER root

# Set environment variables
ENV JWT_SECRET=change-this-in-production
ENV SERVER_ADDR=:8080

# Run the binary
CMD ["./vapor"]
