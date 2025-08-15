#!/bin/bash

# Ansible Performance Tests for Vapor
# Tests performance characteristics of Ansible endpoints

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configuration
BASE_URL="${BASE_URL:-http://localhost:8080}"
API_URL="${BASE_URL}/api/v1/ansible"
VERBOSE="${VERBOSE:-false}"
ITERATIONS="${ITERATIONS:-100}"
CONCURRENCY="${CONCURRENCY:-10}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Performance metrics
declare -a RESPONSE_TIMES=()
TOTAL_REQUESTS=0
FAILED_REQUESTS=0

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

log_metric() {
    echo -e "${BLUE}[METRIC]${NC} $1"
}

# Calculate statistics
calculate_stats() {
    local times=("$@")
    local count=${#times[@]}
    
    if [ $count -eq 0 ]; then
        echo "No data"
        return
    fi
    
    # Sort array
    IFS=$'\n' sorted=($(sort -n <<<"${times[*]}"))
    unset IFS
    
    # Calculate sum and average
    local sum=0
    for time in "${times[@]}"; do
        sum=$(echo "$sum + $time" | bc)
    done
    local avg=$(echo "scale=3; $sum / $count" | bc)
    
    # Calculate percentiles
    local p50_idx=$(( count * 50 / 100 ))
    local p95_idx=$(( count * 95 / 100 ))
    local p99_idx=$(( count * 99 / 100 ))
    
    [ $p50_idx -eq 0 ] && p50_idx=1
    [ $p95_idx -eq 0 ] && p95_idx=1
    [ $p99_idx -eq 0 ] && p99_idx=1
    
    local min="${sorted[0]}"
    local max="${sorted[$((count-1))]}"
    local p50="${sorted[$((p50_idx-1))]}"
    local p95="${sorted[$((p95_idx-1))]}"
    local p99="${sorted[$((p99_idx-1))]}"
    
    echo "  Min:     ${min}ms"
    echo "  Max:     ${max}ms"
    echo "  Average: ${avg}ms"
    echo "  P50:     ${p50}ms"
    echo "  P95:     ${p95}ms"
    echo "  P99:     ${p99}ms"
}

# Measure endpoint response time
measure_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    local start=$(date +%s%3N)
    
    if [ -z "$data" ] || [ "$data" = "null" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "${API_URL}${endpoint}" -H "Content-Type: application/json" 2>/dev/null)
    else
        response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "${API_URL}${endpoint}" -H "Content-Type: application/json" -d "$data" 2>/dev/null)
    fi
    
    local end=$(date +%s%3N)
    local duration=$((end - start))
    
    if [ "$response" = "000" ]; then
        FAILED_REQUESTS=$((FAILED_REQUESTS + 1))
        echo -1
    else
        echo $duration
    fi
}

