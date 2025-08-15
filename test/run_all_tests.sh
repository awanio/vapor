#!/bin/bash

# Master test runner for Vapor virtualization

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[TEST]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Configuration
VAPOR_CONFIG="/tmp/vapor-test.conf"
VAPOR_PID=""
TEST_RESULTS="/tmp/vapor-test-results-$(date +%Y%m%d-%H%M%S).log"

# Cleanup function
cleanup() {
    if [ -n "$VAPOR_PID" ]; then
        log "Stopping Vapor server..."
        kill $VAPOR_PID 2>/dev/null || true
    fi
}

trap cleanup EXIT

# Setup environment
setup() {
    log "Setting up test environment..."
    ./test/setup_test_environment.sh > /dev/null 2>&1
    
    # Start Vapor server
    log "Starting Vapor server..."
    ./bin/vapor -c $VAPOR_CONFIG > /tmp/vapor.log 2>&1 &
    VAPOR_PID=$!
    
    # Wait for server to start
    sleep 3
    
    # Verify server is running
    if ! kill -0 $VAPOR_PID 2>/dev/null; then
        error "Vapor server failed to start. Check /tmp/vapor.log"
        exit 1
    fi
    
    log "Vapor server started (PID: $VAPOR_PID)"
}

# Run unit tests
run_unit_tests() {
    echo ""
    log "Running unit tests..."
    if go test ./internal/libvirt -v > /tmp/unit-test.log 2>&1; then
        log "✓ Unit tests passed"
        echo "UNIT_TESTS: PASSED" >> $TEST_RESULTS
    else
        error "✗ Unit tests failed"
        echo "UNIT_TESTS: FAILED" >> $TEST_RESULTS
        cat /tmp/unit-test.log
        return 1
    fi
}

# Run smoke tests
run_smoke_tests() {
    echo ""
    log "Running smoke tests..."
    if ./test/smoke_test.sh > /tmp/smoke-test.log 2>&1; then
        log "✓ Smoke tests passed"
        echo "SMOKE_TESTS: PASSED" >> $TEST_RESULTS
    else
        error "✗ Smoke tests failed"
        echo "SMOKE_TESTS: FAILED" >> $TEST_RESULTS
        cat /tmp/smoke-test.log
        return 1
    fi
}

# Run E2E tests
run_e2e_tests() {
    echo ""
    log "Running E2E tests..."
    if RUN_E2E_TESTS=true go test -tags=e2e ./test -v > /tmp/e2e-test.log 2>&1; then
        log "✓ E2E tests passed"
        echo "E2E_TESTS: PASSED" >> $TEST_RESULTS
    else
        warn "✗ E2E tests failed (may require full libvirt setup)"
        echo "E2E_TESTS: FAILED" >> $TEST_RESULTS
        # Don't fail on E2E tests as they require full environment
    fi
}

# Run performance tests
run_performance_tests() {
    echo ""
    log "Running performance tests..."
    if CONCURRENT_VMS=3 ITERATIONS=1 ./test/performance_test.sh > /tmp/perf-test.log 2>&1; then
        log "✓ Performance tests passed"
        echo "PERFORMANCE_TESTS: PASSED" >> $TEST_RESULTS
    else
        warn "✗ Performance tests failed"
        echo "PERFORMANCE_TESTS: FAILED" >> $TEST_RESULTS
        # Don't fail on performance tests
    fi
}

# Generate report
generate_report() {
    echo ""
    echo "========================================="
    echo "Test Execution Report"
    echo "========================================="
    
    cat $TEST_RESULTS
    
    echo ""
    info "Detailed logs available at:"
    echo "  - Unit tests: /tmp/unit-test.log"
    echo "  - Smoke tests: /tmp/smoke-test.log"
    echo "  - E2E tests: /tmp/e2e-test.log"
    echo "  - Performance tests: /tmp/perf-test.log"
    echo "  - Server logs: /tmp/vapor.log"
    echo "  - Results: $TEST_RESULTS"
    
    # Check overall status
    if grep -q "FAILED" $TEST_RESULTS; then
        echo ""
        warn "Some tests failed. Please review the logs."
        return 1
    else
        echo ""
        log "✓ All tests passed successfully!"
        return 0
    fi
}

# Main execution
main() {
    echo "========================================="
    echo "Vapor Virtualization Test Suite"
    echo "========================================="
    echo "Starting at: $(date)"
    echo ""
    
    # Setup
    setup
    
    # Run tests
    run_unit_tests
    run_smoke_tests
    run_e2e_tests
    run_performance_tests
    
    # Generate report
    generate_report
    
    echo ""
    echo "Completed at: $(date)"
    echo "========================================="
}

# Run main
main

# Ansible Tests
run_ansible_tests() {
    log "Running Ansible tests..."
    
    # Ansible smoke tests
    if [ -f ./test/smoke_test_ansible.sh ]; then
        log "Running Ansible smoke tests..."
        if ./test/smoke_test_ansible.sh >> $TEST_RESULTS 2>&1; then
            echo -e "  ${GREEN}✓${NC} Ansible smoke tests passed"
        else
            echo -e "  ${RED}✗${NC} Ansible smoke tests failed"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    fi
    
    # Ansible E2E tests
    if [ "$RUN_E2E" = "true" ]; then
        log "Running Ansible E2E tests..."
        if RUN_E2E_TESTS=true go test -v ./test -run TestE2EAnsible -tags e2e >> $TEST_RESULTS 2>&1; then
            echo -e "  ${GREEN}✓${NC} Ansible E2E tests passed"
        else
            echo -e "  ${RED}✗${NC} Ansible E2E tests failed"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    fi
    
    # Ansible performance tests
    if [ "$RUN_PERF" = "true" ] && [ -f ./test/performance_test_ansible.sh ]; then
        log "Running Ansible performance tests..."
        if ./test/performance_test_ansible.sh >> $TEST_RESULTS 2>&1; then
            echo -e "  ${GREEN}✓${NC} Ansible performance tests passed"
        else
            echo -e "  ${RED}✗${NC} Ansible performance tests failed"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    fi
}

# Add to main test execution (call this function in the main test flow)
