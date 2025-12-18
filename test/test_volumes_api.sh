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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/vapor_api.sh
source "${SCRIPT_DIR}/lib/vapor_api.sh"

API_BASE="${API_BASE:-https://localhost:7770/api/v1}"
AUTH_TOKEN="${AUTH_TOKEN:-}"
VAPOR_USERNAME="${VAPOR_USERNAME:-}"
VAPOR_PASSWORD="${VAPOR_PASSWORD:-}"
RESP_FILE="${RESP_FILE:-/tmp/volumes_api_resp.json}"

TEST_POOL_NAME="${TEST_POOL_NAME:-vapor-test-pool-vol-$$}"
TEST_POOL_PATH="${TEST_POOL_PATH:-/var/lib/libvirt/images/${TEST_POOL_NAME}}"

TEST_VOLUME_NAME="${TEST_VOLUME_NAME:-vapor-test-volume-$$}"
TEST_CLONE_NAME="${TEST_CLONE_NAME:-vapor-test-volume-clone-$$}"

# 16 MiB and 32 MiB in bytes
TEST_VOLUME_CAPACITY="${TEST_VOLUME_CAPACITY:-16777216}"
TEST_VOLUME_RESIZED_CAPACITY="${TEST_VOLUME_RESIZED_CAPACITY:-33554432}"

log() {
  echo -e "\n[volumes-test] $*" >&2
}

require_deps
login_if_needed

cleanup() {
  log "Cleaning up test resources (best-effort)"

  # Delete clone and volume if present
  curl -ksS -X DELETE "${API_BASE}/virtualization/storages/pools/${TEST_POOL_NAME}/volumes/${TEST_CLONE_NAME}" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" >/dev/null 2>&1 || true

  curl -ksS -X DELETE "${API_BASE}/virtualization/storages/pools/${TEST_POOL_NAME}/volumes/${TEST_VOLUME_NAME}" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" >/dev/null 2>&1 || true

  # Delete pool (and volumes)
  curl -ksS -X DELETE "${API_BASE}/virtualization/storages/pools/${TEST_POOL_NAME}?delete_volumes=true" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" >/dev/null 2>&1 || true
}

trap cleanup EXIT

log "Using API_BASE=${API_BASE}"
log "Using TEST_POOL_NAME=${TEST_POOL_NAME}"
log "Using TEST_POOL_PATH=${TEST_POOL_PATH}"

# 1) Create pool
log "Creating test storage pool"
api_call POST "/virtualization/storages/pools" "$(jq -n \
  --arg name "$TEST_POOL_NAME" \
  --arg path "$TEST_POOL_PATH" \
  '{name: $name, type: "dir", path: $path, autostart: false}')"

# 2) List volumes (empty)
log "Listing volumes (initial)"
api_call GET "/virtualization/storages/pools/${TEST_POOL_NAME}/volumes"

# 3) Create volume
log "Creating volume ${TEST_VOLUME_NAME}"
api_call POST "/virtualization/storages/pools/${TEST_POOL_NAME}/volumes" "$(jq -n \
  --arg name "$TEST_VOLUME_NAME" \
  --argjson capacity "$TEST_VOLUME_CAPACITY" \
  '{name: $name, capacity: $capacity, format: "qcow2"}')"

# 4) Get volume details
log "Getting volume details"
api_call GET "/virtualization/storages/pools/${TEST_POOL_NAME}/volumes/${TEST_VOLUME_NAME}"

# 5) Resize volume
log "Resizing volume"
api_call POST "/virtualization/storages/pools/${TEST_POOL_NAME}/volumes/${TEST_VOLUME_NAME}/resize" "$(jq -n \
  --argjson capacity "$TEST_VOLUME_RESIZED_CAPACITY" \
  '{capacity: $capacity}')"

# 6) Clone volume
log "Cloning volume"
api_call POST "/virtualization/storages/pools/${TEST_POOL_NAME}/volumes/${TEST_VOLUME_NAME}/clone" "$(jq -n \
  --arg name "$TEST_CLONE_NAME" \
  '{name: $name}')"

# 7) List volumes (should include both)
log "Listing volumes (after create/clone)"
api_call GET "/virtualization/storages/pools/${TEST_POOL_NAME}/volumes"

# 8) Delete clone
log "Deleting clone ${TEST_CLONE_NAME}"
api_call DELETE "/virtualization/storages/pools/${TEST_POOL_NAME}/volumes/${TEST_CLONE_NAME}"

# 9) Delete original
log "Deleting volume ${TEST_VOLUME_NAME}"
api_call DELETE "/virtualization/storages/pools/${TEST_POOL_NAME}/volumes/${TEST_VOLUME_NAME}"

# 10) Delete pool
log "Deleting pool ${TEST_POOL_NAME}"
api_call DELETE "/virtualization/storages/pools/${TEST_POOL_NAME}?delete_volumes=true"

log "Volumes API test completed successfully."
