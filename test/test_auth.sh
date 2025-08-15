#!/bin/bash

# Test Authentication Script for Vapor API
# Tests both password and SSH key authentication methods

API_URL=${API_URL:-"http://localhost:8080/api/v1"}
TEST_USER=${TEST_USER:-$(whoami)}  # Use current user by default
TEST_PASS=${TEST_PASS:-"testpass"}
SSH_KEY_PATH=${SSH_KEY_PATH:-"$HOME/.ssh/id_rsa"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
    fi
}

# Function to extract value from JSON response
get_json_value() {
    echo "$1" | grep -o "\"$2\":[^,}]*" | sed "s/\"$2\"://; s/\"//g; s/^[[:space:]]*//; s/[[:space:]]*$//"
}

echo "========================================="
echo "Vapor API Authentication Test"
echo "========================================="
echo "API URL: $API_URL"
echo ""

# Test 1: Password Authentication
echo -e "${YELLOW}Test 1: Password Authentication${NC}"
echo "Testing login with username: $TEST_USER"

RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
        \"username\": \"$TEST_USER\",
        \"auth_type\": \"password\",
        \"password\": \"$TEST_PASS\"
    }")

TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -n "$TOKEN" ]; then
    print_result 0 "Password authentication successful"
    echo "  Token: ${TOKEN:0:20}..."
else
    print_result 1 "Password authentication failed"
    echo "  Response: $RESPONSE"
fi

echo ""

# Test 2: SSH Key Authentication - Challenge/Response
echo -e "${YELLOW}Test 2: SSH Key Authentication${NC}"

if [ ! -f "$SSH_KEY_PATH" ]; then
    echo -e "${RED}SSH private key not found at $SSH_KEY_PATH${NC}"
    echo "Skipping SSH key authentication test"
else
    # Step 1: Create challenge
    echo "Step 1: Creating challenge..."
    CHALLENGE_RESPONSE=$(curl -s -X POST "$API_URL/auth/challenge" \
        -H "Content-Type: application/json" \
        -d "{\"username\": \"$TEST_USER\"}")
    
    CHALLENGE=$(get_json_value "$CHALLENGE_RESPONSE" "challenge")
    CHALLENGE_ID=$(get_json_value "$CHALLENGE_RESPONSE" "challenge_id")
    
    if [ -n "$CHALLENGE_ID" ]; then
        print_result 0 "Challenge created successfully"
        echo "  Challenge ID: $CHALLENGE_ID"
        
        # Step 2: Sign challenge (this is a simplified example - real implementation would use SSH signing)
        echo "Step 2: Signing challenge with SSH key..."
        # Note: In a real implementation, you would use ssh-keygen -Y sign or similar
        # This is just a placeholder for demonstration
        
        # For demonstration, we'll try to verify with a mock signature
        VERIFY_RESPONSE=$(curl -s -X POST "$API_URL/auth/challenge/verify" \
            -H "Content-Type: application/json" \
            -d "{
                \"username\": \"$TEST_USER\",
                \"challenge_id\": \"$CHALLENGE_ID\",
                \"signature\": \"mock_signature_base64\"
            }")
        
        SSH_TOKEN=$(echo "$VERIFY_RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')
        
        if [ -n "$SSH_TOKEN" ]; then
            print_result 0 "SSH key authentication successful"
            echo "  Token: ${SSH_TOKEN:0:20}..."
        else
            print_result 1 "SSH key authentication failed (expected - requires real SSH signing)"
            echo "  Note: Real SSH signing implementation required for actual testing"
        fi
    else
        print_result 1 "Failed to create challenge"
        echo "  Response: $CHALLENGE_RESPONSE"
    fi
fi

echo ""

# Test 3: Token Refresh
echo -e "${YELLOW}Test 3: Token Refresh${NC}"

if [ -n "$TOKEN" ]; then
    echo "Testing token refresh..."
    REFRESH_RESPONSE=$(curl -s -X POST "$API_URL/auth/refresh" \
        -H "Authorization: Bearer $TOKEN")
    
    NEW_TOKEN=$(echo "$REFRESH_RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')
    
    if [ -n "$NEW_TOKEN" ]; then
        print_result 0 "Token refresh successful"
        echo "  New Token: ${NEW_TOKEN:0:20}..."
    else
        print_result 1 "Token refresh failed"
        echo "  Response: $REFRESH_RESPONSE"
    fi
else
    echo "Skipping token refresh test (no valid token from previous tests)"
fi

echo ""

# Test 4: Get User SSH Keys
echo -e "${YELLOW}Test 4: Get User SSH Keys${NC}"

if [ -n "$TOKEN" ]; then
    echo "Fetching SSH keys for user: $TEST_USER"
    KEYS_RESPONSE=$(curl -s -X GET "$API_URL/auth/users/$TEST_USER/keys" \
        -H "Authorization: Bearer $TOKEN")
    
    if echo "$KEYS_RESPONSE" | grep -q "keys"; then
        print_result 0 "Successfully retrieved SSH keys"
        echo "  Response: ${KEYS_RESPONSE:0:100}..."
    else
        print_result 1 "Failed to retrieve SSH keys"
        echo "  Response: $KEYS_RESPONSE"
    fi
else
    echo "Skipping SSH keys test (no valid token)"
fi

echo ""
echo "========================================="
echo "Authentication Tests Complete"
echo "========================================="
