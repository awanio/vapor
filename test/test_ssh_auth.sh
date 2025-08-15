#!/bin/bash

# Test SSH Private Key Authentication for Vapor API
# This tests the direct private key authentication method

API_URL="http://localhost:8080/api/v1"
USERNAME=$(whoami)
SSH_KEY_PATH="$HOME/.ssh/id_rsa"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "Vapor API SSH Key Authentication Test"
echo "========================================="
echo "API URL: $API_URL"
echo "Username: $USERNAME"
echo ""

# Test: Direct SSH Private Key Authentication
echo -e "${YELLOW}Testing Direct SSH Private Key Authentication${NC}"

if [ ! -f "$SSH_KEY_PATH" ]; then
    echo -e "${RED}SSH private key not found at $SSH_KEY_PATH${NC}"
    echo "Creating a test SSH key pair..."
    ssh-keygen -t rsa -b 2048 -f "$SSH_KEY_PATH" -N "" -q
    echo -e "${GREEN}✓ Created test SSH key pair${NC}"
fi

# Read the private key
PRIVATE_KEY=$(cat "$SSH_KEY_PATH")

# Escape the private key for JSON
ESCAPED_KEY=$(echo "$PRIVATE_KEY" | jq -Rs .)

# Create the JSON payload
JSON_PAYLOAD=$(cat <<EOF
{
    "username": "$USERNAME",
    "auth_type": "ssh_key",
    "private_key": $ESCAPED_KEY
}
EOF
)

echo "Sending authentication request..."
RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "$JSON_PAYLOAD")

# Check if we got a token
if echo "$RESPONSE" | grep -q '"token"'; then
    TOKEN=$(echo "$RESPONSE" | jq -r '.data.token')
    EXPIRES_AT=$(echo "$RESPONSE" | jq -r '.data.expires_at')
    USER_INFO=$(echo "$RESPONSE" | jq '.data.user')
    
    echo -e "${GREEN}✓ SSH key authentication successful!${NC}"
    echo "  Token (first 40 chars): ${TOKEN:0:40}..."
    echo "  Expires at: $EXPIRES_AT"
    echo "  User info: $USER_INFO"
    
    # Test token refresh
    echo ""
    echo -e "${YELLOW}Testing JWT Token Refresh${NC}"
    REFRESH_RESPONSE=$(curl -s -X POST "$API_URL/auth/refresh" \
        -H "Authorization: Bearer $TOKEN")
    
    if echo "$REFRESH_RESPONSE" | grep -q '"token"'; then
        NEW_TOKEN=$(echo "$REFRESH_RESPONSE" | jq -r '.data.token')
        NEW_EXPIRES=$(echo "$REFRESH_RESPONSE" | jq -r '.data.expires_at')
        echo -e "${GREEN}✓ Token refresh successful!${NC}"
        echo "  New token (first 40 chars): ${NEW_TOKEN:0:40}..."
        echo "  New expiration: $NEW_EXPIRES"
    else
        echo -e "${RED}✗ Token refresh failed${NC}"
        echo "  Response: $REFRESH_RESPONSE"
    fi
    
    # Test getting user's SSH keys
    echo ""
    echo -e "${YELLOW}Testing Get User SSH Keys${NC}"
    KEYS_RESPONSE=$(curl -s -X GET "$API_URL/auth/users/$USERNAME/keys")
    
    if echo "$KEYS_RESPONSE" | grep -q '"keys"'; then
        NUM_KEYS=$(echo "$KEYS_RESPONSE" | jq '.data.keys | length')
        echo -e "${GREEN}✓ Retrieved user's SSH keys${NC}"
        echo "  Number of keys: $NUM_KEYS"
        if [ "$NUM_KEYS" -gt 0 ]; then
            echo "  First key (first 60 chars):"
            echo "    $(echo "$KEYS_RESPONSE" | jq -r '.data.keys[0]' | cut -c1-60)..."
        fi
    else
        echo -e "${YELLOW}ℹ No SSH keys found in authorized_keys${NC}"
        echo "  Response: $KEYS_RESPONSE"
    fi
    
else
    echo -e "${RED}✗ SSH key authentication failed${NC}"
    ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error.message' 2>/dev/null || echo "$RESPONSE")
    echo "  Error: $ERROR_MSG"
    
    # Check if authorized_keys exists
    if [ ! -f "$HOME/.ssh/authorized_keys" ]; then
        echo ""
        echo -e "${YELLOW}Note: No authorized_keys file found${NC}"
        echo "Creating authorized_keys with the public key..."
        cat "$SSH_KEY_PATH.pub" > "$HOME/.ssh/authorized_keys"
        chmod 600 "$HOME/.ssh/authorized_keys"
        echo -e "${GREEN}✓ Created authorized_keys file${NC}"
        echo ""
        echo "Please run this test again to test with the new authorized_keys file."
    else
        echo ""
        echo "Checking if public key is in authorized_keys..."
        PUB_KEY=$(cat "$SSH_KEY_PATH.pub")
        if grep -q "$PUB_KEY" "$HOME/.ssh/authorized_keys"; then
            echo -e "${GREEN}✓ Public key is in authorized_keys${NC}"
        else
            echo -e "${YELLOW}ℹ Public key not found in authorized_keys${NC}"
            echo "Adding public key to authorized_keys..."
            cat "$SSH_KEY_PATH.pub" >> "$HOME/.ssh/authorized_keys"
            echo -e "${GREEN}✓ Added public key to authorized_keys${NC}"
            echo ""
            echo "Please run this test again."
        fi
    fi
fi

echo ""
echo "========================================="
echo "Test Complete"
echo "========================================="
