import { fireEvent, render, screen } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { ProMembershipCard } from "@/app/dashboard/_components/stats-card";

const mocks = vi.hoisted(() => ({
  usePro: vi.fn(),
  openStripePortal: vi.fn(),
}));

vi.mock("@/hooks/use-pro", () => ({
  usePro: mocks.usePro,
}));

vi.mock("@/hooks/use-stripe-portal", () => ({
  useStripePortal: () => ({
    isPending: false,
    openStripePortal: mocks.openStripePortal,
  }),
}));

vi.mock("@/components/checkout-button", () => ({
  CheckoutButton: (props: React.ComponentProps<"button">) => (
    <button type="button" {...props}>
      Upgrade to Pro
    </button>
  ),
}));

describe("ProMembershipCard", () => {
  it("shows checkout for free users without a billing issue", () => {
    mocks.usePro.mockReturnValue({
      isPro: false,
      isLoading: false,
      subscriptionStatus: "none",
    });

    render(<ProMembershipCard />);

    expect(
      screen.getByRole("button", { name: "Upgrade to Pro" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Update billing" }),
    ).not.toBeInTheDocument();
  });

  it("sends failed-payment users to the billing portal instead of checkout", () => {
    mocks.usePro.mockReturnValue({
      isPro: false,
      isLoading: false,
      subscriptionStatus: "past_due",
    });

    render(<ProMembershipCard />);

    fireEvent.click(screen.getByRole("button", { name: "Update billing" }));

    expect(mocks.openStripePortal).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("button", { name: "Upgrade to Pro" }),
    ).not.toBeInTheDocument();
  });
});
