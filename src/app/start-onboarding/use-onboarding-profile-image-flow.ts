"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-utils";
import {
  DEFAULT_GARDEN_NAME_PLACEHOLDER,
  type ProfileOnboardingDraft,
} from "./onboarding-utils";

interface GeneratedStarterImage {
  blob: Blob;
  previewUrl: string;
}

interface UseOnboardingProfileImageFlowArgs {
  defaultStarterImageUrl: string | null;
  existingProfileImageUrl: string | null;
  generateStarterImageWithGardenName: (args: {
    baseImageUrl: string;
    gardenName: string;
  }) => Promise<GeneratedStarterImage>;
  imagesFetched: boolean;
  profileDraft: ProfileOnboardingDraft;
  profileId: string | null | undefined;
  setProfileDraft: Dispatch<SetStateAction<ProfileOnboardingDraft>>;
}

export function useOnboardingProfileImageFlow({
  defaultStarterImageUrl,
  existingProfileImageUrl,
  generateStarterImageWithGardenName,
  imagesFetched,
  profileDraft,
  profileId,
  setProfileDraft,
}: UseOnboardingProfileImageFlowArgs) {
  const [selectedStarterImageUrl, setSelectedStarterImageUrl] = useState<
    string | null
  >(defaultStarterImageUrl);
  const [profileImageInputMode, setProfileImageInputMode] = useState<
    "starter" | "upload"
  >("starter");
  const [useExistingProfileImage, setUseExistingProfileImage] =
    useState(false);
  const [applyStarterNameOverlay, setApplyStarterNameOverlay] = useState(true);
  const [isGeneratingStarterImage, setIsGeneratingStarterImage] =
    useState(false);
  const [pendingStarterImageBlob, setPendingStarterImageBlob] =
    useState<Blob | null>(null);
  const [pendingStarterPreviewUrl, setPendingStarterPreviewUrl] = useState<
    string | null
  >(null);
  const [pendingProfileUploadBlob, setPendingProfileUploadBlob] =
    useState<Blob | null>(null);
  const [pendingProfileUploadPreviewUrl, setPendingProfileUploadPreviewUrl] =
    useState<string | null>(null);

  const starterImageGenerationTimeoutRef = useRef<number | null>(null);
  const starterImageGenerationRequestIdRef = useRef(0);
  const profileImageWasEditedRef = useRef(false);

  const clearPendingStarterImage = useCallback(() => {
    setPendingStarterPreviewUrl((previousPreviewUrl) => {
      if (previousPreviewUrl) {
        URL.revokeObjectURL(previousPreviewUrl);
      }

      return null;
    });
    setPendingStarterImageBlob(null);
  }, []);

  const clearPendingProfileUpload = useCallback(() => {
    setPendingProfileUploadPreviewUrl((previousPreviewUrl) => {
      if (previousPreviewUrl) {
        URL.revokeObjectURL(previousPreviewUrl);
      }

      return null;
    });
    setPendingProfileUploadBlob(null);
  }, []);

  const cancelStarterImageGeneration = useCallback(() => {
    if (starterImageGenerationTimeoutRef.current !== null) {
      window.clearTimeout(starterImageGenerationTimeoutRef.current);
      starterImageGenerationTimeoutRef.current = null;
    }

    starterImageGenerationRequestIdRef.current += 1;
    setIsGeneratingStarterImage(false);
  }, []);

  useEffect(() => {
    return () => {
      if (starterImageGenerationTimeoutRef.current !== null) {
        window.clearTimeout(starterImageGenerationTimeoutRef.current);
        starterImageGenerationTimeoutRef.current = null;
      }

      starterImageGenerationRequestIdRef.current += 1;

      if (pendingStarterPreviewUrl) {
        URL.revokeObjectURL(pendingStarterPreviewUrl);
      }

      if (pendingProfileUploadPreviewUrl) {
        URL.revokeObjectURL(pendingProfileUploadPreviewUrl);
      }
    };
  }, [pendingProfileUploadPreviewUrl, pendingStarterPreviewUrl]);

  useEffect(() => {
    if (
      !profileId ||
      !imagesFetched ||
      existingProfileImageUrl ||
      profileImageWasEditedRef.current
    ) {
      return;
    }

    const fallbackStarterImageUrl =
      selectedStarterImageUrl ?? defaultStarterImageUrl;
    if (!fallbackStarterImageUrl) {
      return;
    }

    setSelectedStarterImageUrl(fallbackStarterImageUrl);
    setProfileDraft((previous) => ({
      ...previous,
      profileImageUrl: previous.profileImageUrl ?? fallbackStarterImageUrl,
    }));
  }, [
    defaultStarterImageUrl,
    existingProfileImageUrl,
    imagesFetched,
    profileId,
    selectedStarterImageUrl,
    setProfileDraft,
  ]);

  useEffect(() => {
    if (!existingProfileImageUrl || profileImageWasEditedRef.current) {
      return;
    }

    cancelStarterImageGeneration();
    clearPendingStarterImage();
    clearPendingProfileUpload();
    setUseExistingProfileImage(true);
    setProfileImageInputMode("upload");
    setSelectedStarterImageUrl(null);
    setProfileDraft((previous) => ({
      ...previous,
      profileImageUrl: existingProfileImageUrl,
    }));
  }, [
    cancelStarterImageGeneration,
    clearPendingProfileUpload,
    clearPendingStarterImage,
    existingProfileImageUrl,
    setProfileDraft,
  ]);

  const scheduleStarterImageGeneration = useCallback(
    ({
      baseImageUrl,
      gardenName,
      debounceMs,
    }: {
      baseImageUrl: string;
      gardenName: string;
      debounceMs: number;
    }) => {
      cancelStarterImageGeneration();
      const requestId = starterImageGenerationRequestIdRef.current;
      setIsGeneratingStarterImage(true);

      starterImageGenerationTimeoutRef.current = window.setTimeout(() => {
        void (async () => {
          try {
            const generatedImage = await generateStarterImageWithGardenName({
              baseImageUrl,
              gardenName,
            });

            if (starterImageGenerationRequestIdRef.current !== requestId) {
              URL.revokeObjectURL(generatedImage.previewUrl);
              return;
            }

            setPendingStarterImageBlob(generatedImage.blob);
            setPendingStarterPreviewUrl((previousPreviewUrl) => {
              if (previousPreviewUrl) {
                URL.revokeObjectURL(previousPreviewUrl);
              }

              return generatedImage.previewUrl;
            });
            setProfileDraft((previous) => ({
              ...previous,
              profileImageUrl: generatedImage.previewUrl,
            }));
          } catch (error) {
            if (starterImageGenerationRequestIdRef.current !== requestId) {
              return;
            }

            toast.error("Could not generate starter image", {
              description: getErrorMessage(error),
            });
          } finally {
            if (starterImageGenerationRequestIdRef.current === requestId) {
              setIsGeneratingStarterImage(false);
              starterImageGenerationTimeoutRef.current = null;
            }
          }
        })();
      }, debounceMs);
    },
    [cancelStarterImageGeneration, generateStarterImageWithGardenName, setProfileDraft],
  );

  useEffect(() => {
    if (!applyStarterNameOverlay || profileImageInputMode !== "starter") {
      return;
    }

    if (existingProfileImageUrl) {
      return;
    }

    if (!selectedStarterImageUrl) {
      return;
    }

    if (
      profileDraft.profileImageUrl &&
      profileDraft.profileImageUrl !== selectedStarterImageUrl
    ) {
      return;
    }

    scheduleStarterImageGeneration({
      baseImageUrl: selectedStarterImageUrl,
      gardenName:
        profileDraft.gardenName.trim() || DEFAULT_GARDEN_NAME_PLACEHOLDER,
      debounceMs: 0,
    });
  }, [
    applyStarterNameOverlay,
    existingProfileImageUrl,
    profileDraft.gardenName,
    profileDraft.profileImageUrl,
    profileImageInputMode,
    scheduleStarterImageGeneration,
    selectedStarterImageUrl,
  ]);

  const handleGardenNameChange = useCallback(
    (nextGardenName: string) => {
      setProfileDraft((previous) => ({
        ...previous,
        gardenName: nextGardenName,
      }));

      if (selectedStarterImageUrl && applyStarterNameOverlay) {
        scheduleStarterImageGeneration({
          baseImageUrl: selectedStarterImageUrl,
          gardenName:
            nextGardenName.trim() || DEFAULT_GARDEN_NAME_PLACEHOLDER,
          debounceMs: 150,
        });
      }
    },
    [
      applyStarterNameOverlay,
      scheduleStarterImageGeneration,
      selectedStarterImageUrl,
      setProfileDraft,
    ],
  );

  const handleProfileImageModeChange = useCallback(
    (mode: "starter" | "upload") => {
      profileImageWasEditedRef.current = true;
      setUseExistingProfileImage(false);
      setProfileImageInputMode(mode);

      if (mode === "starter") {
        clearPendingProfileUpload();
      }
    },
    [clearPendingProfileUpload],
  );

  const handleProfileImagePick = useCallback(
    (url: string, starterImageUrl: string | null = null) => {
      cancelStarterImageGeneration();
      clearPendingStarterImage();

      setProfileDraft((previous) => ({
        ...previous,
        profileImageUrl: url,
      }));
      setSelectedStarterImageUrl(starterImageUrl);
    },
    [cancelStarterImageGeneration, clearPendingStarterImage, setProfileDraft],
  );

  const handleDeferredProfileImageReady = useCallback(
    (file: Blob) => {
      profileImageWasEditedRef.current = true;
      setUseExistingProfileImage(false);
      clearPendingProfileUpload();
      const previewUrl = URL.createObjectURL(file);
      setPendingProfileUploadBlob(file);
      setPendingProfileUploadPreviewUrl(previewUrl);
      setProfileImageInputMode("upload");
      handleProfileImagePick(previewUrl, null);
    },
    [clearPendingProfileUpload, handleProfileImagePick],
  );

  const handleStarterImageSelect = useCallback(
    (baseImageUrl: string) => {
      profileImageWasEditedRef.current = true;
      setUseExistingProfileImage(false);
      setProfileImageInputMode("starter");
      clearPendingProfileUpload();
      setSelectedStarterImageUrl(baseImageUrl);

      if (!applyStarterNameOverlay) {
        cancelStarterImageGeneration();
        clearPendingStarterImage();
        setProfileDraft((previous) => ({
          ...previous,
          profileImageUrl: baseImageUrl,
        }));
        return;
      }

      scheduleStarterImageGeneration({
        baseImageUrl,
        gardenName:
          profileDraft.gardenName.trim() || DEFAULT_GARDEN_NAME_PLACEHOLDER,
        debounceMs: 0,
      });
    },
    [
      applyStarterNameOverlay,
      cancelStarterImageGeneration,
      clearPendingProfileUpload,
      clearPendingStarterImage,
      profileDraft.gardenName,
      scheduleStarterImageGeneration,
      setProfileDraft,
    ],
  );

  const handleDeferredProfileImageCleared = useCallback(() => {
    profileImageWasEditedRef.current = true;
    setUseExistingProfileImage(false);
    clearPendingProfileUpload();

    const starterImageUrl = selectedStarterImageUrl ?? defaultStarterImageUrl;
    if (starterImageUrl) {
      setSelectedStarterImageUrl((previous) => previous ?? starterImageUrl);
      setProfileDraft((previous) => ({
        ...previous,
        profileImageUrl: pendingStarterPreviewUrl ?? starterImageUrl,
      }));
      return;
    }

    setProfileDraft((previous) => ({
      ...previous,
      profileImageUrl: null,
    }));
  }, [
    clearPendingProfileUpload,
    defaultStarterImageUrl,
    pendingStarterPreviewUrl,
    selectedStarterImageUrl,
    setProfileDraft,
  ]);

  const handleStarterOverlayChange = useCallback(
    (enabled: boolean) => {
      profileImageWasEditedRef.current = true;
      setUseExistingProfileImage(false);
      setApplyStarterNameOverlay(enabled);

      if (!selectedStarterImageUrl) {
        return;
      }

      if (!enabled) {
        cancelStarterImageGeneration();
        clearPendingStarterImage();
        setProfileDraft((previous) => ({
          ...previous,
          profileImageUrl: selectedStarterImageUrl,
        }));
        return;
      }

      scheduleStarterImageGeneration({
        baseImageUrl: selectedStarterImageUrl,
        gardenName:
          profileDraft.gardenName.trim() || DEFAULT_GARDEN_NAME_PLACEHOLDER,
        debounceMs: 0,
      });
    },
    [
      cancelStarterImageGeneration,
      clearPendingStarterImage,
      profileDraft.gardenName,
      scheduleStarterImageGeneration,
      selectedStarterImageUrl,
      setProfileDraft,
    ],
  );

  const handleUseExistingProfileImageChange = useCallback(
    (enabled: boolean) => {
      if (!existingProfileImageUrl) {
        return;
      }

      if (enabled) {
        profileImageWasEditedRef.current = false;
        setUseExistingProfileImage(true);
        setProfileImageInputMode("upload");
        cancelStarterImageGeneration();
        clearPendingStarterImage();
        clearPendingProfileUpload();
        setSelectedStarterImageUrl(null);
        setProfileDraft((previous) => ({
          ...previous,
          profileImageUrl: existingProfileImageUrl,
        }));
        return;
      }

      profileImageWasEditedRef.current = true;
      setUseExistingProfileImage(false);
      const starterImageUrl = selectedStarterImageUrl ?? defaultStarterImageUrl;
      if (starterImageUrl) {
        handleStarterImageSelect(starterImageUrl);
        return;
      }

      setProfileDraft((previous) => ({
        ...previous,
        profileImageUrl: null,
      }));
    },
    [
      cancelStarterImageGeneration,
      clearPendingProfileUpload,
      clearPendingStarterImage,
      defaultStarterImageUrl,
      existingProfileImageUrl,
      handleStarterImageSelect,
      selectedStarterImageUrl,
      setProfileDraft,
    ],
  );

  return {
    applyStarterNameOverlay,
    clearPendingProfileUpload,
    clearPendingStarterImage,
    handleDeferredProfileImageCleared,
    handleDeferredProfileImageReady,
    handleGardenNameChange,
    handleProfileImageModeChange,
    handleStarterImageSelect,
    handleStarterOverlayChange,
    handleUseExistingProfileImageChange,
    isGeneratingStarterImage,
    pendingProfileUploadBlob,
    pendingProfileUploadPreviewUrl,
    pendingStarterImageBlob,
    pendingStarterPreviewUrl,
    profileImageInputMode,
    selectedStarterImageUrl,
    useExistingProfileImage,
  };
}
