#!/usr/bin/env bash
set -euo pipefail

# Functional smoke test for VM Snapshot endpoints.
#
# Endpoints exercised:
#   - GET    /api/v1/virtualization/computes/:id/snapshots/capabilities
#   - GET    /api/v1/virtualization/computes/:id/snapshots
#   - POST   /api/v1/virtualization/computes/:id/snapshots
#   - GET    /api/v1/virtualization/computes/:id/snapshots/:snapshot
#   - POST   /api/v1/virtualization/computes/:id/snapshots/:snapshot/revert   (optional)
#   - DELETE /api/v1/virtualization/computes/:id/snapshots/:snapshot
#
# Requirements:
#   - A running Vapor API (default: https://localhost:7770).
#   - libvirt installed and running on the target host.
#   - curl and jq installed.
#   - A valid JWT token with sufficient permissions, provided via AUTH_TOKEN
#     or via VAPOR_USERNAME / VAPOR_PASSWORD for login.
#   - At least one existing VM.
#
# Usage examples:
#   AUTH_TOKEN=... ./test/test_vm_snapshots_api.sh
#   VAPOR_USERNAME=admin VAPOR_PASSWORD=admin123 ./test/test_vm_snapshots_api.sh
#   API_BASE=http://localhost:7770/api/v1 AUTH_TOKEN=... ./test/test_vm_snapshots_api.sh
#
# Optional env vars:
#   VM_ID            : VM name or UUID. If empty, script will pick the first VM returned by GET /virtualization/computes.
#   SNAPSHOT_NAME    : Snapshot name to create (default: vapor-test-snapshot-<epoch>-<pid>)
#   SNAPSHOT_DESC    : Description for snapshot (default: "Vapor snapshot API smoke test")
#   INCLUDE_MEMORY   : 1 to request include_memory=true (default: 0)
#   QUIESCE          : 1 to request quiesce=true (default: 0)
#   FORCE_EXTERNAL   : 1 to request force_external=true (default: 0)
#   DO_REVERT        : 1 to actually revert to the snapshot (default: 0). WARNING: reverting is disruptive.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/vapor_api.sh
source "${SCRIPT_DIR}/lib/vapor_api.sh"

API_BASE="${API_BASE:-https://localhost:7770/api/v1}"
AUTH_TOKEN="${AUTH_TOKEN:-}"
VAPOR_USERNAME="${VAPOR_USERNAME:-}"
VAPOR_PASSWORD="${VAPOR_PASSWORD:-}"

VM_ID="${VM_ID:-}"
SNAPSHOT_NAME="${SNAPSHOT_NAME:-vapor-test-snapshot-$(date +%s)-$$}"
SNAPSHOT_DESC="${SNAPSHOT_DESC:-Vapor snapshot API smoke test}"

INCLUDE_MEMORY="${INCLUDE_MEMORY:-0}"
QUIESCE="${QUIESCE:-0}"
FORCE_EXTERNAL="${FORCE_EXTERNAL:-0}"
DO_REVERT="${DO_REVERT:-0}"

# Keep legacy response file name for compatibility with earlier versions of this script.
RESP_FILE="${RESP_FILE:-/tmp/vm_snapshots_api_resp.json}"

log() {
  echo -e "\n[vm-snapshots-test] $*" >&2
}

require_deps
login_if_needed

cleanup() {
  log "Cleaning up test snapshot (best-effort): ${SNAPSHOT_NAME}"
  if [[ -z "${VM_ID}" ]]; then
    return
  fi

  # Snapshot names should be URL-safe for this script (avoid spaces/slashes).
  curl -ksS -X DELETE "${API_BASE}/virtualization/computes/${VM_ID}/snapshots/${SNAPSHOT_NAME}" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" >/dev/null 2>&1 || true
}

trap cleanup EXIT

pick_vm_if_needed() {
  if [[ -n "${VM_ID}" ]]; then
    return
  fi

  log "VM_ID not set; selecting first VM from GET /virtualization/computes"
  api_call GET "/virtualization/computes"

  VM_ID=$(jq -r '.data.vms[0].name // .data.vms[0].uuid // empty' "${RESP_FILE}" 2>/dev/null || true)
  if [[ -z "${VM_ID}" || "${VM_ID}" == "null" ]]; then
    echo "ERROR: No VM found. Provide VM_ID=<vm-name-or-uuid> and retry." >&2
    echo "Response was:" >&2
    cat "${RESP_FILE}" | jq . >&2 || cat "${RESP_FILE}" >&2
    exit 1
  fi

  log "Selected VM_ID=${VM_ID}"
}

