#!/bin/bash
# Test script for Docker and Container endpoints

API_URL="http://localhost:8081/api/v1"
TOKEN=""

echo "Testing Docker and Container endpoints..."
echo "========================================"

# Function to login and get token
login() {
    echo "1. Logging in..."
    RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username": "admin", "password": "admin123"}')
    
    TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    
    if [ -z "$TOKEN" ]; then
        echo "Failed to login. Response: $RESPONSE"
        exit 1
    fi
    echo "Login successful. Token obtained."
    echo
}

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    
    echo "Testing: $description"
    echo "Endpoint: $method $API_URL$endpoint"
    
    RESPONSE=$(curl -s -X "$method" "$API_URL$endpoint" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json")
    
    echo "Response:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    echo
    echo "---"
    echo
}

# Login first
login

# Test Container endpoints (for containerd/CRI-O)
echo "2. Testing Container Endpoints (containerd/CRI-O)"
echo "================================================"
test_endpoint "GET" "/containers" "List containers (containerd/CRI-O)"
test_endpoint "GET" "/images" "List images (containerd/CRI-O)"

# Test Docker-specific endpoints
echo "3. Testing Docker-specific Endpoints"
echo "===================================="
test_endpoint "GET" "/docker/ps" "List Docker containers"
test_endpoint "GET" "/docker/images" "List Docker images"
test_endpoint "GET" "/docker/networks" "List Docker networks"
test_endpoint "GET" "/docker/volumes" "List Docker volumes"

echo "Testing completed!"
