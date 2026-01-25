// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isSentryEnabled = process.env.NEXT_PUBLIC_SENTRY_ENABLED !== "false";

if (isSentryEnabled) {
  Sentry.init({
    dsn: "https://b3773458fec6aa0c594a9c1c73ed046a@o1136137.ingest.us.sentry.io/4508939597643776",

    // Add optional integrations for additional features
    integrations: [Sentry.replayIntegration()],
    // Enable logs to be sent to Sentry
    enableLogs: true,

    // Define how likely Replay events are sampled.
    // This sets the sample rate to be 10%. You may want this to be 100% while
    // in development and sample at a lower rate in production
    replaysSessionSampleRate: 0.1,

    // Define how likely Replay events are sampled when an error occurs.
    replaysOnErrorSampleRate: 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
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
