#!/bin/sh
# Background write worker — drains the `preship_write_jobs` pgmq queue and runs
# the deferred Prisma writes + side effects (reactions, notifications).
#
# Runs as a SEPARATE process from Next.js so it gets its own PgBouncer
# connection slot (it relieves pool pressure, doesn't add to it) and a worker
# crash can't take down the web server. Launched by .zscripts/start.sh and
# .zscripts/dev.sh alongside Next + Caddy.
#
# Same env as the web app: DATABASE_URL (transaction-mode pooler) is required.
# Logs go to stdout/stderr — start.sh captures them with the rest of the
# process output.

set -e

# Resolve the repo root regardless of where this is invoked from (the prod
# bundle copies .zscripts next to the standalone server; dev runs it in place).
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR" || exit 1

if [ -z "$DATABASE_URL" ]; then
  echo "❌ [worker] DATABASE_URL not set — cannot start the write worker."
  exit 1
fi

# Prefer bun (the rest of the stack uses it); fall back to node + tsx.
if command -v bun >/dev/null 2>&1; then
  echo "🛠  [worker] starting with bun: tsx src/worker/index.ts"
  exec bun run src/worker/index.ts
elif command -v npx >/dev/null 2>&1; then
  echo "🛠  [worker] starting with npx tsx: src/worker/index.ts"
  exec npx tsx src/worker/index.ts
else
  echo "❌ [worker] neither bun nor npx found — install one to run the worker."
  exit 1
fi
