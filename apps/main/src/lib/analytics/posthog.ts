"use client";

import posthog, { type CaptureResult } from "posthog-js";

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

interface ListingEditorTapDiagnostic {
  active_element: string | null;
  dialog_scroll_top: number;
  element_at_point: string | null;
  phase: "click" | "pointerdown";
  target: string | null;
  viewport_height: number;
  viewport_offset_top: number;
  x: number;
  y: number;
}

const listingEditorTapDiagnostics: ListingEditorTapDiagnostic[] = [];
let listingEditorTapDiagnosticsStarted = false;
let lastListingEditorTapAt = 0;

function describeElement(element: Element | null) {
  if (!element) return null;

  const form = element.closest("form");
  const formChildIndex = form
    ? Array.from(form.children).findIndex((child) => child.contains(element)) +
      1
    : 0;
  const name = element.getAttribute("name");
  const role = element.getAttribute("role");
  const slot = element.getAttribute("data-slot");

  return [
    element.tagName.toLowerCase(),
    name ? `[name=${name}]` : "",
    role ? `[role=${role}]` : "",
    slot ? `[data-slot=${slot}]` : "",
    formChildIndex ? `:form-child=${formChildIndex}` : "",
  ].join("");
}

function recordListingEditorTap(event: PointerEvent | MouseEvent) {
  if (window.location.pathname !== "/dashboard/listings") return;

  const target = event.target instanceof Element ? event.target : null;
  const form = target?.closest('[role="dialog"] form');
  if (!form) return;

  const dialog = form.closest('[role="dialog"]');
  const elementAtPoint = document.elementFromPoint?.(
    event.clientX,
    event.clientY,
  );
  const viewport = window.visualViewport;

  listingEditorTapDiagnostics.push({
    active_element: describeElement(
      document.activeElement instanceof Element ? document.activeElement : null,
    ),
    dialog_scroll_top: dialog instanceof HTMLElement ? dialog.scrollTop : 0,
    element_at_point: describeElement(elementAtPoint),
    phase: event.type as "click" | "pointerdown",
    target: describeElement(target),
    viewport_height: viewport?.height ?? window.innerHeight,
    viewport_offset_top: viewport?.offsetTop ?? 0,
    x: event.clientX,
    y: event.clientY,
  });
  lastListingEditorTapAt = Date.now();
  listingEditorTapDiagnostics.splice(
    0,
    Math.max(0, listingEditorTapDiagnostics.length - 8),
  );
}

function startListingEditorTapDiagnostics() {
  if (listingEditorTapDiagnosticsStarted) return;
  listingEditorTapDiagnosticsStarted = true;
  document.addEventListener("pointerdown", recordListingEditorTap, true);
  document.addEventListener("click", recordListingEditorTap, true);
}

function addListingEditorTapDiagnostics(event: CaptureResult | null) {
  if (
    event?.event !== "$rageclick" ||
    window.location.pathname !== "/dashboard/listings" ||
    Date.now() - lastListingEditorTapAt > 5_000 ||
    !listingEditorTapDiagnostics.length
  ) {
    return event;
  }

  return {
    ...event,
    properties: {
      ...event.properties,
      listing_editor_tap_diagnostics: [...listingEditorTapDiagnostics],
    },
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

  startListingEditorTapDiagnostics();
  posthog.init(runtimeConfig.posthog.key, {
    advanced_enable_surveys: true,
    api_host: runtimeConfig.posthog.host,
    before_send: addListingEditorTapDiagnostics,
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
