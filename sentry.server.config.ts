// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Check if Sentry is enabled directly from environment
const isSentryEnabled = process.env.NEXT_PUBLIC_SENTRY_ENABLED !== "false";

// Only initialize Sentry if it's enabled
if (isSentryEnabled) {
  Sentry.init({
    dsn: "https://b3773458fec6aa0c594a9c1c73ed046a@o1136137.ingest.us.sentry.io/4508939597643776",

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,
  });
} else {
  console.log("Sentry server is disabled by configuration");
}
