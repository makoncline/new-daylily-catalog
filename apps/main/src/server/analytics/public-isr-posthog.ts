import { after } from "next/server";
import { captureServerPosthogEvent } from "@/server/analytics/posthog-server";

const PUBLIC_ISR_POSTHOG_DISTINCT_ID = "system:public-isr";

const PUBLIC_ISR_POSTHOG_EVENTS = {
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
