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
  };
});

vi.mock("@/app/onboarding/anonymous-onboarding-persuasion-steps", async () => {
  const React = await import("react");
  return {
    PersonalizeStep: () => React.createElement("div", null, "Personalize"),
    WorkflowStep: () => React.createElement("div", null, "Workflow"),
  };
});

vi.mock("@/app/onboarding/anonymous-onboarding-product-steps", async () => {
  const React = await import("react");
  return {
    BuyerExperienceStep: () =>
      React.createElement("div", null, "Buyer experience"),
    CollectionEnrichmentStep: () =>
      React.createElement("div", null, "Enrichment"),
    CultivarCollectionStep: () => React.createElement("div", null, "Cultivars"),
    ListingsWorkspaceStep: () => React.createElement("div", null, "Listings"),
  };
});

function buildController(step: AnonymousOnboardingStepId) {
  const currentStepIndex = [
    "workflow",
    "buyer-need",
    "problem",
    "search-tour",
    "proof",
    "personalize",
    "email",
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
    progressValue: ((currentStepIndex + 1) / 12) * 100,
    currentStepCanContinue: true,
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
      controllerMock.mockReturnValue(buildController("proof"));
      const view = render(
        <AnonymousOnboardingPageClient
          membershipPriceDisplay={{
            amount: "$99",
            interval: "year",
            monthlyEquivalent: null,
          }}
        />,
      );

      expect(scrollIntoViewMock).not.toHaveBeenCalled();

      controllerMock.mockReturnValue(buildController("personalize"));
      view.rerender(
        <AnonymousOnboardingPageClient
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
      expect(scrollIntoViewMock).not.toHaveBeenCalled();
      expect(scrollToMock).toHaveBeenCalledWith({
        behavior: "instant",
        top: 0,
      });
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
      window.scrollTo = originalScrollTo;
      window.requestAnimationFrame = originalRequestAnimationFrame;
      window.cancelAnimationFrame = originalCancelAnimationFrame;
    }
  });
});
