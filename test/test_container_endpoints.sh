#!/bin/bash

# Start the server in background
echo "Starting server..."
./bin/system-api > server.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Get auth token
echo "Getting auth token..."
TOKEN=$(curl -s -X POST http://localhost:8081/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "Failed to get auth token"
    kill $SERVER_PID
    exit 1
fi

echo "Token: $TOKEN"

# Test containers endpoint
echo -e "\n\nTesting /containers endpoint..."
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8081/api/v1/containers | jq .

# Test images endpoint
echo -e "\n\nTesting /images endpoint..."
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8081/api/v1/images | jq .

# Show server logs
echo -e "\n\nServer logs:"
cat server.log

# Kill the server
echo -e "\n\nStopping server..."
kill $SERVER_PID

# Clean up
rm server.log
