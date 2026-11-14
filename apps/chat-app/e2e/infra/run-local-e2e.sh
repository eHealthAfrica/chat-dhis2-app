#!/usr/bin/env bash
# Run the CHAT Playwright suites against the LOCAL DHIS2 instance only.
#
# The e2e/.env file in this directory may point at a shared remote instance. This
# runner loads .env.local (written by bootstrap-dhis2.sh), which overrides .env, and
# refuses to run unless DHIS2_BASE_URL is a localhost URL.
#
# Usage: run-local-e2e.sh [playwright args...]   e.g.  run-local-e2e.sh --grep @integration
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$HERE/../.." && pwd)"           # apps/chat-app
ENV_LOCAL="$APP_DIR/e2e/.env.local"
[ -f "$ENV_LOCAL" ] || { echo "missing $ENV_LOCAL; run infra/bootstrap-dhis2.sh first" >&2; exit 1; }

set -a; . "$ENV_LOCAL"; set +a
case "${DHIS2_BASE_URL:-}" in
  http://localhost:*|http://127.0.0.1:*) ;;
  *) echo "refusing to run: DHIS2_BASE_URL=${DHIS2_BASE_URL:-unset} is not local" >&2; exit 1 ;;
esac

cd "$APP_DIR"
exec pnpm exec playwright test "$@"
