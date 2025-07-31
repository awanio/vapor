#!/bin/bash

# Test different resize message formats

# Check if an auth token is provided
if [ -z "$1" ]; then
    echo "Please provide an auth token as the first argument"
    echo "Usage: $0 <auth_token>"
    exit 1
fi

TOKEN=$1
WS_URL="ws://localhost:8081/ws/terminal"

echo "Testing WebSocket terminal resize with different message formats..."
echo

# Function to send a single message and see response
send_message() {
    local message=$1
    local description=$2
    
    echo "=== $description ==="
    echo "Sending: $message"
    echo
    
    (
        # Send auth message
        echo '{"type":"auth","payload":{"token":"'$TOKEN'"}}'
        sleep 1
        
        # Send subscribe message
        echo '{"type":"subscribe","payload":{"channel":"terminal","rows":24,"cols":80}}'
        sleep 2
        
        # Send the test message
        echo "$message"
        sleep 1
        
        # Send a command to check terminal size
        echo '{"type":"input","data":"stty size\n"}'
        sleep 1
        
        # Exit
        echo '{"type":"input","data":"exit\n"}'
        sleep 1
    ) | timeout 10s websocat -t "$WS_URL" 2>&1 | while read line; do
        # Only show relevant output
        if echo "$line" | grep -E "(error|resize|rows|cols|stty|[0-9]+ [0-9]+)" | grep -v "Binary" | grep -v "auth"; then
            echo "Response: $line"
        fi
    done
    
    echo
    echo "---"
    echo
}

# Check if websocat is installed
if ! command -v websocat &> /dev/null; then
    echo "Error: websocat is not installed"
    echo "Install it with: brew install websocat (on macOS) or from https://github.com/vi/websocat"
    exit 1
fi

# Test format 1: Standard format with payload object
send_message '{"type":"resize","payload":{"rows":40,"cols":120}}' \
             "Format 1: Standard format with payload object"

# Test format 2: Different order in payload
send_message '{"type":"resize","payload":{"cols":100,"rows":50}}' \
             "Format 2: Cols before rows in payload"

# Test format 3: Small terminal size
send_message '{"type":"resize","payload":{"rows":10,"cols":40}}' \
             "Format 3: Small terminal size"

echo "Test complete!"
