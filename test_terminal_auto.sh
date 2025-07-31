#!/bin/bash

# Automated WebSocket terminal test

# Get JWT token
echo "Getting JWT token..."
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.data.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "Failed to get JWT token"
    exit 1
fi

echo "Token obtained: ${TOKEN:0:20}..."

# Create a temporary file for WebSocket communication
TMPFILE=$(mktemp)

# Start websocat in background with input from temp file
tail -f "$TMPFILE" | websocat -t ws://103.179.254.248:8080/ws/terminal 2>&1 | while read line; do
    echo "SERVER: $line"
done &
WEBSOCAT_PID=$!

# Give it time to connect
sleep 1

# Send auth message
echo "Sending auth message..."
echo '{"type":"auth","payload":{"token":"'$TOKEN'"}}' >> "$TMPFILE"
sleep 2

# Send subscribe message
echo "Sending subscribe message..."
echo '{"type":"subscribe","payload":{"cols":80,"rows":24,"shell":"/bin/bash"}}' >> "$TMPFILE"
sleep 3

# Send input message
echo "Sending input message (ls)..."
echo '{"type":"input","data":"ls\n"}' >> "$TMPFILE"
sleep 2

# Send another input message
echo "Sending input message (pwd)..."
echo '{"type":"input","data":"pwd\n"}' >> "$TMPFILE"
sleep 2

# Send exit command
echo "Sending exit command..."
echo '{"type":"input","data":"exit\n"}' >> "$TMPFILE"
sleep 2

# Clean up
kill $WEBSOCAT_PID 2>/dev/null
rm -f "$TMPFILE"

echo "Test completed. Check server.log for details."
