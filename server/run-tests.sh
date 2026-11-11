#!/usr/bin/env bash
# Fresh local database, local server, full check run.   ./run-tests.sh
set -euo pipefail
cd "$(dirname "$0")"
export CI=1 WRANGLER_SEND_METRICS=false NO_PROXY=localhost,127.0.0.1
PEPPER="dev-only-pepper-not-for-production"
PORT=8787
rm -rf .wrangler out && mkdir -p out
echo "SENSI_PEPPER=\"$PEPPER\"" > .dev.vars
node scripts/build-site.mjs > /dev/null
node scripts/seed.mjs > out/seed.sql
SENSI_PEPPER=$PEPPER node scripts/gen-codes.mjs test01 jeje 5 > /dev/null
SENSI_PEPPER=$PEPPER node scripts/shared-code.mjs NEXURA-SENSI-2026 "Kemasan 2026" > out/shared.sql
for f in schema.sql out/seed.sql out/test01-jeje.sql out/shared.sql; do npx wrangler d1 execute nexura --local --file "$f" > /dev/null; done
npx wrangler dev --local --port $PORT > out/dev.log 2>&1 &
trap 'kill %1 2>/dev/null; pkill -f workerd 2>/dev/null || true' EXIT
for _ in $(seq 1 40); do curl -s -o /dev/null --noproxy '*' "http://localhost:$PORT/api/me" && break; sleep 1; done
node test/api.test.mjs "http://localhost:$PORT" "$(sed -n 2p out/test01-jeje.csv)" "$(sed -n 3p out/test01-jeje.csv)" NEXURA-SENSI-2026
# Optional: also drive the account pages and the admin page in a real browser.   ./run-tests.sh shots <folder>
if [ "${1:-}" = "shots" ]; then
  node test/account-pages.mjs "http://localhost:$PORT" "$2"
  node test/shots.mjs "http://localhost:$PORT" "$2"
fi
