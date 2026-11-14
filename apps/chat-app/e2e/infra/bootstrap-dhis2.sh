#!/usr/bin/env bash
# Provision a local DHIS2 2.41 instance for the CHAT e2e suites (DHIS2-374).
#
# Idempotent: safe to re-run. It
#   1. waits for DHIS2 to answer /api/ping,
#   2. imports the e2e org unit, the capture role and the two e2e users
#      (stable UIDs, CREATE_AND_UPDATE),
#   3. verifies the authorities the e2e global setup depends on,
#   4. installs the CHAT app bundle when APP_ZIP is set,
#   5. writes the managed keys into apps/chat-app/e2e/.env.local (gitignored).
#
# Usage (from apps/chat-app/e2e/infra, after docker compose up):
#   APP_ZIP=../../build/bundle/chat-app-2.0.0.zip ./bootstrap-dhis2.sh
#
# Passwords are generated once and reused on re-runs. They live only in the
# gitignored .env.local. Do not reuse this instance or these credentials elsewhere.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
E2E_DIR="$(cd "$HERE/.." && pwd)"
# Local settings live in .env.local (gitignored). The existing .env (remote instance)
# is never read or written here.
ENV_FILE="$E2E_DIR/.env.local"

DHIS2_URL="${DHIS2_URL:-http://localhost:8081}"
BOOT_USER="${DHIS2_BOOTSTRAP_USER:-admin}"
BOOT_PASS="${DHIS2_BOOTSTRAP_PASSWORD:-district}"
APP_ZIP="${APP_ZIP:-}"
APP_KEY="chat-app"                      # key derived from the bundle's manifest short_name
APP_PATH="/api/apps/${APP_KEY}/index.html"

ORG_UNIT_ID="chatE2EOu01"
ROLE_CAPTURE_ID="chatE2ERol1"
ROLE_ADMIN_ID="chatE2ERol2"
USER_ADMIN_ID="chatE2EUsr1"
USER_CAPTURE_ID="chatE2EUsr2"
ADMIN_USERNAME="chat_e2e_admin"
CAPTURE_USERNAME="chat_e2e_capture"

