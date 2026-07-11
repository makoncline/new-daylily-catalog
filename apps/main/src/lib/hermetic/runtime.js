import path from "node:path";
export { getHermeticPersona, HERMETIC_PERSONAS } from "./personas.js";

/**
 * @typedef {object} HermeticRuntimeInput
 * @property {string | undefined} nodeEnv
 * @property {string | undefined} databaseUrl
 * @property {string | undefined} appBaseUrl
 * @property {string | undefined} [clerkSecretKey]
 * @property {string | undefined} [stripeSecretKey]
 * @property {string} appRoot
 */

/** @param {string | undefined} value */
function assertLocalAppUrl(value) {
  if (!value) {
    throw new Error("Hermetic mode requires APP_BASE_URL.");
  }

  const url = new URL(value);
  if (
    url.protocol !== "http:" ||
    !["localhost", "127.0.0.1", "::1"].includes(url.hostname)
  ) {
    throw new Error("Hermetic mode requires a local HTTP APP_BASE_URL.");
  }
}

/** @param {string | undefined} value @param {string} appRoot */
function assertSafeDatabase(value, appRoot) {
  if (!value?.startsWith("file:")) {
    throw new Error("Hermetic mode requires a local SQLite DATABASE_URL.");
  }

  const databasePath = value.slice("file:".length);
  const absolutePath = path.isAbsolute(databasePath)
    ? path.normalize(databasePath)
    : path.resolve(appRoot, databasePath);
  const allowedRoot = `${path.resolve(appRoot, "tests", ".tmp")}${path.sep}`;

  if (!absolutePath.startsWith(allowedRoot)) {
    throw new Error("Hermetic database must be stored under tests/.tmp.");
  }
}

/** @param {string} name @param {string | undefined} value */
function assertNoLiveSecret(name, value) {
  if (value?.toLowerCase().startsWith("sk_live")) {
    throw new Error(`Hermetic mode refuses ${name} live credentials.`);
  }
}

/** @param {HermeticRuntimeInput} input */
export function validateHermeticRuntime(input) {
  if (input.nodeEnv === "production") {
    throw new Error("Hermetic mode cannot run in production.");
  }

  assertSafeDatabase(input.databaseUrl, input.appRoot);
  assertLocalAppUrl(input.appBaseUrl);
  assertNoLiveSecret("Clerk", input.clerkSecretKey);
  assertNoLiveSecret("Stripe", input.stripeSecretKey);
}

export function isHermeticMode() {
  return process.env.HERMETIC_MODE === "1";
}
