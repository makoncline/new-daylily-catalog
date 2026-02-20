// This file configures the initialization of client-side observability libraries.
// Next.js 15.3+ loads this file automatically.

import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";

const isSentryEnabled = process.env.NEXT_PUBLIC_SENTRY_ENABLED !== "false";
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const isProduction = process.env.NODE_ENV === "production";

if (isProduction && posthogKey) {
  posthog.init(posthogKey, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    defaults: "2026-01-30",
  });
}

if (isSentryEnabled) {
  Sentry.init({
    dsn: "https://b3773458fec6aa0c594a9c1c73ed046a@o1136137.ingest.us.sentry.io/4508939597643776",

    integrations: [Sentry.replayIntegration()],
    enableLogs: true,
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
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
