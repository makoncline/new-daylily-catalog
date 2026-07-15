"use client";

import posthog from "posthog-js";

export type PosthogEventName =
  | "home_signup_cta_clicked"
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
  | "trial_canceled"
  | "listing_page_viewed"
  | "listing_link_copied"
  | "catalog_link_copied"
  | "public_listing_contact_clicked"
  | "public_catalog_contact_clicked"
  | "public_cultivar_search_result_opened"
  | "seller_order_method_clicked"
  | "first_listing_created"
  | "first_image_uploaded"
  | "image_upload_failed"
  | "seo_landing_page_cta_clicked"
  | "facebook_share_text_generated"
  | "facebook_share_text_copied"
  | "seller_landing_viewed"
  | "seller_cta_clicked"
  | "seller_example_clicked"
  | "onboarding_entry_viewed"
  | "membership_skipped"
  | "catalog_published";

export type PosthogEventProperties = Record<
  string,
  boolean | null | number | string | undefined
>;

export interface PosthogUserIdentity {
  id: string;
  email?: string;
}

interface RuntimeConfig {
  posthog: {
    enabled?: boolean;
    key?: string;
    host?: string;
  };
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

let posthogEnabledPromise: Promise<boolean> | undefined;

async function isPosthogEnabled() {
  if (posthogEnabledPromise) {
    return posthogEnabledPromise;
  }

  posthogEnabledPromise = initializePosthog().catch((error: unknown) => {
    posthogEnabledPromise = undefined;
    throw error;
  });

  return posthogEnabledPromise;
}

async function initializePosthog() {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  const response = await fetch("/api/runtime-config", {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Runtime config request failed: ${response.status}`);
  }

  const runtimeConfig = (await response.json()) as RuntimeConfig;
  if (
    !runtimeConfig.posthog.enabled ||
    !runtimeConfig.posthog.key ||
    !runtimeConfig.posthog.host
  ) {
    return false;
  }

  posthog.init(runtimeConfig.posthog.key, {
    advanced_enable_surveys: true,
    api_host: runtimeConfig.posthog.host,
    defaults: "2026-01-30",
  });

  return true;
}

function reportPosthogError(error: unknown) {
  console.error("PostHog initialization failed", error);
}

function runWithPosthog(callback: () => void) {
  void isPosthogEnabled()
    .then((isEnabled) => {
      if (isEnabled) {
        callback();
      }
    })
    .catch(reportPosthogError);
}

export function capturePosthogEvent(
  event: PosthogEventName,
  properties?: PosthogEventProperties,
) {
  const eventProperties = withDefaultSourcePage(properties);
  runWithPosthog(() => posthog.capture(event, eventProperties));
}

export function preloadPosthog() {
  runWithPosthog(() => undefined);
}

export function identifyPosthogUser(identity: PosthogUserIdentity) {
  runWithPosthog(() => {
    posthog.identify(identity.id, {
      email: identity.email,
    });
  });
}

export function resetPosthogUser() {
  runWithPosthog(() => posthog.reset());
}
