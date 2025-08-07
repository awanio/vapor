#!/bin/bash

# Test script for PVC and PV detail endpoints

API_BASE="http://localhost:8081/api/v1"
AUTH_TOKEN="your-jwt-token-here"  # Replace with actual JWT token

echo "Testing PVC detail endpoint..."
curl -X GET \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  "${API_BASE}/kubernetes/pvcs/default/test-pvc" \
  -v

echo -e "\n\nTesting PV detail endpoint..."
curl -X GET \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  "${API_BASE}/kubernetes/pvs/test-pv" \
  -v

echo -e "\n\nTesting PVC list endpoint..."
curl -X GET \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  "${API_BASE}/kubernetes/pvcs" \
  -v

echo -e "\n\nTesting PV list endpoint..."
curl -X GET \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  "${API_BASE}/kubernetes/pvs" \
  -v
