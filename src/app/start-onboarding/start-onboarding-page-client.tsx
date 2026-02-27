"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Link2,
  MapPin,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import {
  AhsListingSelect,
  type AhsSearchResult,
} from "@/components/ahs-listing-select";
import { CurrencyInput } from "@/components/currency-input";
import { ImageUpload } from "@/components/image-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import { getErrorMessage } from "@/lib/error-utils";
import { cn, formatPrice, uploadFileWithProgress } from "@/lib/utils";
import { api } from "@/trpc/react";
import type { ImageUploadResponse } from "@/types/image";
import {
  ONBOARDING_BUYER_FLOW_BULLETS,
  ONBOARDING_LISTING_DEFAULTS,
  ONBOARDING_LISTING_DISCOVERY_EXAMPLES,
  ONBOARDING_PROFILE_DISCOVERY_EXAMPLES,
  getNextIncompleteListingField,
  getNextIncompleteProfileField,
  isListingOnboardingDraftComplete,
  isProfileOnboardingDraftComplete,
  ONBOARDING_STEPS,
  STARTER_PROFILE_IMAGES,
  type ListingOnboardingDraft,
  type ListingOnboardingField,
  type ProfileOnboardingDraft,
  type ProfileOnboardingField,
} from "./onboarding-utils";

const PROFILE_PLACEHOLDER_IMAGE = "/assets/catalog-blooms.webp";

const DEFAULT_PROFILE_DRAFT: ProfileOnboardingDraft = {
  gardenName: "",
  location: "",
  description: "",
  profileImageUrl: null,
};

const DEFAULT_LISTING_DRAFT: ListingOnboardingDraft = {
  cultivarReferenceId: null,
  title: "",
  price: null,
  description: "",
};

