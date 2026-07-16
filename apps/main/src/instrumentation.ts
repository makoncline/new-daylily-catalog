import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next";
import { getRuntimeSentryEnabled } from "@/lib/observability-env";

const isSentryEnabled = getRuntimeSentryEnabled();

export async function register() {
  if (
    process.env.INTEGRATION_MODE === "1" &&
    process.env.NEXT_RUNTIME === "nodejs"
  ) {
    await import("@/server/db");
    const { installIntegrationNetworkGuard } = await import(
      "../scripts/integration-network-guard.mjs"
    );
    installIntegrationNetworkGuard();
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startMemoryTelemetry } = await import(
      "@/server/observability/memory-telemetry"
    );
    startMemoryTelemetry();
  }

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
