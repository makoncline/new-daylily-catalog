import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
export const FORBIDDEN_SERVICE_ENV = [
  "CLERK_WEBHOOK_SECRET",
  "STRIPE_WEBHOOK_SECRET",
  "TURSO_DATABASE_AUTH_TOKEN",
  "TURSO_EMBEDDED_REPLICA_URL",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_REGION",
  "AWS_BUCKET_NAME",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_BASE_URL",
  "SENTRY_AUTH_TOKEN",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "NEXT_PUBLIC_POSTHOG_HOST",
  "OPENAI_IMAGE_MODERATION_API_KEY",
];

/** @param {string | undefined} value @param {string} label */
function requireLoopbackUrl(value, label) {
  if (!value) throw new Error(`Integration mode requires ${label}.`);

  const url = new URL(value);
  if (url.protocol !== "http:" || !LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error(`${label} must be loopback HTTP. Got: ${value}`);
  }
  return url;
}

/** @param {string | undefined} value @param {string} appRoot */
function requireDisposableDatabase(value, appRoot) {
  if (!value?.startsWith("file:")) {
    throw new Error("Integration mode requires a local file: DATABASE_URL.");
  }

  const databasePath = value.slice("file:".length);
  const absolutePath = path.isAbsolute(databasePath)
    ? path.normalize(databasePath)
    : path.resolve(appRoot, databasePath);
  const allowedRoot = `${path.resolve(appRoot, "tests", ".tmp")}${path.sep}`;

  if (!absolutePath.startsWith(allowedRoot)) {
    throw new Error(
      `Integration DATABASE_URL must be under tests/.tmp. Got: ${absolutePath}`,
    );
  }
}

/** @param {string} name @param {string | undefined} value */
function requirePlaceholder(name, value) {
  if (!value || !/(integration|placeholder)/i.test(value)) {
    throw new Error(`Integration mode refuses non-placeholder ${name}.`);
  }
}

/**
 * @param {{
 *   appRoot: string;
 *   nodeEnv?: string;
 *   integrationMode?: string;
 *   appBaseUrl?: string;
 *   databaseUrl?: string;
 *   env?: Record<string, string | undefined>;
 * }} runtime
 */
export function validateIntegrationRuntime({
  appRoot,
  nodeEnv,
  integrationMode,
  appBaseUrl,
  databaseUrl,
  env = {},
}) {
  if (integrationMode !== "1") {
    throw new Error("Integration mode must be explicitly enabled.");
  }
  if (nodeEnv === "production") {
    throw new Error("Integration mode cannot run in production.");
  }

  requireLoopbackUrl(appBaseUrl, "APP_BASE_URL");
  requireDisposableDatabase(databaseUrl, appRoot);
  requirePlaceholder("CLERK_SECRET_KEY", env.CLERK_SECRET_KEY);
  requirePlaceholder(
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );
  requirePlaceholder("STRIPE_SECRET_KEY", env.STRIPE_SECRET_KEY);

  for (const name of FORBIDDEN_SERVICE_ENV) {
    if (env[name]) {
      throw new Error(`Integration mode refuses ${name}.`);
    }
  }
}

/** @param {string} url */
function blocked(url) {
  throw new Error(`Blocked outbound integration request: ${url}`);
}

/** @param {string | URL} value */
function assertLoopbackDestination(value) {
  const url = value instanceof URL ? value : new URL(String(value));
  if (!LOOPBACK_HOSTS.has(url.hostname)) blocked(url.href);
}

/**
 * @param {URL} input
 * @param {import("node:http").RequestOptions | undefined} options
 */
function applyRequestOptions(input, options) {
  const url = new URL(input);
  if (!options) return url;

  if (options.protocol) url.protocol = options.protocol;
  if (options.hostname) url.hostname = String(options.hostname);
  else if (options.host) url.host = String(options.host);
  if (options.port !== undefined) url.port = String(options.port);
  if (options.path !== undefined) {
    const pathUrl = new URL(String(options.path), url.origin);
    url.pathname = pathUrl.pathname;
    url.search = pathUrl.search;
  }
  return url;
}

/**
 * @param {string} defaultProtocol
 * @param {string | URL | import("node:http").RequestOptions} input
 * @param {import("node:http").RequestOptions | undefined} options
 */
function requestUrl(defaultProtocol, input, options) {
  if (input instanceof URL || typeof input === "string") {
    return applyRequestOptions(new URL(input), options);
  }

  return applyRequestOptions(
    new URL(`${input?.protocol ?? defaultProtocol}//localhost/`),
    input,
  );
}

/**
 * @param {typeof import("node:http") | typeof import("node:https")} module
 * @param {string} defaultProtocol
 */
function guardHttpModule(module, defaultProtocol) {
  const originalRequest = module.request.bind(module);
  const originalGet = module.get.bind(module);

  module.request = /** @type {typeof module.request} */ (
    /** @param {...unknown} args */
    function guardedRequest(...args) {
      const [input, options] =
        /** @type {[string | URL | import("node:http").RequestOptions, import("node:http").RequestOptions?]} */ (
          args
        );
      assertLoopbackDestination(requestUrl(defaultProtocol, input, options));
      return Reflect.apply(originalRequest, module, args);
    }
  );
  module.get = /** @type {typeof module.get} */ (
    /** @param {...unknown} args */
    function guardedGet(...args) {
      const [input, options] =
        /** @type {[string | URL | import("node:http").RequestOptions, import("node:http").RequestOptions?]} */ (
          args
        );
      assertLoopbackDestination(requestUrl(defaultProtocol, input, options));
      return Reflect.apply(originalGet, module, args);
    }
  );
}

export function installIntegrationNetworkGuard() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = function guardedFetch(input, init) {
    const url = input instanceof Request ? input.url : input;
    assertLoopbackDestination(url);
    return originalFetch(input, init);
  };

  guardHttpModule(http, "http:");
  guardHttpModule(https, "https:");

  if (globalThis.WebSocket) {
    const NativeWebSocket = globalThis.WebSocket;
    globalThis.WebSocket = new Proxy(NativeWebSocket, {
      construct(target, args) {
        assertLoopbackDestination(args[0]);
        return Reflect.construct(target, args);
      },
    });
  }
}

if (process.env.INTEGRATION_NETWORK_GUARD === "1") {
  validateIntegrationRuntime({
    appRoot: process.cwd(),
    nodeEnv: process.env.NODE_ENV,
    integrationMode: process.env.INTEGRATION_MODE,
    appBaseUrl: process.env.APP_BASE_URL,
    databaseUrl: process.env.DATABASE_URL,
    env: process.env,
  });
  installIntegrationNetworkGuard();
}

/** @param {string} databaseUrl */
export function removeIntegrationDatabaseFiles(databaseUrl) {
  const databasePath = databaseUrl.slice("file:".length);
  for (const suffix of ["", "-shm", "-wal"]) {
    fs.rmSync(`${databasePath}${suffix}`, { force: true });
  }
}
