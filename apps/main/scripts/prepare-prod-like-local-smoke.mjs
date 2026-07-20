#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..");
const appRoot = path.join(repoRoot, "apps", "main");
const localDir = path.join(appRoot, "local");
const runtimeEnvPath = path.join(appRoot, ".env.production");
const buildEnvPath = path.join(localDir, ".env.production.build");
const composeOverridePath = path.join(
  localDir,
  "compose.prod-like.override.yaml",
);
const runtimeDbPath = path.join(
  appRoot,
  "prisma",
  "local-prod-copy-daylily-catalog.db",
);
const buildDbPath = path.join(appRoot, "prisma", "prod-like-build-db");

const DEFAULT_REMOTE_ENV_PATH = "/srv/stacks/daylilycatalog/.env";
const DEFAULT_TUNNEL_HOST = "dev.daylilycatalog.com";
const DEFAULT_LOCAL_PORT = "3012";
const DEFAULT_BUILD_DB_URL = "file:/app/apps/main/prisma/prod-like-build-db";
const DEFAULT_RUNTIME_DB_URL = "file:/data/daylilycatalog.sqlite";
const DEFAULT_LOCAL_RELEASE = "prod-like-local";

function usage() {
  console.log(`Usage:
  node scripts/prepare-prod-like-local-smoke.mjs --ssh-host <host> [options]

Options:
  --ssh-host <host>         SSH host that can read the VPS env file.
                            Can also be set with DAYLILY_VPS_SSH_HOST.
  --remote-env <path>       Remote env file path.
                            Default: ${DEFAULT_REMOTE_ENV_PATH}
  --tunnel-host <host>      Cloudflare Tunnel hostname to point at local Docker.
                            Default: ${DEFAULT_TUNNEL_HOST}
  --local-port <port>       Local Docker host port used by compose.local.yaml.
                            Default: ${DEFAULT_LOCAL_PORT}
  --skip-env-pull           Reuse apps/main/.env.production instead of SSH pull.
  --skip-tunnel-config      Do not edit ~/.cloudflared/config.yml.
  --help                    Show this help.
`);
}

function parseArgs(argv) {
  const options = {
    sshHost: process.env.DAYLILY_VPS_SSH_HOST ?? "",
    remoteEnv: DEFAULT_REMOTE_ENV_PATH,
    tunnelHost: DEFAULT_TUNNEL_HOST,
    localPort: DEFAULT_LOCAL_PORT,
    skipEnvPull: false,
    skipTunnelConfig: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a value`);
      return value;
    };

    if (arg === "--help") {
      usage();
      process.exit(0);
    } else if (arg === "--ssh-host") {
      options.sshHost = next();
    } else if (arg === "--remote-env") {
      options.remoteEnv = next();
    } else if (arg === "--tunnel-host") {
      options.tunnelHost = next();
    } else if (arg === "--local-port") {
      options.localPort = next();
    } else if (arg === "--skip-env-pull") {
      options.skipEnvPull = true;
    } else if (arg === "--skip-tunnel-config") {
      options.skipTunnelConfig = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "Z");
}

function requireFile(filePath, message) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${message}\nMissing: ${filePath}`);
  }
}

function pullRemoteEnv({ sshHost, remoteEnv }) {
  if (!sshHost) {
    throw new Error(
      "Provide --ssh-host <host> or set DAYLILY_VPS_SSH_HOST, or pass --skip-env-pull.",
    );
  }

  const result = spawnSync("ssh", [sshHost, "cat", remoteEnv], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    throw new Error(
      `Failed to pull remote env from ${sshHost}:${remoteEnv}\n${result.stderr.trim()}`,
    );
  }

  return result.stdout;
}

function parseEnvLines(text) {
  return text.split(/\r?\n/);
}

function envKeyFromLine(line) {
  const trimmed = line.trim();
  const uncommented = trimmed.replace(/^#+\s*/, "");
  return uncommented.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/)?.[1] ?? null;
}

function setEnvValue(lines, key, value) {
  const nextLine = `${key}=${JSON.stringify(value)}`;
  const index = lines.findIndex((line) => {
    const trimmed = line.trim();
    return !trimmed.startsWith("#") && envKeyFromLine(line) === key;
  });

  if (index >= 0) {
    lines[index] = nextLine;
    return;
  }

  lines.push(nextLine);
}

function commentOutEnvValue(lines, key) {
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("#") || envKeyFromLine(lines[i]) !== key) continue;
    lines[i] = `# ${lines[i]}`;
  }
}

function buildRuntimeEnv(source, { tunnelHost }) {
  const lines = parseEnvLines(source);

  setEnvValue(lines, "APP_BASE_URL", `https://${tunnelHost}`);
  setEnvValue(lines, "DATABASE_URL", DEFAULT_RUNTIME_DB_URL);
  setEnvValue(lines, "NEXT_PUBLIC_SENTRY_ENABLED", "false");
  setEnvValue(lines, "SENTRY_ENVIRONMENT", "prod-like");
  setEnvValue(lines, "PUBLIC_SEARCH_INDEX_REFRESH_INTERVAL_SECONDS", "0");
  setEnvValue(lines, "NODE_OPTIONS", "--max-old-space-size=4096");
  commentOutEnvValue(lines, "SENTRY_AUTH_TOKEN");
  commentOutEnvValue(lines, "TURSO_EMBEDDED_REPLICA_URL");
  commentOutEnvValue(lines, "TURSO_EMBEDDED_REPLICA_SYNC_INTERVAL_SECONDS");
  commentOutEnvValue(lines, "TURSO_EMBEDDED_REPLICA_SYNC_URL");

  return `${lines.join("\n").replace(/\n*$/, "")}\n`;
}

