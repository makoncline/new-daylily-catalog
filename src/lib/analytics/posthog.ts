"use client";

import posthog from "posthog-js";

export const POSTHOG_EVENT_NAMES = {
  home_signup_cta_clicked: true,
  public_nav_dashboard_clicked: true,
  signup_completed: true,
  onboarding_step_viewed: true,
  onboarding_step_completed: true,
  onboarding_completed: true,
  onboarding_profile_saved: true,
  onboarding_listing_saved: true,
  onboarding_aha_reached: true,
  onboarding_skipped: true,
  onboarding_membership_screen_viewed: true,
  onboarding_membership_continue_for_now_clicked: true,
  checkout_started: true,
  checkout_redirect_ready: true,
  checkout_failed: true,
  trial_started: true,
  paid_activated: true,
  trial_canceled: true,
  seller_landing_viewed: true,
  seller_cta_clicked: true,
  seller_example_clicked: true,
  auth_started: true,
  onboarding_entry_viewed: true,
  membership_skipped: true,
  catalog_published: true,
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

function withDefaultSourcePage(properties?: PosthogEventProperties) {
  if (typeof window === "undefined") {
    return properties;
  }

  if (properties?.source_page) {
    return properties;
  }

  return {
    ...properties,
    source_page: window.location.pathname,
  };
}

export function capturePosthogEvent(
  event: PosthogEventName,
  properties?: PosthogEventProperties,
) {
  if (!canUsePosthog()) {
    return;
  }

  posthog.capture(event, withDefaultSourcePage(properties));
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
