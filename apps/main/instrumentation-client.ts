// This file configures the initialization of client-side observability libraries.
// Next.js 15.3+ loads this file automatically.

const isProduction = process.env.NODE_ENV === "production";
type SentryModule = typeof import("@sentry/nextjs");
type RouterTransitionStartArgs = Parameters<
  SentryModule["captureRouterTransitionStart"]
>;

interface RuntimeConfig {
  sentry?: {
    enabled?: boolean;
    dsn?: string;
    environment?: string;
    release?: string | null;
  };
}

async function initializeSentry(runtimeConfig: RuntimeConfig) {
  if (!runtimeConfig.sentry?.enabled || !runtimeConfig.sentry.dsn) {
    return false;
  }

  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn: runtimeConfig.sentry.dsn,
    environment: runtimeConfig.sentry.environment,
    release: runtimeConfig.sentry.release ?? undefined,

    integrations: [Sentry.replayIntegration()],
    enableLogs: true,
    tracesSampleRate: isProduction ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    debug: false,
    ignoreErrors: [
      /\baborterror\b/i,
      /\bfetch is aborted\b/i,
      /\bthe operation was aborted\b/i,
      /\babort\b.*\bpipeTo\b.*\bsignal\b/i,
    ],
    beforeSend(event, hint) {
      const hasAbortType = event.exception?.values?.some(
        (value) => value.type === "AbortError",
      );
      const original = hint?.originalException as { name?: string } | undefined;
      const hasAbortName = original?.name === "AbortError";
      return hasAbortType || hasAbortName ? null : event;
    },
  });
  return true;
}

async function initializeObservability() {
  const response = await fetch("/api/runtime-config", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Runtime config request failed: ${response.status}`);
  }

  return initializeSentry((await response.json()) as RuntimeConfig);
}

const sentryInitializedPromise = initializeObservability().catch(
  (error: unknown) => {
    console.error("Observability initialization failed:", error);
    return false;
  },
);

export function onRouterTransitionStart(...args: RouterTransitionStartArgs) {
  void sentryInitializedPromise.then(async (isInitialized) => {
    if (!isInitialized) {
      return;
    }

    const Sentry = await import("@sentry/nextjs");
    Sentry.captureRouterTransitionStart(...args);
  });
}
