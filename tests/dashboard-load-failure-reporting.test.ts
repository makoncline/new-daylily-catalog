// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { reportDashboardLoadFailure } from "@/app/dashboard/_lib/dashboard-db/dashboard-load-failure-reporting";
import { reportError } from "@/lib/error-utils";

vi.mock("@/lib/error-utils", () => ({
  getErrorMessage: vi.fn(() => "bootstrap failed"),
  reportError: vi.fn(() => {
    throw new Error("sentry unavailable");
  }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("dashboard load failure reporting", () => {
  it("does not throw when Sentry and Telegram reporting fail", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetchMock = vi.fn<typeof fetch>(async () => {
      throw new Error("telegram unavailable");
    });
    vi.stubGlobal("fetch", fetchMock);

    expect(() =>
      reportDashboardLoadFailure({
        error: new Error("bootstrap failed"),
        userId: "user-1",
        phase: "cold-bootstrap",
        startedAt: new Date("2026-04-28T00:00:00.000Z"),
        failedAt: new Date("2026-04-28T00:00:05.000Z"),
        elapsedMs: 5000,
        hydratedSnapshot: false,
        bootstrapActive: true,
      }),
    ).not.toThrow();

    expect(reportError).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "https://send-to-makon.vercel.app/api/send-telegram?",
      ),
      expect.objectContaining({
        credentials: "omit",
        keepalive: true,
        method: "GET",
        mode: "no-cors",
      }),
    );
  });
});
