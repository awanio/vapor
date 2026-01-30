.PHONY: build embed-web build-fe test clean run docker-build docker-run install-deps lint install-system-deps check-system-deps

# Variables
BINARY_NAME=vapor
MAIN_PATH=cmd/vapor/main.go
DOCKER_IMAGE=vapor:latest
VERSION ?= $(shell git describe --tags --always --dirty || echo "dev")
FEATURES ?= Virtualization
LDFLAGS := -ldflags "-X 'main.Version=$(VERSION)' -X 'main.Features=$(FEATURES)'"

# Embed web UI assets
DIST_DIR=web/dist
EMBED_DIR=internal/web/dist

embed-web:
	@if [ -d "$(DIST_DIR)" ] && [ "$(shell ls -A $(DIST_DIR) 2>/dev/null | grep -v '^\.')" ]; then \
		echo "Embedding web UI assets..."; \
		mkdir -p $(EMBED_DIR); \
		rm -rf $(EMBED_DIR)/*; \
		cp -R $(DIST_DIR)/* $(EMBED_DIR) 2>/dev/null || true; \
		cp web/public/locales/* $(EMBED_DIR)/locales/; \
	else \
		echo "Warning: $(DIST_DIR) not found or empty, creating placeholder for build."; \
		mkdir -p $(EMBED_DIR); \
		touch $(EMBED_DIR)/.keep; \
	fi

build-fe:
	cd ./web/ && mv .env .env-bak && VITE_FEATURES="$(FEATURES)" npm run build && mv .env-bak .env && cd ../

# Build the binary
build: build-fe embed-web
	@echo "Building production binary..."
	go build -o bin/$(BINARY_NAME) $(LDFLAGS) $(MAIN_PATH)

# Build for development
build-dev: embed-web
	@echo "Building development binary..."
	go build -o bin/$(BINARY_NAME) $(LDFLAGS) $(MAIN_PATH)

run-dev: embed-web
	export VAPOR_OVMF_CODE=/usr/share/OVMF/OVMF_CODE.fd 
	export VAPOR_OVMF_VARS=/usr/share/OVMF/OVMF_VARS.fd 
	export VAPOR_OVMF_CODE_SECURE=/usr/share/OVMF/OVMF_CODE.secboot.fd
	export VAPOR_OVMF_VARS_SECURE=/usr/share/OVMF/OVMF_VARS.ms.fd
	go run $(LDFLAGS) cmd/vapor/main.go -config ./vapor.conf.example 

run-dev-web:
	cd web && VITE_FEATURES=$(FEATURES) npm run dev

update-systemd: build
	@echo "Update Vapor daemon service in systemd"
	cp ./bin/$(BINARY_NAME) /usr/local/bin/$(BINARY_NAME).new
	mv /usr/local/bin/$(BINARY_NAME).new /usr/local/bin/$(BINARY_NAME)
	systemctl restart vapor
# Run tests
test:
	@echo "Running tests..."
	go test -v ./...

# Run tests with coverage
test-coverage:
	@echo "Running tests with coverage..."
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

# Clean build artifacts
clean:
	@echo "Cleaning..."
	rm -rf bin/
	rm -f coverage.out coverage.html
	rm -rf $(EMBED_DIR)
	mkdir -p $(EMBED_DIR)
	touch $(EMBED_DIR)/.keep

# Run the application
run: build
	@echo "Running..."
	./bin/$(BINARY_NAME)

# Install dependencies
install-deps:
	@echo "Installing dependencies..."
	go mod download
	go mod tidy

# Run linter
lint:
	@echo "Running linter..."
	golangci-lint run

# Format code
fmt:
	@echo "Formatting code..."
	go fmt ./...

# Build Docker image
docker-build:
	@echo "Building Docker image..."
	docker build -t $(DOCKER_IMAGE) .

# Run Docker container
docker-run:
	@echo "Running Docker container..."
	docker run -p 8080:8080 --privileged $(DOCKER_IMAGE)

# Development environment with docker-compose
dev-up:
	@echo "Starting development environment..."
	@cd development && ./compose.sh up -d
	@echo "Development environment started!"
	@echo "Vapor API: http://localhost:8080"
	@echo "K3s API: https://localhost:6443"
	@echo "iSCSI Target: localhost:3260"
	@echo ""
	@echo "Default test user: vapor:vapor123"
	@echo "See development/README.md for more details"

# Stop development environment
dev-down:
	@echo "Stopping development environment..."
	@cd development && ./compose.sh down

# Restart development environment
dev-restart:
	@echo "Restarting development environment..."
	@cd development && ./compose.sh restart vapor-api

# View logs from development environment
dev-logs:
	@cd development && ./compose.sh logs -f vapor-api

# Execute commands in development container
dev-exec:
	@cd development && ./compose.sh exec vapor-api bash

# Run tests in development container
dev-test:
	@echo "Running tests in development container..."
	@cd development && ./compose.sh exec vapor-api go test -v ./...

# Clean development environment
dev-clean:
	@echo "Cleaning development environment..."
	@cd development && ./compose.sh down -v
	@echo "Removed all containers and volumes"

# Show development environment status
dev-ps:
	@cd development && ./compose.sh ps

# Build development environment
dev-build:
	@echo "Building development environment..."
	@cd development && ./compose.sh build

# Pull latest images for development environment
dev-pull:
	@echo "Pulling latest images..."
	@cd development && ./compose.sh pull

# Show development environment help
dev-help:
	@echo "Vapor Development Environment Commands:"
	@echo "  make dev-up      - Start development environment"
	@echo "  make dev-down    - Stop development environment"
	@echo "  make dev-ps      - Show container status"
	@echo "  make dev-restart - Restart vapor-api container"
	@echo "  make dev-logs    - View vapor-api logs"
	@echo "  make dev-exec    - Open bash shell in container"
	@echo "  make dev-test    - Run tests in container"
	@echo "  make dev-build   - Rebuild development images"
	@echo "  make dev-pull    - Pull latest base images"
	@echo "  make dev-clean   - Remove all containers and volumes"
	@echo ""
	@echo "For more information, see development/README.md"

# Generate OpenAPI documentation
docs:
	@echo "OpenAPI documentation is at openapi.yaml"

# Development mode with hot reload
dev:
	@echo "Starting in development mode..."
	go run $(MAIN_PATH)

# Install system dependencies (requires root/sudo)
install-system-deps:
	@echo "Installing system dependencies..."
	@if [ -f /etc/debian_version ]; then \
		echo "Detected Debian/Ubuntu system"; \
		sudo apt-get update && sudo apt-get install -y util-linux e2fsprogs xfsprogs btrfs-progs systemd lvm2 open-iscsi multipath-tools; \
	elif [ -f /etc/redhat-release ]; then \
		echo "Detected RHEL/CentOS/Fedora system"; \
		if command -v dnf >/dev/null 2>&1; then \
			sudo dnf install -y util-linux e2fsprogs xfsprogs btrfs-progs systemd lvm2 iscsi-initiator-utils device-mapper-multipath; \
		else \
			sudo yum install -y util-linux e2fsprogs xfsprogs btrfs-progs systemd lvm2 iscsi-initiator-utils device-mapper-multipath; \
		fi; \
	elif [ -f /etc/arch-release ]; then \
		echo "Detected Arch Linux system"; \
		sudo pacman -S --noconfirm util-linux e2fsprogs xfsprogs btrfs-progs systemd lvm2 open-iscsi multipath-tools; \
	elif [ -f /etc/alpine-release ]; then \
		echo "Detected Alpine Linux system"; \
		sudo apk add util-linux e2fsprogs xfsprogs btrfs-progs lvm2 open-iscsi multipath-tools; \
	else \
		echo "Unknown Linux distribution. Please install packages manually:"; \
		echo "- util-linux (for mount, umount, lsblk)"; \
		echo "- e2fsprogs (for ext2/3/4 support)"; \
		echo "- xfsprogs (for XFS support)"; \
		echo "- btrfs-progs (for Btrfs support)"; \
		echo "- systemd (for journalctl)"; \
		echo "- lvm2 (for LVM support)"; \
		echo "- open-iscsi/iscsi-initiator-utils (for iSCSI support)"; \
		echo "- multipath-tools/device-mapper-multipath (for multipath support)"; \
		exit 1; \
	fi

# Check if system dependencies are installed
check-system-deps:
	@echo "Checking system dependencies..."
	@missing=""; \
	for cmd in mount umount lsblk useradd usermod userdel journalctl; do \
		if ! command -v $$cmd >/dev/null 2>&1; then \
			missing="$$missing $$cmd"; \
		fi; \
	done; \
	if [ -n "$$missing" ]; then \
		echo "ERROR: Missing required commands:$$missing"; \
		echo "Run 'make install-system-deps' to install them"; \
		exit 1; \
	fi; \
	echo "Checking filesystem tools..."; \
	fs_tools=""; \
	for cmd in mkfs.ext4 mkfs.xfs mkfs.btrfs; do \
		if ! command -v $$cmd >/dev/null 2>&1; then \
			fs_tools="$$fs_tools $$cmd"; \
		fi; \
	done; \
	if [ -n "$$fs_tools" ]; then \
		echo "WARNING: Missing filesystem tools:$$fs_tools"; \
		echo "Some filesystem formatting features may not work"; \
	fi; \
	echo "Checking storage management tools..."; \
	storage_tools=""; \
	for cmd in vgs lvs pvs iscsiadm multipath btrfs; do \
		if ! command -v $$cmd >/dev/null 2>&1; then \
			storage_tools="$$storage_tools $$cmd"; \
		fi; \
	done; \
	if [ -n "$$storage_tools" ]; then \
		echo "WARNING: Missing storage management tools:$$storage_tools"; \
		echo "Some advanced storage features may not work"; \
	fi; \
	echo "All required system dependencies are installed!"
