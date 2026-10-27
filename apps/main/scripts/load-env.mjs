import nextEnv from "@next/env";
import path from "node:path";

export const appRoot = path.resolve(import.meta.dirname, "..");

/** @param {string} [stage] */
export function loadAppEnv(stage = process.env.NODE_ENV ?? "development") {
  /** @type {Record<string, string | undefined>} */
  const environment = process.env;
  const runtimeMode = environment.NODE_ENV;
  // @next/env uses NODE_ENV for test-file selection. Keep the target runtime mode.
  environment.NODE_ENV = stage;
  try {
    // Production file delivery remains on its current path until its separate cutover.
    const root =
      stage === "production" ? path.resolve(appRoot, "../..") : appRoot;
    nextEnv.loadEnvConfig(root, stage === "development", console, true);
  } finally {
    if (runtimeMode === undefined) delete environment.NODE_ENV;
    else environment.NODE_ENV = runtimeMode;
  }
}
