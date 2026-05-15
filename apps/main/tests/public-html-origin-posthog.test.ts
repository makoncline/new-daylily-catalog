import { beforeEach, describe, expect, it, vi } from "vitest";

const afterMock = vi.hoisted(() => vi.fn());
const captureServerPosthogEventMock = vi.hoisted(() => vi.fn());

vi.mock("next/server", async () => {
  const actual =
    await vi.importActual<typeof import("next/server")>("next/server");

  return {
    ...actual,
    after: afterMock,
  };
});

vi.mock("@/server/analytics/posthog-server", () => ({
  captureServerPosthogEvent: captureServerPosthogEventMock,
}));

describe("trackPublicHtmlOriginRendered", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("schedules a PostHog event for public HTML origin renders", async () => {
    const { trackPublicHtmlOriginRendered } = await import(
      "@/server/analytics/public-html-origin-posthog"
    );

    trackPublicHtmlOriginRendered({
      routePath: "/rollingoaksdaylilies/timber-man",
      routeType: "listing_page",
    });

    expect(afterMock).toHaveBeenCalledTimes(1);

    const [scheduledTask] = afterMock.mock.calls[0] ?? [];
    expect(typeof scheduledTask).toBe("function");

    await scheduledTask();

    expect(captureServerPosthogEventMock).toHaveBeenCalledWith({
      distinctId: "system:public-html-origin",
      event: "public_html_origin_rendered",
      properties: {
        source_page: "/rollingoaksdaylilies/timber-man",
        render_mode: "dynamic_origin",
        route_path: "/rollingoaksdaylilies/timber-man",
        route_type: "listing_page",
      },
    });
  });
});
