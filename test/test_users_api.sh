#!/usr/bin/env bash
set -euo pipefail

# Functional smoke test for User Management endpoints.
#
# Endpoints exercised:
#   - GET    /api/v1/users
#   - POST   /api/v1/users
#   - PUT    /api/v1/users/:username
#   - POST   /api/v1/users/:username/reset-password
#   - DELETE /api/v1/users/:username
#
# Requirements:
#   - A running Vapor API (default: https://localhost:7770).
#   - curl and jq installed.
#   - A valid JWT token with sufficient permissions, provided via AUTH_TOKEN
#     or via VAPOR_USERNAME / VAPOR_PASSWORD for login.
#   - The API server must be running with permission to call useradd/usermod/userdel/chpasswd
#     on the host (typically requires root privileges).
#
# Usage examples:
#   AUTH_TOKEN=... ./test/test_users_api.sh
#   VAPOR_USERNAME=admin VAPOR_PASSWORD=admin123 ./test/test_users_api.sh
#   API_BASE=http://localhost:7770/api/v1 AUTH_TOKEN=... ./test/test_users_api.sh
#
# Optional env vars:
#   TEST_USERNAME        : User to create (default: vapor-test-user-<epoch>-<pid>)
#   TEST_PASSWORD        : Initial password (default: VaporTest123!)
#   TEST_PASSWORD_UPDATE : Password used during update (default: VaporTest456!)
#   TEST_PASSWORD_RESET  : Password used during reset (default: VaporTest789!)
#   TEST_GROUPS          : Comma-separated groups to set (optional; must already exist)
#   KEEP_USER            : 1 to skip delete/cleanup (default: 0)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/vapor_api.sh
source "${SCRIPT_DIR}/lib/vapor_api.sh"

API_BASE="${API_BASE:-https://localhost:7770/api/v1}"
AUTH_TOKEN="${AUTH_TOKEN:-}"
VAPOR_USERNAME="${VAPOR_USERNAME:-}"
VAPOR_PASSWORD="${VAPOR_PASSWORD:-}"

TEST_USERNAME="${TEST_USERNAME:-vapor-test-user-$(date +%s)-$$}"
TEST_PASSWORD="${TEST_PASSWORD:-VaporTest123!}"
TEST_PASSWORD_UPDATE="${TEST_PASSWORD_UPDATE:-VaporTest456!}"
TEST_PASSWORD_RESET="${TEST_PASSWORD_RESET:-VaporTest789!}"
TEST_GROUPS="${TEST_GROUPS:-}"
KEEP_USER="${KEEP_USER:-0}"

RESP_FILE="${RESP_FILE:-/tmp/users_api_resp.json}"

log() {
  echo -e "\n[users-test] $*" >&2
}

require_deps
login_if_needed

CREATED_USER=0

cleanup() {
  if [[ "${KEEP_USER}" == "1" ]]; then
    log "KEEP_USER=1 set; skipping cleanup"
    return
  fi

  if [[ "${CREATED_USER}" != "1" ]]; then
    return
  fi

  log "Cleaning up test user (best-effort): ${TEST_USERNAME}"
  curl -ksS -X DELETE "${API_BASE}/users/${TEST_USERNAME}" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" >/dev/null 2>&1 || true
}

trap cleanup EXIT

main() {
  log "Using API_BASE=${API_BASE}"
  log "Using TEST_USERNAME=${TEST_USERNAME}"

  # 1) List users
  api_call GET "/users"

  # 2) Create user
  log "Creating user"
  CREATE_BODY=$(jq -n \
    --arg username "${TEST_USERNAME}" \
    --arg password "${TEST_PASSWORD}" \
    --arg groups "${TEST_GROUPS}" \
    '{username: $username, password: $password} + ( $groups|length>0 ? {groups: $groups} : {} )')

  api_call POST "/users" "${CREATE_BODY}"
  CREATED_USER=1

  # 3) Verify user appears in list
  log "Verifying user appears in list"
  api_call GET "/users"
  if ! jq -e --arg u "${TEST_USERNAME}" '.data.users[]? | select(.username == $u) | .username' "${RESP_FILE}" >/dev/null; then
    echo "ERROR: Created user not found in listUsers response" >&2
    exit 1
  fi

  # 4) Update user (password, and optionally groups)
  log "Updating user"
  UPDATE_BODY=$(jq -n \
    --arg username "${TEST_USERNAME}" \
    --arg password "${TEST_PASSWORD_UPDATE}" \
    --arg groups "${TEST_GROUPS}" \
    '{username: $username, password: $password} + ( $groups|length>0 ? {groups: $groups} : {} )')

  api_call PUT "/users/${TEST_USERNAME}" "${UPDATE_BODY}"

  # 5) Reset password
  log "Resetting password"
  RESET_BODY=$(jq -n --arg password "${TEST_PASSWORD_RESET}" '{password: $password}')
  api_call POST "/users/${TEST_USERNAME}/reset-password" "${RESET_BODY}"

  # 6) Delete user (unless KEEP_USER=1)
  if [[ "${KEEP_USER}" == "1" ]]; then
    log "KEEP_USER=1 set; skipping delete"
  else
    log "Deleting user"
    api_call DELETE "/users/${TEST_USERNAME}"
    CREATED_USER=0

    # 7) Verify deletion
    log "Verifying user removed from list"
    api_call GET "/users"
    if jq -e --arg u "${TEST_USERNAME}" '.data.users[]? | select(.username == $u) | .username' "${RESP_FILE}" >/dev/null; then
      echo "ERROR: User still present after delete" >&2
      exit 1
    fi
  fi

  log "Users API smoke test completed successfully."
}

main "$@"
