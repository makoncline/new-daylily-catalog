import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStripePortal } from "@/hooks/use-stripe-portal";

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/trpc/react", () => ({
  api: {
    stripe: {
      getPortalSession: {
        useMutation: () => ({
          isPending: false,
          mutateAsync: mocks.mutateAsync,
        }),
      },
    },
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
  }),
}));

describe("useStripePortal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens the Stripe portal directly", async () => {
    mocks.mutateAsync.mockResolvedValue({
      url: "https://billing.stripe.com/p/session/test",
    });

    const { result } = renderHook(() => useStripePortal());

    await act(async () => {
      await result.current.openStripePortal();
    });

    expect(mocks.push).toHaveBeenCalledWith(
      "https://billing.stripe.com/p/session/test",
    );
    expect(mocks.push).not.toHaveBeenCalledWith(
      expect.stringContaining("/subscribe/success?redirect="),
    );
  });
});
