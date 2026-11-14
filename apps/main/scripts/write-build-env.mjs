import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const buildNames = {
  APP_BASE_URL: "BUILD_APP_BASE_URL",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "BUILD_CLERK_PUBLISHABLE_KEY",
  NEXT_PUBLIC_CLOUDFLARE_URL: "BUILD_CLOUDFLARE_URL",
  NEXT_PUBLIC_SENTRY_ENABLED: "BUILD_NEXT_PUBLIC_SENTRY_ENABLED",
  SENTRY_ENVIRONMENT: "BUILD_ENVIRONMENT_NAME",
  NEXT_PUBLIC_POSTHOG_KEY: "BUILD_NEXT_PUBLIC_POSTHOG_KEY",
  NEXT_PUBLIC_POSTHOG_HOST: "BUILD_NEXT_PUBLIC_POSTHOG_HOST",
  DATABASE_URL: "BUILD_DATABASE_URL",
  TURSO_DATABASE_AUTH_TOKEN: "BUILD_TURSO_DATABASE_AUTH_TOKEN",
  STRIPE_SECRET_KEY: "BUILD_STRIPE_SECRET_KEY",
  SENTRY_AUTH_TOKEN: "BUILD_SENTRY_AUTH_TOKEN",
};

function mask(value) {
  if (process.env.GITHUB_ACTIONS !== "true" || !value) return;
  const escaped = String(value)
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A");
  process.stdout.write(`::add-mask::${escaped}\n`);
}

function main() {
  const token = process.env.DAYLILY_OP_SERVICE_ACCOUNT_TOKEN;
  if (!token) {
    console.error(
      "DAYLILY_OP_SERVICE_ACCOUNT_TOKEN is required for the build env.",
    );
    process.exitCode = 1;
    return;
  }
  mask(token);
  for (const name of [
    "DATABASE_URL",
    "TURSO_DATABASE_AUTH_TOKEN",
    "STRIPE_SECRET_KEY",
    "SENTRY_AUTH_TOKEN",
  ])
    mask(process.env[buildNames[name]]);

  const loaded = spawnSync(
    "pnpm",
    ["exec", "varlock", "load", "--format", "json-full"],
    {
      cwd: path.resolve(import.meta.dirname, ".."),
      env: process.env,
      encoding: "utf8",
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
    },
  );
  if (loaded.status !== 0) {
    console.error(
      "Cannot load the build env from 1Password. Check APP_ENV and DAYLILY_OP_SERVICE_ACCOUNT_TOKEN.",
    );
    process.exitCode = 1;
    return;
  }
  const { config } = JSON.parse(loaded.stdout);
  const values = {};
  for (const [name, item] of Object.entries(config)) {
    if (item.isSensitive || name === "DATABASE_URL") mask(item.value);
    values[name] = item.value;
  }

  const required = [
    "APP_BASE_URL",
    "NEXT_PUBLIC_CLOUDFLARE_URL",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "DATABASE_URL",
    "TURSO_DATABASE_AUTH_TOKEN",
    "STRIPE_SECRET_KEY",
    "SENTRY_AUTH_TOKEN",
  ];
  const missing = required.filter((name) => !values[name]);
  if (missing.length) {
    console.error(`Required build env values are empty. ${missing.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  const hash = (value) =>
    createHash("sha256")
      .update(String(value ?? ""))
      .digest("hex");
  const differences = Object.entries(buildNames)
    .filter(
      ([name, oldName]) => hash(values[name]) !== hash(process.env[oldName]),
    )
    .map(([name]) => name);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      [
        "## Build env source comparison",
        "",
        ...differences.map((name) => `- ${name}`),
        "",
      ].join("\n"),
    );
  }
  const lines = Object.keys(buildNames).map((name) => {
    const value = String(values[name] ?? "").replaceAll("'", "'\\''");
    return `${name}='${value}'`;
  });
  writeFileSync(process.argv[2], `${lines.join("\n")}\n`, { mode: 0o600 });
}

try {
  main();
} catch {
  console.error("Cannot render the build env file.");
  process.exitCode = 1;
}