log() { printf '[bootstrap] %s\n' "$*"; }
die() { printf '[bootstrap] ERROR: %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# 1. Wait for DHIS2
# ---------------------------------------------------------------------------
log "waiting for DHIS2 at $DHIS2_URL"
for _ in $(seq 1 120); do
  code="$(curl -s -o /dev/null -m 5 -w '%{http_code}' "$DHIS2_URL/api/ping" || true)"
  [ "$code" = "200" ] && break
  sleep 5
done
[ "${code:-}" = "200" ] || die "DHIS2 did not answer /api/ping (last status: ${code:-none})"
log "DHIS2 is up"

# ---------------------------------------------------------------------------
# 2. Credentials: reuse from .env when present, otherwise generate once
# ---------------------------------------------------------------------------
env_value() { grep -E "^$1=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- || true; }
gen_password() { printf 'Qe%s9!' "$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 20)"; }

ADMIN_PASS="$(env_value DHIS2_ADMIN_PASSWORD)"; ADMIN_PASS="${ADMIN_PASS:-$(gen_password)}"
CAPTURE_PASS="$(env_value DHIS2_CAPTURE_PASSWORD)"; CAPTURE_PASS="${CAPTURE_PASS:-$(gen_password)}"

# ---------------------------------------------------------------------------
# 3. Metadata: org unit, roles, users
# ---------------------------------------------------------------------------
# Capture authorities follow DHIS2's standard "Facility tracker" role, which is
# what a tracker data-entry user needs. F_CHAT_ADD_SETTINGS is deliberately
# absent: the access-control specs depend on it.
# M_chatapp is the app-access authority. DHIS2 (App.getSeeAppAuthority) derives it
# from the app short_name ("chat-app") with non-alphanumerics removed, and
# AppController returns 404 for users who lack it. ALL and M_dhis-web-app-management
# also grant access.
CAPTURE_AUTHORITIES='[
  "M_chatapp",
  "F_ACTIVITY_PLAN","F_ANONYMOUS_DATA_ENTRY","F_GENERATE_BENEFICIARY_TABULAR_REPORT",
  "F_GENERATE_PROGRAM_SUMMARY_REPORT","F_GENERATE_STATISTICAL_PROGRAM_REPORT",
  "F_NAME_BASED_DATA_ENTRY","F_PROGRAM_INSTANCE_DELETE","F_PROGRAM_INSTANCE_MANAGEMENT",
  "F_PROGRAM_STAGE_INSTANCE_DELETE","F_PROGRAM_STAGE_INSTANCE_SEARCH","F_PROGRAM_TRACKING_LIST",
  "F_PROGRAM_TRACKING_MANAGEMENT","F_PROGRAM_TRACKING_SEARCH","F_SINGLE_EVENT_DATA_ENTRY",
  "F_TRACKED_ENTITY_COMMENT_ADD","F_TRACKED_ENTITY_INSTANCE_DASHBOARD",
  "F_TRACKED_ENTITY_INSTANCE_HISTORY","F_TRACKED_ENTITY_INSTANCE_LIST",
  "F_TRACKED_ENTITY_INSTANCE_MANAGEMENT","F_DATAVALUE_ADD","F_CHAT_APP",
  "M_dhis-web-capture","M_dhis-web-dashboard","M_dhis-web-event-capture",
  "M_dhis-web-tracker-capture","M_dhis-web-dataentry"
]'

METADATA_JSON="$(ORG_UNIT_ID="$ORG_UNIT_ID" ROLE_CAPTURE_ID="$ROLE_CAPTURE_ID" ROLE_ADMIN_ID="$ROLE_ADMIN_ID" \
  USER_ADMIN_ID="$USER_ADMIN_ID" USER_CAPTURE_ID="$USER_CAPTURE_ID" ADMIN_USERNAME="$ADMIN_USERNAME" \
  CAPTURE_USERNAME="$CAPTURE_USERNAME" ADMIN_PASS="$ADMIN_PASS" CAPTURE_PASS="$CAPTURE_PASS" \
  CAPTURE_AUTHORITIES="$CAPTURE_AUTHORITIES" python3 - <<'PY'
import json, os
e = os.environ
ou = {"id": e["ORG_UNIT_ID"], "name": "CHAT E2E Facility", "shortName": "CHAT E2E",
      "openingDate": "2020-01-01", "level": 1}
ou_ref = [{"id": e["ORG_UNIT_ID"]}]
roles = [
    {"id": e["ROLE_CAPTURE_ID"], "name": "CHAT E2E Capture",
     "authorities": json.loads(e["CAPTURE_AUTHORITIES"])},
    {"id": e["ROLE_ADMIN_ID"], "name": "CHAT E2E Admin",
     # ALL lets the seed import metadata. The explicit F_CHAT_ADD_SETTINGS is needed
     # because the app checks authorities.includes(...) on /api/me, and ALL is not
     # expanded there, so an ALL-only user cannot open Settings.
     "authorities": ["ALL", "F_CHAT_ADD_SETTINGS"]},
]
def user(uid, username, password, first, role_id):
    return {
        "id": uid, "username": username, "password": password,
        "firstName": first, "surname": "E2E",
        "userRoles": [{"id": role_id}],
        "organisationUnits": ou_ref,
        "dataViewOrganisationUnits": ou_ref,
        "teiSearchOrganisationUnits": ou_ref,
    }
users = [
    user(e["USER_ADMIN_ID"], e["ADMIN_USERNAME"], e["ADMIN_PASS"], "CHAT", e["ROLE_ADMIN_ID"]),
    user(e["USER_CAPTURE_ID"], e["CAPTURE_USERNAME"], e["CAPTURE_PASS"], "Capture", e["ROLE_CAPTURE_ID"]),
]
print(json.dumps({"organisationUnits": [ou], "userRoles": roles, "users": users}))
PY
)"

log "importing org unit, roles and users"
IMPORT_RESPONSE="$(curl -s -m 180 -u "$BOOT_USER:$BOOT_PASS" -H 'Content-Type: application/json' \
  -X POST "$DHIS2_URL/api/metadata?importStrategy=CREATE_AND_UPDATE&atomicMode=NONE" \
  -d "$METADATA_JSON")"
IMPORT_STATUS="$(echo "$IMPORT_RESPONSE" | jq -r '.response.status // .status // "UNKNOWN"')"
echo "$IMPORT_RESPONSE" | jq -r '.response.typeReports[]? | "[bootstrap]   \(.klass | split(".") | last): created=\(.stats.created) updated=\(.stats.updated) ignored=\(.stats.ignored)"'
if [ "$IMPORT_STATUS" != "OK" ]; then
  echo "$IMPORT_RESPONSE" | jq -c '.response.typeReports[]? | select(.objectReports | length > 0) | {klass, errors: [.objectReports[]? | {uid, errs: [.errorReports[]? | .message]}]}' >&2
  die "metadata import status: $IMPORT_STATUS"
fi
log "metadata import: $IMPORT_STATUS"

# 3b. The capture user's program data access is granted by the e2e seed (support/seed.ts),
#     so it is re-applied on every run, after the program is created.

