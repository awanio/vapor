#!/bin/bash

# Test WebSocket authentication fix

# First, get a JWT token
echo "Getting JWT token..."
TOKEN=$(curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "Failed to get JWT token. Make sure the server is running."
    exit 1
fi

echo "Token obtained: ${TOKEN:0:20}..."

# Test metrics WebSocket
echo -e "\n\nTesting metrics WebSocket..."
echo '{"type":"auth","payload":{"token":"'$TOKEN'"}}' | websocat -n ws://localhost:8080/ws/metrics &
METRICS_PID=$!

# Give it time to authenticate
sleep 2

# Send subscribe message
echo '{"type":"subscribe"}' | websocat ws://localhost:8080/ws/metrics >/dev/null 2>&1 &

# Wait a bit to see if we get data
sleep 5

# Kill the background process
kill $METRICS_PID 2>/dev/null

# Test logs WebSocket
echo -e "\n\nTesting logs WebSocket..."
echo '{"type":"auth","payload":{"token":"'$TOKEN'"}}' | websocat -n ws://localhost:8080/ws/logs &
LOGS_PID=$!

# Give it time to authenticate
sleep 2

# Send subscribe message with filters
echo '{"type":"subscribe","payload":{"filters":{"unit":"sshd"}}}' | websocat ws://localhost:8080/ws/logs >/dev/null 2>&1 &

# Wait a bit to see if we get data
sleep 5

# Kill the background process
kill $LOGS_PID 2>/dev/null

echo -e "\n\nWebSocket tests completed. Check server logs for authentication success messages."
