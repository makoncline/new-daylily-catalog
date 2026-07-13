// @vitest-environment jsdom

import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { reportDashboardLoadFailure } from "@/app/dashboard/_lib/dashboard-db/dashboard-load-failure-reporting";
import { reportError } from "@/lib/error-utils";

const telegramAlertUrl = "https://send-to-makon.vercel.app/api/send-telegram";
const server = setupServer();

vi.mock("@/lib/error-utils", () => ({
  getErrorMessage: vi.fn(() => "bootstrap failed"),
  reportError: vi.fn(() => {
    throw new Error("sentry unavailable");
  }),
}));

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});

afterAll(() => {
  server.close();
});

describe("dashboard load failure reporting", () => {
  it("does not send Telegram reports outside production", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    let telegramRequests = 0;
    server.use(
      http.get(telegramAlertUrl, () => {
        telegramRequests += 1;
        return HttpResponse.json({ ok: true });
      }),
    );

    reportDashboardLoadFailure({
      error: new Error("bootstrap failed"),
      userId: "user-1",
      phase: "cold-bootstrap",
      startedAt: new Date("2026-04-28T00:00:00.000Z"),
      failedAt: new Date("2026-04-28T00:00:05.000Z"),
      elapsedMs: 5000,
      bootstrapActive: true,
    });

    expect(reportError).toHaveBeenCalled();
    expect(telegramRequests).toBe(0);
  });

  it("does not throw when Sentry and production Telegram reporting fail", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubEnv("NODE_ENV", "production");
    const requestObserved = new Promise<Request>((resolve) => {
      server.use(
        http.get(telegramAlertUrl, ({ request }) => {
          resolve(request);
          return HttpResponse.error();
        }),
      );
    });

    expect(() =>
      reportDashboardLoadFailure({
        error: new Error("bootstrap failed"),
        userId: "user-1",
        phase: "cold-bootstrap",
        startedAt: new Date("2026-04-28T00:00:00.000Z"),
        failedAt: new Date("2026-04-28T00:00:05.000Z"),
        elapsedMs: 5000,
        bootstrapActive: true,
      }),
    ).not.toThrow();

    const request = await requestObserved;
    const url = new URL(request.url);

    expect(reportError).toHaveBeenCalled();
    expect(request.method).toBe("GET");
    expect(request.credentials).toBe("omit");
    expect(request.keepalive).toBe(true);
    expect(request.mode).toBe("no-cors");
    expect(url.searchParams.get("subject")).toBe(
      "Daylily dashboard load failed",
    );
    expect(url.searchParams.get("message")).toContain("User: user-1");
    expect(url.searchParams.get("message")).toContain("Phase: cold-bootstrap");
  });
});
