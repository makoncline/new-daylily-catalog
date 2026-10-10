import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next";
import { getRuntimeSentryEnabled } from "@/lib/observability-env";

import {
  getErrorContext,
  getLogContext,
  installConsoleLogging,
  logEvent,
  setErrorContext,
  validCorrelationId,
} from "@/lib/telemetry";
import { connectSentryLogging } from "@/lib/sentry-telemetry";

installConsoleLogging();

const isSentryEnabled = getRuntimeSentryEnabled();

export async function register() {
  connectSentryLogging();
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/server/observability/log-context");
  }
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

export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context,
) => {
  const previousContext = getErrorContext(error) ?? getLogContext();
  const logContext = {
    ...previousContext,
    ...(previousContext.correlation_scope === "runtime"
      ? {
          correlation_id:
            validCorrelationId(request.headers["x-correlation-id"]) ??
            crypto.randomUUID(),
          correlation_scope: "request" as const,
        }
      : {}),
    method: request.method,
    pathname: request.path.split("?")[0],
    route: context.routePath,
    route_type: context.routeType,
    render_source: context.renderSource,
    revalidate_reason: context.revalidateReason,
    content_type: request.headers["content-type"],
    cf_ray: request.headers["cf-ray"],
    release: process.env.SENTRY_RELEASE,
  };
  setErrorContext(error, logContext);
  logEvent("error", "next_request_failed", { ...logContext, error });
  if (isSentryEnabled) {
    Sentry.captureRequestError(error, request, context);
  }
};
