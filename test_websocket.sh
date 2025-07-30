#!/bin/bash

# Test WebSocket authentication fix

# First, get a JWT token
echo "Getting JWT token..."
TOKEN=$(curl -s -X POST http://103.179.254.248:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.data.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "Failed to get JWT token. Make sure the server is running."
    exit 1
fi

echo "Token obtained: ${TOKEN:0:20}..."

# Test Terminal WebSocket
echo -e "\n\nTesting terminal WebSocket..."
echo '{"type":"auth","payload":{"token":"'$TOKEN'"}}' | websocat -n ws://103.179.254.248:8080/ws/terminal &
TERMINAL_PID=$!

# Give it time to authenticate
sleep 2

# Start terminal session
echo '{"type":"subscribe","payload":{"cols":80,"rows":24,"shell":"/bin/bash"}}' | websocat -n ws://103.179.254.248:8080/ws/terminal &

# Wait a bit to see if we get data
sleep 2

# Send input
echo '{"type":"input","data":"ls\n"}' | websocat ws://103.179.254.248:8080/ws/terminal >/dev/null 2>&1 &

# Wait a bit to see output
echo "Terminal should list directory contents."
sleep 5

# Kill the background process
kill $TERMINAL_PID 2>/dev/null

# Test metrics WebSocket
echo -e "\n\nTesting metrics WebSocket..."
echo '{"type":"auth","payload":{"token":"'$TOKEN'"}}' | websocat -n ws://103.179.254.248:8080/ws/metrics &
METRICS_PID=$!

# Give it time to authenticate
sleep 2

# Send subscribe message
echo '{"type":"subscribe"}' | websocat ws://103.179.254.248:8080/ws/metrics >/dev/null 2>&1 &

# Wait a bit to see if we get data
sleep 5

# Kill the background process
kill $METRICS_PID 2>/dev/null

# Test logs WebSocket
echo -e "\n\nTesting logs WebSocket..."
echo '{"type":"auth","payload":{"token":"'$TOKEN'"}}' | websocat -n ws://103.179.254.248:8080/ws/logs &
LOGS_PID=$!

# Give it time to authenticate
sleep 2

# Send subscribe message with filters
echo '{"type":"subscribe","payload":{"filters":{"unit":"sshd"}}}' | websocat ws://103.179.254.248:8080/ws/logs >/dev/null 2>&1 &

# Wait a bit to see if we get data
sleep 5

# Kill the background process
kill $LOGS_PID 2>/dev/null

echo -e "\n\nWebSocket tests completed. Check server logs for authentication success messages."