# Performance test for an endpoint
perf_test_endpoint() {
    local test_name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local iterations=${5:-$ITERATIONS}
    
    log_info "Testing: $test_name"
    echo "  Iterations: $iterations"
    
    local times=()
    local progress=0
    
    for i in $(seq 1 $iterations); do
        duration=$(measure_request "$method" "$endpoint" "$data")
        if [ $duration -gt 0 ]; then
            times+=($duration)
        fi
        
        # Show progress
        progress=$((i * 100 / iterations))
        if [ $((i % 10)) -eq 0 ]; then
            echo -ne "\r  Progress: ${progress}%"
        fi
    done
    echo -ne "\r  Progress: 100%\n"
    
    if [ ${#times[@]} -gt 0 ]; then
        calculate_stats "${times[@]}"
    else
        log_error "  All requests failed"
    fi
    
    echo ""
}

# Concurrent requests test
concurrent_test() {
    local test_name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local concurrency=${5:-$CONCURRENCY}
    local total_requests=${6:-$ITERATIONS}
    
    log_info "Concurrent Test: $test_name"
    echo "  Concurrency: $concurrency"
    echo "  Total Requests: $total_requests"
    
    local temp_dir=$(mktemp -d)
    local start_time=$(date +%s%3N)
    
    # Launch concurrent requests
    for i in $(seq 1 $total_requests); do
        (
            duration=$(measure_request "$method" "$endpoint" "$data")
            echo $duration > "$temp_dir/result_$i"
        ) &
        
        # Limit concurrency
        if [ $((i % concurrency)) -eq 0 ]; then
            wait
        fi
    done
    wait
    
    local end_time=$(date +%s%3N)
    local total_duration=$((end_time - start_time))
    
    # Collect results
    local times=()
    local successful=0
    for i in $(seq 1 $total_requests); do
        if [ -f "$temp_dir/result_$i" ]; then
            duration=$(cat "$temp_dir/result_$i")
            if [ $duration -gt 0 ]; then
                times+=($duration)
                successful=$((successful + 1))
            fi
        fi
    done
    
    # Calculate throughput
    local throughput=$(echo "scale=2; $successful * 1000 / $total_duration" | bc)
    
    echo "  Successful: $successful/$total_requests"
    echo "  Total Time: ${total_duration}ms"
    echo "  Throughput: ${throughput} req/s"
    
    if [ ${#times[@]} -gt 0 ]; then
        echo "  Response Times:"
        calculate_stats "${times[@]}"
    fi
    
    # Cleanup
    rm -rf "$temp_dir"
    echo ""
}

# Load test with increasing concurrency
load_test() {
    local endpoint=$1
    local method=${2:-GET}
    local data=${3:-null}
    
    log_info "Load Test for $endpoint"
    echo "Testing with increasing concurrency levels..."
    echo ""
    
    for concurrency in 1 5 10 20 50; do
        log_metric "Concurrency Level: $concurrency"
        concurrent_test "Load Test" "$method" "$endpoint" "$data" $concurrency 50
        sleep 2  # Brief pause between tests
    done
}

# Stress test - sustained load
stress_test() {
    local duration_seconds=${1:-60}
    
    log_info "Stress Test - Sustained Load"
    echo "  Duration: ${duration_seconds} seconds"
    echo "  Concurrency: 20"
    echo ""
    
    local temp_dir=$(mktemp -d)
    local start_time=$(date +%s)
    local end_time=$((start_time + duration_seconds))
    local request_count=0
    
    # Create test playbook for stress testing
    local playbook_data='{
        "name": "stress-test.yml",
        "content": "---\n- name: Stress Test\n  hosts: localhost\n  tasks:\n    - debug:\n        msg: Stress test"
    }'
    
    # Upload test playbook
    curl -s -X POST "${API_URL}/playbooks/upload" -H "Content-Type: application/json" -d "$playbook_data" > /dev/null
    
    # Run sustained load
    while [ $(date +%s) -lt $end_time ]; do
        for i in $(seq 1 20); do
            (
                # Mix of different operations
                case $((i % 4)) in
                    0) measure_request "GET" "/playbooks" null ;;
                    1) measure_request "GET" "/executions" null ;;
                    2) measure_request "GET" "/playbooks/templates" null ;;
                    3) measure_request "GET" "/inventory/dynamic" null ;;
                esac
                echo 1 >> "$temp_dir/requests"
            ) &
        done
        wait
        
        request_count=$(wc -l < "$temp_dir/requests" 2>/dev/null || echo 0)
        echo -ne "\r  Requests completed: $request_count"
        
        sleep 0.5
    done
    
    echo ""
    local actual_duration=$(($(date +%s) - start_time))
    local throughput=$(echo "scale=2; $request_count / $actual_duration" | bc)
    
    echo "  Total Requests: $request_count"
    echo "  Duration: ${actual_duration}s"
    echo "  Average Throughput: ${throughput} req/s"
    
    # Cleanup
    curl -s -X DELETE "${API_URL}/playbooks/stress-test.yml" > /dev/null
    rm -rf "$temp_dir"
    echo ""
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
    echo ""
}

# Setup test data
setup_test_data() {
    log_info "Setting up test data..."
    
    # Create various sizes of playbooks for testing
    for size in small medium large; do
        local task_count=1
        case $size in
            small) task_count=5 ;;
            medium) task_count=50 ;;
            large) task_count=200 ;;
        esac
        
        local tasks=""
        for i in $(seq 1 $task_count); do
            tasks="$tasks\n    - name: Task $i\n      debug:\n        msg: Task $i"
        done
        
        local playbook_data="{
            \"name\": \"perf-test-${size}.yml\",
            \"content\": \"---\\\n- name: Performance Test ${size}\\\n  hosts: localhost\\\n  tasks:${tasks}\"
        }"
        
        curl -s -X POST "${API_URL}/playbooks/upload" -H "Content-Type: application/json" -d "$playbook_data" > /dev/null
    done
    
    log_info "Test data created"
    echo ""
}

# Cleanup test data
cleanup_test_data() {
    log_info "Cleaning up test data..."
    
    for size in small medium large; do
        curl -s -X DELETE "${API_URL}/playbooks/perf-test-${size}.yml" > /dev/null 2>&1
    done
    
    log_info "Test data cleaned"
}

