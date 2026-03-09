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

describe("IsrWrittenAt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("schedules a PostHog event for ISR page generation", async () => {
    const { IsrWrittenAt } = await import(
      "@/app/(public)/_components/isr-written-at"
    );

    IsrWrittenAt({
      routePath: "/catalogs",
      routeType: "catalogs_index",
    });

    expect(afterMock).toHaveBeenCalledTimes(1);

    const [scheduledTask] = afterMock.mock.calls[0] ?? [];
    expect(typeof scheduledTask).toBe("function");

    await scheduledTask();

    expect(captureServerPosthogEventMock).toHaveBeenCalledWith({
      distinctId: "system:public-isr",
      event: "public_isr_page_generated",
      properties: {
        source_page: "/catalogs",
        render_mode: "isr",
        route_path: "/catalogs",
        route_type: "catalogs_index",
      },
    });
  });
});
