#!/bin/bash

# Test script for Vapor API development environment
# This script tests all major features to ensure the development environment is working correctly

set -e

API_URL="http://localhost:8080"
USERNAME="vapor"
PASSWORD="vapor123"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Vapor API Development Environment Test${NC}"
echo -e "${GREEN}========================================${NC}"

# Wait for API to be ready
echo -e "\n${YELLOW}Waiting for API to be ready...${NC}"
for i in {1..30}; do
    if curl -s -f "${API_URL}/health" > /dev/null 2>&1; then
        echo -e "${GREEN}API is ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}API failed to start after 30 seconds${NC}"
        exit 1
    fi
    sleep 1
    echo -n "."
done

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
    fi
}

# 1. Test Authentication
echo -e "\n${YELLOW}1. Testing Authentication...${NC}"
TOKEN=$(curl -s -X POST "${API_URL}/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${USERNAME}\",\"password\":\"${PASSWORD}\"}" \
    | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    print_result 0 "Authentication successful"
else
    print_result 1 "Authentication failed"
    exit 1
fi

# 2. Test System Information
echo -e "\n${YELLOW}2. Testing System Information...${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_URL}/api/v1/system/summary" \
    -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
[ "$HTTP_CODE" = "200" ]
print_result $? "System summary endpoint"

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_URL}/api/v1/system/cpu" \
    -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
[ "$HTTP_CODE" = "200" ]
print_result $? "CPU information endpoint"

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_URL}/api/v1/system/memory" \
    -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
[ "$HTTP_CODE" = "200" ]
print_result $? "Memory information endpoint"

# 3. Test Network Management
echo -e "\n${YELLOW}3. Testing Network Management...${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_URL}/api/v1/network/interfaces" \
    -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
[ "$HTTP_CODE" = "200" ]
print_result $? "List network interfaces"

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_URL}/api/v1/network/bridges" \
    -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
[ "$HTTP_CODE" = "200" ]
print_result $? "List network bridges"

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_URL}/api/v1/network/vlans" \
    -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
[ "$HTTP_CODE" = "200" ]
print_result $? "List VLANs"

# 4. Test Storage Management
echo -e "\n${YELLOW}4. Testing Storage Management...${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_URL}/api/v1/storage/disks" \
    -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
[ "$HTTP_CODE" = "200" ]
print_result $? "List disks"

# Test LVM
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_URL}/api/v1/storage/lvm/vgs" \
    -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
[ "$HTTP_CODE" = "200" ]
print_result $? "List volume groups"

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_URL}/api/v1/storage/lvm/lvs" \
    -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
[ "$HTTP_CODE" = "200" ]
print_result $? "List logical volumes"

# Test iSCSI
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_URL}/api/v1/storage/iscsi/sessions" \
    -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
[ "$HTTP_CODE" = "200" ]
print_result $? "List iSCSI sessions"

# Test RAID
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_URL}/api/v1/storage/raid/devices" \
    -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
[ "$HTTP_CODE" = "200" ]
print_result $? "List RAID devices"

# 5. Test User Management
echo -e "\n${YELLOW}5. Testing User Management...${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_URL}/api/v1/users" \
    -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
[ "$HTTP_CODE" = "200" ]
print_result $? "List users"

# 6. Test Container Management
echo -e "\n${YELLOW}6. Testing Container Management...${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_URL}/api/v1/containers" \
    -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
# Container endpoint might return 200 or 500 depending on whether runtime is available
[ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "500" ]
print_result $? "Container management endpoint"

# 7. Test Docker Management
echo -e "\n${YELLOW}7. Testing Docker Management...${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_URL}/api/v1/docker/ps" \
    -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
[ "$HTTP_CODE" = "200" ]
print_result $? "Docker containers list"

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_URL}/api/v1/docker/images" \
    -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
[ "$HTTP_CODE" = "200" ]
print_result $? "Docker images list"

# 8. Test Kubernetes Management
echo -e "\n${YELLOW}8. Testing Kubernetes Management...${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_URL}/api/v1/kubernetes/namespaces" \
    -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
# K8s endpoint might return 200 or 503 depending on whether K8s is available
[ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "503" ]
print_result $? "Kubernetes namespaces endpoint"

# 9. Test Logs
echo -e "\n${YELLOW}9. Testing Log Management...${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_URL}/api/v1/logs?limit=10" \
    -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
[ "$HTTP_CODE" = "200" ]
print_result $? "System logs endpoint"

# 10. Test Health Check
echo -e "\n${YELLOW}10. Testing Health Check...${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_URL}/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
[ "$HTTP_CODE" = "200" ]
print_result $? "Health check endpoint"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}All tests completed!${NC}"
echo -e "${GREEN}========================================${NC}"

# Test WebSocket endpoints (optional)
echo -e "\n${YELLOW}Testing WebSocket endpoints (requires wscat)...${NC}"
if command -v wscat &> /dev/null; then
    echo "You can test WebSocket endpoints with:"
    echo "  wscat -c ws://localhost:8080/ws/metrics -H \"Authorization: Bearer ${TOKEN}\""
    echo "  wscat -c ws://localhost:8080/ws/logs -H \"Authorization: Bearer ${TOKEN}\""
    echo "  wscat -c ws://localhost:8080/ws/terminal -H \"Authorization: Bearer ${TOKEN}\""
else
    echo "Install wscat to test WebSocket endpoints: npm install -g wscat"
fi

echo -e "\n${YELLOW}Access the Web UI at:${NC} http://localhost:8080"
echo -e "${YELLOW}API Documentation at:${NC} http://localhost:8080/docs"
