import * as Sentry from "@sentry/nextjs";

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

    if (process.env.NODE_ENV === "development") {
      const logArgs = [
        `${level.toUpperCase()}:`,
        message,
        "\nAdditional Context:",
        context,
      ];
      if (level === "fatal" || level === "error") {
        console.error(...logArgs);
      } else if (level === "warning") {
        console.warn(...logArgs);
      } else if (level === "info") {
        console.info(...logArgs);
      } else {
        console.log(...logArgs);
      }
    }

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
      extra: Object.keys(extraRest).length ? extraRest : undefined,
      // indexed metadata for filtering in Sentry UI
      tags: source ? { source: String(source) } : undefined,
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
