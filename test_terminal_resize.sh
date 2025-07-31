#!/bin/bash

# Test WebSocket Terminal Resize

# Check if an auth token is provided
if [ -z "$1" ]; then
    echo "Please provide an auth token as the first argument"
    echo "Usage: $0 <auth_token>"
    exit 1
fi

TOKEN=$1
WS_URL="ws://localhost:8081/ws/terminal"

echo "Testing WebSocket terminal resize functionality..."
echo "Connecting to: $WS_URL"
echo

# Function to test resize
test_resize() {
    local rows=$1
    local cols=$2
    
    echo "Testing resize to ${rows}x${cols}..."
    
    # Using websocat to connect and send messages
    (
        # Send auth message
        echo '{"type":"auth","payload":{"token":"'$TOKEN'"}}'
        sleep 1
        
        # Send subscribe message with initial size
        echo '{"type":"subscribe","payload":{"channel":"terminal","rows":24,"cols":80}}'
        sleep 2
        
        # Send resize message
        echo '{"type":"resize","payload":{"rows":'$rows',"cols":'$cols'}}'
        sleep 1
        
        # Send a command to see the terminal size
        echo '{"type":"input","data":"stty size\n"}'
        sleep 1
        
        # Exit
        echo '{"type":"input","data":"exit\n"}'
    ) | websocat -t --ping-interval 10 "$WS_URL" 2>&1 | while read line; do
        echo "Server: $line"
        # Check if we see the expected size in the output
        if echo "$line" | grep -q "\"data\":.*$rows.*$cols"; then
            echo "✓ Resize to ${rows}x${cols} appears successful!"
        fi
    done
}

# Check if websocat is installed
if ! command -v websocat &> /dev/null; then
    echo "Error: websocat is not installed"
    echo "Install it with: brew install websocat (on macOS) or from https://github.com/vi/websocat"
    exit 1
fi

echo "=== Test 1: Initial size 24x80 then resize to 40x120 ==="
test_resize 40 120

echo
echo "=== Test 2: Resize to 50x100 ==="
test_resize 50 100

echo
echo "=== Test 3: Small terminal 20x60 ==="
test_resize 20 60

echo
echo "Done testing resize functionality!"
