"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
import {
  ANONYMOUS_ONBOARDING_STEPS,
  DEFAULT_GARDEN_NAME_PLACEHOLDER,
  STARTER_PROFILE_IMAGES,
  getListingPreview,
  getProfilePreview,
  normalizeEmail,
  type AnonymousOnboardingPageClientProps,
} from "./anonymous-onboarding-config";
import {
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [draft, setDraftState] = useState(() =>
    createAnonymousOnboardingDraft(),
  );
  const draftRef = useRef(draft);
  const hasHydratedDraftRef = useRef(false);
  const [draftIsHydrated, setDraftIsHydrated] = useState(false);
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

  const [emailInputOverride, setEmailInputOverride] = useState<string | null>(
    null,
  );
  const [isEditingCheckoutEmail, setIsEditingCheckoutEmail] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [profileImageInputMode, setProfileImageInputModeState] = useState<
    "starter" | "upload"
  >("starter");
  const [selectedStarterProfileImageUrl, setSelectedStarterProfileImageUrl] =
    useState<string | null>(STARTER_PROFILE_IMAGES[0]?.url ?? null);
  const uploadedProfileImageDataUrlRef = useRef<string | null>(null);
  const starterProfileImageDataUrlRef = useRef<string | null>(null);
  const defaultStarterGenerationStartedRef = useRef(false);
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

    const frame = window.requestAnimationFrame(() => {
      if (hasHydratedDraftRef.current) {
        return;
      }
      hasHydratedDraftRef.current = true;

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
      if (storedDraft.profile.profileImageSource === "upload") {
        uploadedProfileImageDataUrlRef.current =
          storedDraft.profile.profileImageDataUrl;
      } else if (storedDraft.profile.profileImageSource === "starter") {
        starterProfileImageDataUrlRef.current =
          storedDraft.profile.profileImageDataUrl;
      }
      setSelectedStarterProfileImageUrl(
        storedDraft.profile.starterImageUrl ??
          (storedDraft.profile.profileImageSource === "starter"
            ? null
            : (STARTER_PROFILE_IMAGES[0]?.url ?? null)),
      );
      setProfileImageInputModeState(
        storedDraft.profile.profileImageSource === "upload"
          ? "upload"
          : "starter",
      );
      setDraftIsHydrated(true);
      if (requestedStep !== initialStep) {
        window.history.replaceState(null, "", buildStepUrl(initialStep));
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [buildStepUrl, searchParams]);

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
      window.history.replaceState(
        null,
        "",
        buildStepUrl(draftRef.current.step),
      );
      return;
    }

    setDraft((currentDraft) => ({
      ...currentDraft,
      step: requestedStep,
    }));
  }, [buildStepUrl, searchParams, setDraft]);

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
      window.history.pushState(null, "", buildStepUrl(step));
    },
    [buildStepUrl, setDraft],
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

              starterProfileImageDataUrlRef.current = dataUrl;
              setDraft((currentDraft) => ({
                ...currentDraft,
                profile: {
                  ...currentDraft.profile,
                  profileImageDataUrl: dataUrl,
                  profileImageSource: "starter",
                  starterImageUrl: baseImageUrl,
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
      if (draftRef.current.profile.profileImageSource === "upload") {
        uploadedProfileImageDataUrlRef.current =
          draftRef.current.profile.profileImageDataUrl;
      }
      setProfileImageInputModeState("starter");
      setSelectedStarterProfileImageUrl(baseImageUrl);
      setDraft((currentDraft) => ({
        ...currentDraft,
        profile: {
          ...currentDraft.profile,
          profileImageDataUrl: null,
          profileImageSource: null,
          starterImageUrl: baseImageUrl,
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
        if (draftRef.current.profile.profileImageSource === "starter") {
          starterProfileImageDataUrlRef.current =
            draftRef.current.profile.profileImageDataUrl;
        }
        const uploadedImageDataUrl = uploadedProfileImageDataUrlRef.current;
        setDraft((currentDraft) => ({
          ...currentDraft,
          profile: {
            ...currentDraft.profile,
            profileImageDataUrl: uploadedImageDataUrl,
            profileImageSource: uploadedImageDataUrl ? "upload" : null,
          },
        }));
        return;
      }

      if (draftRef.current.profile.profileImageSource === "upload") {
        uploadedProfileImageDataUrlRef.current =
          draftRef.current.profile.profileImageDataUrl;
      }
      const starterImageDataUrl = starterProfileImageDataUrlRef.current;
      const baseImageUrl =
        selectedStarterProfileImageUrl ??
        (starterImageDataUrl ? undefined : STARTER_PROFILE_IMAGES[0]?.url);
      if (baseImageUrl) {
        setSelectedStarterProfileImageUrl(baseImageUrl);
      }
      setDraft((currentDraft) => ({
        ...currentDraft,
        profile: {
          ...currentDraft.profile,
          profileImageDataUrl: starterImageDataUrl,
          profileImageSource: starterImageDataUrl ? "starter" : null,
          starterImageUrl:
            baseImageUrl ?? currentDraft.profile.starterImageUrl,
        },
      }));
      if (!starterImageDataUrl && baseImageUrl) {
        scheduleStarterProfileImageGeneration({
          applyNameOverlay: applyStarterNameOverlay,
          baseImageUrl,
          debounceMs: 0,
          gardenName: draftRef.current.profile.gardenName,
        });
      }
    },
    [
      applyStarterNameOverlay,
      cancelStarterProfileImageGeneration,
      scheduleStarterProfileImageGeneration,
      selectedStarterProfileImageUrl,
      setDraft,
    ],
  );

  useEffect(() => {
    if (
      !draftIsHydrated ||
      profileImageInputMode !== "starter" ||
      draft.profile.profileImageDataUrl ||
      isGeneratingStarterProfileImage ||
      defaultStarterGenerationStartedRef.current
    ) {
      return;
    }

    const baseImageUrl =
      selectedStarterProfileImageUrl ?? STARTER_PROFILE_IMAGES[0]?.url;
    if (!baseImageUrl) {
      return;
    }

    defaultStarterGenerationStartedRef.current = true;
    scheduleStarterProfileImageGeneration({
      applyNameOverlay: applyStarterNameOverlay,
      baseImageUrl,
      debounceMs: 0,
      gardenName: draft.profile.gardenName,
    });
  }, [
    applyStarterNameOverlay,
    draft.profile.gardenName,
    draft.profile.profileImageDataUrl,
    draftIsHydrated,
    isGeneratingStarterProfileImage,
    profileImageInputMode,
    scheduleStarterProfileImageGeneration,
    selectedStarterProfileImageUrl,
  ]);

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
        if (target === "profileImageDataUrl") {
          uploadedProfileImageDataUrlRef.current = dataUrl;
        }
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
    uploadedProfileImageDataUrlRef.current = null;
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

  return {
    applyStarterNameOverlay,
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
      }

      return updateImageDraft(image, "profileImageDataUrl");
    },
  };
}

export type AnonymousOnboardingController = ReturnType<
  typeof useAnonymousOnboardingController
>;
