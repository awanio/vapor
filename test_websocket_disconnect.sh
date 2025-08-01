#!/bin/bash

# Test script to verify WebSocket disconnection handling without panic

set -e

API_URL="http://localhost:8080"
WS_URL="ws://localhost:8080"

echo "=== WebSocket Disconnection Test ==="
echo "This test verifies that the server handles abrupt client disconnections gracefully"
echo

# Check if the server is running
if ! curl -s "${API_URL}/health" > /dev/null 2>&1; then
    echo "❌ Server is not running at ${API_URL}"
    echo "Please start the server first with: make run"
    exit 1
fi

echo "✅ Server is running"

# Get JWT token
echo -n "Getting authentication token... "
TOKEN=$(curl -s -X POST "${API_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}' | jq -r '.data.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ Failed to get token"
    exit 1
fi
echo "✅"

# Function to test WebSocket endpoint with abrupt disconnection
test_websocket_disconnect() {
    local endpoint=$1
    local subscribe_msg=$2
    
    echo
    echo "Testing ${endpoint}..."
    
    # Start WebSocket connection and disconnect after 2 seconds
    (
        echo '{"type":"auth","token":"'${TOKEN}'"}'
        sleep 0.5
        echo "${subscribe_msg}"
        sleep 2
    ) | timeout 3 websocat "${WS_URL}${endpoint}" 2>&1 | head -20 &
    
    WS_PID=$!
    
    # Wait a moment for connection to establish
    sleep 1
    
    # Force kill the WebSocket client to simulate abrupt disconnection
    kill -9 $WS_PID 2>/dev/null || true
    
    # Give server time to handle the disconnection
    sleep 1
    
    # Check if server is still healthy
    if curl -s "${API_URL}/health" > /dev/null 2>&1; then
        echo "✅ Server survived disconnection from ${endpoint}"
    else
        echo "❌ Server crashed after disconnection from ${endpoint}"
        return 1
    fi
}

# Test metrics WebSocket
test_websocket_disconnect "/ws/metrics" '{"type":"subscribe","channel":"metrics"}'

# Test logs WebSocket
test_websocket_disconnect "/ws/logs" '{"type":"subscribe","channel":"logs","options":{"lines":10}}'

# Test terminal WebSocket
test_websocket_disconnect "/ws/terminal" '{"type":"subscribe","channel":"terminal"}'

echo
echo "=== Multiple Simultaneous Disconnections Test ==="
echo "Testing multiple clients disconnecting at once..."

# Start multiple WebSocket connections
for i in {1..5}; do
    (
        echo '{"type":"auth","token":"'${TOKEN}'"}'
        sleep 0.5
        echo '{"type":"subscribe","channel":"metrics"}'
        sleep 10
    ) | websocat "${WS_URL}/ws/metrics" 2>&1 > /dev/null &
    PIDS[$i]=$!
done

# Wait for connections to establish
sleep 2

# Kill all connections at once
echo "Killing all ${#PIDS[@]} WebSocket connections..."
for pid in ${PIDS[@]}; do
    kill -9 $pid 2>/dev/null || true
done

# Wait for server to process disconnections
sleep 2

# Final health check
if curl -s "${API_URL}/health" > /dev/null 2>&1; then
    echo "✅ Server survived multiple simultaneous disconnections"
else
    echo "❌ Server crashed after multiple disconnections"
    exit 1
fi

echo
echo "=== Server Log Check ==="
echo "Check the server logs for any panic messages."
echo "If you see 'WebSocket client panic recovered' messages, that's good - it means the panic was caught."
echo "If you see unhandled panic stack traces, the fix needs more work."
echo
echo "✅ All tests completed successfully!"