main() {
  pick_vm_if_needed

  log "Using API_BASE=${API_BASE}"
  log "Using VM_ID=${VM_ID}"
  log "Using SNAPSHOT_NAME=${SNAPSHOT_NAME}"

  # 1) Capabilities
  api_call GET "/virtualization/computes/${VM_ID}/snapshots/capabilities"

  local supports_memory
  supports_memory=$(jq -r '.data.capabilities.supports_memory // false' "${RESP_FILE}" 2>/dev/null || echo false)

  # If caller requested include_memory but capabilities say no, downgrade to disk-only.
  if [[ "${INCLUDE_MEMORY}" == "1" && "${supports_memory}" != "true" ]]; then
    log "INCLUDE_MEMORY=1 requested but supports_memory=false; proceeding with include_memory=false"
    INCLUDE_MEMORY=0
  fi

  # 2) List snapshots
  api_call GET "/virtualization/computes/${VM_ID}/snapshots"

  # 3) Create snapshot
  log "Creating snapshot"
  CREATE_BODY=$(jq -n \
    --arg name "${SNAPSHOT_NAME}" \
    --arg desc "${SNAPSHOT_DESC}" \
    --argjson include_memory $( [[ "${INCLUDE_MEMORY}" == "1" ]] && echo true || echo false ) \
    --argjson quiesce $( [[ "${QUIESCE}" == "1" ]] && echo true || echo false ) \
    --argjson force_external $( [[ "${FORCE_EXTERNAL}" == "1" ]] && echo true || echo false ) \
    '{name: $name, description: $desc, include_memory: $include_memory, quiesce: $quiesce, force_external: $force_external}')

  api_call POST "/virtualization/computes/${VM_ID}/snapshots" "${CREATE_BODY}"

  # 4) Verify snapshot appears in list
  log "Verifying snapshot appears in list"
  api_call GET "/virtualization/computes/${VM_ID}/snapshots"
  if ! jq -e --arg n "${SNAPSHOT_NAME}" '.data.snapshots[]? | select(.name == $n) | .name' "${RESP_FILE}" >/dev/null; then
    echo "ERROR: Created snapshot not found in listSnapshots response" >&2
    exit 1
  fi

  # 5) Get snapshot detail
  log "Getting snapshot detail"
  api_call GET "/virtualization/computes/${VM_ID}/snapshots/${SNAPSHOT_NAME}"
  detail_name=$(jq -r '.data.snapshot.name // empty' "${RESP_FILE}" 2>/dev/null || true)
  if [[ "${detail_name}" != "${SNAPSHOT_NAME}" ]]; then
    echo "ERROR: getSnapshotDetail returned unexpected name: '${detail_name}'" >&2
    exit 1
  fi

  # 6) Optional revert (DISRUPTIVE)
  if [[ "${DO_REVERT}" == "1" ]]; then
    log "DO_REVERT=1 set: reverting to snapshot (WARNING: this is disruptive)"
    api_call POST "/virtualization/computes/${VM_ID}/snapshots/${SNAPSHOT_NAME}/revert" "{}"

    reverted_name=$(jq -r '.data.snapshot_name // empty' "${RESP_FILE}" 2>/dev/null || true)
    if [[ "${reverted_name}" != "${SNAPSHOT_NAME}" ]]; then
      echo "ERROR: revertSnapshot returned unexpected snapshot_name: '${reverted_name}'" >&2
      exit 1
    fi
  else
    log "Skipping revert (set DO_REVERT=1 to exercise revert endpoint)"
  fi

  # 7) Delete snapshot
  log "Deleting snapshot"
  api_call DELETE "/virtualization/computes/${VM_ID}/snapshots/${SNAPSHOT_NAME}"

  # 8) Verify deletion
  log "Verifying snapshot removed from list"
  api_call GET "/virtualization/computes/${VM_ID}/snapshots"
  if jq -e --arg n "${SNAPSHOT_NAME}" '.data.snapshots[]? | select(.name == $n) | .name' "${RESP_FILE}" >/dev/null; then
    echo "ERROR: Snapshot still present after delete" >&2
    exit 1
  fi

  log "VM snapshots API smoke test completed successfully."
}

main "$@"
