#!/usr/bin/env bash
set -euo pipefail

# Simple functional test for ISO endpoints, including pool_name metadata
# Follows the pattern of test_storage_pools_api.sh and test_volumes_api.sh

API_BASE="${API_BASE:-https://localhost:7770/api/v1}"
AUTH_TOKEN="${AUTH_TOKEN:-}" 

TEST_POOL_NAME="vapor-test-pool-iso-$$"
TEST_POOL_PATH="/var/lib/libvirt/images/${TEST_POOL_NAME}"
TEST_ISO_NAME_JSON="vapor-test-iso-json-$$"
TEST_ISO_NAME_TUS="vapor-test-iso-tus-$$"
TEST_POOL_NAME_JSON="vapor-iso-json-pool-$$"
TEST_POOL_NAME_TUS="vapor-iso-tus-pool-$$"

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

  local response_file
  response_file="/tmp/isos_api_resp.json"

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

# Helper for TUS upload calls (no JSON wrapper, raw curl)
iso_upload_call() {
  echo
  echo "=== $* ==="
  bash -c "$*"
}

cleanup() {
  echo "\n=== Cleaning up test resources ==="

  # Delete ISOs by listing and filtering our test names
  echo "Listing ISOs for cleanup..."
  list_resp=$(curl -ksS -X GET "${API_BASE}/virtualization/isos" \
    -H "Authorization: Bearer ${AUTH_TOKEN}") || list_resp=""

  if [[ -n "${list_resp}" ]]; then
    echo "Current ISOs:" | sed 's/$//' # ensure newline
    echo "${list_resp}" | jq . || echo "${list_resp}"

    # Delete any ISO whose name matches our test patterns (best-effort)
    if echo "${list_resp}" | jq -e '.data.isos? | type == "array"' >/dev/null 2>&1; then
      echo "Deleting test ISOs (if any)..."
      echo "${list_resp}" | jq -r '.data.isos[]? | select(type == "object" and (((.name // "") | contains("vapor-test-iso-json")) or ((.name // "") | contains("vapor-test-iso-tus")))) | .id' | while read -r iso_id; do
        [[ -z "${iso_id}" ]] && continue
        api_call DELETE "/virtualization/isos/${iso_id}"
      done
    else
      echo "Skip ISO cleanup: /virtualization/isos response did not contain data.isos array" >&2
    fi
  fi

  # Delete the storage pool used to store the TUS ISO, if it exists
  echo "Deleting test storage pool (if exists): ${TEST_POOL_NAME}"
  curl -ksS -X DELETE "${API_BASE}/virtualization/storages/pools/${TEST_POOL_NAME}?delete_volumes=true" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" >/dev/null 2>&1 || true
}

trap cleanup EXIT

echo "Using API_BASE=${API_BASE}"

# 1. JSON ISO upload with explicit pool_name

# Ensure some file exists server-side for path-based upload. This test assumes
# the ISO file has already been placed on the server. Adjust the path if needed.
TEST_ISO_PATH_JSON="/var/lib/libvirt/images/iso/test.iso"

JSON_BODY=$(jq -n \
  --arg name "${TEST_ISO_NAME_JSON}" \
  --arg path "${TEST_ISO_PATH_JSON}" \
  --arg pool "${TEST_POOL_NAME_JSON}" \
  '{name: $name, path: $path, pool_name: $pool}')

echo "\n=== Testing JSON ISO upload with explicit pool_name ==="
api_call POST "/virtualization/isos" "${JSON_BODY}"

# 2. TUS ISO upload with pool_name in Upload-Metadata

# Prepare a small local dummy file to upload via TUS
TMP_ISO_FILE="/tmp/${TEST_ISO_NAME_TUS}.iso"
rm -f "${TMP_ISO_FILE}"
head -c 1048576 </dev/urandom >"${TMP_ISO_FILE}"

FILE_SIZE=$(stat -c%s "${TMP_ISO_FILE}")

# Base64-encode metadata fields for Upload-Metadata
b64() { printf '%s' "$1" | base64 -w0; }

FILENAME_B64=$(b64 "${TEST_ISO_NAME_TUS}.iso")
POOL_B64=$(b64 "${TEST_POOL_NAME_TUS}")

UPLOAD_METADATA="filename ${FILENAME_B64},pool_name ${POOL_B64}"

echo "\n=== Creating TUS upload session for ISO (with pool_name metadata) ==="
CREATE_RESP=$(curl -ksS -D - \
  -X POST "${API_BASE}/virtualization/isos/upload" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Tus-Resumable: 1.0.0" \
  -H "Upload-Length: ${FILE_SIZE}" \
  -H "Upload-Metadata: ${UPLOAD_METADATA}")

echo "Response headers and body from upload session creation:"
echo "${CREATE_RESP}"

UPLOAD_URL=$(printf '%s' "${CREATE_RESP}" | awk '/^[Ll]ocation:/ {print $2}' | tr -d '\r')
if [[ -z "${UPLOAD_URL}" ]]; then
  echo "ERROR: Failed to parse Location header from TUS upload creation response" >&2
  exit 1
fi

# If the Location header is relative, prepend API_BASE
if [[ "${UPLOAD_URL}" != http* ]]; then
  UPLOAD_URL="${API_BASE}${UPLOAD_URL}"
fi

echo "Upload URL: ${UPLOAD_URL}"

echo "\n=== Uploading ISO file via TUS PATCH ==="
http_code=$(curl -ksS -o /dev/null -w '%{http_code}' \
  -X PATCH "${UPLOAD_URL}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Tus-Resumable: 1.0.0" \
  -H "Upload-Offset: 0" \
  -H "Content-Type: application/offset+octet-stream" \
  --data-binary @"${TMP_ISO_FILE}")

echo "TUS PATCH HTTP ${http_code}"
if [[ ! "${http_code}" =~ ^2 ]]; then
  echo "ERROR: TUS PATCH failed with HTTP ${http_code}" >&2
  exit 1
fi

# Complete the upload and register the ISO
UPLOAD_ID=$(basename "${UPLOAD_URL}")

echo "\n=== Completing TUS upload and registering ISO ==="
api_call POST "/virtualization/isos/upload/${UPLOAD_ID}/complete"

# 3. List ISOs and verify that metadata.pool_name is present for our test ISOs

echo "\n=== Verifying ISOs list and pool_name metadata ==="
LIST_RESP=$(curl -ksS -X GET "${API_BASE}/virtualization/isos" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")

echo "Full /virtualization/isos response:"
echo "${LIST_RESP}" | jq . || echo "${LIST_RESP}"

echo "\nExtracting test ISOs and their pool_name metadata..."
for name in "${TEST_ISO_NAME_JSON}" "${TEST_ISO_NAME_TUS}.iso"; do
  echo "--- ISO: ${name} ---"
  echo "${LIST_RESP}" | jq -r --arg n "${name}" \
    '.data.isos[]? | select(.name == $n) | "id=\(.id) pool_name=\(.metadata.pool_name // "")"'
done

echo "\nISO API functional test completed successfully."
