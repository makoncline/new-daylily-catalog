import { captureException, captureMessage, setContext } from "@/lib/sentry";

export interface ErrorReporterOptions {
  error: Error;
  level?: "error" | "warning" | "info" | "debug" | "log" | "fatal";
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
    const message = error.message;
    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      const logArgs = [
        `${level.toUpperCase()}:`,
        message,
        "\nAdditional Context:",
        context,
      ];
      switch (level) {
        case "fatal":
        case "error":
          console.error(...logArgs);
          break;
        case "warning":
          console.warn(...logArgs);
          break;
        case "info":
          console.info(...logArgs);
          break;
        case "log":
        case "debug":
        default:
          console.log(...logArgs);
          break;
      }
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

    // Report based on level
    if (level === "error" || level === "fatal") {
      // For critical errors, use captureException
      captureException(error);
    } else {
      // For warnings, info, etc., use captureMessage
      captureMessage(message, level);
    }
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
