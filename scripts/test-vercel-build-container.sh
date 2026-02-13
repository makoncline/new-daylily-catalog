#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.development}"
if [ -L "$ENV_FILE" ]; then
  ENV_FILE="$(readlink "$ENV_FILE")"
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: env file not found at $ENV_FILE"
  echo "Set ENV_FILE=/absolute/path/to/.env.development to override."
  exit 1
fi

IMAGE="${IMAGE:-amazonlinux:2023}"
PLATFORM="${PLATFORM:-linux/amd64}"

echo "Using env file: $ENV_FILE"
echo "Using image: $IMAGE ($PLATFORM)"

docker run --rm -it \
  --platform "$PLATFORM" \
  -v "$ROOT_DIR:/repo" \
  -w /repo \
  --env-file "$ENV_FILE" \
  -e NODE_ENV=production \
  -e CI=true \
  -e VERCEL=1 \
  "$IMAGE" \
  bash -lc '
set -euo pipefail

dnf install -y \
  nodejs22 \
  sqlite \
  curl-minimal \
  tar \
  xz \
  git \
  findutils

corepack enable

# Vercel will pick pnpm based on lockfile; in this container we rely on corepack + packageManager.
pnpm --version

pnpm install --frozen-lockfile

pnpm build
'
