"use client";

import posthog from "posthog-js";

export const POSTHOG_EVENT_NAMES = {
  home_signup_cta_clicked: true,
  seller_landing_viewed: true,
  seller_cta_clicked: true,
  seller_example_clicked: true,
  auth_started: true,
  onboarding_entry_viewed: true,
  trial_started: true,
  membership_skipped: true,
  catalog_published: true,
  public_nav_dashboard_clicked: true,
  onboarding_step_viewed: true,
  onboarding_step_completed: true,
  onboarding_profile_saved: true,
  onboarding_listing_saved: true,
  onboarding_aha_reached: true,
  onboarding_skipped: true,
  onboarding_membership_screen_viewed: true,
  onboarding_membership_continue_for_now_clicked: true,
  checkout_started: true,
  checkout_redirect_ready: true,
  checkout_failed: true,
} as const;

export type PosthogEventName = keyof typeof POSTHOG_EVENT_NAMES;

export type PosthogEventProperties = Record<
  string,
  boolean | null | number | string | undefined
>;

export interface PosthogUserIdentity {
  id: string;
  email?: string;
}

function canUsePosthog() {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  return process.env.NODE_ENV === "production" && Boolean(posthogKey);
}

export function capturePosthogEvent(
  event: PosthogEventName,
  properties?: PosthogEventProperties,
) {
  if (!canUsePosthog()) {
    return;
  }

  posthog.capture(event, properties);
}

export function identifyPosthogUser(identity: PosthogUserIdentity) {
  if (!canUsePosthog()) {
    return;
  }

  posthog.identify(identity.id, {
    email: identity.email,
  });
}

export function resetPosthogUser() {
  if (!canUsePosthog()) {
    return;
  }

  posthog.reset();
}
