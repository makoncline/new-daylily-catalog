"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { capturePosthogEvent } from "@/lib/analytics/posthog";
import { ONBOARDING_STEPS, type OnboardingStepId } from "./onboarding-utils";

interface RouterLike {
  push: (href: string, options?: { scroll?: boolean }) => void;
  replace: (href: string, options?: { scroll?: boolean }) => void;
}

interface UseOnboardingStepFlowArgs {
  clearOnboardingDraftSnapshot: () => void;
  currentUserId: string | null | undefined;
  isCurrentUserFetched: boolean;
  isGeneratingStarterImage: boolean;
  isListingReadyToContinue: boolean;
  isProfileReadyToContinue: boolean;
  isSavingListing: boolean;
  isSavingProfile: boolean;
  onboardingPath: string;
  rawStepParam: string | null;
  router: RouterLike;
  saveListingDraft: () => Promise<boolean>;
  saveProfileDraft: () => Promise<boolean>;
  searchParamsString: string;
}

export function useOnboardingStepFlow({
  clearOnboardingDraftSnapshot,
  currentUserId,
  isCurrentUserFetched,
  isGeneratingStarterImage,
  isListingReadyToContinue,
  isProfileReadyToContinue,
  isSavingListing,
  isSavingProfile,
  onboardingPath,
  rawStepParam,
  router,
  saveListingDraft,
  saveProfileDraft,
  searchParamsString,
}: UseOnboardingStepFlowArgs) {
  const viewedOnboardingStepsRef = useRef<Set<OnboardingStepId>>(new Set());
  const hasTrackedOnboardingEntryRef = useRef(false);

  const stepIndex = useMemo(() => {
    if (!rawStepParam) {
      return 0;
    }

    const matchingStepIndex = ONBOARDING_STEPS.findIndex(
      (step) => step.id === rawStepParam,
    );

    return matchingStepIndex >= 0 ? matchingStepIndex : 0;
  }, [rawStepParam]);

  const currentStep = ONBOARDING_STEPS[stepIndex] ?? ONBOARDING_STEPS[0]!;
  const progressValue = ((stepIndex + 1) / ONBOARDING_STEPS.length) * 100;

  const getOnboardingStepNumber = useCallback(
    (stepId: OnboardingStepId) =>
      ONBOARDING_STEPS.findIndex((step) => step.id === stepId) + 1,
    [],
  );

  const captureOnboardingStepEvent = useCallback(
    (
      event: "onboarding_step_viewed" | "onboarding_step_completed",
      stepId: OnboardingStepId,
    ) => {
      capturePosthogEvent(event, {
        step_id: stepId,
        step_number: getOnboardingStepNumber(stepId),
        total_steps: ONBOARDING_STEPS.length,
      });
    },
    [getOnboardingStepNumber],
  );

  useEffect(() => {
    if (!rawStepParam) {
      return;
    }

    const isValidStep = ONBOARDING_STEPS.some(
      (step) => step.id === rawStepParam,
    );
    if (isValidStep) {
      return;
    }

    const nextParams = new URLSearchParams(searchParamsString);
    nextParams.delete("step");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${onboardingPath}?${nextQuery}` : onboardingPath, {
      scroll: false,
    });
  }, [onboardingPath, rawStepParam, router, searchParamsString]);

  useEffect(() => {
    if (!isCurrentUserFetched || hasTrackedOnboardingEntryRef.current) {
      return;
    }

    if (!currentUserId) {
      return;
    }

    hasTrackedOnboardingEntryRef.current = true;
    capturePosthogEvent("onboarding_entry_viewed", {
      source_page_type: "onboarding",
      source_path: onboardingPath,
      target_path: onboardingPath,
      is_authenticated: true,
    });
  }, [currentUserId, isCurrentUserFetched, onboardingPath]);

  useEffect(() => {
    if (viewedOnboardingStepsRef.current.has(currentStep.id)) {
      return;
    }

    viewedOnboardingStepsRef.current.add(currentStep.id);
    captureOnboardingStepEvent("onboarding_step_viewed", currentStep.id);
    if (currentStep.id === "start-membership") {
      capturePosthogEvent("onboarding_membership_screen_viewed", {
        source: "onboarding-step",
      });
    }
  }, [captureOnboardingStepEvent, currentStep.id]);

  const scrollToTop = useCallback(() => {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, []);

  const getStepHref = useCallback(
    (stepId: OnboardingStepId) => {
      const nextParams = new URLSearchParams(searchParamsString);
      const firstStepId = ONBOARDING_STEPS[0]?.id;

      if (stepId === firstStepId) {
        nextParams.delete("step");
      } else {
        nextParams.set("step", stepId);
      }

      const nextQuery = nextParams.toString();
      return nextQuery ? `${onboardingPath}?${nextQuery}` : onboardingPath;
    },
    [onboardingPath, searchParamsString],
  );

  const goToStep = useCallback(
    (stepId: OnboardingStepId) => {
      const targetStepIndex = ONBOARDING_STEPS.findIndex(
        (step) => step.id === stepId,
      );

      if (targetStepIndex < 0) {
        return;
      }

      router.push(getStepHref(stepId), { scroll: false });
      scrollToTop();
    },
    [getStepHref, router, scrollToTop],
  );

  const goToNextStep = useCallback(() => {
    const nextStep =
      ONBOARDING_STEPS[Math.min(stepIndex + 1, ONBOARDING_STEPS.length - 1)];
    if (!nextStep) {
      return;
    }

    goToStep(nextStep.id);
  }, [goToStep, stepIndex]);

  const goToPreviousStep = useCallback(() => {
    const previousStep = ONBOARDING_STEPS[Math.max(stepIndex - 1, 0)];
    if (!previousStep) {
      return;
    }

    goToStep(previousStep.id);
  }, [goToStep, stepIndex]);

  const handlePrimaryAction = useCallback(async () => {
    switch (currentStep.id) {
      case "build-profile-card": {
        const didSave = await saveProfileDraft();
        if (didSave) {
          captureOnboardingStepEvent(
            "onboarding_step_completed",
            "build-profile-card",
          );
          goToNextStep();
        }
        return;
      }
      case "build-listing-card": {
        const didSave = await saveListingDraft();
        if (didSave) {
          captureOnboardingStepEvent(
            "onboarding_step_completed",
            "build-listing-card",
          );
          goToNextStep();
        }
        return;
      }
      case "preview-buyer-contact": {
        captureOnboardingStepEvent(
          "onboarding_step_completed",
          "preview-buyer-contact",
        );
        capturePosthogEvent("onboarding_aha_reached", {
          milestone: "profile_saved_listing_saved_buyer_flow_seen",
          step_variant: "combined_preview_contact",
        });
        goToNextStep();
        return;
      }
      case "start-membership": {
        clearOnboardingDraftSnapshot();
        captureOnboardingStepEvent(
          "onboarding_step_completed",
          "start-membership",
        );
        capturePosthogEvent("onboarding_completed", {
          completion_path: "keep_unlisted",
          source: "onboarding-step",
        });
        router.push("/dashboard");
        return;
      }
      default: {
        goToNextStep();
      }
    }
  }, [
    captureOnboardingStepEvent,
    clearOnboardingDraftSnapshot,
    currentStep.id,
    goToNextStep,
    router,
    saveListingDraft,
    saveProfileDraft,
  ]);

  const primaryButtonLabel = useMemo(() => {
    switch (currentStep.id) {
      case "build-profile-card":
        return isSavingProfile
          ? "Saving profile..."
          : "Save profile and continue";
      case "build-listing-card":
        return isSavingListing
          ? "Saving listing..."
          : "Save listing and continue";
      case "preview-buyer-contact":
        return "Review plans";
      case "start-membership":
        return "Keep unlisted";
      default:
        return "Continue";
    }
  }, [currentStep.id, isSavingListing, isSavingProfile]);

  const primaryButtonDisabled = useMemo(
    () =>
      (currentStep.id === "build-profile-card" &&
        (!isProfileReadyToContinue ||
          isSavingProfile ||
          isGeneratingStarterImage)) ||
      (currentStep.id === "build-listing-card" &&
        (!isListingReadyToContinue || isSavingListing)),
    [
      currentStep.id,
      isGeneratingStarterImage,
      isListingReadyToContinue,
      isProfileReadyToContinue,
      isSavingListing,
      isSavingProfile,
    ],
  );

  const handleMembershipContinueForNow = useCallback(() => {
    clearOnboardingDraftSnapshot();
    captureOnboardingStepEvent("onboarding_step_completed", "start-membership");
    capturePosthogEvent("onboarding_completed", {
      completion_path: "continue_for_now",
      source: "onboarding-step",
    });
    capturePosthogEvent("onboarding_membership_continue_for_now_clicked", {
      source: "onboarding-step",
    });
    capturePosthogEvent("membership_skipped", {
      source_page_type: "onboarding",
      source_path: onboardingPath,
      target_path: "/dashboard",
      is_authenticated: true,
    });
  }, [captureOnboardingStepEvent, clearOnboardingDraftSnapshot, onboardingPath]);

  const handleSkipOnboarding = useCallback(() => {
    clearOnboardingDraftSnapshot();
    capturePosthogEvent("onboarding_skipped", {
      step_id: currentStep.id,
      step_index: stepIndex + 1,
    });
    router.push("/dashboard");
  }, [clearOnboardingDraftSnapshot, currentStep.id, router, stepIndex]);

  return {
    currentStep,
    getStepHref,
    goToPreviousStep,
    goToStep,
    handleMembershipContinueForNow,
    handlePrimaryAction,
    handleSkipOnboarding,
    primaryButtonDisabled,
    primaryButtonLabel,
    progressValue,
    stepIndex,
  };
}
