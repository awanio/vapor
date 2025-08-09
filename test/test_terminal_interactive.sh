#!/bin/bash

# Interactive WebSocket terminal test

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Interactive WebSocket Terminal Test${NC}"
echo "===================================="

# Get JWT token
echo -e "\n${YELLOW}Getting JWT token...${NC}"
TOKEN=$(curl -s -X POST http://103.179.254.248:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.data.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo -e "${RED}Failed to get JWT token. Make sure the server is running.${NC}"
    exit 1
fi

echo -e "${GREEN}Token obtained successfully${NC}"

# Start websocat in interactive mode
echo -e "\n${YELLOW}Connecting to terminal WebSocket...${NC}"
echo -e "${YELLOW}Once connected, the message flow will be:${NC}"
echo "1. Send auth message"
echo "2. Send subscribe message to start terminal"
echo "3. Send input messages to interact with terminal"
echo ""
echo -e "${YELLOW}Example messages to send:${NC}"
echo '{"type":"auth","payload":{"token":"'$TOKEN'"}}'
echo '{"type":"subscribe","payload":{"cols":80,"rows":24,"shell":"/bin/bash"}}'
echo '{"type":"input","data":"ls -la\n"}'
echo '{"type":"input","data":"pwd\n"}'
echo '{"type":"input","data":"echo Hello from WebSocket terminal\n"}'
echo ""
echo -e "${GREEN}Starting interactive session...${NC}"
echo "Press Ctrl+C to exit"
echo ""

# Connect to WebSocket
websocat -t ws://103.179.254.248:8080/ws/terminal
