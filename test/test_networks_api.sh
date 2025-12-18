#!/usr/bin/env bash
set -euo pipefail

# Functional test for /virtualization/networks endpoints
# Follows the patterns of test_storage_pools_api.sh, test_volumes_api.sh, and test_isos_api.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/vapor_api.sh
source "${SCRIPT_DIR}/lib/vapor_api.sh"

API_BASE="${API_BASE:-https://localhost:7770/api/v1}"
AUTH_TOKEN="${AUTH_TOKEN:-}"
RESP_FILE="${RESP_FILE:-/tmp/networks_api_resp.json}"

TEST_NETWORK_NAME="vapor-test-network-$$"

require_deps
login_if_needed

default_delete_network() {
  echo "\n=== Cleaning up test networks ==="

  # Try to delete the test network if it still exists
  echo "Deleting test network (if exists): ${TEST_NETWORK_NAME}"
  curl -ksS -X DELETE "${API_BASE}/virtualization/networks/${TEST_NETWORK_NAME}" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" >/dev/null 2>&1 || true
}

trap default_delete_network EXIT

echo "Using API_BASE=${API_BASE}"

# 1. List networks

echo "\n=== Listing existing networks ==="
api_call GET "/virtualization/networks"

# 2. Create a new NAT network

CREATE_BODY=$(jq -n \
  --arg name "${TEST_NETWORK_NAME}" \
  '{name: $name, mode: "nat", ip_range: {address: "192.168.250.1", netmask: "255.255.255.0"}, dhcp: {start: "192.168.250.10", end: "192.168.250.254"}, autostart: true}')

echo "\n=== Creating network ${TEST_NETWORK_NAME} ==="
api_call POST "/virtualization/networks" "${CREATE_BODY}"

# 3. Get network details

echo "\n=== Getting network details ==="
api_call GET "/virtualization/networks/${TEST_NETWORK_NAME}"

# 4. Update network (toggle autostart)

UPDATE_BODY=$(jq -n '{autostart: false}')

echo "\n=== Updating network (autostart=false) ==="
api_call PUT "/virtualization/networks/${TEST_NETWORK_NAME}" "${UPDATE_BODY}"

# 5. Get DHCP leases (likely empty, but should succeed)

echo "\n=== Getting DHCP leases for network ==="
api_call GET "/virtualization/networks/${TEST_NETWORK_NAME}/dhcp-leases"

# 6. Get network ports (likely empty, but should succeed)

echo "\n=== Getting network ports for network ==="
api_call GET "/virtualization/networks/${TEST_NETWORK_NAME}/ports"

# 7. Delete the network

echo "\n=== Deleting network ${TEST_NETWORK_NAME} ==="
api_call DELETE "/virtualization/networks/${TEST_NETWORK_NAME}"

echo "\nNetwork API functional test completed successfully."
