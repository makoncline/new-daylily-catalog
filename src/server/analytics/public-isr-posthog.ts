import { after } from "next/server";
import { captureServerPosthogEvent } from "@/server/analytics/posthog-server";

const PUBLIC_ISR_POSTHOG_DISTINCT_ID = "system:public-isr";

export const PUBLIC_ISR_POSTHOG_EVENTS = {
  INVALIDATED: "public_isr_invalidated",
  PAGE_GENERATED: "public_isr_page_generated",
} as const;

export interface TrackPublicIsrPageGenerationInput {
  routePath: string;
  routeType:
    | "catalogs_index"
    | "cultivar_page"
    | "home_page"
    | "profile_page"
    | "profile_page_paginated";
}

interface TrackPublicIsrInvalidationInputBase {
  sourcePage: string;
  transport: "direct" | "internal-route";
  triggerReason?: string;
  triggerSource: string;
}

export interface TrackPublicIsrPathInvalidationInput
  extends TrackPublicIsrInvalidationInputBase {
  path: string;
  type?: "page" | "layout";
}

export interface TrackPublicIsrTagInvalidationInput
  extends TrackPublicIsrInvalidationInputBase {
  profile: string;
  tag: string;
}

export function trackPublicIsrPageGeneration({
  routePath,
  routeType,
}: TrackPublicIsrPageGenerationInput) {
  after(() =>
    captureServerPosthogEvent({
      distinctId: PUBLIC_ISR_POSTHOG_DISTINCT_ID,
      event: PUBLIC_ISR_POSTHOG_EVENTS.PAGE_GENERATED,
      properties: {
        source_page: routePath,
        render_mode: "isr",
        route_path: routePath,
        route_type: routeType,
      },
    }),
  );
}

export function trackPublicIsrPathInvalidation({
  path,
  sourcePage,
  transport,
  triggerReason,
  triggerSource,
  type,
}: TrackPublicIsrPathInvalidationInput) {
  after(() =>
    captureServerPosthogEvent({
      distinctId: PUBLIC_ISR_POSTHOG_DISTINCT_ID,
      event: PUBLIC_ISR_POSTHOG_EVENTS.INVALIDATED,
      properties: {
        source_page: sourcePage,
        target_kind: "path",
        target_path: path,
        target_type: type ?? "page",
        transport,
        trigger_reason: triggerReason,
        trigger_source: triggerSource,
      },
    }),
  );
}

export function trackPublicIsrTagInvalidation({
  profile,
  sourcePage,
  tag,
  transport,
  triggerReason,
  triggerSource,
}: TrackPublicIsrTagInvalidationInput) {
  after(() =>
    captureServerPosthogEvent({
      distinctId: PUBLIC_ISR_POSTHOG_DISTINCT_ID,
      event: PUBLIC_ISR_POSTHOG_EVENTS.INVALIDATED,
      properties: {
        cache_profile: profile,
        source_page: sourcePage,
        target_kind: "tag",
        target_tag: tag,
        transport,
        trigger_reason: triggerReason,
        trigger_source: triggerSource,
      },
    }),
  );
}
