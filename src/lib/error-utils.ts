import { type ErrorInfo as ReactErrorInfo } from "react";

export interface ErrorReporterOptions {
  error: Error;
  errorInfo?: ReactErrorInfo;
  context?: Record<string, unknown>;
}

export function reportError({
  error,
  errorInfo,
  context = {},
}: ErrorReporterOptions) {
  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.group("Error Report");
    console.error("Error:", error);
    console.error("Component Stack:", errorInfo?.componentStack);
    console.error("Additional Context:", context);
    console.groupEnd();
  }

  // Here you can add additional error reporting services like:
  // - Sentry
  // - LogRocket
  // - Application Insights
  // etc.
}

export function logError(error: Error, info: ReactErrorInfo) {
  reportError({ error, errorInfo: info });
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