function buildBuildEnv(runtimeEnv) {
  const lines = parseEnvLines(runtimeEnv);
  setEnvValue(lines, "DATABASE_URL", DEFAULT_BUILD_DB_URL);
  setEnvValue(lines, "SENTRY_SOURCEMAPS_DISABLED", "1");
  return `${lines.join("\n").replace(/\n*$/, "")}\n`;
}

function writeIfChanged(filePath, contents, mode) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (
    fs.existsSync(filePath) &&
    fs.readFileSync(filePath, "utf8") === contents
  ) {
    return;
  }
  fs.writeFileSync(filePath, contents, mode ? { mode } : undefined);
}

function writeComposeOverride(buildEnv) {
  const fingerprint = crypto
    .createHash("sha256")
    .update(buildEnv)
    .digest("hex")
    .slice(0, 16);

  const contents = `services:
  app:
    build:
      context: ../..
      dockerfile: apps/main/Dockerfile
      args:
        BUILD_ENV_FINGERPRINT: prod-like-${fingerprint}
        GIT_COMMIT_SHA: ${DEFAULT_LOCAL_RELEASE}
    volumes:
      - ./prisma/local-prod-copy-daylily-catalog.db:/data/daylilycatalog.sqlite

secrets:
  app_env:
    file: local/.env.production.build
`;

  writeIfChanged(composeOverridePath, contents);
}

function prepareBuildDb() {
  requireFile(
    runtimeDbPath,
    "Create the local production DB copy first, for example: CI=false pnpm env:dev bash scripts/db-backup.sh",
  );
  fs.copyFileSync(runtimeDbPath, buildDbPath);
}

function updateTunnelConfig({ tunnelHost, localPort }) {
  const configPath = path.join(os.homedir(), ".cloudflared", "config.yml");
  requireFile(configPath, "Cloudflare tunnel config not found.");

  const source = fs.readFileSync(configPath, "utf8");
  const lines = source.split(/\r?\n/);
  const hostPattern = new RegExp(
    `^\\s*-\\s*hostname:\\s*${escapeRegExp(tunnelHost)}\\s*$`,
  );
  const defaultServiceLine = `    service: http://127.0.0.1:${localPort}`;
  let changed = false;
  let found = false;

  for (let i = 0; i < lines.length; i++) {
    if (!hostPattern.test(lines[i])) continue;
    found = true;

    const entryIndent = lines[i].match(/^(\s*)-/)?.[1] ?? "";
    const serviceLine = `${entryIndent}  service: http://127.0.0.1:${localPort}`;
    const nextEntryPattern = new RegExp(`^${escapeRegExp(entryIndent)}-\\s+`);
    let blockEnd = i + 1;
    while (blockEnd < lines.length && !nextEntryPattern.test(lines[blockEnd])) {
      blockEnd++;
    }

    const serviceIndex = lines.findIndex((line, index) => {
      return index > i && index < blockEnd && /^\s*service:\s*/.test(line);
    });

    if (serviceIndex >= 0) {
      if (lines[serviceIndex] !== serviceLine) {
        lines[serviceIndex] = serviceLine;
        changed = true;
      }
    } else {
      lines.splice(i + 1, 0, serviceLine);
      changed = true;
    }

    break;
  }

  if (!found) {
    const ingressIndex = lines.findIndex((line) =>
      /^\s*ingress:\s*$/.test(line),
    );
    if (ingressIndex < 0) {
      throw new Error(`No ingress block found in ${configPath}`);
    }

    lines.splice(
      ingressIndex + 1,
      0,
      `  - hostname: ${tunnelHost}`,
      defaultServiceLine,
    );
    changed = true;
  }

  if (changed) {
    const backupPath = `${configPath}.bak-${timestamp()}`;
    fs.copyFileSync(configPath, backupPath);
    fs.writeFileSync(configPath, `${lines.join("\n").replace(/\n*$/, "")}\n`);
    return backupPath;
  }

  return null;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const envSource = options.skipEnvPull
    ? fs.readFileSync(runtimeEnvPath, "utf8")
    : pullRemoteEnv(options);
  const runtimeEnv = buildRuntimeEnv(envSource, options);
  const buildEnv = buildBuildEnv(runtimeEnv);

  prepareBuildDb();
  writeIfChanged(runtimeEnvPath, runtimeEnv, 0o600);
  writeIfChanged(buildEnvPath, buildEnv, 0o600);
  writeComposeOverride(buildEnv);

  const tunnelBackup = options.skipTunnelConfig
    ? null
    : updateTunnelConfig({
        tunnelHost: options.tunnelHost,
        localPort: options.localPort,
      });

  console.log("Prepared prod-like local smoke files:");
  console.log(`- ${path.relative(repoRoot, runtimeEnvPath)}`);
  console.log(`- ${path.relative(repoRoot, buildEnvPath)}`);
  console.log(`- ${path.relative(repoRoot, composeOverridePath)}`);
  console.log(`- ${path.relative(repoRoot, buildDbPath)}`);
  if (tunnelBackup) {
    console.log(`Updated ~/.cloudflared/config.yml; backup: ${tunnelBackup}`);
  } else if (!options.skipTunnelConfig) {
    console.log(
      "Cloudflare tunnel config already pointed at the requested local port.",
    );
  }
  console.log("");
  console.log("Next:");
  console.log(
    "  docker compose -f compose.local.yaml -f local/compose.prod-like.override.yaml up --build -d",
  );
  console.log("  pnpm start-tunnel");
  console.log(`  open https://${options.tunnelHost}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
