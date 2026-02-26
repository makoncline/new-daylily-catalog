#!/usr/bin/env bash

set -euo pipefail

PORT="${PORT:-3000}"
BASE_URL="${BASE_URL:-http://localhost:${PORT}}"
OUTPUT_DIR="tests/.tmp/query-profiler"
SESSION_FILE="${OUTPUT_DIR}/e2e-session.jsonl"
REPORT_SQL_MD="${OUTPUT_DIR}/e2e-strategic-report.md"
REPORT_SQL_JSON="${OUTPUT_DIR}/e2e-strategic-report.json"
REPORT_OP_MD="${OUTPUT_DIR}/e2e-strategic-report-operation.md"
REPORT_OP_JSON="${OUTPUT_DIR}/e2e-strategic-report-operation.json"
SERVER_LOG="${OUTPUT_DIR}/profile-dev.log"

if [[ -z "${LOCAL_DATABASE_URL:-}" ]]; then
  echo "LOCAL_DATABASE_URL is required. Example:"
  echo "LOCAL_DATABASE_URL=\"file:/absolute/path/to/prisma/local-prod-copy-daylily-catalog.db\" pnpm env:dev pnpm profile:queries"
  exit 1
fi

mkdir -p "${OUTPUT_DIR}"
rm -f "${SESSION_FILE}" "${SESSION_FILE}.reset.lock"

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "${SERVER_PID}" >/dev/null 2>&1; then
    kill "${SERVER_PID}" >/dev/null 2>&1 || true
    wait "${SERVER_PID}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

echo "Starting dev server with profiler at ${BASE_URL}..."
LOCAL_QUERY_PROFILER=1 \
LOCAL_QUERY_PROFILER_RESET=1 \
LOCAL_QUERY_PROFILER_OUTPUT="${SESSION_FILE}" \
USE_TURSO_DB="${USE_TURSO_DB:-false}" \
PORT="${PORT}" \
pnpm dev >"${SERVER_LOG}" 2>&1 &
SERVER_PID=$!

echo "Waiting for server readiness..."
READY=0
for _ in {1..180}; do
  if curl -fsS "${BASE_URL}" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done

if [[ "${READY}" -ne 1 ]]; then
  echo "Server did not become ready at ${BASE_URL}."
  echo "Last server logs:"
  tail -n 80 "${SERVER_LOG}" || true
  exit 1
fi

echo "Running strategic query-profiling e2e scenario..."
E2E_PROFILE_SCENARIO=1 \
BASE_URL="${BASE_URL}" \
pnpm exec playwright test tests/e2e/query-profiler-strategic.e2e.ts

echo "Generating SQL report..."
pnpm exec tsx scripts/query-profiler-report.ts \
  --input "${SESSION_FILE}" \
  --output "${REPORT_SQL_MD}" \
  --json "${REPORT_SQL_JSON}" \
  --focus cultivar \
  --top 120

echo "Generating operation report..."
pnpm exec tsx scripts/query-profiler-report.ts \
  --input "${SESSION_FILE}" \
  --event-type operation \
  --output "${REPORT_OP_MD}" \
  --json "${REPORT_OP_JSON}" \
  --focus cultivar \
  --top 120

echo "Done. Outputs:"
echo "- ${SESSION_FILE}"
echo "- ${REPORT_SQL_MD}"
echo "- ${REPORT_SQL_JSON}"
echo "- ${REPORT_OP_MD}"
echo "- ${REPORT_OP_JSON}"
