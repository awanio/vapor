.PHONY: build test clean run docker-build docker-run install-deps lint

# Variables
BINARY_NAME=system-api
MAIN_PATH=cmd/system-api/main.go
DOCKER_IMAGE=system-api:latest

# Build the binary
build:
	@echo "Building..."
	go build -o bin/$(BINARY_NAME) $(MAIN_PATH)

# Build for Linux x86_64
build-linux:
	@echo "Building for Linux x86_64..."
	GOOS=linux GOARCH=amd64 go build -o bin/$(BINARY_NAME)-linux-amd64 $(MAIN_PATH)

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

# Generate OpenAPI documentation
docs:
	@echo "OpenAPI documentation is at openapi.yaml"

# Development mode with hot reload
dev:
	@echo "Starting in development mode..."
	go run $(MAIN_PATH)
