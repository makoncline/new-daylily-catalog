#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { parse } from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const outDir = path.join(rootDir, ".server-deploy");
const deployHost = "vps-test.daylilycatalog.com";
const sourceEnvPath = path.join(rootDir, ".env.production");

const runtimeRequiredKeys = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_CLOUDFLARE_URL",
  "AWS_REGION",
  "AWS_BUCKET_NAME",
  "STRIPE_PRICE_ID",
  "CLERK_SECRET_KEY",
  "CLERK_WEBHOOK_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
];

const runtimeOptionalKeys = [
  "NEXT_PUBLIC_SENTRY_ENABLED",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "NEXT_PUBLIC_POSTHOG_HOST",
];

async function copyFile(name) {
  await fs.copyFile(path.join(rootDir, name), path.join(outDir, name));
}

function quoteEnvValue(value) {
  return JSON.stringify(value);
}

function getDefaultImageTag() {
  const override = process.env.IMAGE_TAG?.trim();
  if (override) {
    return override;
  }

  const shortSha = execFileSync("git", ["rev-parse", "--short=8", "HEAD"], {
    cwd: rootDir,
    encoding: "utf8",
  }).trim();

  return `main-${shortSha}`;
}

async function writeServerEnv() {
  let rawEnv;

  try {
    rawEnv = await fs.readFile(sourceEnvPath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      console.log("Skipped .server-deploy/.env because .env.production was not found");
      return;
    }

    throw error;
  }

  const sourceEnv = parse(rawEnv);
  const useTursoDb = sourceEnv.USE_TURSO_DB ?? "true";
  const envEntries = new Map([
    ["APP_BASE_URL", sourceEnv.APP_BASE_URL ?? `https://${deployHost}`],
    ["IMAGE_TAG", sourceEnv.IMAGE_TAG ?? getDefaultImageTag()],
    ["USE_TURSO_DB", useTursoDb],
  ]);

  for (const key of runtimeRequiredKeys) {
    const value = sourceEnv[key];
    if (!value) {
      throw new Error(`.env.production is missing required runtime key: ${key}`);
    }

    envEntries.set(key, value);
  }

  if (useTursoDb === "false") {
    const localDatabaseUrl = sourceEnv.LOCAL_DATABASE_URL;
    if (!localDatabaseUrl) {
      throw new Error(".env.production is missing required runtime key: LOCAL_DATABASE_URL");
    }

    envEntries.set("LOCAL_DATABASE_URL", localDatabaseUrl);
  } else {
    for (const key of ["TURSO_DATABASE_URL", "TURSO_DATABASE_AUTH_TOKEN"]) {
      const value = sourceEnv[key];
      if (!value) {
        throw new Error(`.env.production is missing required runtime key: ${key}`);
      }

      envEntries.set(key, value);
    }
  }

  for (const key of runtimeOptionalKeys) {
    const value = sourceEnv[key];
    if (value) {
      envEntries.set(key, value);
    }
  }

  const lines = [
    "# Generated from .env.production by pnpm deploy:bundle",
    "# Contains runtime vars for the VPS stack only.",
    "",
  ];

  for (const key of [...envEntries.keys()].sort()) {
    lines.push(`${key}=${quoteEnvValue(envEntries.get(key))}`);
  }

  lines.push("");

  await fs.writeFile(path.join(outDir, ".env"), lines.join("\n"));
}

async function main() {
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  await copyFile("compose.yaml");

  await fs.writeFile(
    path.join(outDir, "caddy-route.caddy"),
    `@daylilycatalog host ${deployHost}
handle @daylilycatalog {
  reverse_proxy app:3000
}
`,
  );
  await writeServerEnv();

  console.log(`Wrote ${path.relative(rootDir, outDir)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
