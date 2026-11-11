#!/usr/bin/env bash
# Fresh local database, local server, full check run.
#   ./run-tests.sh                  the API checks
#   ./run-tests.sh pages <folder>   ...then the real pages in Chrome, screenshots into <folder>
set -euo pipefail
cd "$(dirname "$0")"
export CI=1 WRANGLER_SEND_METRICS=false NO_PROXY=localhost,127.0.0.1
PEPPER="dev-only-pepper-not-for-production"
PORT=8787
BASE="http://localhost:$PORT"

stop_server() { pkill -f "wrangler dev" 2>/dev/null || true; pkill -f workerd 2>/dev/null || true; sleep 1; }
start_server() { # $1: extra lines for .dev.vars
  stop_server
  printf 'SENSI_PEPPER="%s"\n%s\n' "$PEPPER" "${1:-}" > .dev.vars
  npx wrangler dev --local --port $PORT >> out/dev.log 2>&1 &
  for _ in $(seq 1 40); do curl -s -o /dev/null --noproxy '*' "$BASE/api/me" && return; sleep 1; done
  echo "server did not start"; exit 1
}
trap stop_server EXIT

stop_server
rm -rf .wrangler out && mkdir -p out
SENSI_PEPPER=$PEPPER node scripts/gen-codes.mjs test01 jeje 5 > /dev/null
SENSI_PEPPER=$PEPPER node scripts/shared-code.mjs NEXURA-SENSI-2026 "Kemasan 2026" > out/shared.sql

# The database starts empty: the server builds its own tables and catalogue on the first request.
start_server 'DEMO_PAYMENTS="no"'
for f in out/test01-jeje.sql out/shared.sql; do npx wrangler d1 execute nexura-staging --local --file "$f" > /dev/null; done
node test/api.test.mjs "$BASE" "$(sed -n 2p out/test01-jeje.csv)" "$(sed -n 3p out/test01-jeje.csv)" NEXURA-SENSI-2026

if [ "${1:-}" = "pages" ]; then
  # Practice payments on, as on a developer's computer, so the flow can be paid through.
  start_server 'DEMO_PAYMENTS="yes"'
  npx wrangler d1 execute nexura-staging --local --command "DELETE FROM rate_events" > /dev/null
  node test/account-pages.mjs "$BASE" "$2"
  node test/shop-pages.mjs "$BASE" "$2"
  node test/shots.mjs "$BASE" "$2"
fi
