"use client";

import * as Sentry from "@sentry/nextjs";

// Check if Sentry is enabled directly from environment
const isSentryEnabled = process.env.NEXT_PUBLIC_SENTRY_ENABLED !== "false";

/**
 * Captures an exception in Sentry
 */
export function captureException(error: unknown): void {
  if (isSentryEnabled) {
    Sentry.captureException(error);
  } else {
    // Fallback to console error when Sentry is disabled
    console.error("Sentry disabled - Error:", error);
  }
}

/**
 * Captures a message in Sentry
 */
export function captureMessage(
  message: string,
  level?: Sentry.SeverityLevel,
): void {
  if (isSentryEnabled) {
    Sentry.captureMessage(message, level);
  } else {
    // Fallback to console log when Sentry is disabled
    console.log(`Sentry disabled - Message (${level ?? "info"}):`);
    console.log(message);
  }
}

/**
 * Set user information for better error tracking
 */
export function setUser(user: {
  id: string;
  email?: string;
  username?: string;
}): void {
  if (isSentryEnabled) {
    Sentry.setUser(user);
  }
}

/**
 * Clear user information (for signout)
 */
export function clearUser(): void {
  if (isSentryEnabled) {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb to track user actions for better context
 */
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
  if (isSentryEnabled) {
    Sentry.addBreadcrumb(breadcrumb);
  }
}

/**
 * Set context data for better error understanding
 */
export function setContext(
  name: string,
  context: Record<string, unknown>,
): void {
  if (isSentryEnabled) {
    Sentry.setContext(name, context);
  }
}

/**
 * Set a tag for easier filtering in Sentry dashboard
 */
export function setTag(key: string, value: string): void {
  if (isSentryEnabled) {
    Sentry.setTag(key, value);
  }
}

/**
 * Create a span for performance monitoring a specific operation
 */
export async function withSpan<T>(
  name: string,
  op: string,
  callback: () => Promise<T>,
): Promise<T> {
  if (isSentryEnabled) {
    return Sentry.startSpan({ name, op }, callback);
  } else {
    // Just run the callback directly when Sentry is disabled
    return callback();
  }
}