# Main performance test suite
run_performance_tests() {
    echo "======================================"
    echo "Ansible Performance Test Suite"
    echo "======================================"
    echo "Configuration:"
    echo "  Base URL: $BASE_URL"
    echo "  Iterations: $ITERATIONS"
    echo "  Concurrency: $CONCURRENCY"
    echo ""
    
    # 1. Basic endpoint performance
    log_info "=== Basic Endpoint Performance ==="
    echo ""
    
    perf_test_endpoint "List Playbooks" "GET" "/playbooks" null
    perf_test_endpoint "List Templates" "GET" "/playbooks/templates" null
    perf_test_endpoint "List Executions" "GET" "/executions" null
    perf_test_endpoint "Generate Dynamic Inventory" "GET" "/inventory/dynamic" null
    
    # 2. Write operations performance
    log_info "=== Write Operations Performance ==="
    echo ""
    
    local small_playbook='{
        "name": "perf-write-test.yml",
        "content": "---\n- hosts: localhost\n  tasks:\n    - ping:"
    }'
    perf_test_endpoint "Upload Small Playbook" "POST" "/playbooks/upload" "$small_playbook" 20
    
    # Cleanup
    curl -s -X DELETE "${API_URL}/playbooks/perf-write-test.yml" > /dev/null
    
    # 3. Concurrent operations
    log_info "=== Concurrent Operations ==="
    echo ""
    
    concurrent_test "Concurrent Reads" "GET" "/playbooks" null
    concurrent_test "Concurrent Template Lists" "GET" "/playbooks/templates" null
    
    # 4. Load testing
    log_info "=== Load Testing ==="
    echo ""
    
    load_test "/playbooks"
    
    # 5. Stress testing (optional - takes time)
    if [ "$RUN_STRESS_TEST" = "true" ]; then
        log_info "=== Stress Testing ==="
        echo ""
        stress_test 30  # 30 second stress test
    fi
    
    # 6. Large payload testing
    log_info "=== Large Payload Performance ==="
    echo ""
    
    # Create a large playbook
    local large_tasks=""
    for i in $(seq 1 100); do
        large_tasks="${large_tasks}    - name: Task $i\n      debug:\n        msg: Task $i execution\n"
    done
    
    local large_playbook="{
        \"name\": \"perf-large-test.yml\",
        \"content\": \"---\n- name: Large Playbook Test\n  hosts: localhost\n  tasks:\n${large_tasks}\"
    }"
    
    perf_test_endpoint "Upload Large Playbook" "POST" "/playbooks/upload" "$large_playbook" 10
    
    # Test retrieving large playbook
    perf_test_endpoint "Get Large Playbook" "GET" "/playbooks/perf-large-test.yml" null 10
    
    # Cleanup
    curl -s -X DELETE "${API_URL}/playbooks/perf-large-test.yml" > /dev/null
    
    echo ""
}

# Print summary
print_summary() {
    echo "======================================"
    echo "Performance Test Summary"
    echo "======================================"
    echo "Total Requests: $TOTAL_REQUESTS"
    echo "Failed Requests: $FAILED_REQUESTS"
    
    if [ $FAILED_REQUESTS -gt 0 ]; then
        local failure_rate=$(echo "scale=2; $FAILED_REQUESTS * 100 / $TOTAL_REQUESTS" | bc)
        echo -e "${YELLOW}Failure Rate: ${failure_rate}%${NC}"
    else
        echo -e "${GREEN}Failure Rate: 0%${NC}"
    fi
    
    echo "======================================"
    
    if [ $FAILED_REQUESTS -gt $((TOTAL_REQUESTS / 10)) ]; then
        log_error "High failure rate detected!"
        return 1
    else
        log_info "Performance tests completed successfully"
        return 0
    fi
}

# Main execution
main() {
    check_server
    setup_test_data
    
    # Run tests
    run_performance_tests
    
    # Cleanup
    cleanup_test_data
    
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
        -i|--iterations)
            ITERATIONS="$2"
            shift 2
            ;;
        -c|--concurrency)
            CONCURRENCY="$2"
            shift 2
            ;;
        -s|--stress)
            RUN_STRESS_TEST=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  -v, --verbose           Enable verbose output"
            echo "  -u, --url URL          Set base URL (default: http://localhost:8080)"
            echo "  -i, --iterations NUM   Number of iterations (default: 100)"
            echo "  -c, --concurrency NUM  Concurrency level (default: 10)"
            echo "  -s, --stress           Run stress tests"
            echo "  -h, --help             Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

main
