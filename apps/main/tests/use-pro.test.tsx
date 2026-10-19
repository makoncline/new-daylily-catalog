import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePro } from "@/hooks/use-pro";

const mocks = vi.hoisted(() => ({
  capture: vi.fn(),
  checkout: vi.fn(),
  locationAssign: vi.fn(),
}));

vi.mock("@/trpc/react", () => ({
  api: {
    stripe: {
      generateCheckout: {
        useMutation: () => ({
          isPending: false,
          mutateAsync: mocks.checkout,
        }),
      },
    },
  },
}));

vi.mock("@/lib/analytics/posthog", () => ({
  capturePosthogEvent: mocks.capture,
}));

vi.mock("@/hooks/use-persisted-subscription-query", () => ({
  usePersistedSubscriptionQuery: () => ({
    data: null,
    isLoading: false,
  }),
}));

describe("usePro", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkout.mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay/test",
    });
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, assign: mocks.locationAssign },
    });
  });

  it("sends dashboard upgrades directly to Stripe Checkout", async () => {
    const { result } = renderHook(() => usePro());

    await act(() => result.current.sendToCheckout());

    expect(mocks.checkout).toHaveBeenCalledWith();
    expect(mocks.locationAssign).toHaveBeenCalledWith(
      "https://checkout.stripe.com/c/pay/test",
    );
    expect(mocks.capture).toHaveBeenNthCalledWith(1, "checkout_started", {
      source: "dashboard",
    });
    expect(mocks.capture).toHaveBeenNthCalledWith(
      2,
      "checkout_redirect_ready",
      { source: "dashboard" },
    );
  });
});
