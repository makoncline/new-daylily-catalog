import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useOnboardingStepFlow } from "@/app/start-onboarding/use-onboarding-step-flow";

const capturePosthogEventMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/analytics/posthog", () => ({
  capturePosthogEvent: capturePosthogEventMock,
}));

function createRouter() {
  return {
    push: vi.fn(),
    replace: vi.fn(),
  };
}

function createArgs(
  overrides: Partial<Parameters<typeof useOnboardingStepFlow>[0]> = {},
): Parameters<typeof useOnboardingStepFlow>[0] {
  return {
    clearOnboardingDraftSnapshot: vi.fn(),
    currentUserId: null,
    isCurrentUserFetched: false,
    isGeneratingStarterImage: false,
    isListingReadyToContinue: false,
    isProfileReadyToContinue: false,
    isSavingListing: false,
    isSavingProfile: false,
    onboardingPath: "/onboarding",
    rawStepParam: null,
    router: createRouter(),
    saveListingDraft: vi.fn().mockResolvedValue(true),
    saveProfileDraft: vi.fn().mockResolvedValue(true),
    searchParamsString: "",
    ...overrides,
  };
}

describe("useOnboardingStepFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes invalid step params back to the base onboarding path", () => {
    const router = createRouter();

    renderHook(() =>
      useOnboardingStepFlow(
        createArgs({
          rawStepParam: "not-a-step",
          router,
          searchParamsString: "step=not-a-step&foo=bar",
        }),
      ),
    );

    expect(router.replace).toHaveBeenCalledWith("/onboarding?foo=bar", {
      scroll: false,
    });
  });

  it("handles preview-step primary action by advancing to membership and tracking the milestone", async () => {
    const router = createRouter();

    const { result } = renderHook(() =>
      useOnboardingStepFlow(
        createArgs({
          rawStepParam: "preview-buyer-contact",
          router,
          searchParamsString: "step=preview-buyer-contact",
        }),
      ),
    );

    await act(async () => {
      await result.current.handlePrimaryAction();
    });

    expect(router.push).toHaveBeenCalledWith(
      "/onboarding?step=start-membership",
      { scroll: false },
    );
    expect(capturePosthogEventMock).toHaveBeenCalledWith(
      "onboarding_step_completed",
      expect.objectContaining({
        step_id: "preview-buyer-contact",
      }),
    );
    expect(capturePosthogEventMock).toHaveBeenCalledWith(
      "onboarding_aha_reached",
      expect.objectContaining({
        milestone: "profile_saved_listing_saved_buyer_flow_seen",
      }),
    );
  });
});
