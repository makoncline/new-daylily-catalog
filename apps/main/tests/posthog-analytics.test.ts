import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";

const initMock = vi.hoisted(() => vi.fn());
const captureMock = vi.hoisted(() => vi.fn());
const mutableEnv = process.env as Record<string, string | undefined>;

vi.mock("posthog-js", () => ({
  default: {
    init: initMock,
    capture: captureMock,
  },
}));

function enabledPosthogResponse() {
  return new Response(
    JSON.stringify({
      posthog: {
        enabled: true,
        host: "https://analytics.example.com",
        key: "phc_test",
      },
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}

describe("posthog browser analytics", () => {
  let previousNodeEnv: string | undefined;
  let fetchMock: MockInstance<typeof fetch>;

  beforeEach(() => {
    initMock.mockClear();
    captureMock.mockClear();
    previousNodeEnv = process.env.NODE_ENV;
    mutableEnv.NODE_ENV = "production";
    vi.resetModules();
  });

  afterEach(() => {
    fetchMock.mockRestore();
    window.history.replaceState({}, "", "/");
    Reflect.deleteProperty(document, "elementFromPoint");

    if (previousNodeEnv === undefined) {
      delete mutableEnv.NODE_ENV;
    } else {
      mutableEnv.NODE_ENV = previousNodeEnv;
    }
  });

  it("uses runtime config and stays disabled when PostHog is unavailable", async () => {
    fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ posthog: { enabled: false } }), {
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
    const { capturePosthogEvent } = await import("@/lib/analytics/posthog");

    capturePosthogEvent("checkout_started");

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/runtime-config", {
        cache: "no-store",
      });
    });
    expect(initMock).not.toHaveBeenCalled();
    expect(captureMock).not.toHaveBeenCalled();
  });

  it("enables PostHog surveys when browser analytics is available", async () => {
    fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(enabledPosthogResponse());
    const { capturePosthogEvent } = await import("@/lib/analytics/posthog");

    capturePosthogEvent("checkout_started");

    await vi.waitFor(() => {
      expect(initMock).toHaveBeenCalledWith(
        "phc_test",
        expect.objectContaining({
          advanced_enable_surveys: true,
          api_host: "https://analytics.example.com",
          defaults: "2026-01-30",
        }),
      );
    });
    expect(captureMock).toHaveBeenCalledWith("checkout_started", {
      source_page: "/",
    });
  });

  it("adds listing editor tap phases to rage-click events without capturing text", async () => {
    fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(enabledPosthogResponse());
    window.history.pushState({}, "", "/dashboard/listings?editing=listing-1");
    const { capturePosthogEvent } = await import("@/lib/analytics/posthog");

    capturePosthogEvent("checkout_started");

    await vi.waitFor(() => expect(initMock).toHaveBeenCalledOnce());
    document.body.innerHTML = `
      <div role="dialog">
        <form>
          <div><input name="price" /></div>
          <div><p>Private helper text must not be captured</p></div>
        </form>
      </div>
    `;
    const price = document.querySelector("input")!;
    const helper = document.querySelector("p")!;
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => helper),
    });

    price.dispatchEvent(
      new MouseEvent("pointerdown", {
        bubbles: true,
        clientX: 40,
        clientY: 80,
      }),
    );
    helper.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        clientX: 40,
        clientY: 80,
      }),
    );

    const config = initMock.mock.calls[0]?.[1] as {
      before_send?: (event: {
        event: string;
        properties: Record<string, unknown>;
        uuid: string;
      }) => unknown;
    };
    const result = config.before_send?.({
      event: "$rageclick",
      properties: { existing: "preserved" },
      uuid: "event-1",
    });

    expect(result).toMatchObject({
      properties: {
        existing: "preserved",
        listing_editor_tap_diagnostics: [
          expect.objectContaining({
            phase: "pointerdown",
            target: "input[name=price]:form-child=1",
            element_at_point: "p:form-child=2",
            x: 40,
            y: 80,
          }),
          expect.objectContaining({
            phase: "click",
            target: "p:form-child=2",
          }),
        ],
      },
    });
    expect(JSON.stringify(result)).not.toContain("Private helper text");
  });
});
