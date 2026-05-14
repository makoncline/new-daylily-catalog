"use client";

import * as Sentry from "@sentry/nextjs";

/**
 * Captures an exception in Sentry
 */
export function captureException(error: unknown): void {
  Sentry.captureException(error);
}

/**
 * Captures a message in Sentry
 */
export function captureMessage(
  message: string,
  level?: Sentry.SeverityLevel,
): void {
  Sentry.captureMessage(message, level);
}

/**
 * Set user information for better error tracking
 */
export function setUser(user: {
  id: string;
  email?: string;
  username?: string;
}): void {
  Sentry.setUser(user);
}

/**
 * Clear user information (for signout)
 */
export function clearUser(): void {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb to track user actions for better context
 */
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Set context data for better error understanding
 */
export function setContext(
  name: string,
  context: Record<string, unknown>,
): void {
  Sentry.setContext(name, context);
}

/**
 * Set a tag for easier filtering in Sentry dashboard
 */
export function setTag(key: string, value: string): void {
  Sentry.setTag(key, value);
}

/**
 * Create a span for performance monitoring a specific operation
 */
export async function withSpan<T>(
  name: string,
  op: string,
  callback: () => Promise<T>,
): Promise<T> {
  return Sentry.startSpan({ name, op }, callback);
}
