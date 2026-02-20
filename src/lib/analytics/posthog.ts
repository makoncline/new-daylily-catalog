"use client";

import posthog from "posthog-js";

export type PosthogEventName =
  | "home_signup_cta_clicked"
  | "public_nav_dashboard_clicked"
  | "checkout_started"
  | "checkout_redirect_ready"
  | "checkout_failed";

export type PosthogEventProperties = Record<
  string,
  boolean | null | number | string | undefined
>;

function canCapturePosthogEvents() {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  return process.env.NODE_ENV === "production" && Boolean(posthogKey);
}

export function capturePosthogEvent(
  event: PosthogEventName,
  properties?: PosthogEventProperties,
) {
  if (!canCapturePosthogEvents()) {
    return;
  }

  posthog.capture(event, properties);
}
