import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnonymousOnboardingPageClient } from "@/app/onboarding/anonymous-onboarding-layout";
import type { AnonymousOnboardingStepId } from "@/app/onboarding/anonymous-onboarding-draft";

const controllerMock = vi.hoisted(() => vi.fn());

vi.mock("@/app/onboarding/use-anonymous-onboarding-controller", () => ({
  useAnonymousOnboardingController: () => controllerMock(),
}));

vi.mock("@/app/onboarding/anonymous-onboarding-steps", async () => {
  const React = await import("react");
  return {
    CheckoutStep: () => React.createElement("div", null, "Checkout step"),
    EmailStep: () => React.createElement("div", null, "Email step"),
    ListingStep: () => React.createElement("div", null, "Listing step"),
    PreviewStep: () => React.createElement("div", null, "Preview step"),
    ProfileStep: () => React.createElement("div", null, "Profile step"),
  };
});

const exampleCultivars = [
  {
    key: "cr-first",
    name: "First Bloom",
    hybridizerYear: "First Hybridizer, 2021",
    imageUrl: "https://example.com/first.jpg",
  },
];

function buildController(step: AnonymousOnboardingStepId) {
  const currentStepIndex = [
    "email",
    "profile",
    "listing",
    "preview",
    "checkout",
  ].indexOf(step);

  return {
    collectEmail: { isPending: false },
    currentStepIndex,
    draft: {
      step,
    },
    emailIsValid: true,
    furthestStepIndex: currentStepIndex,
    goBack: vi.fn(),
    goForward: vi.fn(),
    goToStep: vi.fn(),
    progressValue: ((currentStepIndex + 1) / 5) * 100,
    storageWarning: null,
  };
}

describe("AnonymousOnboardingPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scrolls to the changed step content instead of the page top", () => {
    const scrollIntoViewMock = vi.fn();
    const scrollToMock = vi.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const originalScrollTo = window.scrollTo;
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;

    HTMLElement.prototype.scrollIntoView =
      scrollIntoViewMock as typeof HTMLElement.prototype.scrollIntoView;
    window.scrollTo = scrollToMock as unknown as typeof window.scrollTo;
    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    };
    window.cancelAnimationFrame = vi.fn();

    try {
      controllerMock.mockReturnValue(buildController("profile"));
      const view = render(
        <AnonymousOnboardingPageClient
          exampleCultivars={exampleCultivars}
          membershipPriceDisplay={{
            amount: "$99",
            interval: "year",
            monthlyEquivalent: null,
          }}
        />,
      );

      expect(scrollIntoViewMock).not.toHaveBeenCalled();

      controllerMock.mockReturnValue(buildController("listing"));
      view.rerender(
        <AnonymousOnboardingPageClient
          exampleCultivars={exampleCultivars}
          membershipPriceDisplay={{
            amount: "$99",
            interval: "year",
            monthlyEquivalent: null,
          }}
        />,
      );

      expect(
        screen.getByTestId("anonymous-onboarding-step-content"),
      ).toBeInTheDocument();
      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "start",
      });
      expect(scrollToMock).not.toHaveBeenCalled();
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
      window.scrollTo = originalScrollTo;
      window.requestAnimationFrame = originalRequestAnimationFrame;
      window.cancelAnimationFrame = originalCancelAnimationFrame;
    }
  });
});
