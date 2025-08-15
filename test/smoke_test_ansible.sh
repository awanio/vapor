#!/bin/bash

# Ansible Smoke Tests for Vapor
# Quick validation that Ansible endpoints are functioning

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/test_helpers.sh" 2>/dev/null || true

# Configuration
BASE_URL="${BASE_URL:-http://localhost:8080}"
API_URL="${BASE_URL}/api/v1/ansible"
VERBOSE="${VERBOSE:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local test_name=$5
    
    TESTS_RUN=$((TESTS_RUN + 1))
    
    if [ "$VERBOSE" = "true" ]; then
        log_info "Testing: $test_name"
    fi
    
    if [ -z "$data" ] || [ "$data" = "null" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "${API_URL}${endpoint}" -H "Content-Type: application/json")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "${API_URL}${endpoint}" -H "Content-Type: application/json" -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "$expected_status" ]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        if [ "$VERBOSE" = "true" ]; then
            echo -e "  ${GREEN}✓${NC} $test_name (Status: $http_code)"
        else
            echo -n "."
        fi
        return 0
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\n  ${RED}✗${NC} $test_name"
        echo "    Expected: $expected_status, Got: $http_code"
        if [ "$VERBOSE" = "true" ]; then
            echo "    Response: $body"
        fi
        return 1
    fi
}

# Check if server is running
check_server() {
    log_info "Checking if Vapor server is running..."
    if ! curl -s -f "${BASE_URL}/health" > /dev/null 2>&1; then
        log_error "Vapor server is not running at ${BASE_URL}"
        echo "Please start the server with: make run"
        exit 1
    fi
    log_info "Server is running"
}

# Smoke Tests
run_smoke_tests() {
    echo ""
    log_info "Starting Ansible Smoke Tests"
    echo "================================"
    
    # 1. Playbook Management Tests
    log_info "Testing Playbook Management"
    
    test_endpoint "GET" "/playbooks" null 200 "List playbooks"
    
    test_endpoint "GET" "/playbooks/templates" null 200 "List templates"
    
    local upload_data='{
        "name": "smoke-test.yml",
        "content": "---\n- name: Smoke Test\n  hosts: localhost\n  tasks:\n    - ping:",
        "description": "Smoke test playbook"
    }'
    test_endpoint "POST" "/playbooks/upload" "$upload_data" 201 "Upload playbook"
    
    test_endpoint "GET" "/playbooks/smoke-test.yml" null 200 "Get playbook details"
    
    test_endpoint "POST" "/playbooks/validate" '{"name":"smoke-test.yml"}' 200 "Validate playbook"
    
    # 2. Ad-hoc Command Tests
    log_info "Testing Ad-hoc Commands"
    
    local adhoc_data='{
        "hosts": "localhost",
        "module": "ping",
        "inventory": "localhost,"
    }'
    # May return 202 (accepted) or 500 (if ansible not installed)
    if test_endpoint "POST" "/adhoc" "$adhoc_data" 202 "Run ad-hoc command" || \
       test_endpoint "POST" "/adhoc" "$adhoc_data" 500 "Run ad-hoc command (ansible not available)"; then
        :
    fi
    
    # 3. Inventory Tests
    log_info "Testing Inventory Management"
    
    test_endpoint "GET" "/inventory/dynamic" null 200 "Generate dynamic inventory"
    
    local inventory_data='{
        "name": "smoke-test-inventory",
        "inventory": {
            "all": {
                "hosts": ["host1", "host2"]
            },
            "_meta": {
                "hostvars": {
                    "host1": {"ansible_host": "192.168.1.10"},
                    "host2": {"ansible_host": "192.168.1.11"}
                }
            }
        }
    }'
    test_endpoint "POST" "/inventory" "$inventory_data" 200 "Save inventory"
    
    # 4. Execution Management Tests
    log_info "Testing Execution Management"
    
    test_endpoint "GET" "/executions" null 200 "List executions"
    
    # 5. Schedule Tests
    log_info "Testing Schedule Management"
    
    local schedule_data='{
        "name": "Smoke Test Schedule",
        "schedule": "0 * * * *",
        "playbook": {
            "playbook": "smoke-test.yml",
            "inventory": "localhost,"
        }
    }'
    
    # Create schedule and capture ID for cleanup
    response=$(curl -s -X POST "${API_URL}/schedules" -H "Content-Type: application/json" -d "$schedule_data")
    http_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API_URL}/schedules" -H "Content-Type: application/json" -d "$schedule_data")
    
    if [ "$http_code" = "201" ]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        schedule_id=$(echo "$response" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
        if [ "$VERBOSE" = "true" ]; then
            echo -e "  ${GREEN}✓${NC} Create schedule (ID: $schedule_id)"
        else
            echo -n "."
        fi
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "\n  ${RED}✗${NC} Create schedule"
    fi
    
    test_endpoint "GET" "/schedules" null 200 "List schedules"
    
    # 6. Template Tests
    log_info "Testing Template Operations"
    
    local template_data='{
        "template_id": "system-update",
        "name": "smoke-test-from-template.yml",
        "variables": {"target_hosts": "localhost"}
    }'
    test_endpoint "POST" "/playbooks/from-template" "$template_data" 201 "Create from template"
    
    # 7. External Source Tests (Optional)
    log_info "Testing External Sources (Optional)"
    
    local git_data='{
        "url": "https://github.com/ansible/ansible-examples.git",
        "branch": "master"
    }'
    # This might fail if git is not available or network is down
    if test_endpoint "POST" "/playbooks/sync-git" "$git_data" 200 "Sync from Git" || true; then
        :
    fi
    
    # Cleanup
    log_info "Cleaning up test resources"
    
    test_endpoint "DELETE" "/playbooks/smoke-test.yml" null 200 "Delete test playbook" || true
    test_endpoint "DELETE" "/playbooks/smoke-test-from-template.yml" null 200 "Delete template playbook" || true
    
    if [ ! -z "$schedule_id" ]; then
        test_endpoint "DELETE" "/schedules/$schedule_id" null 200 "Delete test schedule" || true
    fi
    
    echo ""
}

# Summary
print_summary() {
    echo ""
    echo "================================"
    echo "Smoke Test Summary"
    echo "================================"
    echo "Tests Run:    $TESTS_RUN"
    echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
    if [ $TESTS_FAILED -gt 0 ]; then
        echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
    else
        echo -e "Tests Failed: $TESTS_FAILED"
    fi
    echo "================================"
    
    if [ $TESTS_FAILED -gt 0 ]; then
        log_error "Some smoke tests failed!"
        return 1
    else
        log_info "All smoke tests passed!"
        return 0
    fi
}

# Main execution
main() {
    check_server
    run_smoke_tests
    print_summary
    
    exit $?
}

# Handle script arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -u|--url)
            BASE_URL="$2"
            API_URL="${BASE_URL}/api/v1/ansible"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  -v, --verbose    Enable verbose output"
            echo "  -u, --url URL    Set base URL (default: http://localhost:8080)"
            echo "  -h, --help       Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

main
