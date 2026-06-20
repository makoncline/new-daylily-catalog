"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import {
  ANONYMOUS_ONBOARDING_STEPS,
  getListingPreview,
  getProfilePreview,
  normalizeEmail,
  type AnonymousOnboardingPageClientProps,
} from "./anonymous-onboarding-config";
import {
  clearAnonymousOnboardingDraft,
  compressOnboardingImageFile,
  createAnonymousOnboardingDraft,
  readAnonymousOnboardingDraft,
  writeAnonymousOnboardingDraft,
  type AnonymousOnboardingDraft,
} from "./anonymous-onboarding-draft";
import type { AnonymousOnboardingStepId } from "./anonymous-onboarding-draft";

export function useAnonymousOnboardingController({
  membershipPriceDisplay,
}: AnonymousOnboardingPageClientProps) {
  const router = useRouter();
  const [draft, setDraftState] = useState(() =>
    createAnonymousOnboardingDraft(),
  );
  const draftRef = useRef(draft);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const storedDraft = readAnonymousOnboardingDraft();
      draftRef.current = storedDraft;
      setDraftState(storedDraft);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const setDraft = useCallback(
    (
      updater:
        | AnonymousOnboardingDraft
        | ((draft: AnonymousOnboardingDraft) => AnonymousOnboardingDraft),
    ) => {
      const currentDraft = draftRef.current;
      const nextDraft =
        typeof updater === "function" ? updater(currentDraft) : updater;
      draftRef.current = nextDraft;
      const didPersist = writeAnonymousOnboardingDraft(nextDraft);
      setDraftState(nextDraft);
      setStorageWarning(
        didPersist
          ? null
          : "Your browser did not save this draft. You can keep going, but you may need to re-enter details if you leave this page.",
      );
    },
    [],
  );

  const clearStoredDraft = useCallback(() => {
    clearAnonymousOnboardingDraft();
    const nextDraft = createAnonymousOnboardingDraft();
    draftRef.current = nextDraft;
    setDraftState(nextDraft);
    setStorageWarning(null);
  }, []);
  const [emailInputOverride, setEmailInputOverride] = useState<string | null>(
    null,
  );
  const [isEditingCheckoutEmail, setIsEditingCheckoutEmail] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const collectEmail = api.onboarding.collectEmail.useMutation();
  const createCheckout = api.onboarding.createCheckout.useMutation();

  const stepIndex = ANONYMOUS_ONBOARDING_STEPS.findIndex(
    (step) => step.id === draft.step,
  );
  const currentStepIndex = stepIndex >= 0 ? stepIndex : 0;
  const progressValue =
    ((currentStepIndex + 1) / ANONYMOUS_ONBOARDING_STEPS.length) * 100;
  const profilePreview = getProfilePreview(draft);
  const listingPreview = getListingPreview(draft);
  const emailInput = emailInputOverride ?? draft.email ?? "";
  const emailIsValid = /.+@.+\..+/.test(normalizeEmail(emailInput));

  const goToStep = useCallback(
    (step: AnonymousOnboardingStepId) => {
      setImageError(null);
      setDraft((currentDraft) => ({ ...currentDraft, step }));
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    },
    [setDraft],
  );

  const saveEmailAndContinue = useCallback(
    async (stage: "initial" | "pre_checkout_review") => {
      const email = normalizeEmail(emailInput);
      if (!emailIsValid) {
        return;
      }

      const changed = Boolean(draft.email && draft.email !== email);
      setDraft((currentDraft) => ({ ...currentDraft, email }));
      setEmailInputOverride(null);
      try {
        await collectEmail.mutateAsync({
          email,
          draftId: draft.draftId,
          stage,
          changed: stage === "pre_checkout_review" ? changed : false,
        });
      } catch (error) {
        console.warn("Unable to capture onboarding email lead", error);
      }

      if (stage === "pre_checkout_review") {
        setIsEditingCheckoutEmail(false);
        return;
      }

      goToStep("profile");
    },
    [
      collectEmail,
      draft.draftId,
      draft.email,
      emailInput,
      emailIsValid,
      goToStep,
      setDraft,
    ],
  );

  const updateImageDraft = useCallback(
    async (
      file: File | undefined,
      target: "profileImageDataUrl" | "listingImageDataUrl",
    ) => {
      if (!file) {
        return;
      }

      try {
        setImageError(null);
        const dataUrl = await compressOnboardingImageFile(file);
        setDraft((currentDraft) =>
          target === "profileImageDataUrl"
            ? {
                ...currentDraft,
                profile: {
                  ...currentDraft.profile,
                  profileImageDataUrl: dataUrl,
                },
              }
            : {
                ...currentDraft,
                listingPreview: {
                  ...currentDraft.listingPreview,
                  imageDataUrl: dataUrl,
                },
              },
        );
      } catch (error) {
        setImageError(error instanceof Error ? error.message : String(error));
      }
    },
    [setDraft],
  );

  const goForward = useCallback(async () => {
    if (draft.step === "email") {
      await saveEmailAndContinue("initial");
      return;
    }

    if (draft.step === "profile") {
      goToStep("listing");
      return;
    }

    if (draft.step === "listing") {
      goToStep("preview");
      return;
    }

    if (draft.step === "preview") {
      goToStep("checkout");
    }
  }, [draft.step, goToStep, saveEmailAndContinue]);

  const goBack = useCallback(() => {
    const previousStep = ANONYMOUS_ONBOARDING_STEPS[currentStepIndex - 1]?.id;
    if (previousStep) {
      goToStep(previousStep);
    }
  }, [currentStepIndex, goToStep]);

  const startCheckout = useCallback(async () => {
    if (!draft.email) {
      goToStep("email");
      return;
    }

    const result = await createCheckout.mutateAsync({
      email: draft.email,
      draftId: draft.draftId,
    });
    window.location.href = result.url;
  }, [createCheckout, draft.draftId, draft.email, goToStep]);

  const clearDraft = useCallback(() => {
    clearStoredDraft();
    setEmailInputOverride(null);
    router.replace("/onboarding", { scroll: false });
  }, [clearStoredDraft, router]);

  return {
    collectEmail,
    createCheckout,
    currentStepIndex,
    draft,
    emailInput,
    emailIsValid,
    goBack,
    goForward,
    goToStep,
    imageError,
    isEditingCheckoutEmail,
    listingPreview,
    membershipPriceDisplay,
    profilePreview,
    progressValue,
    saveEmailAndContinue,
    setDraft,
    setEmailInput: setEmailInputOverride,
    setImageError,
    setIsEditingCheckoutEmail,
    startCheckout,
    storageWarning,
    updateListingImage: (file: File | undefined) =>
      updateImageDraft(file, "listingImageDataUrl"),
    updateProfileImage: (file: File | undefined) =>
      updateImageDraft(file, "profileImageDataUrl"),
    clearDraft,
  };
}

export type AnonymousOnboardingController = ReturnType<
  typeof useAnonymousOnboardingController
>;
