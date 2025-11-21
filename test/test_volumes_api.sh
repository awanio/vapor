#!/usr/bin/env bash

# Simple end-to-end test script for the Storage Volumes API.
#
# This script exercises the libvirt storage volume endpoints exposed by Vapor:
#   - GET    /api/v1/virtualization/storages/pools/:pool_name/volumes
#   - POST   /api/v1/virtualization/storages/pools/:pool_name/volumes
#   - GET    /api/v1/virtualization/storages/pools/:pool_name/volumes/:vol_name
#   - POST   /api/v1/virtualization/storages/pools/:pool_name/volumes/:vol_name/resize
#   - POST   /api/v1/virtualization/storages/pools/:pool_name/volumes/:vol_name/clone
#   - DELETE /api/v1/virtualization/storages/pools/:pool_name/volumes/:vol_name
#   - DELETE /api/v1/virtualization/storages/pools/:name?delete_volumes=true (cleanup)
#
# Requirements:
#   - A running Vapor API (default: https://localhost:7770).
#   - libvirt installed and running on the target host.
#   - curl and jq installed.
#   - A valid JWT token with sufficient permissions, provided via AUTH_TOKEN
#     or via VAPOR_USERNAME / VAPOR_PASSWORD for login.
#
# Usage examples:
#   AUTH_TOKEN=... ./test/test_volumes_api.sh
#   VAPOR_USERNAME=admin VAPOR_PASSWORD=admin123 ./test/test_volumes_api.sh
#   API_BASE=https://localhost:7770/api/v1 AUTH_TOKEN=... ./test/test_volumes_api.sh

set -euo pipefail

API_BASE="${API_BASE:-https://localhost:7770/api/v1}"
AUTH_TOKEN="${AUTH_TOKEN:-}"
VAPOR_USERNAME="${VAPOR_USERNAME:-}"
VAPOR_PASSWORD="${VAPOR_PASSWORD:-}"

TEST_POOL_NAME="${TEST_POOL_NAME:-vapor-test-pool-vol-$$}"
TEST_POOL_PATH="${TEST_POOL_PATH:-/var/lib/libvirt/images/${TEST_POOL_NAME}}"

TEST_VOLUME_NAME="${TEST_VOLUME_NAME:-vapor-test-volume-$$}"
TEST_CLONE_NAME="${TEST_CLONE_NAME:-vapor-test-volume-clone-$$}"

# 16 MiB and 32 MiB in bytes
TEST_VOLUME_CAPACITY="${TEST_VOLUME_CAPACITY:-16777216}"
TEST_VOLUME_RESIZED_CAPACITY="${TEST_VOLUME_RESIZED_CAPACITY:-33554432}"

if ! command -v curl >/dev/null 2>&1; then
  echo "ERROR: curl is required" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required" >&2
  exit 1
fi

log() {
  echo -e "\n[volumes-test] $*" >&2
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
  VAPOR_USERNAME=admin VAPOR_PASSWORD=admin123 ./test/test_volumes_api.sh
EOF_USAGE
    exit 1
  fi

  log "Attempting login as '$VAPOR_USERNAME' to ${API_BASE}/auth/login"
  local login_resp
  login_resp=$(curl -sS -k -X POST \
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
    http_code=$(curl -sS -k -o /tmp/volumes_api_resp.json -w '%{http_code}' \
      -X "$method" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" \
      -H "Content-Type: application/json" \
      "$url" \
      -d "$data")
  else
    http_code=$(curl -sS -k -o /tmp/volumes_api_resp.json -w '%{http_code}' \
      -X "$method" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" \
      -H "Content-Type: application/json" \
      "$url")
  fi

  echo "HTTP ${http_code}" >&2
  cat /tmp/volumes_api_resp.json | jq . >&2 || cat /tmp/volumes_api_resp.json >&2

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
  log "Using TEST_VOLUME_NAME=${TEST_VOLUME_NAME}"
  log "Using TEST_CLONE_NAME=${TEST_CLONE_NAME}"

  # 1) Ensure pools are reachable
  log "Listing storage pools (pre-check)"
  api_call GET "/virtualization/storages/pools"

  # 2) Create a dir-based storage pool for volume tests
  log "Creating test storage pool for volumes"
  api_call POST "/virtualization/storages/pools" "$(jq -n \
    --arg name "$TEST_POOL_NAME" \
    --arg path "$TEST_POOL_PATH" \
    '{name: $name, type: "dir", path: $path, autostart: false}')"

  # 3) List volumes in the new pool (should succeed, likely empty)
  log "Listing volumes in test pool (expected empty or few)"
  api_call GET "/virtualization/storages/pools/${TEST_POOL_NAME}/volumes"

  # 4) Create a new volume in the pool
  log "Creating test volume in pool ${TEST_POOL_NAME}"
  api_call POST "/virtualization/storages/pools/${TEST_POOL_NAME}/volumes" "$(jq -n \
    --arg name "$TEST_VOLUME_NAME" \
    --argjson capacity "$TEST_VOLUME_CAPACITY" \
    '{name: $name, capacity: $capacity, format: "qcow2"}')"

  # 5) Get volume details
  log "Getting details for test volume ${TEST_VOLUME_NAME}"
  api_call GET "/virtualization/storages/pools/${TEST_POOL_NAME}/volumes/${TEST_VOLUME_NAME}"

  # 6) Resize the volume to a larger capacity
  log "Resizing test volume ${TEST_VOLUME_NAME}"
  api_call POST "/virtualization/storages/pools/${TEST_POOL_NAME}/volumes/${TEST_VOLUME_NAME}/resize" "$(jq -n \
    --argjson capacity "$TEST_VOLUME_RESIZED_CAPACITY" \
    '{capacity: $capacity}')"

  # 7) Clone the volume within the same pool
  log "Cloning test volume ${TEST_VOLUME_NAME} to ${TEST_CLONE_NAME} in same pool"
  api_call POST "/virtualization/storages/pools/${TEST_POOL_NAME}/volumes/${TEST_VOLUME_NAME}/clone" "$(jq -n \
    --arg new_name "$TEST_CLONE_NAME" \
    '{new_name: $new_name}')"

  # 8) Get details for the cloned volume
  log "Getting details for cloned volume ${TEST_CLONE_NAME}"
  api_call GET "/virtualization/storages/pools/${TEST_POOL_NAME}/volumes/${TEST_CLONE_NAME}"

  # 9) Delete the cloned volume
  log "Deleting cloned volume ${TEST_CLONE_NAME}"
  api_call DELETE "/virtualization/storages/pools/${TEST_POOL_NAME}/volumes/${TEST_CLONE_NAME}"

  # 10) Delete the original volume
  log "Deleting original test volume ${TEST_VOLUME_NAME}"
  api_call DELETE "/virtualization/storages/pools/${TEST_POOL_NAME}/volumes/${TEST_VOLUME_NAME}"

  # 11) Delete the test pool (delete_volumes=true as a safety net)
  log "Deleting test storage pool (delete_volumes=true)"
  api_call DELETE "/virtualization/storages/pools/${TEST_POOL_NAME}?delete_volumes=true"

  log "Storage volumes API test completed successfully."
}

main "$@"
