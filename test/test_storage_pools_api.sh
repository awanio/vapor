#!/usr/bin/env bash

# Simple end-to-end test script for the Storage Pools API.
#
# This script exercises the libvirt storage pools endpoints exposed by Vapor:
#   - GET    /api/v1/virtualization/storages/pools
#   - POST   /api/v1/virtualization/storages/pools
#   - GET    /api/v1/virtualization/storages/pools/:name
#   - PUT    /api/v1/virtualization/storages/pools/:name
#   - POST   /api/v1/virtualization/storages/pools/:name/refresh
#   - POST   /api/v1/virtualization/storages/pools/:name/stop
#   - POST   /api/v1/virtualization/storages/pools/:name/start
#   - GET    /api/v1/virtualization/storages/pools/:name/capacity
#   - DELETE /api/v1/virtualization/storages/pools/:name?delete_volumes=true
#
# Requirements:
#   - A running Vapor API (default: http://localhost:7770).
#   - libvirt installed and running on the target host.
#   - curl and jq installed.
#   - A valid JWT token with sufficient permissions, provided via AUTH_TOKEN
#     or via VAPOR_USERNAME / VAPOR_PASSWORD for login.
#
# Usage examples:
#   AUTH_TOKEN=... ./test/test_storage_pools_api.sh
#   VAPOR_USERNAME=admin VAPOR_PASSWORD=admin123 ./test/test_storage_pools_api.sh
#   API_BASE=http://localhost:8081/api/v1 AUTH_TOKEN=... ./test/test_storage_pools_api.sh

set -euo pipefail

API_BASE="${API_BASE:-https://localhost:7770/api/v1}"
AUTH_TOKEN="${AUTH_TOKEN:-}"
VAPOR_USERNAME="${VAPOR_USERNAME:-}"
VAPOR_PASSWORD="${VAPOR_PASSWORD:-}"

TEST_POOL_NAME="${TEST_POOL_NAME:-vapor-test-pool-$$}"
TEST_POOL_PATH="${TEST_POOL_PATH:-/var/lib/libvirt/images/${TEST_POOL_NAME}}"

if ! command -v curl >/dev/null 2>&1; then
  echo "ERROR: curl is required" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required" >&2
  exit 1
fi

log() {
  echo -e "\n[storage-pools-test] $*" >&2
}

# Perform login if AUTH_TOKEN is not provided but credentials are.
login_if_needed() {
  if [[ -n "$AUTH_TOKEN" ]]; then
    return
  fi

  if [[ -z "$VAPOR_USERNAME" || -z "$VAPOR_PASSWORD" ]]; then
    cat >&2 <<EOF_USAGE
ERROR: AUTH_TOKEN is not set and no VAPOR_USERNAME/VAPOR_PASSWORD provided.

Set one of:
  - AUTH_TOKEN   : existing JWT token
  - VAPOR_USERNAME and VAPOR_PASSWORD : credentials to POST to /auth/login

Example:
  VAPOR_USERNAME=admin VAPOR_PASSWORD=admin123 ./test/test_storage_pools_api.sh
EOF_USAGE
    exit 1
  fi

  log "Attempting login as '","$VAPOR_USERNAME","' to ${API_BASE}/auth/login"
  local login_resp
  login_resp=$(curl -sS -X POST \
    -H "Content-Type: application/json" \
    "${API_BASE}/auth/login" \
    -d "{\"username\":\"${VAPOR_USERNAME}\",\"password\":\"${VAPOR_PASSWORD}\"}")

  AUTH_TOKEN=$(echo "$login_resp" | jq -r '.token // empty') || true
  if [[ -z "$AUTH_TOKEN" || "$AUTH_TOKEN" == "null" ]]; then
    echo "ERROR: Failed to obtain AUTH_TOKEN from /auth/login response" >&2
    echo "Response was:" >&2
    echo "$login_resp" | jq . >&2 || echo "$login_resp" >&2
    exit 1
  fi

  log "Successfully obtained AUTH_TOKEN from /auth/login"
}

# Helper to call the API and assert 2xx status.
# Usage: api_call METHOD PATH [JSON_BODY]
api_call() {
  local method="$1"; shift
  local path="$1"; shift
  local data="${1-}"

  local url="${API_BASE}${path}"

  log "${method} ${url}"

  local http_code
  if [[ -n "$data" ]]; then
    http_code=$(curl -sS -k -o /tmp/storage_pools_api_resp.json -w '%{http_code}' \
      -X "$method" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" \
      -H "Content-Type: application/json" \
      "$url" \
      -d "$data")
  else
    http_code=$(curl -sS -k -o /tmp/storage_pools_api_resp.json -w '%{http_code}' \
      -X "$method" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" \
      -H "Content-Type: application/json" \
      "$url")
  fi

  echo "HTTP ${http_code}" >&2
  cat /tmp/storage_pools_api_resp.json | jq . >&2 || cat /tmp/storage_pools_api_resp.json >&2

  if [[ "$http_code" != 2?? ]]; then
    echo "ERROR: Request to ${path} failed with HTTP ${http_code}" >&2
    exit 1
  fi
}

main() {
  login_if_needed

  log "Using API_BASE=${API_BASE}"
  log "Using TEST_POOL_NAME=${TEST_POOL_NAME}"
  log "Using TEST_POOL_PATH=${TEST_POOL_PATH}"

  # 1) List pools before creating the test pool
  log "Listing storage pools (before creating test pool)"
  api_call GET "/virtualization/storages/pools"

  # 2) Create a dir-based storage pool
  log "Creating test storage pool"
  api_call POST "/virtualization/storages/pools" "$(jq -n \
    --arg name "$TEST_POOL_NAME" \
    --arg path "$TEST_POOL_PATH" \
    '{name: $name, type: "dir", path: $path, autostart: false}')"

  # 3) Get pool details
  log "Getting details for test pool"
  api_call GET "/virtualization/storages/pools/${TEST_POOL_NAME}"

  # 4) Test filtering & pagination (state/type/page/page_size)
  log "Listing storage pools with filters (state=all, type=dir, page=1, page_size=10)"
  api_call GET "/virtualization/storages/pools?state=all&type=dir&page=1&page_size=10"

  # 5) Update pool autostart to true
  log "Updating test pool autostart=true"
  api_call PUT "/virtualization/storages/pools/${TEST_POOL_NAME}" "$(jq -n '{autostart: true}')"

  # 6) Refresh the pool (should work when active)
  log "Refreshing test pool"
  api_call POST "/virtualization/storages/pools/${TEST_POOL_NAME}/refresh"

  # 7) Stop the pool
  log "Stopping test pool"
  api_call POST "/virtualization/storages/pools/${TEST_POOL_NAME}/stop"

  # 8) Start the pool again
  log "Starting test pool again"
  api_call POST "/virtualization/storages/pools/${TEST_POOL_NAME}/start"

  # 9) Get capacity
  log "Getting capacity for test pool"
  api_call GET "/virtualization/storages/pools/${TEST_POOL_NAME}/capacity"

  # 10) Delete the pool (with delete_volumes=true)
  log "Deleting test pool (delete_volumes=true)"
  api_call DELETE "/virtualization/storages/pools/${TEST_POOL_NAME}?delete_volumes=true"

  # 11) List pools after deleting the test pool
  log "Listing storage pools (after deleting test pool)"
  api_call GET "/virtualization/storages/pools"

  log "Storage pools API test completed successfully."
}

main "$@"
