import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next";

const isSentryEnabled = process.env.NEXT_PUBLIC_SENTRY_ENABLED !== "false";

export const onRequestError: Instrumentation.onRequestError = (...args) => {
  if (isSentryEnabled) {
    Sentry.captureRequestError(...args);
  }
};
