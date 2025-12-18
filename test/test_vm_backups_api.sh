#!/usr/bin/env bash
set -euo pipefail

# Functional smoke test for VM Backup endpoints.
#
# Endpoints exercised:
#   - GET    /api/v1/virtualization/computes/:id/backups
#   - POST   /api/v1/virtualization/computes/:id/backups
#   - POST   /api/v1/virtualization/computes/restore (optional)
#   - DELETE /api/v1/virtualization/computes/backups/:backup_id
#
# Requirements:
#   - A running Vapor API (default: https://localhost:7770).
#   - libvirt installed and running on the target host.
#   - curl and jq installed.
#   - A valid JWT token with sufficient permissions, provided via AUTH_TOKEN
#     or via VAPOR_USERNAME / VAPOR_PASSWORD for login.
#   - SQLite DB configured for backups (otherwise list/restore/delete may fail).
#
# Usage examples:
#   AUTH_TOKEN=... ./test/test_vm_backups_api.sh
#   VAPOR_USERNAME=admin VAPOR_PASSWORD=admin123 ./test/test_vm_backups_api.sh
#   VM_ID=my-vm AUTH_TOKEN=... ./test/test_vm_backups_api.sh
#
# Optional env vars:
#   API_BASE            : default https://localhost:7770/api/v1
#   VM_ID               : VM name or UUID. If empty, selects first VM from GET /virtualization/computes
#   BACKUP_TYPE         : full|incremental|differential (default: full)
#   DESTINATION_PATH    : optional; if empty backend will use default
#   COMPRESSION         : none|gzip|bzip2|xz|zstd (default: none)
#   ENCRYPTION          : none|AES-256|AES-128|aes256|aes128 (default: none)
#   INCLUDE_MEMORY      : 1/0 (default: 0)
#   RETENTION_DAYS      : integer (default: 0)
#   DESCRIPTION         : optional (default: "Vapor backup API smoke test")
#   WAIT_FOR_COMPLETION : 1/0 (default: 0) - poll until status is completed/failed
#   TIMEOUT_SECONDS     : poll timeout (default: 60)
#   DO_RESTORE          : 1/0 (default: 0) - run restore endpoint (disruptive: creates VM)
#   RESTORED_VM_NAME    : optional override for restore new_vm_name
#   CLEANUP_RESTORED_VM : 1/0 (default: 0) - delete restored VM at end (destructive)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/vapor_api.sh
source "${SCRIPT_DIR}/lib/vapor_api.sh"

API_BASE="${API_BASE:-https://localhost:7770/api/v1}"
AUTH_TOKEN="${AUTH_TOKEN:-}"
VAPOR_USERNAME="${VAPOR_USERNAME:-}"
VAPOR_PASSWORD="${VAPOR_PASSWORD:-}"

VM_ID="${VM_ID:-}"
BACKUP_TYPE="${BACKUP_TYPE:-full}"
DESTINATION_PATH="${DESTINATION_PATH:-}"
COMPRESSION="${COMPRESSION:-none}"
ENCRYPTION="${ENCRYPTION:-none}"
INCLUDE_MEMORY="${INCLUDE_MEMORY:-0}"
RETENTION_DAYS="${RETENTION_DAYS:-0}"
DESCRIPTION="${DESCRIPTION:-Vapor backup API smoke test}"
WAIT_FOR_COMPLETION="${WAIT_FOR_COMPLETION:-0}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-60}"
DO_RESTORE="${DO_RESTORE:-0}"
RESTORED_VM_NAME="${RESTORED_VM_NAME:-}"
CLEANUP_RESTORED_VM="${CLEANUP_RESTORED_VM:-0}"

# Keep legacy response file name for compatibility with earlier versions of this script.
RESP_FILE="${RESP_FILE:-/tmp/vm_backups_api_resp.json}"
BACKUP_ID=""

log() {
  echo -e "\n[vm-backups-test] $*" >&2
}

require_deps
login_if_needed

