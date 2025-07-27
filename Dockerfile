# Build stage
FROM --platform=linux/amd64 golang:1.21-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary specifically for Linux x86_64
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -a -installsuffix cgo -o system-api ./cmd/system-api

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
COPY --from=builder /app/system-api .
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
CMD ["./system-api"]
