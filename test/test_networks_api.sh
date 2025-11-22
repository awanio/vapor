#!/usr/bin/env bash
set -euo pipefail

# Functional test for /virtualization/networks endpoints
# Follows the patterns of test_storage_pools_api.sh, test_volumes_api.sh, and test_isos_api.sh

API_BASE="${API_BASE:-https://localhost:7770/api/v1}"
AUTH_TOKEN="${AUTH_TOKEN:-}"

TEST_NETWORK_NAME="vapor-test-network-$$"

# Check dependencies
if ! command -v curl >/dev/null 2>&1; then
  echo "ERROR: curl is required" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required" >&2
  exit 1
fi

# Obtain AUTH_TOKEN if not provided
if [[ -z "${AUTH_TOKEN}" ]]; then
  if [[ -z "${VAPOR_USERNAME:-}" || -z "${VAPOR_PASSWORD:-}" ]]; then
    echo "ERROR: AUTH_TOKEN is not set and no VAPOR_USERNAME/VAPOR_PASSWORD provided." >&2
    exit 1
  fi

  echo "Logging in to obtain AUTH_TOKEN..."
  LOGIN_RESP=$(curl -ksS -X POST "${API_BASE}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${VAPOR_USERNAME}\",\"password\":\"${VAPOR_PASSWORD}\"}")

  AUTH_TOKEN=$(echo "${LOGIN_RESP}" | jq -r '.token // empty') || AUTH_TOKEN=""
  if [[ -z "${AUTH_TOKEN}" || "${AUTH_TOKEN}" == "null" ]]; then
    echo "ERROR: Failed to obtain AUTH_TOKEN from /auth/login response" >&2
    echo "Response was: ${LOGIN_RESP}" >&2
    exit 1
  fi
fi

# Helper to call API with JSON
api_call() {
  local method="$1"; shift
  local path="$1"; shift
  local data="${1:-}"

  local url="${API_BASE}${path}"
  echo
  echo "=== ${method} ${url} ==="

  local response_file="/tmp/networks_api_resp.json"

  if [[ -n "${data}" ]]; then
    http_code=$(curl -ksS -o "${response_file}" -w '%{http_code}' \
      -X "${method}" "${url}" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "${data}")
  else
    http_code=$(curl -ksS -o "${response_file}" -w '%{http_code}' \
      -X "${method}" "${url}" \
      -H "Authorization: Bearer ${AUTH_TOKEN}")
  fi

  echo "HTTP ${http_code}"
  if [[ -s "${response_file}" ]]; then
    cat "${response_file}" | jq . || cat "${response_file}"
  fi

  if [[ ! "${http_code}" =~ ^2 ]]; then
    echo "ERROR: Request to ${path} failed with HTTP ${http_code}" >&2
    exit 1
  fi
}

cleanup() {
  echo "\n=== Cleaning up test networks ==="

  # Try to delete the test network if it still exists
  echo "Deleting test network (if exists): ${TEST_NETWORK_NAME}"
  curl -ksS -X DELETE "${API_BASE}/virtualization/networks/${TEST_NETWORK_NAME}" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" >/dev/null 2>&1 || true
}

trap cleanup EXIT

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