cleanup() {
  if [[ -n "${BACKUP_ID}" ]]; then
    log "Cleanup: deleting test backup (best-effort): ${BACKUP_ID}"
    curl -ksS -X DELETE "${API_BASE}/virtualization/computes/backups/${BACKUP_ID}" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" >/dev/null 2>&1 || true
  fi

  if [[ "${CLEANUP_RESTORED_VM}" == "1" && -n "${RESTORED_VM_NAME}" ]]; then
    log "Cleanup: deleting restored VM (best-effort): ${RESTORED_VM_NAME}"
    curl -ksS -X DELETE "${API_BASE}/virtualization/computes/${RESTORED_VM_NAME}" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" >/dev/null 2>&1 || true
  fi
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

wait_for_backup_presence() {
  local deadline=$(( $(date +%s) + TIMEOUT_SECONDS ))
  while (( $(date +%s) < deadline )); do
    api_call GET "/virtualization/computes/${VM_ID}/backups"
    if jq -e --arg id "${BACKUP_ID}" '.data.backups[]? | select((.backup_id // .id) == $id) | .backup_id // .id' "${RESP_FILE}" >/dev/null; then
      return
    fi
    sleep 1
  done
  echo "ERROR: Backup ${BACKUP_ID} did not appear in list within ${TIMEOUT_SECONDS}s" >&2
  exit 1
}

wait_for_backup_completion() {
  local deadline=$(( $(date +%s) + TIMEOUT_SECONDS ))
  while (( $(date +%s) < deadline )); do
    api_call GET "/virtualization/computes/${VM_ID}/backups"
    status=$(jq -r --arg id "${BACKUP_ID}" '.data.backups[]? | select((.backup_id // .id) == $id) | .status // empty' "${RESP_FILE}" 2>/dev/null || true)
    if [[ -z "${status}" ]]; then
      sleep 1
      continue
    fi
    log "Backup status: ${status}"
    if [[ "${status}" == "completed" ]]; then
      return
    fi
    if [[ "${status}" == "failed" ]]; then
      echo "ERROR: Backup ${BACKUP_ID} failed" >&2
      exit 1
    fi
    sleep 2
  done
  echo "ERROR: Backup ${BACKUP_ID} did not complete within ${TIMEOUT_SECONDS}s" >&2
  exit 1
}

main() {
  pick_vm_if_needed

  log "Using API_BASE=${API_BASE}"
  log "Using VM_ID=${VM_ID}"

  # 1) List backups
  api_call GET "/virtualization/computes/${VM_ID}/backups"

  # 2) Create backup
  log "Creating backup"
  INCLUDE_MEMORY_JSON=$( [[ "${INCLUDE_MEMORY}" == "1" ]] && echo true || echo false )

  CREATE_BODY=$(jq -n \
    --arg backup_type "${BACKUP_TYPE}" \
    --arg destination_path "${DESTINATION_PATH}" \
    --arg compression "${COMPRESSION}" \
    --arg encryption "${ENCRYPTION}" \
    --arg description "${DESCRIPTION}" \
    --argjson include_memory "${INCLUDE_MEMORY_JSON}" \
    --argjson retention_days "${RETENTION_DAYS}" \
    '{backup_type: $backup_type, compression: $compression, encryption: $encryption, include_memory: $include_memory, retention_days: $retention_days, description: $description} 
     | if $destination_path != "" then .destination_path = $destination_path else . end')

  api_call POST "/virtualization/computes/${VM_ID}/backups" "${CREATE_BODY}"

  BACKUP_ID=$(jq -r '.data.backup.backup_id // .data.backup.id // empty' "${RESP_FILE}" 2>/dev/null || true)
  if [[ -z "${BACKUP_ID}" || "${BACKUP_ID}" == "null" ]]; then
    echo "ERROR: Could not extract backup_id from create response" >&2
    exit 1
  fi
  log "Created backup id: ${BACKUP_ID}"

  # 3) Verify it appears in list
  wait_for_backup_presence

  # 4) Optionally wait for completion
  if [[ "${WAIT_FOR_COMPLETION}" == "1" ]]; then
    wait_for_backup_completion
  else
    log "Skipping wait for completion (set WAIT_FOR_COMPLETION=1 to poll status)"
  fi

  # 5) Optional restore (disruptive)
  if [[ "${DO_RESTORE}" == "1" ]]; then
    if [[ -z "${RESTORED_VM_NAME}" ]]; then
      RESTORED_VM_NAME="${VM_ID}-restored-${BACKUP_ID:0:6}"
    fi

    log "Restoring backup ${BACKUP_ID} to new VM: ${RESTORED_VM_NAME} (DO_RESTORE=1)"
    RESTORE_BODY=$(jq -n --arg backup_id "${BACKUP_ID}" --arg new_vm_name "${RESTORED_VM_NAME}" '{backup_id: $backup_id, new_vm_name: $new_vm_name, overwrite: false}')
    api_call POST "/virtualization/computes/restore" "${RESTORE_BODY}"
  else
    log "Skipping restore (set DO_RESTORE=1 to exercise restore endpoint)"
  fi

  # 6) Delete the backup
  log "Deleting backup ${BACKUP_ID}"
  api_call DELETE "/virtualization/computes/backups/${BACKUP_ID}"

  # 7) Verify status is deleted or not present
  api_call GET "/virtualization/computes/${VM_ID}/backups"
  status=$(jq -r --arg id "${BACKUP_ID}" '.data.backups[]? | select((.backup_id // .id) == $id) | .status // empty' "${RESP_FILE}" 2>/dev/null || true)
  if [[ -n "${status}" && "${status}" != "deleted" ]]; then
    echo "ERROR: Backup still present but status is not 'deleted' (status=${status})" >&2
    exit 1
  fi

  log "VM backups API smoke test completed successfully."
}

main "$@"