export function StartOnboardingPageClient() {
  const router = useRouter();
  const utils = api.useUtils();

  const [stepIndex, setStepIndex] = useState(0);
  const [focusedProfileField, setFocusedProfileField] =
    useState<ProfileOnboardingField>("gardenName");
  const [activeListingField, setActiveListingField] =
    useState<ListingOnboardingField>("cultivar");

  const [profileDraft, setProfileDraft] =
    useState<ProfileOnboardingDraft>(DEFAULT_PROFILE_DRAFT);
  const [listingDraft, setListingDraft] =
    useState<ListingOnboardingDraft>(DEFAULT_LISTING_DRAFT);

  const [selectedProfileImageId, setSelectedProfileImageId] = useState<string | null>(
    null,
  );
  const [selectedStarterImageUrl, setSelectedStarterImageUrl] = useState<string | null>(
    null,
  );
  const [profileImageInputMode, setProfileImageInputMode] = useState<
    "starter" | "upload"
  >("starter");
  const [applyStarterNameOverlay, setApplyStarterNameOverlay] = useState(true);
  const [isGeneratingStarterImage, setIsGeneratingStarterImage] = useState(false);
  const [pendingStarterImageBlob, setPendingStarterImageBlob] =
    useState<Blob | null>(null);
  const [pendingStarterPreviewUrl, setPendingStarterPreviewUrl] = useState<
    string | null
  >(null);
  const [selectedCultivarName, setSelectedCultivarName] = useState<string | null>(
    null,
  );
  const [selectedCultivarAhsId, setSelectedCultivarAhsId] = useState<string | null>(
    null,
  );
  const [selectedListingImageId, setSelectedListingImageId] = useState<
    string | null
  >(null);
  const [selectedListingImageUrl, setSelectedListingImageUrl] = useState<
    string | null
  >(null);

  const [savedListingId, setSavedListingId] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingListing, setIsSavingListing] = useState(false);

  const profileQuery = api.dashboardDb.userProfile.get.useQuery();
  const imagesQuery = api.dashboardDb.image.list.useQuery(undefined, {
    enabled: Boolean(profileQuery.data?.id),
  });
  const listingQuery = api.dashboardDb.listing.list.useQuery();
  const shouldAttemptDefaultCultivar =
    listingQuery.isFetched &&
    (listingQuery.data?.length ?? 0) === 0 &&
    listingDraft.cultivarReferenceId === null &&
    selectedCultivarName === null;
  const defaultCultivarQuery = api.dashboardDb.ahs.search.useQuery(
    { query: ONBOARDING_LISTING_DEFAULTS.cultivarQuery },
    {
      enabled: shouldAttemptDefaultCultivar,
    },
  );
  const fallbackCultivarQuery = api.dashboardDb.ahs.search.useQuery(
    { query: ONBOARDING_LISTING_DEFAULTS.fallbackCultivarQuery },
    {
      enabled:
        shouldAttemptDefaultCultivar &&
        defaultCultivarQuery.isFetched &&
        (defaultCultivarQuery.data?.length ?? 0) === 0,
    },
  );
  const selectedCultivarDetailsQuery = api.dashboardDb.ahs.get.useQuery(
    { id: selectedCultivarAhsId ?? "" },
    { enabled: Boolean(selectedCultivarAhsId) },
  );

  const updateProfileMutation = api.dashboardDb.userProfile.update.useMutation();
  const getImagePresignedUrlMutation =
    api.dashboardDb.image.getPresignedUrl.useMutation();
  const createImageMutation = api.dashboardDb.image.create.useMutation();
  const deleteImageMutation = api.dashboardDb.image.delete.useMutation();
  const createListingMutation = api.dashboardDb.listing.create.useMutation();
  const updateListingMutation = api.dashboardDb.listing.update.useMutation();
  const linkAhsMutation = api.dashboardDb.listing.linkAhs.useMutation();

  const hasHydratedProfile = useRef(false);
  const hasHydratedProfileImage = useRef(false);
  const hasHydratedListing = useRef(false);
  const hasHydratedListingImage = useRef(false);
  const hasAppliedDefaultCultivar = useRef(false);
  const hasInitializedListingDraft = useRef(false);
  const gardenNameInputRef = useRef<HTMLInputElement | null>(null);
  const gardenLocationInputRef = useRef<HTMLInputElement | null>(null);
  const gardenDescriptionInputRef = useRef<HTMLTextAreaElement | null>(null);
  const profileImageEditorRef = useRef<HTMLDivElement | null>(null);
  const listingCultivarRef = useRef<HTMLDivElement | null>(null);
  const listingTitleInputRef = useRef<HTMLInputElement | null>(null);
  const listingDescriptionInputRef = useRef<HTMLTextAreaElement | null>(null);
  const listingImageEditorRef = useRef<HTMLDivElement | null>(null);
  const starterImageGenerationTimeoutRef = useRef<number | null>(null);
  const starterImageGenerationRequestIdRef = useRef(0);

  useEffect(() => {
    if (!profileQuery.data || hasHydratedProfile.current) {
      return;
    }

    hasHydratedProfile.current = true;

    const nextImage = profileQuery.data.logoUrl ?? null;

    setProfileDraft({
      gardenName: profileQuery.data.title ?? "",
      location: profileQuery.data.location ?? "",
      description: profileQuery.data.description ?? "",
      profileImageUrl: nextImage,
    });

    const matchingStarterImage = STARTER_PROFILE_IMAGES.find(
      (starterImage) => starterImage.url === nextImage,
    );
    setSelectedProfileImageId(null);
    setSelectedStarterImageUrl(matchingStarterImage?.url ?? null);
  }, [profileQuery.data]);

  useEffect(() => {
    if (!profileQuery.data?.id || !imagesQuery.data || hasHydratedProfileImage.current) {
      return;
    }

    hasHydratedProfileImage.current = true;

    const profileImageUrl =
      imagesQuery.data.find((image) => image.userProfileId === profileQuery.data?.id)
        ?.url ?? null;

    if (!profileImageUrl) {
      return;
    }

    setProfileDraft((previous) => ({
      ...previous,
      profileImageUrl,
    }));
    const matchingProfileImage = imagesQuery.data.find(
      (image) => image.url === profileImageUrl,
    );
    setSelectedProfileImageId(matchingProfileImage?.id ?? null);
    const matchingStarterImage = STARTER_PROFILE_IMAGES.find(
      (starterImage) => starterImage.url === profileImageUrl,
    );
    setSelectedStarterImageUrl(matchingStarterImage?.url ?? null);
  }, [imagesQuery.data, profileQuery.data?.id]);

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
    };
  }, [pendingStarterPreviewUrl]);

  useEffect(() => {
    if (!listingQuery.data || hasHydratedListing.current) {
      return;
    }

    hasHydratedListing.current = true;
    const existingListing = listingQuery.data[0];

    if (!existingListing) {
      return;
    }

    setSavedListingId(existingListing.id);
    setListingDraft({
      cultivarReferenceId: existingListing.cultivarReferenceId,
      title: existingListing.title,
      price: existingListing.price,
      description: existingListing.description ?? "",
    });

    hasAppliedDefaultCultivar.current = true;
  }, [listingQuery.data]);

  useEffect(() => {
    hasHydratedListingImage.current = false;
  }, [savedListingId]);

  useEffect(() => {
    if (!savedListingId || !imagesQuery.data || hasHydratedListingImage.current) {
      return;
    }

    hasHydratedListingImage.current = true;
    const listingImage = imagesQuery.data.find(
      (image) => image.listingId === savedListingId,
    );

    if (!listingImage) {
      return;
    }

    setSelectedListingImageId(listingImage.id);
    setSelectedListingImageUrl(listingImage.url);
  }, [imagesQuery.data, savedListingId]);

  const currentStep = ONBOARDING_STEPS[stepIndex] ?? ONBOARDING_STEPS[0]!;
  const profileMissingField = getNextIncompleteProfileField(profileDraft);
  const listingMissingField = getNextIncompleteListingField(listingDraft);
  const profileImages = useMemo(() => {
    if (!profileQuery.data?.id) {
      return [];
    }

    return (imagesQuery.data ?? []).filter(
      (image) => image.userProfileId === profileQuery.data.id,
    );
  }, [imagesQuery.data, profileQuery.data?.id]);

  const listingImages = useMemo(() => {
    if (!savedListingId) {
      return [];
    }

    return (imagesQuery.data ?? []).filter((image) => image.listingId === savedListingId);
  }, [imagesQuery.data, savedListingId]);

  const progressValue = ((stepIndex + 1) / ONBOARDING_STEPS.length) * 100;
  const selectedCultivarImageUrl = selectedCultivarDetailsQuery.data?.ahsImageUrl ?? null;
  const profileImagePreviewUrl = profileDraft.profileImageUrl ?? PROFILE_PLACEHOLDER_IMAGE;
  const listingImagePreviewUrl =
    selectedListingImageUrl ??
    selectedCultivarImageUrl ??
    ONBOARDING_LISTING_DEFAULTS.fallbackImageUrl;

  const listingTitlePreview = listingDraft.title.trim() || "Your first listing title";
  const listingDescriptionPreview =
    listingDraft.description.trim() ||
    "Write a short description so buyers know what makes this plant special.";

  const clearPendingStarterImage = () => {
    setPendingStarterPreviewUrl((previousPreviewUrl) => {
      if (previousPreviewUrl) {
        URL.revokeObjectURL(previousPreviewUrl);
      }

      return null;
    });
    setPendingStarterImageBlob(null);
  };

  const cancelStarterImageGeneration = () => {
    if (starterImageGenerationTimeoutRef.current !== null) {
      window.clearTimeout(starterImageGenerationTimeoutRef.current);
      starterImageGenerationTimeoutRef.current = null;
    }

    starterImageGenerationRequestIdRef.current += 1;
    setIsGeneratingStarterImage(false);
  };

  const scheduleStarterImageGeneration = ({
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
          setSelectedProfileImageId(null);
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
  };

  const focusProfileField = (field: ProfileOnboardingField) => {
    setFocusedProfileField(field);

    if (field === "gardenName") {
      gardenNameInputRef.current?.focus();
      return;
    }

    if (field === "location") {
      gardenLocationInputRef.current?.focus();
      return;
    }

    if (field === "description") {
      gardenDescriptionInputRef.current?.focus();
      return;
    }

    profileImageEditorRef.current?.focus();
    profileImageEditorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const focusListingField = (field: ListingOnboardingField) => {
    setActiveListingField(field);

    if (field === "title") {
      listingTitleInputRef.current?.focus();
      return;
    }

    if (field === "price") {
      const priceInput = document.getElementById("listing-price");
      if (priceInput instanceof HTMLInputElement) {
        priceInput.focus();
      }
      return;
    }

    if (field === "description") {
      listingDescriptionInputRef.current?.focus();
      return;
    }

    if (field === "cultivar") {
      listingCultivarRef.current?.focus();
      listingCultivarRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }

    listingImageEditorRef.current?.focus();
    listingImageEditorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const handleProfileImagePick = (
    url: string,
    starterImageUrl: string | null = null,
    imageId: string | null = null,
  ) => {
    cancelStarterImageGeneration();
    clearPendingStarterImage();

    const nextDraft = {
      ...profileDraft,
      profileImageUrl: url,
    };

    setProfileDraft(nextDraft);
    setSelectedProfileImageId(imageId);
    setSelectedStarterImageUrl(starterImageUrl);
  };

  const handleProfileImageUploadComplete = (result: ImageUploadResponse) => {
    setProfileImageInputMode("upload");
    handleProfileImagePick(result.url, null, result.image.id);
  };

  const handleListingImageUploadComplete = (result: ImageUploadResponse) => {
    setSelectedListingImageId(result.image.id);
    setSelectedListingImageUrl(result.url);
    setActiveListingField("image");
  };

  const handleStarterImageSelect = (baseImageUrl: string) => {
    setProfileImageInputMode("starter");
    setSelectedProfileImageId(null);
    setSelectedStarterImageUrl(baseImageUrl);
    setProfileDraft((previous) => ({
      ...previous,
      profileImageUrl: baseImageUrl,
    }));

    if (!applyStarterNameOverlay) {
      cancelStarterImageGeneration();
      clearPendingStarterImage();
      return;
    }

    const gardenName = profileDraft.gardenName.trim();
    if (!gardenName) {
      cancelStarterImageGeneration();
      clearPendingStarterImage();
      toast.error("Add your garden name first to stamp it on starter images.");
      focusProfileField("gardenName");
      return;
    }

    scheduleStarterImageGeneration({
      baseImageUrl,
      gardenName,
      debounceMs: 0,
    });
  };

  const handleStarterOverlayChange = (enabled: boolean) => {
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
      setSelectedProfileImageId(null);
      return;
    }

    const gardenName = profileDraft.gardenName.trim();
    if (!gardenName) {
      return;
    }

    scheduleStarterImageGeneration({
      baseImageUrl: selectedStarterImageUrl,
      gardenName,
      debounceMs: 0,
    });
  };

  const syncOnboardingProfileImageSelection = async ({
    profileId,
    selectedImageUrl,
    selectedImageKey,
    selectedImageId,
  }: {
    profileId: string;
    selectedImageUrl: string;
    selectedImageKey: string;
    selectedImageId: string | null;
  }) => {
    let imageToKeepId =
      selectedImageId ??
      profileImages.find((image) => image.url === selectedImageUrl)?.id ??
      null;

    if (!imageToKeepId) {
      const createdImage = await createImageMutation.mutateAsync({
        type: "profile",
        referenceId: profileId,
        url: selectedImageUrl,
        key: selectedImageKey,
      });
      imageToKeepId = createdImage.id;
    }

    const imagesToDelete = profileImages.filter((image) => image.id !== imageToKeepId);
    await Promise.all(
      imagesToDelete.map((image) =>
        deleteImageMutation.mutateAsync({
          type: "profile",
          referenceId: profileId,
          imageId: image.id,
        }),
      ),
    );

    setSelectedProfileImageId(imageToKeepId);
  };

  const syncOnboardingListingImageSelection = async ({
    listingId,
    selectedImageUrl,
    selectedImageKey,
    selectedImageId,
  }: {
    listingId: string;
    selectedImageUrl: string;
    selectedImageKey: string;
    selectedImageId: string | null;
  }) => {
    let imageToKeepId =
      selectedImageId ??
      listingImages.find((image) => image.url === selectedImageUrl)?.id ??
      null;

    if (!imageToKeepId) {
      const createdImage = await createImageMutation.mutateAsync({
        type: "listing",
        referenceId: listingId,
        url: selectedImageUrl,
        key: selectedImageKey,
      });
      imageToKeepId = createdImage.id;
    }

    const imagesToDelete = listingImages.filter((image) => image.id !== imageToKeepId);
    await Promise.all(
      imagesToDelete.map((image) =>
        deleteImageMutation.mutateAsync({
          type: "listing",
          referenceId: listingId,
          imageId: image.id,
        }),
      ),
    );

    setSelectedListingImageId(imageToKeepId);
  };

  const applyAhsSelection = useCallback((result: AhsSearchResult) => {
    if (!result.cultivarReferenceId) {
      return;
    }

    setListingDraft((previous) => {
      const nextDraft = {
        ...previous,
        cultivarReferenceId: result.cultivarReferenceId,
        title:
          previous.title.trim().length > 0
            ? previous.title
            : (result.name ?? previous.title),
      };

      const nextIncomplete = getNextIncompleteListingField(nextDraft);
      setActiveListingField(nextIncomplete ?? "title");

      return nextDraft;
    });

    setSelectedCultivarName(result.name ?? null);
    setSelectedCultivarAhsId(result.id);
  }, []);

  const handleAhsSelect = (result: AhsSearchResult) => {
    if (!result.cultivarReferenceId) {
      toast.error("This cultivar cannot be linked yet.");
      return;
    }

    applyAhsSelection(result);
  };

  const ensureListingDraftRecord = useCallback(async () => {
    if (savedListingId) {
      return savedListingId;
    }

    const createdListing = await createListingMutation.mutateAsync({
      title: listingDraft.title.trim() || ONBOARDING_LISTING_DEFAULTS.draftTitle,
      cultivarReferenceId: listingDraft.cultivarReferenceId,
    });

    if (ONBOARDING_LISTING_DEFAULTS.defaultStatus) {
      await updateListingMutation.mutateAsync({
        id: createdListing.id,
        data: {
          status: ONBOARDING_LISTING_DEFAULTS.defaultStatus,
        },
      });
    }

    setSavedListingId(createdListing.id);
    await Promise.all([
      utils.dashboardDb.listing.list.invalidate(),
      utils.dashboardDb.image.list.invalidate(),
    ]);

    return createdListing.id;
  }, [
    createListingMutation,
    listingDraft.cultivarReferenceId,
    listingDraft.title,
    savedListingId,
    updateListingMutation,
    utils.dashboardDb.image.list,
    utils.dashboardDb.listing.list,
  ]);

  useEffect(() => {
    if (!shouldAttemptDefaultCultivar || hasAppliedDefaultCultivar.current) {
      return;
    }

    const defaultResults =
      (defaultCultivarQuery.data?.length ?? 0) > 0
        ? defaultCultivarQuery.data
        : fallbackCultivarQuery.data;
    if (!defaultResults || defaultResults.length === 0) {
      return;
    }

    const normalizedTarget = ONBOARDING_LISTING_DEFAULTS.cultivarName
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    const preferredMatch =
      defaultResults.find((result) => {
        const normalizedName = (result.name ?? "")
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim();
        return normalizedName === normalizedTarget;
      }) ?? defaultResults[0];
    if (!preferredMatch) {
      return;
    }

    hasAppliedDefaultCultivar.current = true;
    applyAhsSelection(preferredMatch);
  }, [
    applyAhsSelection,
    defaultCultivarQuery.data,
    fallbackCultivarQuery.data,
    shouldAttemptDefaultCultivar,
  ]);

  useEffect(() => {
    if (currentStep.id !== "build-listing-card") {
      return;
    }

    if (savedListingId || hasInitializedListingDraft.current) {
      return;
    }

    if (!listingQuery.isFetched || (listingQuery.data?.length ?? 0) > 0) {
      return;
    }

    hasInitializedListingDraft.current = true;
    void ensureListingDraftRecord().catch((error) => {
      hasInitializedListingDraft.current = false;
      toast.error("Unable to prepare your listing draft", {
        description: getErrorMessage(error),
      });
    });
  }, [
    currentStep.id,
    ensureListingDraftRecord,
    listingQuery.data,
    listingQuery.isFetched,
    savedListingId,
  ]);

  const saveProfileDraft = async () => {
    if (!profileQuery.data?.id) {
      toast.error("Unable to load your profile.");
      return false;
    }

    if (!isProfileOnboardingDraftComplete(profileDraft)) {
      focusProfileField(profileMissingField ?? "gardenName");
      toast.error("Complete image, garden name, and description first.");
      return false;
    }

    setIsSavingProfile(true);

    try {
      let profileImageUrlToSave = profileDraft.profileImageUrl;
      let profileImageKeyToSave = `onboarding:${Date.now()}`;

      if (pendingStarterImageBlob && profileImageUrlToSave) {
        const { url, key } = await uploadGeneratedStarterProfileImage({
          blob: pendingStarterImageBlob,
          referenceId: profileQuery.data.id,
          getPresignedUrl: getImagePresignedUrlMutation.mutateAsync,
        });

        profileImageUrlToSave = url;
        profileImageKeyToSave = key;
        clearPendingStarterImage();

        setProfileDraft((previous) => ({
          ...previous,
          profileImageUrl: url,
        }));
      }

      await updateProfileMutation.mutateAsync({
        data: {
          title: profileDraft.gardenName.trim(),
          location: profileDraft.location.trim(),
          description: profileDraft.description.trim(),
          logoUrl: profileImageUrlToSave,
        },
      });

      if (profileImageUrlToSave) {
        await syncOnboardingProfileImageSelection({
          profileId: profileQuery.data.id,
          selectedImageUrl: profileImageUrlToSave,
          selectedImageKey: profileImageKeyToSave,
          selectedImageId: selectedProfileImageId,
        });
      }

      await Promise.all([
        utils.dashboardDb.userProfile.get.invalidate(),
        utils.dashboardDb.image.list.invalidate(),
      ]);

      return true;
    } catch (error) {
      toast.error("Failed to save profile", {
        description: getErrorMessage(error),
      });
      return false;
    } finally {
      setIsSavingProfile(false);
    }
  };

  const saveListingDraft = async () => {
    if (!isListingOnboardingDraftComplete(listingDraft)) {
      focusListingField(listingMissingField ?? "cultivar");
      toast.error("Complete cultivar, title, price, and description first.");
      return false;
    }

    setIsSavingListing(true);

    try {
      const listingId = await ensureListingDraftRecord();

      if (listingDraft.cultivarReferenceId) {
        await linkAhsMutation.mutateAsync({
          id: listingId,
          cultivarReferenceId: listingDraft.cultivarReferenceId,
          syncName: false,
        });
      }

      await updateListingMutation.mutateAsync({
        id: listingId,
        data: {
          title: listingDraft.title.trim(),
          price: listingDraft.price,
          description: listingDraft.description.trim(),
        },
      });

      const listingImageToSave =
        selectedListingImageUrl ?? selectedCultivarImageUrl ?? null;

      if (listingImageToSave) {
        await syncOnboardingListingImageSelection({
          listingId,
          selectedImageUrl: listingImageToSave,
          selectedImageKey: `onboarding-listing:${Date.now()}`,
          selectedImageId: selectedListingImageId,
        });
      }

      await Promise.all([
        utils.dashboardDb.listing.list.invalidate(),
        utils.dashboardDb.image.list.invalidate(),
      ]);

      return true;
    } catch (error) {
      toast.error("Failed to save listing", {
        description: getErrorMessage(error),
      });
      return false;
    } finally {
      setIsSavingListing(false);
    }
  };

  const goToNextStep = () => {
    setStepIndex((previous) =>
      Math.min(previous + 1, ONBOARDING_STEPS.length - 1),
    );
  };

  const goToPreviousStep = () => {
    setStepIndex((previous) => Math.max(previous - 1, 0));
  };

  const handlePrimaryAction = async () => {
    switch (currentStep.id) {
      case "build-profile-card": {
        const didSave = await saveProfileDraft();
        if (didSave) {
          goToNextStep();
        }
        return;
      }
      case "build-listing-card": {
        const didSave = await saveListingDraft();
        if (didSave) {
          goToNextStep();
        }
        return;
      }
      case "preview-buyer-contact": {
        router.push(SUBSCRIPTION_CONFIG.NEW_USER_MEMBERSHIP_PATH);
        return;
      }
      default: {
        goToNextStep();
      }
    }
  };

  const primaryButtonLabel = (() => {
    switch (currentStep.id) {
      case "build-profile-card":
        return isSavingProfile ? "Saving profile..." : "Save profile and continue";
      case "preview-profile-card":
        return "Build my first listing";
      case "build-listing-card":
        return isSavingListing ? "Saving listing..." : "Save listing and continue";
      case "preview-listing-card":
        return "Show buyer inquiry flow";
      case "preview-buyer-contact":
        return "Continue to membership";
      default:
        return "Continue";
    }
  })();

  const primaryButtonDisabled =
    (currentStep.id === "build-profile-card" &&
      (!isProfileOnboardingDraftComplete(profileDraft) || isSavingProfile)) ||
    (currentStep.id === "build-listing-card" &&
      (!isListingOnboardingDraftComplete(listingDraft) || isSavingListing));

  return (
    <div className="bg-muted/20 min-h-svh" data-testid="start-onboarding-page">
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6 md:px-8 md:py-10">
        <header className="space-y-4">
          <div className="space-y-3">
            <Badge variant="secondary" className="w-fit">
              Guided onboarding
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
              Build your catalog in minutes.
            </h1>
            <p className="text-muted-foreground max-w-3xl text-base md:text-lg">
              We&apos;ll walk through profile setup and your first listing so buyers can
              discover you before you get started in the dashboard.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold md:text-xl">{currentStep.title}</p>
              <Badge variant="outline" className="text-xs">
                Step {stepIndex + 1} of {ONBOARDING_STEPS.length}
              </Badge>
            </div>
          </div>

          <Progress value={progressValue} className="h-2" />

          <div className="pb-1">
            <div className="flex flex-wrap gap-2">
              {ONBOARDING_STEPS.map((step, index) => {
                const isCurrent = index === stepIndex;
                const isComplete = index < stepIndex;

                return (
                  <div
                    key={step.id}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      isCurrent && "border-primary bg-primary/10 text-primary",
                      isComplete &&
                        "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
                      !isCurrent && !isComplete && "text-muted-foreground",
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {isComplete ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                      {`Step ${index + 1}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </header>

        {currentStep.id === "build-profile-card" ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,480px)]">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Edit your catalog card</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  This is how customers will see your catalog card on the Catalogs page.
                  Edit these fields and watch the preview update live.
                </p>

                <div
                  className={cn(
                    "space-y-2 rounded-lg border p-4 transition-colors",
                    focusedProfileField === "gardenName" &&
                      "border-primary bg-primary/5",
                  )}
                >
                  <Label htmlFor="garden-name">Garden name</Label>
                  <Input
                    ref={gardenNameInputRef}
                    id="garden-name"
                    placeholder="Sunrise Daylily Farm"
                    value={profileDraft.gardenName}
                    onFocus={() => setFocusedProfileField("gardenName")}
                    onChange={(event) => {
                      const nextDraft = {
                        ...profileDraft,
                        gardenName: event.target.value,
                      };
                      setProfileDraft(nextDraft);

                      if (selectedStarterImageUrl && applyStarterNameOverlay) {
                        const trimmedGardenName = nextDraft.gardenName.trim();

                        if (!trimmedGardenName) {
                          cancelStarterImageGeneration();
                          clearPendingStarterImage();
                          setProfileDraft((previous) => ({
                            ...previous,
                            profileImageUrl: selectedStarterImageUrl,
                          }));
                        } else {
                          scheduleStarterImageGeneration({
                            baseImageUrl: selectedStarterImageUrl,
                            gardenName: trimmedGardenName,
                            debounceMs: 150,
                          });
                        }
                      }
                    }}
                  />
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Your garden name is your storefront title. Buyers will use it to
                    recognize and return to your catalog.
                  </p>
                </div>

                <div
                  className={cn(
                    "space-y-2 rounded-lg border p-4 transition-colors",
                    focusedProfileField === "location" && "border-primary bg-primary/5",
                  )}
                >
                  <Label htmlFor="garden-location">Location</Label>
                  <Input
                    ref={gardenLocationInputRef}
                    id="garden-location"
                    placeholder="Snohomish, WA"
                    value={profileDraft.location}
                    onFocus={() => setFocusedProfileField("location")}
                    onChange={(event) =>
                      setProfileDraft({
                        ...profileDraft,
                        location: event.target.value,
                      })
                    }
                  />
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Add your city and state so buyers know where you grow and whether you
                    are likely a regional fit.
                  </p>
                </div>

                <div
                  ref={profileImageEditorRef}
                  tabIndex={-1}
                  className={cn(
                    "space-y-4 rounded-lg border p-4 transition-colors outline-none",
                    focusedProfileField === "image" &&
                      "border-primary bg-primary/5",
                  )}
                  onFocusCapture={() => setFocusedProfileField("image")}
                  onClick={() => setFocusedProfileField("image")}
                >
                  <div className="space-y-1">
                    <Label>Profile image</Label>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Your photo is what customers notice first when scanning catalogs.
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant={
                        profileImageInputMode === "starter" ? "default" : "outline"
                      }
                      onClick={() => {
                        setFocusedProfileField("image");
                        setProfileImageInputMode("starter");
                      }}
                    >
                      Use a starter image
                    </Button>
                    <Button
                      type="button"
                      variant={
                        profileImageInputMode === "upload" ? "default" : "outline"
                      }
                      onClick={() => {
                        setFocusedProfileField("image");
                        setProfileImageInputMode("upload");
                      }}
                    >
                      Upload your own image
                    </Button>
                  </div>

                  {profileImageInputMode === "starter" ? (
                    <div className="space-y-2">
                      <div className="flex items-start gap-3 rounded-lg border border-dashed p-3">
                        <Checkbox
                          id="starter-overlay"
                          checked={applyStarterNameOverlay}
                          onCheckedChange={(value) =>
                            handleStarterOverlayChange(value === true)
                          }
                        />
                        <div className="space-y-1 text-sm">
                          <Label htmlFor="starter-overlay" className="cursor-pointer">
                            Stamp garden name onto starter image
                          </Label>
                          <p className="text-muted-foreground text-xs">
                            Enabled by default. This applies only to starter images and
                            never to uploaded photos.
                          </p>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {STARTER_PROFILE_IMAGES.map((image) => (
                          <button
                            key={image.id}
                            type="button"
                            className={cn(
                              "rounded-lg border p-2 text-left transition",
                              profileDraft.profileImageUrl === image.url ||
                                selectedStarterImageUrl === image.url
                                ? "border-primary bg-primary/5"
                                : "hover:border-primary/50",
                            )}
                            onClick={() => {
                              handleStarterImageSelect(image.url);
                            }}
                            disabled={isGeneratingStarterImage}
                          >
                            <div className="relative aspect-square overflow-hidden rounded-md">
                              <Image
                                src={image.url}
                                alt={image.label}
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) 33vw, 120px"
                              />
                            </div>
                            <p className="mt-2 text-xs font-medium">{image.label}</p>
                          </button>
                        ))}
                      </div>
                      {isGeneratingStarterImage ? (
                        <p className="text-muted-foreground text-xs">
                          Generating starter image with your garden name...
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        Drag and drop an image, then crop and adjust it before saving.
                      </p>
                      {profileQuery.data?.id ? (
                        <div className="rounded-lg border bg-background p-3">
                          <ImageUpload
                            type="profile"
                            referenceId={profileQuery.data.id}
                            onUploadComplete={handleProfileImageUploadComplete}
                            onMutationSuccess={() => {
                              void utils.dashboardDb.image.list.invalidate();
                            }}
                          />
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          Loading profile uploader...
                        </p>
                      )}
                    </div>
                  )}

                </div>

                <div
                  className={cn(
                    "space-y-2 rounded-lg border p-4 transition-colors",
                    focusedProfileField === "description" &&
                      "border-primary bg-primary/5",
                  )}
                >
                  <Label htmlFor="garden-description">Garden description</Label>
                  <Textarea
                    ref={gardenDescriptionInputRef}
                    id="garden-description"
                    rows={5}
                    placeholder="Share what you grow, what collectors can expect, and your shipping style."
                    value={profileDraft.description}
                    onFocus={() => setFocusedProfileField("description")}
                    onChange={(event) =>
                      setProfileDraft({
                        ...profileDraft,
                        description: event.target.value,
                      })
                    }
                  />
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Tell buyers what you grow and what kind of buying experience they can
                    expect from you.
                  </p>
                </div>

                {profileMissingField ? (
                  <p className="text-muted-foreground text-sm">
                    Next up: <span className="font-medium">{profileMissingField}</span>
                  </p>
                ) : (
                  <p className="text-sm font-medium text-emerald-700">
                    Profile card is ready to save.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="space-y-4 p-4 md:p-6">
                <div className="relative overflow-hidden rounded-2xl border bg-card">
                  <div className="relative aspect-square overflow-hidden border-b bg-muted">
                    <Image
                      src={profileImagePreviewUrl}
                      alt="Profile preview"
                      fill
                      className="object-cover"
                      sizes="(max-width: 1279px) 100vw, 460px"
                      unoptimized
                    />
                    <HotspotButton
                      className="left-3 top-3"
                      label="Edit profile image"
                      active={focusedProfileField === "image"}
                      onClick={() => focusProfileField("image")}
                    />
                  </div>

                  <div className="space-y-4 p-4">
                    <div className="relative pl-10">
                      <HotspotButton
                        className="left-0 top-1"
                        label="Edit garden name"
                        active={focusedProfileField === "gardenName"}
                        onClick={() => focusProfileField("gardenName")}
                      />
                      <p className="text-4xl leading-tight font-bold tracking-tight">
                        {profileDraft.gardenName.trim() || "Your garden name"}
                      </p>
                    </div>

                    <div className="relative pl-10">
                      <HotspotButton
                        className="left-0 top-0"
                        label="Edit location"
                        active={focusedProfileField === "location"}
                        onClick={() => focusProfileField("location")}
                      />
                      <Badge
                        variant="secondary"
                        className="inline-flex items-center gap-1 pr-2 text-base"
                      >
                        <MapPin className="h-4 w-4" />
                        {profileDraft.location.trim() || "Add your city, ST"}
                      </Badge>
                    </div>

                    <div className="relative pl-10">
                      <HotspotButton
                        className="left-0 top-1"
                        label="Edit description"
                        active={focusedProfileField === "description"}
                        onClick={() => focusProfileField("description")}
                      />
                      <p className="text-muted-foreground text-lg leading-relaxed">
                        {profileDraft.description.trim() ||
                          "Add a short intro so collectors know what you specialize in."}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {currentStep.id === "preview-profile-card" ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Catalog discovery preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  This is an example gallery view, not the live catalogs page. It mirrors
                  how customers discover gardens first when browsing catalogs.
                </p>
                <p className="text-sm font-medium text-emerald-700">
                  Look for the <span className="rounded bg-emerald-100 px-1">Yours</span>{" "}
                  badge to spot your card.
                </p>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <ProfilePreviewCard
                    title={profileDraft.gardenName || "Your garden name"}
                    description={
                      profileDraft.description ||
                      "Your description appears here for browsing collectors."
                    }
                    imageUrl={profileImagePreviewUrl}
                    location={profileDraft.location || "Add your city, ST"}
                    highlighted={true}
                    ownershipBadge="Yours"
                  />
                  {ONBOARDING_PROFILE_DISCOVERY_EXAMPLES.map((exampleCard) => (
                    <ProfilePreviewCard
                      key={exampleCard.id}
                      title={exampleCard.title}
                      description={exampleCard.description}
                      imageUrl={exampleCard.imageUrl}
                      location={exampleCard.location}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="max-w-3xl">
              <CardHeader>
                <CardTitle className="text-xl">What this unlocks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <PreviewBullet text="Collectors can identify your catalog quickly by image + name." />
                <PreviewBullet text="Your description helps the right buyers click through." />
                <PreviewBullet text="This same profile info is reused across public pages." />
              </CardContent>
            </Card>
          </div>
        ) : null}

        {currentStep.id === "build-listing-card" ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,500px)]">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Edit your first listing card</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  This is how buyers will see one of your listing cards. Edit these fields
                  and watch the card preview update live.
                </p>

                <div
                  ref={listingCultivarRef}
                  tabIndex={-1}
                  className={cn(
                    "space-y-3 rounded-lg border p-4 transition-colors outline-none",
                    activeListingField === "cultivar" && "border-primary bg-primary/5",
                  )}
                  onFocusCapture={() => setActiveListingField("cultivar")}
                  onClick={() => setActiveListingField("cultivar")}
                >
                  <Label>Link to a daylily database cultivar</Label>
                  <AhsListingSelect
                    onSelect={handleAhsSelect}
                    selectedLabel={selectedCultivarName}
                  />
                  {selectedCultivarName ? (
                    <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
                      <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-emerald-800 uppercase">
                        <CheckCircle2 className="h-4 w-4" />
                        Selected cultivar
                      </p>
                      <p className="mt-1 text-sm font-medium">{selectedCultivarName}</p>
                    </div>
                  ) : null}
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    This links your listing to cultivar details buyers already trust and
                    research.
                  </p>
                </div>

                <div
                  className={cn(
                    "space-y-2 rounded-lg border p-4 transition-colors",
                    activeListingField === "title" && "border-primary bg-primary/5",
                  )}
                >
                  <Label htmlFor="listing-title">Listing title</Label>
                  <Input
                    ref={listingTitleInputRef}
                    id="listing-title"
                    value={listingDraft.title}
                    onFocus={() => setActiveListingField("title")}
                    onChange={(event) =>
                      setListingDraft({
                        ...listingDraft,
                        title: event.target.value,
                      })
                    }
                    placeholder="Coffee Frenzy spring fan"
                  />
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Buyers scan titles first. Keep it clear and specific to what you are
                    offering.
                  </p>
                </div>

                <div
                  className={cn(
                    "space-y-2 rounded-lg border p-4 transition-colors",
                    activeListingField === "price" && "border-primary bg-primary/5",
                  )}
                >
                  <Label htmlFor="listing-price">Price</Label>
                  <CurrencyInput
                    id="listing-price"
                    value={listingDraft.price}
                    onFocus={() => setActiveListingField("price")}
                    onChange={(value) =>
                      setListingDraft({
                        ...listingDraft,
                        price: value,
                      })
                    }
                    placeholder="25"
                  />
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Adding a price lets buyers add this listing to cart before messaging
                    you.
                  </p>
                </div>

                <div
                  className={cn(
                    "space-y-2 rounded-lg border p-4 transition-colors",
                    activeListingField === "description" &&
                      "border-primary bg-primary/5",
                  )}
                >
                  <Label htmlFor="listing-description">Description</Label>
                  <Textarea
                    ref={listingDescriptionInputRef}
                    id="listing-description"
                    rows={5}
                    value={listingDraft.description}
                    onFocus={() => setActiveListingField("description")}
                    onChange={(event) =>
                      setListingDraft({
                        ...listingDraft,
                        description: event.target.value,
                      })
                    }
                    placeholder="Healthy spring fan with strong roots and bright rebloom potential."
                  />
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Describe condition and value so buyers know exactly why they should
                    contact you.
                  </p>
                </div>

                <div
                  ref={listingImageEditorRef}
                  tabIndex={-1}
                  className={cn(
                    "space-y-3 rounded-lg border p-4 transition-colors outline-none",
                    activeListingField === "image" && "border-primary bg-primary/5",
                  )}
                  onFocusCapture={() => setActiveListingField("image")}
                  onClick={() => setActiveListingField("image")}
                >
                  <Label>Listing image (optional)</Label>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Upload your own photo if you want. If you skip this, we will use the
                    linked cultivar image when available.
                  </p>
                  {savedListingId ? (
                    <div className="rounded-lg border bg-background p-3">
                      <ImageUpload
                        type="listing"
                        referenceId={savedListingId}
                        onUploadComplete={handleListingImageUploadComplete}
                        onMutationSuccess={() => {
                          void utils.dashboardDb.image.list.invalidate();
                        }}
                      />
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Preparing listing image uploader...
                    </p>
                  )}
                </div>

                {listingMissingField ? (
                  <p className="text-muted-foreground text-sm">
                    Next up: <span className="font-medium">{listingMissingField}</span>
                  </p>
                ) : (
                  <p className="text-sm font-medium text-emerald-700">
                    Listing card is ready to save.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="space-y-4 p-4 md:p-6">
                <div className="relative overflow-hidden rounded-xl border bg-card">
                  <div className="relative aspect-square overflow-hidden border-b bg-muted">
                    <Image
                      src={listingImagePreviewUrl}
                      alt="Listing preview"
                      fill
                      className="object-cover"
                      sizes="(max-width: 1279px) 100vw, 460px"
                      unoptimized
                    />
                    <HotspotButton
                      className="left-3 top-3"
                      label="Edit listing image"
                      active={activeListingField === "image"}
                      onClick={() => focusListingField("image")}
                    />
                    <Badge
                      variant={listingDraft.price !== null ? "secondary" : "outline"}
                      className="absolute right-3 top-3 bg-background/90 backdrop-blur-sm"
                    >
                      {listingDraft.price !== null
                        ? formatPrice(listingDraft.price)
                        : "Add price"}
                    </Badge>
                    <HotspotButton
                      className="right-3 top-14"
                      label="Edit price"
                      active={activeListingField === "price"}
                      onClick={() => focusListingField("price")}
                    />
                  </div>

                  <div className="space-y-3 p-4">
                    <div className="relative pl-10">
                      <HotspotButton
                        className="left-0 top-1"
                        label="Edit listing title"
                        active={activeListingField === "title"}
                        onClick={() => focusListingField("title")}
                      />
                      <p className="text-xl font-semibold tracking-tight">
                        {listingTitlePreview}
                      </p>
                    </div>

                    <div className="relative pl-10">
                      <HotspotButton
                        className="left-0 top-0.5"
                        label="Edit cultivar link"
                        active={activeListingField === "cultivar"}
                        onClick={() => focusListingField("cultivar")}
                      />
                      {selectedCultivarName ? (
                        <div className="text-muted-foreground inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs">
                          <Link2 className="h-3.5 w-3.5" />
                          Linked: {selectedCultivarName}
                        </div>
                      ) : (
                        <div className="text-muted-foreground inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs">
                          <Link2 className="h-3.5 w-3.5" />
                          Link a cultivar reference
                        </div>
                      )}
                    </div>

                    {selectedCultivarDetailsQuery.data ? (
                      <Badge variant="secondary" className="ml-10 w-fit text-xs">
                        {[
                          selectedCultivarDetailsQuery.data.hybridizer,
                          selectedCultivarDetailsQuery.data.year,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </Badge>
                    ) : null}

                    <div className="relative pl-10">
                      <HotspotButton
                        className="left-0 top-1"
                        label="Edit listing description"
                        active={activeListingField === "description"}
                        onClick={() => focusListingField("description")}
                      />
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {listingDescriptionPreview}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {currentStep.id === "preview-listing-card" ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Finished listing card preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  This is an example buyer-facing card preview, using your new listing data.
                </p>
                <p className="text-sm font-medium text-emerald-700">
                  Look for the <span className="rounded bg-emerald-100 px-1">Yours</span>{" "}
                  badge to spot your listing.
                </p>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <ListingPreviewCard
                    title={listingTitlePreview}
                    description={listingDescriptionPreview}
                    price={listingDraft.price}
                    linkedLabel={selectedCultivarName}
                    hybridizerYear={
                      selectedCultivarDetailsQuery.data
                        ? [
                            selectedCultivarDetailsQuery.data.hybridizer,
                            selectedCultivarDetailsQuery.data.year,
                          ]
                            .filter(Boolean)
                            .join(", ")
                        : null
                    }
                    imageUrl={listingImagePreviewUrl}
                    highlighted={true}
                    ownershipBadge="Yours"
                  />
                  {ONBOARDING_LISTING_DISCOVERY_EXAMPLES.map((exampleListing) => (
                    <ListingPreviewCard
                      key={exampleListing.id}
                      title={exampleListing.title}
                      description={exampleListing.description}
                      price={exampleListing.price}
                      linkedLabel={exampleListing.linkedLabel}
                      hybridizerYear={exampleListing.hybridizerYear}
                      imageUrl={exampleListing.imageUrl}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="max-w-3xl">
              <CardHeader>
                <CardTitle className="text-xl">What buyers scan first</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <PreviewBullet text="Clear title and price for quick comparisons." />
                <PreviewBullet text="Cultivar link for confidence and research context." />
                <PreviewBullet text="Description that explains condition and value." />
              </CardContent>
            </Card>
          </div>
        ) : null}

        {currentStep.id === "preview-buyer-contact" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">How buyers contact you</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground max-w-3xl">
                This example shows the two common paths to contact you: visiting your
                catalog profile or adding priced listings to cart before messaging by
                email.
              </p>

              <div className="grid gap-4 rounded-2xl border bg-background p-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
                <div className="space-y-4">
                  <div className="rounded-xl border p-4">
                    <p className="text-muted-foreground text-xs font-medium uppercase">
                      Step 1
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      Buyer discovers your catalog card and opens your profile.
                    </p>
                    <div className="mt-3 max-w-sm">
                      <ProfilePreviewCard
                        title={profileDraft.gardenName.trim() || "Your garden name"}
                        description={
                          profileDraft.description.trim() ||
                          "Your profile description appears here for browsing buyers."
                        }
                        imageUrl={profileImagePreviewUrl}
                        location={profileDraft.location.trim() || "Add your city, ST"}
                        highlighted={true}
                        ownershipBadge="Yours"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border p-4">
                    <p className="text-muted-foreground text-xs font-medium uppercase">
                      Step 2
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      Buyer opens your listing. If it has a price, they can add it to cart
                      and send one email message with cart details, or message you directly
                      without adding anything to cart.
                    </p>
                    <div className="mt-3 max-w-sm">
                      <ListingPreviewCard
                        title={listingTitlePreview}
                        description={listingDescriptionPreview}
                        price={listingDraft.price}
                        linkedLabel={selectedCultivarName}
                        hybridizerYear={
                          selectedCultivarDetailsQuery.data
                            ? [
                                selectedCultivarDetailsQuery.data.hybridizer,
                                selectedCultivarDetailsQuery.data.year,
                              ]
                                .filter(Boolean)
                                .join(", ")
                            : null
                        }
                        imageUrl={listingImagePreviewUrl}
                        highlighted={true}
                        ownershipBadge="Your listing"
                      />
                    </div>
                    <div className="mt-4">
                      <Button type="button" size="sm" className="inline-flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4" />
                        Add to cart
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-sm font-semibold">What this enables</p>
                  <ol className="text-muted-foreground mt-3 space-y-2 text-sm">
                    {ONBOARDING_BUYER_FLOW_BULLETS.map((bullet, index) => (
                      <li key={bullet}>{index + 1}. {bullet}</li>
                    ))}
                  </ol>
                </div>
              </div>
              <p className="text-muted-foreground text-sm">
                Before you get started, you can choose membership or continue for now and
                reach your dashboard.
              </p>
            </CardContent>
          </Card>
        ) : null}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t pt-2">
          <div className="text-muted-foreground text-sm">{currentStep.description}</div>
          <div className="flex items-center gap-2">
            {stepIndex > 0 ? (
              <Button type="button" variant="outline" onClick={goToPreviousStep}>
                Back
              </Button>
            ) : null}

            <Button
              type="button"
              onClick={handlePrimaryAction}
              disabled={primaryButtonDisabled}
              className="inline-flex items-center gap-2"
              data-testid="start-onboarding-primary-action"
            >
              {primaryButtonLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function drawImageCoverSquare({
  context,
  image,
  size,
}: {
  context: CanvasRenderingContext2D;
  image: HTMLImageElement;
  size: number;
}) {
  const imageAspectRatio = image.width / image.height;
  const destinationAspectRatio = 1;

  let sourceWidth = image.width;
  let sourceHeight = image.height;
  let sourceX = 0;
  let sourceY = 0;

  if (imageAspectRatio > destinationAspectRatio) {
    sourceWidth = image.height;
    sourceX = (image.width - sourceWidth) / 2;
  } else if (imageAspectRatio < destinationAspectRatio) {
    sourceHeight = image.width;
    sourceY = (image.height - sourceHeight) / 2;
  }

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    size,
    size,
  );
}

const STARTER_IMAGE_CANVAS_SIZE = 1200;
const STARTER_IMAGE_TEXT_FIT_RATIO = 0.75;
const STARTER_IMAGE_TEXT_MAX_LINES = 4;

interface GeneratedStarterImage {
  blob: Blob;
  previewUrl: string;
}

async function generateStarterImageWithGardenName({
  baseImageUrl,
  gardenName,
}: {
  baseImageUrl: string;
  gardenName: string;
}): Promise<GeneratedStarterImage> {
  const image = await loadImageElement(baseImageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = STARTER_IMAGE_CANVAS_SIZE;
  canvas.height = STARTER_IMAGE_CANVAS_SIZE;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas not available");
  }

  drawImageCoverSquare({
    context,
    image,
    size: STARTER_IMAGE_CANVAS_SIZE,
  });

  drawHeroStyleImageOverlay({
    context,
    size: STARTER_IMAGE_CANVAS_SIZE,
  });

  drawGardenNameOverlay({
    context,
    gardenName,
    size: STARTER_IMAGE_CANVAS_SIZE,
  });

  const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
  const previewUrl = URL.createObjectURL(blob);

  return { blob, previewUrl };
}

async function uploadGeneratedStarterProfileImage({
  blob,
  referenceId,
  getPresignedUrl,
}: {
  blob: Blob;
  referenceId: string;
  getPresignedUrl: (input: {
    type: "profile";
    fileName: string;
    contentType: string;
    size: number;
    referenceId: string;
  }) => Promise<{
    presignedUrl: string;
    key: string;
    url: string;
  }>;
}) {
  const fileName = `starter-logo-${Date.now()}.jpg`;
  const contentType = blob.type || "image/jpeg";

  const { presignedUrl, key, url } = await getPresignedUrl({
    type: "profile",
    fileName,
    contentType,
    size: blob.size,
    referenceId,
  });

  await uploadFileWithProgress({
    presignedUrl,
    file: blob,
    onProgress: () => undefined,
  });

  return { url, key };
}

function drawGardenNameOverlay({
  context,
  gardenName,
  size,
}: {
  context: CanvasRenderingContext2D;
  gardenName: string;
  size: number;
}) {
  const fontFamily =
    window.getComputedStyle(document.body).fontFamily ||
    "ui-sans-serif, system-ui, sans-serif";
  const maxWidth = size * STARTER_IMAGE_TEXT_FIT_RATIO;
  const maxHeight = size * STARTER_IMAGE_TEXT_FIT_RATIO;

  const layout = getGardenNameLayout({
    context,
    text: gardenName.trim(),
    fontFamily,
    maxWidth,
    maxHeight,
  });

  const textBlockHeight = layout.lines.length * layout.lineHeight;
  const textStartY = (size - textBlockHeight) / 2 + layout.fontSize;
  const textStartX = (size - maxWidth) / 2;

  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.font = `800 ${layout.fontSize}px ${fontFamily}`;
  context.fillStyle = "rgba(255, 255, 255, 1)";
  context.shadowColor = "rgba(0, 0, 0, 0.24)";
  context.shadowBlur = Math.max(4, layout.fontSize * 0.04);
  context.shadowOffsetX = 0;
  context.shadowOffsetY = Math.max(2, layout.fontSize * 0.02);

  layout.lines.forEach((line, index) => {
    const y = textStartY + index * layout.lineHeight;
    context.fillText(line, textStartX, y);
  });
}

function drawHeroStyleImageOverlay({
  context,
  size,
}: {
  context: CanvasRenderingContext2D;
  size: number;
}) {
  // Match homepage hero treatment: darkened image with high-contrast white text.
  context.fillStyle = "rgba(17, 24, 39, 0.6)";
  context.fillRect(0, 0, size, size);
}

function getGardenNameLayout({
  context,
  text,
  fontFamily,
  maxWidth,
  maxHeight,
}: {
  context: CanvasRenderingContext2D;
  text: string;
  fontFamily: string;
  maxWidth: number;
  maxHeight: number;
}) {
  const words = text.split(/\s+/).filter(Boolean);
  const maxFontSize = 220;
  const minFontSize = 42;
  const lineCandidates = buildGardenNameLineCandidates(
    words,
    STARTER_IMAGE_TEXT_MAX_LINES,
  );

  for (const lines of lineCandidates) {
    for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= 2) {
      context.font = `700 ${fontSize}px ${fontFamily}`;
      const lineHeight = fontSize * 1.08;
      const textHeight = lineHeight * lines.length;
      const widestLine = Math.max(
        ...lines.map((line) => context.measureText(line).width),
        0,
      );

      if (textHeight <= maxHeight && widestLine <= maxWidth) {
        return {
          lines,
          fontSize,
          lineHeight,
        };
      }
    }
  }

  const fallbackText =
    text.length > 28 ? `${text.slice(0, 28).trimEnd()}...` : text;
  return {
    lines: [fallbackText],
    fontSize: minFontSize,
    lineHeight: minFontSize * 1.08,
  };
}

function buildGardenNameLineCandidates(words: string[], maxLines: number) {
  if (words.length === 0) {
    return [["Garden Name"]];
  }

  const candidates: string[][] = [];
  const seen = new Set<string>();

  const addCandidate = (lines: string[]) => {
    const normalized = lines.join("|");
    if (seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    candidates.push(lines);
  };

  if (words.length <= maxLines) {
    // Prefer one word per line so names stack like "Free / User / Daylily".
    addCandidate(words);
  }

  for (
    let lineCount = Math.min(maxLines, words.length);
    lineCount >= 1;
    lineCount -= 1
  ) {
    const distributedLines = distributeWordsIntoLines(words, lineCount);
    if (distributedLines.length > 0) {
      addCandidate(distributedLines);
    }
  }

  return candidates.length > 0 ? candidates : [words];
}

function distributeWordsIntoLines(words: string[], lineCount: number) {
  if (lineCount <= 0 || words.length === 0) {
    return [];
  }

  if (lineCount >= words.length) {
    return [...words];
  }

  const lines: string[] = [];
  let startIndex = 0;

  for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
    const remainingWords = words.length - startIndex;
    const remainingLines = lineCount - lineIndex;
    const wordsForLine = Math.ceil(remainingWords / remainingLines);
    const line = words
      .slice(startIndex, startIndex + wordsForLine)
      .join(" ")
      .trim();

    if (!line) {
      continue;
    }

    lines.push(line);
    startIndex += wordsForLine;
  }

  if (startIndex < words.length && lines.length > 0) {
    const remainingWords = words.slice(startIndex).join(" ").trim();
    const lastLineIndex = lines.length - 1;
    if (remainingWords) {
      lines[lastLineIndex] = `${lines[lastLineIndex]} ${remainingWords}`.trim();
    }
  }

  return lines;
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load starter image"));
    image.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to create image blob"));
        return;
      }

      resolve(blob);
    }, type, quality);
  });
}

function HotspotButton({
  active,
  className,
  label,
  onClick,
}: {
  active: boolean;
  className?: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "absolute z-20 inline-flex h-7 w-7 items-center justify-center rounded-full border border-primary/60 bg-background/95 text-primary shadow-md transition-transform hover:scale-105",
        active && "ring-primary/25 ring-4",
        className,
      )}
    >
      {active ? (
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/50" />
        </span>
      ) : (
        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary/80" />
      )}
      <span className="sr-only">{label}</span>
    </button>
  );
}

function PreviewBullet({ text }: { text: string }) {
  return (
    <p className="flex items-start gap-2">
      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
      <span>{text}</span>
    </p>
  );
}

function ProfilePreviewCard({
  title,
  description,
  imageUrl,
  location,
  highlighted = false,
  ownershipBadge,
}: {
  title: string;
  description: string;
  imageUrl: string;
  location?: string;
  highlighted?: boolean;
  ownershipBadge?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-card",
        highlighted && "border-primary shadow-[0_0_0_2px_rgba(24,24,27,0.08)]",
      )}
    >
      <div className="relative aspect-square border-b">
        <Image src={imageUrl} alt={title} fill className="object-cover" unoptimized />
        {ownershipBadge ? (
          <Badge className="absolute left-3 top-3" variant="secondary">
            {ownershipBadge}
          </Badge>
        ) : null}
      </div>
      <div className="space-y-3 p-4">
        <p className="text-3xl leading-tight font-bold tracking-tight">{title}</p>

        {location ? (
          <Badge variant="secondary" className="inline-flex items-center gap-1 text-sm">
            <MapPin className="h-3.5 w-3.5" />
            {location}
          </Badge>
        ) : null}

        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function ListingPreviewCard({
  title,
  description,
  price,
  linkedLabel,
  hybridizerYear,
  imageUrl,
  highlighted = false,
  ownershipBadge,
}: {
  title: string;
  description: string;
  price: number | null;
  linkedLabel: string | null;
  hybridizerYear: string | null;
  imageUrl: string;
  highlighted?: boolean;
  ownershipBadge?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card",
        highlighted && "border-primary shadow-[0_0_0_2px_rgba(24,24,27,0.08)]",
      )}
    >
      <div className="relative aspect-square border-b bg-muted">
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 50vw, 280px"
          unoptimized
        />
        {price !== null ? (
          <Badge
            className="absolute right-3 top-3 bg-background/90 backdrop-blur-sm"
            variant="secondary"
          >
            {formatPrice(price)}
          </Badge>
        ) : null}
        <Badge
          className="absolute bottom-3 right-3 bg-background/90 backdrop-blur-sm"
          variant="secondary"
        >
          <Link2 className="h-3 w-3" />
        </Badge>
        {ownershipBadge ? (
          <Badge className="absolute left-3 top-3" variant="secondary">
            {ownershipBadge}
          </Badge>
        ) : null}
      </div>
      <div className="space-y-2 p-4">
        <p className="font-semibold tracking-tight">{title}</p>
        {hybridizerYear ? (
          <Badge variant="secondary" className="text-xs">
            {hybridizerYear}
          </Badge>
        ) : null}
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
        <div className="text-muted-foreground inline-flex items-center gap-1 text-xs">
          <Link2 className="h-3.5 w-3.5" />
          {linkedLabel ? `Linked: ${linkedLabel}` : "Inquiry only"}
        </div>
      </div>
    </div>
  );
}
