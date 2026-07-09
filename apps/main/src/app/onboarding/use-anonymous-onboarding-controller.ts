"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
import {
  ANONYMOUS_ONBOARDING_STEPS,
  DEFAULT_GARDEN_NAME_PLACEHOLDER,
  getListingPreview,
  getProfilePreview,
  normalizeEmail,
  type AnonymousOnboardingPageClientProps,
} from "./anonymous-onboarding-config";
import {
  clearAnonymousOnboardingDraft,
  compressOnboardingImageBlob,
  createOnboardingProfileImageFromStarter,
  createAnonymousOnboardingDraft,
  readAnonymousOnboardingDraft,
  writeAnonymousOnboardingDraft,
  type AnonymousOnboardingDraft,
} from "./anonymous-onboarding-draft";
import type { AnonymousOnboardingStepId } from "./anonymous-onboarding-draft";

function readOnboardingStep(value: string | null) {
  return ANONYMOUS_ONBOARDING_STEPS.find((step) => step.id === value)?.id;
}

function getOnboardingStepIndex(step: AnonymousOnboardingStepId) {
  return ANONYMOUS_ONBOARDING_STEPS.findIndex((item) => item.id === step);
}

export function useAnonymousOnboardingController({
  exampleCultivars,
  membershipPriceDisplay,
}: AnonymousOnboardingPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [draft, setDraftState] = useState(() =>
    createAnonymousOnboardingDraft(),
  );
  const draftRef = useRef(draft);
  const hasHydratedDraftRef = useRef(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

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
  const [profileImageInputMode, setProfileImageInputModeState] = useState<
    "starter" | "upload"
  >("starter");
  const [selectedStarterProfileImageUrl, setSelectedStarterProfileImageUrl] =
    useState<string | null>(null);
  const [applyStarterNameOverlay, setApplyStarterNameOverlayState] =
    useState(true);
  const [isGeneratingStarterProfileImage, setIsGeneratingStarterProfileImage] =
    useState(false);
  const starterProfileImageGenerationTimeoutRef = useRef<number | null>(null);
  const starterProfileImageGenerationRequestIdRef = useRef(0);
  const collectEmail = api.onboarding.collectEmail.useMutation();
  const createCheckout = api.onboarding.createCheckout.useMutation();

  const buildStepUrl = useCallback(
    (step: AnonymousOnboardingStepId) => {
      const nextSearchParams = new URLSearchParams(searchParams.toString());
      nextSearchParams.set("step", step);
      return `${pathname}?${nextSearchParams.toString()}`;
    },
    [pathname, searchParams],
  );

  useEffect(() => {
    if (hasHydratedDraftRef.current) {
      return;
    }
    hasHydratedDraftRef.current = true;

    const frame = window.requestAnimationFrame(() => {
      const storedDraft = readAnonymousOnboardingDraft();
      const requestedStep = readOnboardingStep(searchParams.get("step"));
      const requestedStepIndex = requestedStep
        ? getOnboardingStepIndex(requestedStep)
        : -1;
      const furthestStepIndex = getOnboardingStepIndex(
        storedDraft.furthestStep,
      );
      const initialStep =
        requestedStep && requestedStepIndex <= furthestStepIndex
          ? requestedStep
          : storedDraft.step;
      const hydratedDraft = { ...storedDraft, step: initialStep };

      draftRef.current = hydratedDraft;
      setDraftState(hydratedDraft);
      setProfileImageInputModeState(
        storedDraft.profile.profileImageSource === "upload"
          ? "upload"
          : "starter",
      );
      if (requestedStep !== initialStep) {
        router.replace(buildStepUrl(initialStep), { scroll: false });
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [buildStepUrl, router, searchParams]);

  useEffect(() => {
    if (!hasHydratedDraftRef.current) {
      return;
    }

    const requestedStep = readOnboardingStep(searchParams.get("step"));
    if (requestedStep === draftRef.current.step) {
      return;
    }

    if (
      !requestedStep ||
      getOnboardingStepIndex(requestedStep) >
      getOnboardingStepIndex(draftRef.current.furthestStep)
    ) {
      router.replace(buildStepUrl(draftRef.current.step), { scroll: false });
      return;
    }

    setDraft((currentDraft) => ({
      ...currentDraft,
      step: requestedStep,
    }));
  }, [buildStepUrl, router, searchParams, setDraft]);

  const stepIndex = ANONYMOUS_ONBOARDING_STEPS.findIndex(
    (step) => step.id === draft.step,
  );
  const currentStepIndex = stepIndex >= 0 ? stepIndex : 0;
  const furthestStepIndex = Math.max(
    0,
    getOnboardingStepIndex(draft.furthestStep),
  );
  const progressValue =
    ((currentStepIndex + 1) / ANONYMOUS_ONBOARDING_STEPS.length) * 100;
  const profilePreview = getProfilePreview(draft);
  const listingPreview = getListingPreview(draft, exampleCultivars);
  const emailInput = emailInputOverride ?? draft.email ?? "";
  const emailIsValid = /.+@.+\..+/.test(normalizeEmail(emailInput));

  const goToStep = useCallback(
    (step: AnonymousOnboardingStepId) => {
      setImageError(null);
      setDraft((currentDraft) => {
        const furthestStep =
          getOnboardingStepIndex(step) >
          getOnboardingStepIndex(currentDraft.furthestStep)
            ? step
            : currentDraft.furthestStep;

        return { ...currentDraft, step, furthestStep };
      });
      router.push(buildStepUrl(step), { scroll: false });
    },
    [buildStepUrl, router, setDraft],
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

  const cancelStarterProfileImageGeneration = useCallback(() => {
    if (starterProfileImageGenerationTimeoutRef.current !== null) {
      window.clearTimeout(starterProfileImageGenerationTimeoutRef.current);
      starterProfileImageGenerationTimeoutRef.current = null;
    }

    starterProfileImageGenerationRequestIdRef.current += 1;
    setIsGeneratingStarterProfileImage(false);
  }, []);

  useEffect(
    () => () => {
      if (starterProfileImageGenerationTimeoutRef.current !== null) {
        window.clearTimeout(starterProfileImageGenerationTimeoutRef.current);
      }

      starterProfileImageGenerationRequestIdRef.current += 1;
    },
    [],
  );

  const scheduleStarterProfileImageGeneration = useCallback(
    ({
      applyNameOverlay,
      baseImageUrl,
      debounceMs,
      gardenName,
    }: {
      applyNameOverlay: boolean;
      baseImageUrl: string;
      debounceMs: number;
      gardenName: string;
    }) => {
      if (starterProfileImageGenerationTimeoutRef.current !== null) {
        window.clearTimeout(starterProfileImageGenerationTimeoutRef.current);
      }

      const requestId = starterProfileImageGenerationRequestIdRef.current + 1;
      starterProfileImageGenerationRequestIdRef.current = requestId;
      setImageError(null);
      setIsGeneratingStarterProfileImage(true);

      starterProfileImageGenerationTimeoutRef.current = window.setTimeout(
        () => {
          void (async () => {
            try {
              const dataUrl = await createOnboardingProfileImageFromStarter({
                applyNameOverlay,
                baseImageUrl,
                gardenName:
                  gardenName.trim() || DEFAULT_GARDEN_NAME_PLACEHOLDER,
              });

              if (
                starterProfileImageGenerationRequestIdRef.current !== requestId
              ) {
                return;
              }

              setDraft((currentDraft) => ({
                ...currentDraft,
                profile: {
                  ...currentDraft.profile,
                  profileImageDataUrl: dataUrl,
                  profileImageSource: "starter",
                },
              }));
            } catch (error) {
              if (
                starterProfileImageGenerationRequestIdRef.current !== requestId
              ) {
                return;
              }

              setImageError(
                error instanceof Error ? error.message : String(error),
              );
            } finally {
              if (
                starterProfileImageGenerationRequestIdRef.current === requestId
              ) {
                starterProfileImageGenerationTimeoutRef.current = null;
                setIsGeneratingStarterProfileImage(false);
              }
            }
          })();
        },
        debounceMs,
      );
    },
    [setDraft],
  );

  const selectStarterProfileImage = useCallback(
    (baseImageUrl: string) => {
      setProfileImageInputModeState("starter");
      setSelectedStarterProfileImageUrl(baseImageUrl);
      setDraft((currentDraft) => ({
        ...currentDraft,
        profile: {
          ...currentDraft.profile,
          profileImageDataUrl: null,
          profileImageSource: null,
        },
      }));
      scheduleStarterProfileImageGeneration({
        applyNameOverlay: applyStarterNameOverlay,
        baseImageUrl,
        debounceMs: 0,
        gardenName: draftRef.current.profile.gardenName,
      });
    },
    [applyStarterNameOverlay, scheduleStarterProfileImageGeneration, setDraft],
  );

  const setProfileImageInputMode = useCallback(
    (mode: "starter" | "upload") => {
      setImageError(null);
      setProfileImageInputModeState(mode);

      if (mode === "upload") {
        cancelStarterProfileImageGeneration();
        setSelectedStarterProfileImageUrl(null);
        if (draftRef.current.profile.profileImageSource === "starter") {
          setDraft((currentDraft) => ({
            ...currentDraft,
            profile: {
              ...currentDraft.profile,
              profileImageDataUrl: null,
              profileImageSource: null,
            },
          }));
        }
        return;
      }

      if (draftRef.current.profile.profileImageSource === "upload") {
        setDraft((currentDraft) => ({
          ...currentDraft,
          profile: {
            ...currentDraft.profile,
            profileImageDataUrl: null,
            profileImageSource: null,
          },
        }));
      }
    },
    [cancelStarterProfileImageGeneration, setDraft],
  );

  const setApplyStarterNameOverlay = useCallback(
    (enabled: boolean) => {
      setApplyStarterNameOverlayState(enabled);
      if (!selectedStarterProfileImageUrl) {
        return;
      }

      scheduleStarterProfileImageGeneration({
        applyNameOverlay: enabled,
        baseImageUrl: selectedStarterProfileImageUrl,
        debounceMs: 0,
        gardenName: draftRef.current.profile.gardenName,
      });
    },
    [scheduleStarterProfileImageGeneration, selectedStarterProfileImageUrl],
  );

  const updateProfileGardenName = useCallback(
    (gardenName: string) => {
      setDraft((currentDraft) => ({
        ...currentDraft,
        profile: {
          ...currentDraft.profile,
          gardenName,
        },
      }));

      if (
        profileImageInputMode === "starter" &&
        applyStarterNameOverlay &&
        selectedStarterProfileImageUrl
      ) {
        scheduleStarterProfileImageGeneration({
          applyNameOverlay: true,
          baseImageUrl: selectedStarterProfileImageUrl,
          debounceMs: 150,
          gardenName,
        });
      }
    },
    [
      applyStarterNameOverlay,
      profileImageInputMode,
      scheduleStarterProfileImageGeneration,
      selectedStarterProfileImageUrl,
      setDraft,
    ],
  );

  const updateImageDraft = useCallback(
    async (
      image: Blob | File | undefined,
      target: "profileImageDataUrl" | "listingImageDataUrl",
    ) => {
      if (!image) {
        return;
      }

      try {
        setImageError(null);
        const dataUrl = await compressOnboardingImageBlob(image);
        setDraft((currentDraft) =>
          target === "profileImageDataUrl"
            ? {
                ...currentDraft,
                profile: {
                  ...currentDraft.profile,
                  profileImageDataUrl: dataUrl,
                  profileImageSource: "upload",
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

  const clearProfileImage = useCallback(() => {
    cancelStarterProfileImageGeneration();
    setImageError(null);
    setSelectedStarterProfileImageUrl(null);
    setDraft((currentDraft) => ({
      ...currentDraft,
      profile: {
        ...currentDraft.profile,
        profileImageDataUrl: null,
        profileImageSource: null,
      },
    }));
  }, [cancelStarterProfileImageGeneration, setDraft]);

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

    try {
      const result = await createCheckout.mutateAsync({
        email: draft.email,
        draftId: draft.draftId,
      });
      window.location.href = result.url;
    } catch {
      return;
    }
  }, [createCheckout, draft.draftId, draft.email, goToStep]);

  const clearDraft = useCallback(() => {
    cancelStarterProfileImageGeneration();
    clearStoredDraft();
    setEmailInputOverride(null);
    setSelectedStarterProfileImageUrl(null);
    setProfileImageInputModeState("starter");
    setApplyStarterNameOverlayState(true);
    router.replace(buildStepUrl("email"), { scroll: false });
  }, [
    buildStepUrl,
    cancelStarterProfileImageGeneration,
    clearStoredDraft,
    router,
  ]);

  return {
    applyStarterNameOverlay,
    clearDraft,
    clearProfileImage,
    collectEmail,
    createCheckout,
    currentStepIndex,
    draft,
    emailInput,
    emailIsValid,
    exampleCultivars,
    furthestStepIndex,
    goBack,
    goForward,
    goToStep,
    imageError,
    isEditingCheckoutEmail,
    isGeneratingStarterProfileImage,
    listingPreview,
    membershipPriceDisplay,
    profileImageInputMode,
    profilePreview,
    progressValue,
    saveEmailAndContinue,
    selectStarterProfileImage,
    selectedStarterProfileImageUrl,
    setApplyStarterNameOverlay,
    setDraft,
    setEmailInput: setEmailInputOverride,
    setImageError,
    setIsEditingCheckoutEmail,
    setProfileImageInputMode,
    startCheckout,
    storageWarning,
    updateListingImage: (image: Blob | File | undefined) =>
      updateImageDraft(image, "listingImageDataUrl"),
    updateProfileGardenName,
    updateProfileImage: (image: Blob | File | undefined) => {
      if (image) {
        cancelStarterProfileImageGeneration();
        setProfileImageInputModeState("upload");
        setSelectedStarterProfileImageUrl(null);
      }

      return updateImageDraft(image, "profileImageDataUrl");
    },
  };
}

export type AnonymousOnboardingController = ReturnType<
  typeof useAnonymousOnboardingController
>;
