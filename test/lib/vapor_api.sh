#!/usr/bin/env bash

# Shared helpers for test/ smoke scripts.
#
# Intended usage:
#   set -euo pipefail
#   SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
#   # shellcheck source=lib/vapor_api.sh
#   source "${SCRIPT_DIR}/lib/vapor_api.sh"
#   require_deps
#   login_if_needed
#   api_call GET "/some/path"
#
# Conventions:
#   - Requires API_BASE (defaults to https://localhost:7770/api/v1)
#   - Uses AUTH_TOKEN or VAPOR_USERNAME/VAPOR_PASSWORD to obtain token
#   - Writes response body to RESP_FILE (defaults to /tmp/<script>_api_resp.json)

# Print via script-level log() if it exists; otherwise print to stderr.
_vapor_log() {
  if declare -F log >/dev/null 2>&1; then
    log "$@"
  else
    echo -e "\n[vapor-test] $*" >&2
  fi
}

require_deps() {
  if ! command -v curl >/dev/null 2>&1; then
    echo "ERROR: curl is required" >&2
    exit 1
  fi

  if ! command -v jq >/dev/null 2>&1; then
    echo "ERROR: jq is required" >&2
    exit 1
  fi
}

# Login and populate AUTH_TOKEN if needed.
# Requires either AUTH_TOKEN, or VAPOR_USERNAME/VAPOR_PASSWORD.
login_if_needed() {
  API_BASE="${API_BASE:-https://localhost:7770/api/v1}"
  AUTH_TOKEN="${AUTH_TOKEN:-}"

  if [[ -n "${AUTH_TOKEN}" ]]; then
    return
  fi

  if [[ -z "${VAPOR_USERNAME:-}" || -z "${VAPOR_PASSWORD:-}" ]]; then
    echo "ERROR: AUTH_TOKEN is not set and no VAPOR_USERNAME/VAPOR_PASSWORD provided." >&2
    exit 1
  fi

  _vapor_log "Logging in to obtain AUTH_TOKEN..."

  local login_resp
  login_resp=$(curl -ksS -X POST "${API_BASE}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${VAPOR_USERNAME}\",\"password\":\"${VAPOR_PASSWORD}\"}")

  AUTH_TOKEN=$(echo "${login_resp}" | jq -r '.token // empty') || AUTH_TOKEN=""
  if [[ -z "${AUTH_TOKEN}" || "${AUTH_TOKEN}" == "null" ]]; then
    echo "ERROR: Failed to obtain AUTH_TOKEN from /auth/login response" >&2
    echo "Response was: ${login_resp}" >&2
    exit 1
  fi

  export AUTH_TOKEN
}

# Helper to call API with JSON.
# Usage: api_call METHOD PATH [JSON_BODY]
api_call() {
  API_BASE="${API_BASE:-https://localhost:7770/api/v1}"
  AUTH_TOKEN="${AUTH_TOKEN:-}"

  local method="$1"; shift
  local path="$1"; shift
  local data="${1:-}"

  local url="${API_BASE}${path}"
  local http_code

  # Default response file per-script.
  if [[ -z "${RESP_FILE:-}" ]]; then
    RESP_FILE="/tmp/${0##*/}_api_resp.json"
  fi

  echo
  echo "=== ${method} ${url} ==="

  rm -f "${RESP_FILE}"

  if [[ -n "${data}" ]]; then
    http_code=$(curl -ksS -o "${RESP_FILE}" -w '%{http_code}' \
      -X "${method}" "${url}" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "${data}")
  else
    http_code=$(curl -ksS -o "${RESP_FILE}" -w '%{http_code}' \
      -X "${method}" "${url}" \
      -H "Authorization: Bearer ${AUTH_TOKEN}")
  fi

  echo "HTTP ${http_code}"
  if [[ -s "${RESP_FILE}" ]]; then
    cat "${RESP_FILE}" | jq . || cat "${RESP_FILE}"
  fi

  if [[ ! "${http_code}" =~ ^2 ]]; then
    echo "ERROR: Request to ${path} failed with HTTP ${http_code}" >&2
    exit 1
  fi
}
