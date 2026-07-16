const NEXT_PUBLIC_PREFIX = "NEXT_PUBLIC";

const SENTRY_ENABLED_ENV_NAME = `${NEXT_PUBLIC_PREFIX}_SENTRY_ENABLED`;
const SENTRY_RELEASE_ENV_NAME = "SENTRY_RELEASE";
const POSTHOG_KEY_ENV_NAME = `${NEXT_PUBLIC_PREFIX}_POSTHOG_KEY`;
const POSTHOG_HOST_ENV_NAME = `${NEXT_PUBLIC_PREFIX}_POSTHOG_HOST`;
const OBSERVABILITY_LOG_KEY = Symbol.for(
  "daylily-catalog.observability-status-logged",
);

interface ObservabilityStatus {
  sentry: {
    enabled: boolean;
    reason: string | null;
  };
  posthog: {
    enabled: boolean;
    host: string | null;
    keyConfigured: boolean;
    reason: string | null;
  };
}

interface ObservabilityGlobal {
  [OBSERVABILITY_LOG_KEY]?: boolean;
}

function readRuntimeEnv(name: string) {
  return process.env[name];
}

export function getObservabilityStatus() {
  const sentryEnabledValue = readRuntimeEnv(SENTRY_ENABLED_ENV_NAME);
  const posthogKey = readRuntimeEnv(POSTHOG_KEY_ENV_NAME);
  const posthogHost = readRuntimeEnv(POSTHOG_HOST_ENV_NAME);
  const posthogHostReason = getPosthogHostDisabledReason(posthogHost);
  const status: ObservabilityStatus = {
    sentry: {
      enabled: sentryEnabledValue === "true",
      reason: getSentryDisabledReason(sentryEnabledValue),
    },
    posthog: {
      enabled:
        Boolean(posthogKey) && Boolean(posthogHost) && !posthogHostReason,
      host: posthogHost ?? null,
      keyConfigured: Boolean(posthogKey),
      reason:
        getPosthogKeyDisabledReason(posthogKey) ??
        getPosthogHostDisabledReason(posthogHost),
    },
  };

  logObservabilityStatusOnce(status);
  return status;
}

export function getRuntimeSentryEnabled() {
  return getObservabilityStatus().sentry.enabled;
}

export function getRuntimeSentryRelease() {
  const release = readRuntimeEnv(SENTRY_RELEASE_ENV_NAME)?.trim();
  return release === "" ? null : (release ?? null);
}

export function getRuntimePosthogConfig() {
  const status = getObservabilityStatus();
  if (!status.posthog.enabled || !status.posthog.host) {
    return null;
  }

  return {
    host: status.posthog.host,
    posthogKey: readRuntimeEnv(POSTHOG_KEY_ENV_NAME)!,
  };
}

export function getRuntimePosthogClientConfig() {
  return getRuntimePosthogConfig();
}

export function getOptionalRuntimePosthogConfig() {
  return getRuntimePosthogConfig();
}

function getSentryDisabledReason(value: string | undefined) {
  if (value === "true") {
    return null;
  }

  if (value === "false") {
    return "disabled_by_env";
  }

  if (!value) {
    return "missing_env";
  }

  return "invalid_env";
}

function getPosthogKeyDisabledReason(value: string | undefined) {
  return value ? null : "missing_key";
}

function getPosthogHostDisabledReason(value: string | undefined) {
  if (!value) {
    return "missing_host";
  }

  try {
    new URL(value);
    return null;
  } catch {
    return "invalid_host";
  }
}

function logObservabilityStatusOnce(status: ObservabilityStatus) {
  const globalState = globalThis as ObservabilityGlobal;
  if (globalState[OBSERVABILITY_LOG_KEY]) {
    return;
  }

  globalState[OBSERVABILITY_LOG_KEY] = true;
  console.info(
    JSON.stringify({
      event: "observability_status",
      nodeEnv: process.env.NODE_ENV ?? null,
      vercelEnv: process.env.VERCEL_ENV ?? null,
      sentry: status.sentry,
      posthog: status.posthog,
    }),
  );
}
