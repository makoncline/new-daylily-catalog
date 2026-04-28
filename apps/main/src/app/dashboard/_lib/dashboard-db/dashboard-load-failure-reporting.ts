"use client";

import { getErrorMessage, reportError } from "@/lib/error-utils";

const TELEGRAM_ALERT_URL =
  "https://send-to-makon.vercel.app/api/send-telegram";

interface DashboardLoadFailureBrowserContext {
  url?: string;
  path?: string;
  host?: string;
  userAgent?: string;
  online?: boolean;
  visibilityState?: string;
}

export interface DashboardLoadFailureReport {
  error: unknown;
  userId: string;
  phase: string;
  startedAt: Date;
  failedAt: Date;
  elapsedMs: number;
  hydratedSnapshot: boolean;
  bootstrapActive: boolean;
}

export function reportDashboardLoadFailure(report: DashboardLoadFailureReport) {
  const browserContext = getBrowserContext();
  const errorMessage = getErrorMessage(report.error);

  let sentryEventId: string | undefined;
  try {
    sentryEventId = reportError({
      error: report.error,
      level: "error",
      context: {
        source: "dashboard-db-load",
        userId: report.userId,
        phase: report.phase,
        startedAt: report.startedAt.toISOString(),
        failedAt: report.failedAt.toISOString(),
        elapsedMs: report.elapsedMs,
        hydratedSnapshot: report.hydratedSnapshot,
        bootstrapActive: report.bootstrapActive,
        ...browserContext,
      },
    });
  } catch (error) {
    console.error("Dashboard load Sentry reporting failed", error);
  }

  sendTelegramDashboardLoadFailure({
    ...report,
    errorMessage,
    sentryEventId,
    browserContext,
  });
}

function getBrowserContext() {
  if (typeof window === "undefined") {
    return {} satisfies DashboardLoadFailureBrowserContext;
  }

  return {
    url: window.location.href,
    path: window.location.pathname,
    host: window.location.host,
    userAgent: window.navigator.userAgent,
    online: window.navigator.onLine,
    visibilityState: document.visibilityState,
  } satisfies DashboardLoadFailureBrowserContext;
}

function sendTelegramDashboardLoadFailure(args: DashboardLoadFailureReport & {
  errorMessage: string;
  sentryEventId: string | undefined;
  browserContext: DashboardLoadFailureBrowserContext;
}) {
  if (typeof fetch === "undefined") return;

  try {
    const message = buildTelegramMessage(args);
    const url = new URL(TELEGRAM_ALERT_URL);
    url.searchParams.set("subject", "Daylily dashboard load failed");
    url.searchParams.set("message", message);

    void fetch(url.toString(), {
      method: "GET",
      mode: "no-cors",
      credentials: "omit",
      keepalive: true,
    }).catch(() => undefined);
  } catch (error) {
    console.error("Dashboard load Telegram reporting failed", error);
  }
}

function buildTelegramMessage(args: DashboardLoadFailureReport & {
  errorMessage: string;
  sentryEventId: string | undefined;
  browserContext: DashboardLoadFailureBrowserContext;
}) {
  const context = args.browserContext;
  return [
    "Dashboard load failed",
    `User: ${args.userId}`,
    `Phase: ${args.phase}`,
    `Elapsed: ${args.elapsedMs}ms`,
    `Hydrated snapshot: ${args.hydratedSnapshot ? "yes" : "no"}`,
    `Bootstrap active: ${args.bootstrapActive ? "yes" : "no"}`,
    `Started: ${args.startedAt.toISOString()}`,
    `Failed: ${args.failedAt.toISOString()}`,
    `URL: ${String(context.url ?? "unknown")}`,
    `Host: ${String(context.host ?? "unknown")}`,
    `Online: ${String(context.online ?? "unknown")}`,
    `Visibility: ${String(context.visibilityState ?? "unknown")}`,
    `Sentry event: ${args.sentryEventId ?? "not captured"}`,
    `Error: ${args.errorMessage}`,
    `User agent: ${String(context.userAgent ?? "unknown")}`,
  ].join("\n");
}
