// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN } from "./src/lib/sentry-config";
import { getRuntimeSentryEnabled } from "./src/lib/observability-env";

const isSentryEnabled = getRuntimeSentryEnabled();
const isProduction = process.env.NODE_ENV === "production";

if (isSentryEnabled) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // Enable logs to be sent to Sentry
    enableLogs: true,
    tracesSampleRate: isProduction ? 0.1 : 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,
  });
}
