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
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
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
  if (process.env.HERMETIC_MODE !== "1") return false;

  validateHermeticRuntime({
    nodeEnv: process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL,
    appBaseUrl: process.env.APP_BASE_URL,
    clerkSecretKey: process.env.CLERK_SECRET_KEY,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    appRoot: process.cwd(),
  });
  return true;
}

export function isRealisticDataMode() {
  if (!process.env.REALISTIC_DATA_RUNTIME_ID) return false;

  if (process.env.NODE_ENV === "production") {
    throw new Error("Realistic-data mode cannot run in production.");
  }
  assertLocalAppUrl(process.env.APP_BASE_URL);
  assertNoLiveSecret("Clerk", process.env.CLERK_SECRET_KEY);
  assertNoLiveSecret("Stripe", process.env.STRIPE_SECRET_KEY);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.startsWith("file:")) {
    throw new Error("Realistic-data mode requires a local SQLite database.");
  }
  const databasePath = path.resolve(databaseUrl.slice("file:".length));
  const allowedRoot = `${path.resolve(process.cwd(), "local", "realistic-data")}${path.sep}`;
  if (!databasePath.startsWith(allowedRoot)) {
    throw new Error(
      "Realistic-data database must be stored under local/realistic-data.",
    );
  }
  return true;
}
