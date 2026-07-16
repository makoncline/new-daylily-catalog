import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TierLimitedCreateAction } from "@/app/dashboard/_components/tier-limited-create-action";

vi.mock("@/components/checkout-button", () => ({
  CheckoutButton: () => <button type="button">Checkout</button>,
}));

describe("TierLimitedCreateAction", () => {
  it("opens the upgrade dialog when a free user hits the limit", () => {
    render(
      <TierLimitedCreateAction
        buttonLabel="Create Thing"
        currentCount={2}
        freeTierLimit={2}
        isPro={false}
        upgradeDialogTitle="Upgrade Required"
        upgradeDialogDescription="Limit reached"
        upgradeDialogBody={<div>Upgrade body</div>}
        renderCreateDialog={() => <div>Create dialog</div>}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create Thing" }));

    expect(screen.getByText("Upgrade Required")).toBeInTheDocument();
    expect(screen.getByText("Upgrade body")).toBeInTheDocument();
    expect(screen.queryByText("Create dialog")).not.toBeInTheDocument();
  });

  it("opens the create dialog when under the limit", () => {
    render(
      <TierLimitedCreateAction
        buttonLabel="Create Thing"
        currentCount={1}
        freeTierLimit={2}
        isPro={false}
        upgradeDialogTitle="Upgrade Required"
        upgradeDialogDescription="Limit reached"
        upgradeDialogBody={<div>Upgrade body</div>}
        renderCreateDialog={() => <div>Create dialog</div>}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create Thing" }));

    expect(screen.getByText("Create dialog")).toBeInTheDocument();
    expect(screen.queryByText("Upgrade Required")).not.toBeInTheDocument();
  });

  it("does not choose a tier path while account data is loading", () => {
    render(
      <TierLimitedCreateAction
        buttonLabel="Create Thing"
        currentCount={2}
        disabled
        freeTierLimit={2}
        isPro={false}
        upgradeDialogTitle="Upgrade Required"
        upgradeDialogDescription="Limit reached"
        upgradeDialogBody={<div>Upgrade body</div>}
        renderCreateDialog={() => <div>Create dialog</div>}
      />,
    );

    const createButton = screen.getByRole("button", { name: "Create Thing" });
    expect(createButton).toBeDisabled();
    fireEvent.click(createButton);

    expect(screen.queryByText("Upgrade Required")).not.toBeInTheDocument();
    expect(screen.queryByText("Create dialog")).not.toBeInTheDocument();
  });
});
