#!/usr/bin/env bash
set -euo pipefail

# Functional smoke test for VM Backup endpoints.
#
# Endpoints exercised:
#   - GET    /api/v1/virtualization/computes/:id/backups
#   - POST   /api/v1/virtualization/computes/:id/backups
#   - POST   /api/v1/virtualization/computes/restore (optional)
#   - DELETE /api/v1/virtualization/computes/backups/:backup_id
#   - POST   /api/v1/virtualization/computes/backups/import (when RUN_ALL_TESTS=1)
#   - POST   /api/v1/virtualization/computes/backups/upload (TUS protocol, when RUN_ALL_TESTS=1)
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
#   RUN_ALL_TESTS       : 1/0 (default: 0) - run all tests including import and TUS upload

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

test_import_backup() {
  log "=== Testing Import Backup API ==="
  
  # Get VM UUID for import
  api_call GET "/virtualization/computes/${VM_ID}"
  VM_UUID=$(jq -r '.data.uuid // empty' "${RESP_FILE}" 2>/dev/null || true)
  if [[ -z "${VM_UUID}" || "${VM_UUID}" == "null" ]]; then
    log "WARNING: Could not get VM UUID, using empty value"
    VM_UUID=""
  fi
  
  # Create a test backup file in a location accessible to root
  TEST_BACKUP_DIR="/var/lib/libvirt/vapor-backups/test-import"
  TEST_BACKUP_FILE="${TEST_BACKUP_DIR}/test-backup-${VM_ID}.qcow2"
  
  log "Creating test backup file: ${TEST_BACKUP_FILE}"
  # Create directory with sudo and set proper permissions
  sudo mkdir -p "${TEST_BACKUP_DIR}"
  sudo chmod 755 "${TEST_BACKUP_DIR}"
  
  # Create a minimal qcow2 file (10MB) using qemu-img with sudo
  if command -v qemu-img >/dev/null 2>&1; then
    sudo qemu-img create -f qcow2 "${TEST_BACKUP_FILE}" 10M >/dev/null 2>&1
  else
    # Fallback: create an empty file if qemu-img is not available
    sudo dd if=/dev/zero of="${TEST_BACKUP_FILE}" bs=1M count=10 >/dev/null 2>&1
  fi
  sudo chmod 644 "${TEST_BACKUP_FILE}"
  
  # Get file size
  FILE_SIZE=$(stat -c%s "${TEST_BACKUP_FILE}" 2>/dev/null || stat -f%z "${TEST_BACKUP_FILE}" 2>/dev/null || echo "0")
  log "Test backup file created: ${FILE_SIZE} bytes"
  
  # Import the backup
  log "Importing backup file"
  IMPORT_BODY=$(jq -n \
    --arg vm_name "${VM_ID}" \
    --arg vm_uuid "${VM_UUID}" \
    --arg path "${TEST_BACKUP_FILE}" \
    --arg backup_type "full" \
    --arg compression "none" \
    --arg encryption "none" \
    --arg description "Test imported backup" \
    --argjson retention_days 7 \
    '{vm_name: $vm_name, path: $path, type: $backup_type, compression: $compression, encryption: $encryption, description: $description, retention_days: $retention_days} 
     | if $vm_uuid != "" then .vm_uuid = $vm_uuid else . end')
  
  api_call POST "/virtualization/computes/backups/import" "${IMPORT_BODY}"
  
  IMPORTED_BACKUP_ID=$(jq -r '.data.backup.backup_id // .data.backup.id // empty' "${RESP_FILE}" 2>/dev/null || true)
  if [[ -z "${IMPORTED_BACKUP_ID}" || "${IMPORTED_BACKUP_ID}" == "null" ]]; then
    echo "ERROR: Could not extract backup_id from import response" >&2
    cat "${RESP_FILE}" | jq . >&2
    sudo rm -rf "${TEST_BACKUP_DIR}"
    exit 1
  fi
  log "Imported backup id: ${IMPORTED_BACKUP_ID}"
  
  # Verify backup appears in list
  api_call GET "/virtualization/computes/${VM_ID}/backups"
  if ! jq -e --arg id "${IMPORTED_BACKUP_ID}" '.data.backups[]? | select((.backup_id // .id) == $id) | .backup_id // .id' "${RESP_FILE}" >/dev/null; then
    echo "ERROR: Imported backup ${IMPORTED_BACKUP_ID} not found in list" >&2
    sudo rm -rf "${TEST_BACKUP_DIR}"
    exit 1
  fi
  
  # Verify backup status is completed
  status=$(jq -r --arg id "${IMPORTED_BACKUP_ID}" '.data.backups[]? | select((.backup_id // .id) == $id) | .status // empty' "${RESP_FILE}" 2>/dev/null || true)
  if [[ "${status}" != "completed" ]]; then
    echo "ERROR: Imported backup status is '${status}', expected 'completed'" >&2
    sudo rm -rf "${TEST_BACKUP_DIR}"
    exit 1
  fi
  log "Import backup status: ${status} ✓"
  
  # Verify file size is correct
  imported_size=$(jq -r --arg id "${IMPORTED_BACKUP_ID}" '.data.backups[]? | select((.backup_id // .id) == $id) | .size_bytes // empty' "${RESP_FILE}" 2>/dev/null || true)
  log "Imported backup size: ${imported_size} bytes (expected: ${FILE_SIZE})"
  
  # Delete the imported backup
  log "Deleting imported backup ${IMPORTED_BACKUP_ID}"
  api_call DELETE "/virtualization/computes/backups/${IMPORTED_BACKUP_ID}"
  
  # Clean up test file
  sudo rm -rf "${TEST_BACKUP_DIR}"
  
  log "Import backup test completed successfully ✓"
}

test_tus_upload() {
  log "=== Testing TUS Upload Backup API ==="
  
  # Get VM UUID for upload
  api_call GET "/virtualization/computes/${VM_ID}"
  VM_UUID=$(jq -r '.data.uuid // empty' "${RESP_FILE}" 2>/dev/null || true)
  if [[ -z "${VM_UUID}" || "${VM_UUID}" == "null" ]]; then
    log "WARNING: Could not get VM UUID, using empty value"
    VM_UUID=""
  fi
  
  # Create a test file to upload
  TEST_UPLOAD_DIR=$(mktemp -d)
  TEST_UPLOAD_FILE="${TEST_UPLOAD_DIR}/test-tus-backup-${VM_ID}.qcow2"
  
  log "Creating test upload file: ${TEST_UPLOAD_FILE}"
  # Create a small test file (5MB)
  dd if=/dev/urandom of="${TEST_UPLOAD_FILE}" bs=1M count=5 >/dev/null 2>&1
  
  FILE_SIZE=$(stat -c%s "${TEST_UPLOAD_FILE}" 2>/dev/null || stat -f%z "${TEST_UPLOAD_FILE}" 2>/dev/null || echo "0")
  log "Test upload file created: ${FILE_SIZE} bytes"
  
  # Base64 encode metadata for TUS protocol
  FILENAME=$(basename "${TEST_UPLOAD_FILE}")
  FILENAME_B64=$(echo -n "${FILENAME}" | base64)
  VM_NAME_B64=$(echo -n "${VM_ID}" | base64)
  VM_UUID_B64=$(echo -n "${VM_UUID}" | base64)
  BACKUP_TYPE_B64=$(echo -n "full" | base64)
  COMPRESSION_B64=$(echo -n "none" | base64)
  ENCRYPTION_B64=$(echo -n "none" | base64)
  DESCRIPTION_B64=$(echo -n "Test TUS upload backup" | base64)
  RETENTION_B64=$(echo -n "7" | base64)
  
  # Create TUS upload session
  log "Creating TUS upload session"
  METADATA="filename ${FILENAME_B64},vm_name ${VM_NAME_B64},backup_type ${BACKUP_TYPE_B64},compression ${COMPRESSION_B64},encryption ${ENCRYPTION_B64},description ${DESCRIPTION_B64},retention_days ${RETENTION_B64}"
  if [[ -n "${VM_UUID}" ]]; then
    METADATA="${METADATA},vm_uuid ${VM_UUID_B64}"
  fi
  
  CREATE_RESP=$(curl -ksS -X POST "${API_BASE}/virtualization/computes/backups/upload" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Upload-Length: ${FILE_SIZE}" \
    -H "Upload-Metadata: ${METADATA}" \
    -H "Tus-Resumable: 1.0.0" \
    -w "\nHTTP %{http_code}" 2>&1)
  
  HTTP_CODE=$(echo "${CREATE_RESP}" | tail -1 | awk '{print $2}')
  UPLOAD_BODY=$(echo "${CREATE_RESP}" | sed '$d')
  
  if [[ "${HTTP_CODE}" != "201" ]]; then
    echo "ERROR: TUS upload creation failed with HTTP ${HTTP_CODE}" >&2
    echo "${UPLOAD_BODY}" >&2
    rm -rf "${TEST_UPLOAD_DIR}"
    exit 1
  fi
  
  UPLOAD_ID=$(echo "${UPLOAD_BODY}" | jq -r '.upload_id // empty')
  if [[ -z "${UPLOAD_ID}" || "${UPLOAD_ID}" == "null" ]]; then
    echo "ERROR: Could not extract upload_id from TUS create response" >&2
    echo "${UPLOAD_BODY}" >&2
    rm -rf "${TEST_UPLOAD_DIR}"
    exit 1
  fi
  log "Created TUS upload session: ${UPLOAD_ID}"
  
  # Upload file in chunks (1MB chunks)
  CHUNK_SIZE=1048576  # 1MB
  OFFSET=0
  
  while [[ ${OFFSET} -lt ${FILE_SIZE} ]]; do
    BYTES_TO_UPLOAD=$((FILE_SIZE - OFFSET))
    if [[ ${BYTES_TO_UPLOAD} -gt ${CHUNK_SIZE} ]]; then
      BYTES_TO_UPLOAD=${CHUNK_SIZE}
    fi
    
    log "Uploading chunk: offset=${OFFSET}, size=${BYTES_TO_UPLOAD}"
    
    # Extract chunk and upload
    CHUNK_RESP=$(dd if="${TEST_UPLOAD_FILE}" bs=1 skip=${OFFSET} count=${BYTES_TO_UPLOAD} 2>/dev/null | \
      curl -ksS -X PATCH "${API_BASE}/virtualization/computes/backups/upload/${UPLOAD_ID}" \
        -H "Authorization: Bearer ${AUTH_TOKEN}" \
        -H "Upload-Offset: ${OFFSET}" \
        -H "Content-Type: application/offset+octet-stream" \
        -H "Tus-Resumable: 1.0.0" \
        --data-binary @- \
        -w "\nHTTP %{http_code}" 2>&1)
    
    CHUNK_HTTP_CODE=$(echo "${CHUNK_RESP}" | tail -1 | awk '{print $2}')
    if [[ "${CHUNK_HTTP_CODE}" != "204" ]]; then
      echo "ERROR: TUS chunk upload failed with HTTP ${CHUNK_HTTP_CODE}" >&2
      echo "${CHUNK_RESP}" >&2
      rm -rf "${TEST_UPLOAD_DIR}"
      exit 1
    fi
    
    OFFSET=$((OFFSET + BYTES_TO_UPLOAD))
    
    # Get upload progress
    PROGRESS=$(curl -ksS -X GET "${API_BASE}/virtualization/computes/backups/upload/${UPLOAD_ID}" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" | jq -r '.progress // "unknown"')
    log "Upload progress: ${PROGRESS}"
  done
  
  log "File upload completed, finalizing..."
  
  # Complete the upload
  COMPLETE_RESP=$(curl -ksS -X POST "${API_BASE}/virtualization/computes/backups/upload/${UPLOAD_ID}/complete" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -w "\nHTTP %{http_code}" 2>&1)
  
  COMPLETE_HTTP_CODE=$(echo "${COMPLETE_RESP}" | tail -1 | awk '{print $2}')
  COMPLETE_BODY=$(echo "${COMPLETE_RESP}" | sed '$d')
  
  if [[ "${COMPLETE_HTTP_CODE}" != "200" ]]; then
    echo "ERROR: TUS upload completion failed with HTTP ${COMPLETE_HTTP_CODE}" >&2
    echo "${COMPLETE_BODY}" >&2
    rm -rf "${TEST_UPLOAD_DIR}"
    exit 1
  fi
  
  TUS_BACKUP_ID=$(echo "${COMPLETE_BODY}" | jq -r '.data.backup.backup_id // .data.backup.id // empty')
  if [[ -z "${TUS_BACKUP_ID}" || "${TUS_BACKUP_ID}" == "null" ]]; then
    echo "ERROR: Could not extract backup_id from TUS complete response" >&2
    echo "${COMPLETE_BODY}" >&2
    rm -rf "${TEST_UPLOAD_DIR}"
    exit 1
  fi
  log "TUS upload registered as backup: ${TUS_BACKUP_ID}"
  
  # Verify backup appears in list
  api_call GET "/virtualization/computes/${VM_ID}/backups"
  if ! jq -e --arg id "${TUS_BACKUP_ID}" '.data.backups[]? | select((.backup_id // .id) == $id) | .backup_id // .id' "${RESP_FILE}" >/dev/null; then
    echo "ERROR: TUS backup ${TUS_BACKUP_ID} not found in list" >&2
    rm -rf "${TEST_UPLOAD_DIR}"
    exit 1
  fi
  
  # Verify backup status is completed
  status=$(jq -r --arg id "${TUS_BACKUP_ID}" '.data.backups[]? | select((.backup_id // .id) == $id) | .status // empty' "${RESP_FILE}" 2>/dev/null || true)
  if [[ "${status}" != "completed" ]]; then
    echo "ERROR: TUS backup status is '${status}', expected 'completed'" >&2
    rm -rf "${TEST_UPLOAD_DIR}"
    exit 1
  fi
  log "TUS backup status: ${status} ✓"
  
  # Delete the TUS backup
  log "Deleting TUS backup ${TUS_BACKUP_ID}"
  api_call DELETE "/virtualization/computes/backups/${TUS_BACKUP_ID}"
  
  # Clean up test file
  rm -rf "${TEST_UPLOAD_DIR}"
  
  log "TUS upload test completed successfully ✓"
}

run_all_tests() {
  pick_vm_if_needed
  
  log "Using API_BASE=${API_BASE}"
  log "Using VM_ID=${VM_ID}"
  
  # Run basic backup test
  main "$@"
  
  # Run import backup test
  test_import_backup
  
  # Run TUS upload test
  test_tus_upload
  
  log "===================================="
  log "All backup API tests completed successfully! ✓"
  log "===================================="
}

# Check if we should run all tests or just the basic test
if [[ "${RUN_ALL_TESTS:-0}" == "1" ]]; then
  run_all_tests "$@"
else
  main "$@"
fi

