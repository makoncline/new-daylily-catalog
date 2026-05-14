import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OnboardingAhsListingSelect } from "@/app/start-onboarding/_components/onboarding-ahs-listing-select";
import { AhsListingSelect } from "@/components/ahs-listing-select";

class TestResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = TestResizeObserver;

vi.mock("@/trpc/react", () => ({
  api: {
    dashboardDb: {
      ahs: {
        search: {
          useQuery: () => ({
            data: [],
            isLoading: false,
          }),
        },
      },
    },
  },
}));

describe("AHS listing search focus", () => {
  it("focuses the dashboard AHS search input when opened", async () => {
    render(<AhsListingSelect onSelect={vi.fn()} />);

    fireEvent.click(
      screen.getByRole("combobox", {
        name: "Select Daylily Database listing",
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Search AHS listings…"),
      ).toHaveFocus();
    });
  });

  it("focuses the onboarding variety search input when opened", async () => {
    render(
      <OnboardingAhsListingSelect
        onSelect={vi.fn()}
        predefinedOptions={[]}
        isPredefinedOptionsLoading={false}
        limitedSearchMessage="Search is limited during onboarding."
      />,
    );

    fireEvent.click(
      screen.getByRole("combobox", {
        name: "Select a starter variety",
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Search onboarding varieties…"),
      ).toHaveFocus();
    });
  });
});
