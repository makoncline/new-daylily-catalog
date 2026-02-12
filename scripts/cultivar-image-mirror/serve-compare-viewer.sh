#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
OUTPUT_DIR="${SCRIPT_DIR}/output"
PORT="${PORT:-8787}"

cd "${REPO_ROOT}"
npx tsx "${SCRIPT_DIR}/generate-compare-viewer.ts" --output-dir "${OUTPUT_DIR}"

cd "${OUTPUT_DIR}"
URL="http://localhost:${PORT}/viewer/index.html"
echo "[compare-viewer] Serving ${OUTPUT_DIR} at ${URL}"

if command -v open >/dev/null 2>&1; then
  (sleep 1; open "${URL}") >/dev/null 2>&1 &
fi

python3 -m http.server "${PORT}"
