import { captureException, setContext } from "@/lib/sentry";

export interface ErrorReporterOptions {
  error: Error;
  context?: {
    source?: string;
    errorInfo?: React.ErrorInfo | Record<string, unknown>;
    [key: string]: unknown;
  };
}

export function reportError({ error, context = {} }: ErrorReporterOptions) {
  try {
    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.group("Error Report");
      console.error("Error:", error);
      console.error("Additional Context:", context);
      console.groupEnd();
    }

    // Send error to Sentry
    const componentStack = context?.errorInfo?.componentStack;
    if (componentStack) {
      // Add React component stack as context
      setContext("reactComponentStack", { componentStack });
    }

    // Add any additional context
    if (Object.keys(context).length > 0) {
      setContext("additionalContext", context);
    }

    // Capture the exception in Sentry
    captureException(error);
  } catch (error) {
    console.error("Report error failed:", error);
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