# ---------------------------------------------------------------------------
# 4. Install the CHAT app bundle (optional)
# ---------------------------------------------------------------------------
if [ -n "$APP_ZIP" ]; then
  [ -f "$APP_ZIP" ] || die "APP_ZIP not found: $APP_ZIP"
  log "installing app bundle $(basename "$APP_ZIP")"
  code="$(curl -s -m 300 -o /dev/null -w '%{http_code}' -u "$BOOT_USER:$BOOT_PASS" \
    -X POST "$DHIS2_URL/api/apps?overwrite=true" -F "file=@$APP_ZIP")"
  [ "$code" = "204" ] || die "app install returned HTTP $code"
fi

# ---------------------------------------------------------------------------
# 5. Verify what the e2e global setup checks
# ---------------------------------------------------------------------------
auth_of() {
  local body code
  body="$(curl -s -m 30 -w "\n%{http_code}" -u "${1}:${2}" "$DHIS2_URL/api/me?fields=authorities")"
  code="$(tail -n1 <<<"$body")"
  [ "$code" = "200" ] || die "login as $1 failed (HTTP $code)"
  sed "\$d" <<<"$body" | jq -c '.authorities'
}
ADMIN_AUTH="$(auth_of "$ADMIN_USERNAME" "$ADMIN_PASS")"
CAPTURE_AUTH="$(auth_of "$CAPTURE_USERNAME" "$CAPTURE_PASS")"
echo "$ADMIN_AUTH" | jq -e 'index("F_CHAT_ADD_SETTINGS")' >/dev/null \
  || die "$ADMIN_USERNAME lacks an explicit F_CHAT_ADD_SETTINGS (the app does not expand ALL)"
if echo "$CAPTURE_AUTH" | jq -e 'index("ALL") or index("F_CHAT_ADD_SETTINGS")' >/dev/null; then
  die "$CAPTURE_USERNAME must NOT have F_CHAT_ADD_SETTINGS or ALL"
fi
log "verified: $ADMIN_USERNAME has F_CHAT_ADD_SETTINGS, $CAPTURE_USERNAME lacks it"

APP_CODE="$(curl -s -o /dev/null -m 30 -u "$CAPTURE_USERNAME:$CAPTURE_PASS" -w '%{http_code}' "$DHIS2_URL$APP_PATH")"
log "app route $APP_PATH -> HTTP $APP_CODE (as $CAPTURE_USERNAME)"
[ "$APP_CODE" = "200" ] || die "$CAPTURE_USERNAME cannot open the app (HTTP $APP_CODE). Check the app is installed (APP_ZIP=...) and the M_chatapp authority."

# ---------------------------------------------------------------------------
# 6. Write managed keys into apps/chat-app/e2e/.env (other keys are preserved)
# ---------------------------------------------------------------------------
[ -f "$ENV_FILE" ] || printf '# Local DHIS2 e2e settings, written by infra/bootstrap-dhis2.sh. Gitignored.\n' > "$ENV_FILE"
set_env() {
  python3 - "$ENV_FILE" "$1" "$2" <<'PY'
import re, sys
path, key, value = sys.argv[1], sys.argv[2], sys.argv[3]
lines = open(path).read().splitlines()
pattern = re.compile(rf'^#?\s*{re.escape(key)}=')
out, done = [], False
for line in lines:
    if pattern.match(line):
        if not done:
            out.append(f'{key}={value}'); done = True
        continue
    out.append(line)
if not done:
    out.append(f'{key}={value}')
open(path, 'w').write('\n'.join(out) + '\n')
PY
}
set_env DHIS2_BASE_URL "$DHIS2_URL"
set_env APP_PATH "$APP_PATH"
set_env DHIS2_ADMIN_USERNAME "$ADMIN_USERNAME"
set_env DHIS2_ADMIN_PASSWORD "$ADMIN_PASS"
set_env DHIS2_CAPTURE_USERNAME "$CAPTURE_USERNAME"
set_env DHIS2_CAPTURE_PASSWORD "$CAPTURE_PASS"
# Pin the seed IDs. Otherwise an E2E_ORG_UNIT_ID/E2E_PROGRAM_ID from another .env
# (dotenv does not override set variables) would point the seed at a missing org unit.
set_env E2E_ORG_UNIT_ID "$ORG_UNIT_ID"
set_env E2E_PROGRAM_ID "chatE2EPrg1"
chmod 600 "$ENV_FILE"
log "wrote managed keys to $ENV_FILE (mode 600, gitignored)"
log "run e2e against it with:  set -a; source .env.local; set +a; pnpm e2e"
log "done"
