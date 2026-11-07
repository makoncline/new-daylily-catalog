import nextEnv from "@next/env";
import * as dotenv from "dotenv";
import path from "node:path";

export const appRoot = path.resolve(import.meta.dirname, "..");

/** @param {string} [stage] */
export function loadAppEnv(stage = process.env.NODE_ENV ?? "development") {
  if (stage === "production") {
    // Preserve the existing production fallback and its root-before-app precedence.
    dotenv.config({
      path: path.resolve(appRoot, "../../.env.production"),
      quiet: true,
    });
    dotenv.config({ path: path.join(appRoot, ".env.production"), quiet: true });
    return;
  }
  /** @type {Record<string, string | undefined>} */
  const environment = process.env;
  const runtimeMode = environment.NODE_ENV;
  // @next/env uses NODE_ENV for test-file selection. Keep the target runtime mode.
  environment.NODE_ENV = stage;
  try {
    nextEnv.loadEnvConfig(appRoot, stage === "development");
  } finally {
    if (runtimeMode === undefined) delete environment.NODE_ENV;
    else environment.NODE_ENV = runtimeMode;
  }
}
