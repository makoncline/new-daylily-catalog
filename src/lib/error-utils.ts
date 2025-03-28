import { type ErrorInfo as ReactErrorInfo } from "react";
import { captureException, setContext } from "@/lib/sentry";

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

  // Send error to Sentry
  if (errorInfo?.componentStack) {
    // Add React component stack as context
    setContext("reactComponentStack", {
      componentStack: errorInfo.componentStack,
    });
  }

  // Add any additional context
  if (Object.keys(context).length > 0) {
    setContext("additionalContext", context);
  }

  // Capture the exception in Sentry
  captureException(error);
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
