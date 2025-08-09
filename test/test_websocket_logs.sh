#!/bin/bash

# Test script for WebSocket logs functionality

API_URL="http://localhost:8080"
WS_URL="ws://localhost:8080"

echo "=== WebSocket Logs Test ==="
echo

# Check if server is running
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

echo
echo "Testing WebSocket logs endpoint..."
echo "Subscribing to logs with filters:"
echo "- unit: sshd"
echo "- priority: error"
echo "- follow: true"
echo

# Test the logs WebSocket with the correct payload format
echo "Connecting to ${WS_URL}/ws/logs..."
(
    # Send auth message
    echo '{"type":"auth","token":"'${TOKEN}'"}'
    sleep 1
    
    # Send subscribe message with filters in payload
    echo '{
        "type": "subscribe",
        "payload": {
            "filters": {
                "unit": "sshd",
                "priority": "error",
                "follow": true
            }
        }
    }'
    
    # Keep connection open to receive logs
    sleep 10
) | websocat "${WS_URL}/ws/logs" 2>&1 | while IFS= read -r line; do
    echo "Received: $line"
    
    # Check if it's a sample log message
    if echo "$line" | grep -q "Sample log message"; then
        echo "⚠️  Receiving sample log messages (journalctl not available on this system)"
    fi
    
    # Parse and display log data nicely
    if echo "$line" | jq -e '.type == "data"' > /dev/null 2>&1; then
        echo "Log entry:"
        echo "$line" | jq '.payload | {timestamp, level, unit, message}'
    fi
done

echo
echo "Test completed!"
echo
echo "Note: On macOS or systems without journalctl, you'll see sample log messages."
echo "On Linux systems with systemd, you'll see real system logs."
