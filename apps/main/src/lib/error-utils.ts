import * as Sentry from "@sentry/nextjs";
import {
  getErrorContext,
  getLogContext,
  logEvent,
  sanitizeTelemetry,
  setErrorContext,
  validCorrelationId,
} from "./telemetry";

export interface ErrorReporterOptions {
  error: unknown;
  level?: Sentry.SeverityLevel;
  context?: {
    source?: string;
    errorInfo?: React.ErrorInfo | Record<string, unknown>;
    [key: string]: unknown;
  };
}

export function reportError({
  error,
  level = "error",
  context = {},
}: ErrorReporterOptions) {
  try {
    const err = normalizeError(error);
    const message = err.message;

    const logContext = getErrorContext(error) ?? getLogContext();
    const correlationId =
      validCorrelationId(context.correlation_id) ?? logContext.correlation_id;
    setErrorContext(err, { ...logContext, correlation_id: correlationId });
    logEvent(
      level === "fatal"
        ? "error"
        : level === "warning"
          ? "warn"
          : level === "log"
            ? "info"
            : level,
      "application_error",
      {
        ...context,
        ...logContext,
        correlation_id: correlationId,
        error: err,
      },
    );

    // Build per-event context
    const componentStack = context?.errorInfo?.componentStack;
    const { source, ...extraRest } = context;

    const captureOptions = {
      level,
      // structured block for the React stack (shows under Contexts)
      contexts: componentStack
        ? { reactComponentStack: { componentStack } }
        : undefined,
      // arbitrary key/values (shows under Additional Data)
      extra: sanitizeTelemetry({
        ...extraRest,
        ...logContext,
        correlation_id: correlationId,
      }) as Record<string, unknown>,
      // indexed metadata for filtering in Sentry UI
      tags: {
        ...(source ? { source: String(source) } : {}),
        correlation_id: correlationId,
      },
    };

    // Capture and return eventId for correlation if you want to log it
    const eventId =
      level === "error" || level === "fatal"
        ? Sentry.captureException(err, captureOptions)
        : Sentry.captureMessage(message, captureOptions);

    return eventId;
  } catch (e) {
    console.error("Report error failed:", e);
    return undefined;
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unexpected error occurred";
}

export function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(getErrorMessage(error));
}
