const NEXT_PUBLIC_PREFIX = "NEXT_PUBLIC";

const SENTRY_ENABLED_ENV_NAME = `${NEXT_PUBLIC_PREFIX}_SENTRY_ENABLED`;
const POSTHOG_KEY_ENV_NAME = `${NEXT_PUBLIC_PREFIX}_POSTHOG_KEY`;
const POSTHOG_HOST_ENV_NAME = `${NEXT_PUBLIC_PREFIX}_POSTHOG_HOST`;

function readRuntimeEnv(name: string) {
  return process.env[name];
}

function requireRuntimeEnv(name: string) {
  const value = readRuntimeEnv(name);
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

export function getRuntimeSentryEnabled() {
  const value = requireRuntimeEnv(SENTRY_ENABLED_ENV_NAME);
  if (value !== "true" && value !== "false") {
    throw new Error(`${SENTRY_ENABLED_ENV_NAME} must be set to true or false.`);
  }

  return value === "true";
}

export function getRuntimePosthogConfig() {
  const host = requireRuntimeEnv(POSTHOG_HOST_ENV_NAME);
  return {
    host: parsePosthogHost(host),
    posthogKey: requireRuntimeEnv(POSTHOG_KEY_ENV_NAME),
  };
}

export function getOptionalRuntimePosthogConfig() {
  const posthogKey = readRuntimeEnv(POSTHOG_KEY_ENV_NAME);
  const host = readRuntimeEnv(POSTHOG_HOST_ENV_NAME);

  if (!posthogKey && !host) {
    return null;
  }

  if (!posthogKey) {
    throw new Error(`${POSTHOG_KEY_ENV_NAME} is required.`);
  }

  if (!host) {
    throw new Error(`${POSTHOG_HOST_ENV_NAME} is required.`);
  }

  return {
    host: parsePosthogHost(host),
    posthogKey,
  };
}

function parsePosthogHost(host: string) {
  try {
    new URL(host);
  } catch {
    throw new Error(`${POSTHOG_HOST_ENV_NAME} must be a valid URL.`);
  }

  return host;
}
