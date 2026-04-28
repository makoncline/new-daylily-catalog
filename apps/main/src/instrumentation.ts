import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next";

const isSentryEnabled = process.env.NEXT_PUBLIC_SENTRY_ENABLED !== "false";

export async function register() {
  if (!isSentryEnabled) {
    return;
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError: Instrumentation.onRequestError = (...args) => {
  if (isSentryEnabled) {
    Sentry.captureRequestError(...args);
  }
};
