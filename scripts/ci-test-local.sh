#!/bin/bash

# CI Test Runner for Local Development
# This script mimics the GitLab CI/CD pipeline locally
# Usage: ./scripts/ci-test-local.sh [stage]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
GO_VERSION="1.24"
TEST_TIMEOUT="10m"
COVERAGE_THRESHOLD="60"

# Functions
print_header() {
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}========================================${NC}\n"
}

print_error() {
    echo -e "${RED}ERROR: $1${NC}" >&2
}

print_warning() {
    echo -e "${YELLOW}WARNING: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Check if running in CI or local
if [ -n "$CI" ]; then
    echo "Running in CI environment"
else
    echo "Running in local environment"
fi

# Parse arguments
STAGE=${1:-all}

# Function to run lint stage
run_lint() {
    print_header "LINT STAGE"
    
    # Check if golangci-lint is installed
    if ! command -v golangci-lint &> /dev/null; then
        print_warning "golangci-lint not found. Installing..."
        go install github.com/golangci/golangci-lint/cmd/golangci-lint@v1.54.2
    fi
    
    echo "Running golangci-lint..."
    if golangci-lint run --timeout 5m --color always; then
        print_success "Linting passed"
    else
        print_error "Linting failed"
        return 1
    fi
    
    echo -e "\nChecking code formatting..."
    if [ -z "$(gofmt -l .)" ]; then
        print_success "Code formatting check passed"
    else
        print_error "Code formatting issues found:"
        gofmt -l .
        return 1
    fi
}

# Function to run unit tests
run_unit_tests() {
    print_header "UNIT TEST STAGE"
    
    echo "Running unit tests with coverage..."
    go test -v -race -coverprofile=coverage.out -covermode=atomic -timeout=${TEST_TIMEOUT} ./... || {
        print_error "Unit tests failed"
        return 1
    }
    
    echo -e "\nGenerating coverage report..."
    go tool cover -func=coverage.out
    go tool cover -html=coverage.out -o coverage.html
    
    # Check coverage threshold
    coverage=$(go tool cover -func=coverage.out | grep total | awk '{print $3}' | sed 's/%//')
    echo -e "\nTotal coverage: ${coverage}%"
    
    if (( $(echo "$coverage < $COVERAGE_THRESHOLD" | bc -l) )); then
        print_error "Coverage ${coverage}% is below threshold ${COVERAGE_THRESHOLD}%"
        return 1
    else
        print_success "Coverage check passed"
    fi
}

# Function to run integration tests
run_integration_tests() {
    print_header "INTEGRATION TEST STAGE"
    
    # Check for required system dependencies
    echo "Checking system dependencies..."
    for cmd in docker sqlite3; do
        if ! command -v $cmd &> /dev/null; then
            print_warning "$cmd not found. Some integration tests may fail."
        fi
    done
    
    echo "Running integration tests..."
    if go test -v -tags=integration -timeout=${TEST_TIMEOUT} ./internal/tests/... 2>/dev/null; then
        print_success "Integration tests passed"
    else
        print_warning "Integration tests failed or not found"
    fi
}

# Function to run API tests
run_api_tests() {
    print_header "API TEST STAGE"
    
    # Build the binary
    echo "Building API binary for testing..."
    go build -o vapor-test ./cmd/vapor/main.go || {
        print_error "Failed to build API binary"
        return 1
    }
    
    # Start the API server
    echo "Starting API server..."
    JWT_SECRET=test-secret ./vapor-test &
    SERVER_PID=$!
    
    # Wait for server to start
    sleep 5
    
    # Check if server is running
    if ! kill -0 $SERVER_PID 2>/dev/null; then
        print_error "API server failed to start"
        return 1
    fi
    
    # Run API tests
    echo "Running API tests..."
    if [ -f "./test/test_api.sh" ]; then
        chmod +x ./test/test_api.sh
        if ./test/test_api.sh; then
            print_success "API tests passed"
        else
            print_error "API tests failed"
            kill $SERVER_PID 2>/dev/null || true
            return 1
        fi
    else
        print_warning "API test script not found"
    fi
    
    # Clean up
    kill $SERVER_PID 2>/dev/null || true
    rm -f vapor-test
}

# Function to run E2E tests with docker-compose
run_e2e_tests() {
    print_header "E2E TEST STAGE"
    
    # Check if docker-compose is available
    if ! command -v docker-compose &> /dev/null; then
        print_warning "docker-compose not found. Skipping E2E tests."
        return 0
    fi
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        print_error "Docker is not running"
        return 1
    fi
    
    echo "Starting E2E test environment..."
    cd development
    
    # Start services
    docker-compose up -d || {
        print_error "Failed to start E2E environment"
        cd ..
        return 1
    }
    
    # Wait for services to be ready
    echo "Waiting for services to be ready..."
    sleep 30
    
    # Show service status
    docker-compose ps
    
    # Run E2E tests
    echo "Running E2E tests..."
    
    # Run smoke tests
    if docker-compose exec -T vapor-api-dev bash -c "cd /app && chmod +x test/*.sh && ./test/smoke_test.sh"; then
        print_success "Smoke tests passed"
    else
        print_warning "Smoke tests failed"
    fi
    
    # Clean up
    echo "Cleaning up E2E environment..."
    docker-compose down -v
    cd ..
}

# Function to build Docker image
run_docker_build() {
    print_header "DOCKER BUILD STAGE"
    
    echo "Building Docker image..."
    if docker build -t vapor:test -f Dockerfile .; then
        print_success "Docker image built successfully"
    else
        print_error "Docker build failed"
        return 1
    fi
}

# Main execution
main() {
    case $STAGE in
        lint)
            run_lint
            ;;
        unit)
            run_unit_tests
            ;;
        integration)
            run_integration_tests
            ;;
        api)
            run_api_tests
            ;;
        e2e)
            run_e2e_tests
            ;;
        docker)
            run_docker_build
            ;;
        all)
            print_header "RUNNING ALL CI STAGES"
            
            run_lint || exit 1
            run_unit_tests || exit 1
            run_integration_tests || print_warning "Integration tests had issues"
            run_api_tests || print_warning "API tests had issues"
            run_docker_build || print_warning "Docker build had issues"
            run_e2e_tests || print_warning "E2E tests had issues"
            
            print_header "CI PIPELINE COMPLETE"
            print_success "All critical stages passed"
            ;;
        *)
            echo "Usage: $0 [lint|unit|integration|api|e2e|docker|all]"
            echo ""
            echo "Stages:"
            echo "  lint        - Run linting and code formatting checks"
            echo "  unit        - Run unit tests with coverage"
            echo "  integration - Run integration tests"
            echo "  api         - Run API tests"
            echo "  e2e         - Run E2E tests with docker-compose"
            echo "  docker      - Build Docker image"
            echo "  all         - Run all stages (default)"
            exit 1
            ;;
    esac
}

# Run main function
main

# Exit with appropriate code
exit $?
