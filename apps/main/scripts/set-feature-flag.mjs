#!/usr/bin/env node

import { open, readFile, rename, rm, stat, writeFile } from "node:fs/promises";

const flagsPath =
  process.env.RUNTIME_FEATURE_FLAGS_PATH ?? "/data/runtime-feature-flags.json";
const runtimeConfigUrl =
  process.env.RUNTIME_CONFIG_URL ?? "http://127.0.0.1:3000/api/runtime-config";
const lockPath = `${flagsPath}.lock`;
const lockStaleMs = 60_000;

async function getRuntimeFeatures() {
  const response = await fetch(runtimeConfigUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Runtime config request failed: ${response.status}`);
  }

  const runtimeConfig = await response.json();
  if (
    !runtimeConfig ||
    typeof runtimeConfig !== "object" ||
    !runtimeConfig.features ||
    typeof runtimeConfig.features !== "object"
  ) {
    throw new Error("Runtime config response has no feature snapshot.");
  }

  return runtimeConfig.features;
}

async function readFlags() {
  try {
    const flags = JSON.parse(await readFile(flagsPath, "utf8"));
    if (!flags || typeof flags !== "object" || Array.isArray(flags)) {
      throw new Error("Feature flag file must contain a JSON object.");
    }
    return flags;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

async function acquireUpdateLock() {
  try {
    const handle = await open(lockPath, "wx");
    return async () => {
      await handle.close();
      await rm(lockPath, { force: true });
    };
  } catch (error) {
    if (error?.code !== "EEXIST") {
      throw error;
    }
  }

  try {
    const lockAgeMs = Date.now() - (await stat(lockPath)).mtimeMs;
    if (lockAgeMs < lockStaleMs) {
      throw new Error("Another feature flag update is in progress.");
    }
    await rm(lockPath, { force: true });
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  return acquireUpdateLock();
}

async function main() {
  const [name, rawValue, ...extraArguments] = process.argv.slice(2);
  if (
    !name ||
    !["true", "false"].includes(rawValue) ||
    extraArguments.length > 0
  ) {
    throw new Error("Usage: set-feature-flag.mjs <name> <true|false>");
  }

  const runtimeFeatures = await getRuntimeFeatures();
  if (!Object.hasOwn(runtimeFeatures, name)) {
    throw new Error(`Unknown runtime feature flag: ${name}`);
  }

  const enabled = rawValue === "true";
  const releaseLock = await acquireUpdateLock();
  let previousConfigured;
  try {
    const flags = await readFlags();
    previousConfigured = flags[name] === true;
    flags[name] = enabled;

    const temporaryPath = `${flagsPath}.${process.pid}.tmp`;
    try {
      await writeFile(temporaryPath, `${JSON.stringify(flags, null, 2)}\n`);
      await rename(temporaryPath, flagsPath);
    } finally {
      await rm(temporaryPath, { force: true });
    }
  } finally {
    await releaseLock();
  }

  const effectiveFeatures = await getRuntimeFeatures();
  console.log(
    JSON.stringify({
      name,
      previousConfigured,
      configured: enabled,
      effective: effectiveFeatures[name] === true,
    }),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
