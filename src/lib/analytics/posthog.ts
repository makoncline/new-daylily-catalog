"use client";

import posthog from "posthog-js";

export type PosthogEventName =
  | "home_signup_cta_clicked"
  | "public_nav_dashboard_clicked"
  | "signup_completed"
  | "onboarding_step_viewed"
  | "onboarding_step_completed"
  | "onboarding_completed"
  | "onboarding_profile_saved"
  | "onboarding_listing_saved"
  | "onboarding_aha_reached"
  | "onboarding_skipped"
  | "onboarding_membership_screen_viewed"
  | "onboarding_membership_continue_for_now_clicked"
  | "checkout_started"
  | "checkout_redirect_ready"
  | "checkout_failed"
  | "trial_started"
  | "paid_activated"
  | "trial_canceled";

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
