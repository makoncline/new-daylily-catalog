import { after } from "next/server";
import type { PublicSeoRouteType } from "@/lib/public-seo-routes";
import { captureServerPosthogEvent } from "@/server/analytics/posthog-server";

const PUBLIC_HTML_ORIGIN_POSTHOG_DISTINCT_ID = "system:public-html-origin";

const PUBLIC_HTML_ORIGIN_POSTHOG_EVENTS = {
  PAGE_RENDERED: "public_html_origin_rendered",
} as const;

export interface TrackPublicHtmlOriginRenderedInput {
  routePath: string;
  routeType: PublicSeoRouteType;
}

export function trackPublicHtmlOriginRendered({
  routePath,
  routeType,
}: TrackPublicHtmlOriginRenderedInput) {
  // This measures origin render pressure only. CDN HITs should not emit it,
  // so it must not be interpreted as a pageview event.
  after(() =>
    captureServerPosthogEvent({
      distinctId: PUBLIC_HTML_ORIGIN_POSTHOG_DISTINCT_ID,
      event: PUBLIC_HTML_ORIGIN_POSTHOG_EVENTS.PAGE_RENDERED,
      properties: {
        source_page: routePath,
        render_mode: "dynamic_origin",
        route_path: routePath,
        route_type: routeType,
      },
    }),
  );
}
