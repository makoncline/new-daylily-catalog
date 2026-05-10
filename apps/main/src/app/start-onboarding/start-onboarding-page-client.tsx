"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import {
  OnboardingBuyerContactPreviewStep,
  OnboardingMembershipStep,
} from "./_components/onboarding-finish-steps";
import {
  OnboardingListingEditStep,
  OnboardingProfileEditStep,
} from "./_components/onboarding-edit-steps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import { cn, uploadFileWithProgress } from "@/lib/utils";
import { api } from "@/trpc/react";
import {
  getEarliestByCreatedAt,
  getNextIncompleteListingField,
  getNextIncompleteProfileField,
  isListingOnboardingDraftComplete,
  isProfileOnboardingDraftComplete,
  isStarterProfileImageUrl,
  normalizePersistedImageUrl,
  ONBOARDING_LISTING_DEFAULTS,
  ONBOARDING_STEPS,
  STARTER_PROFILE_IMAGES,
  type ListingOnboardingDraft,
  type ListingOnboardingField,
  type ProfileOnboardingDraft,
  type ProfileOnboardingField,
} from "./onboarding-utils";
import { useOnboardingBootstrapState } from "./use-onboarding-bootstrap-state";
import { useOnboardingListingFlow } from "./use-onboarding-listing-flow";
import { useOnboardingProfileImageFlow } from "./use-onboarding-profile-image-flow";
import { useOnboardingPreviewState } from "./use-onboarding-preview-state";
import { useOnboardingSaveFlow } from "./use-onboarding-save-flow";
import { useOnboardingStepFlow } from "./use-onboarding-step-flow";

const DEFAULT_STARTER_IMAGE_URL = STARTER_PROFILE_IMAGES[0]?.url ?? null;

interface MembershipPriceDisplay {
  amount: string;
  interval: string;
  monthlyEquivalent: string | null;
}

interface StartOnboardingPageClientProps {
  membershipPriceDisplay: MembershipPriceDisplay | null;
}

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
  status: ONBOARDING_LISTING_DEFAULTS.defaultStatus,
};

interface StartOnboardingState {
  focusedProfileField: ProfileOnboardingField;
  activeListingField: ListingOnboardingField;
  profileDraft: ProfileOnboardingDraft;
  listingDraft: ListingOnboardingDraft;
  selectedCultivarName: string | null;
  selectedCultivarAhsId: string | null;
  selectedListingImageId: string | null;
  selectedListingImageUrl: string | null;
  savedListingId: string | null;
}

type StartOnboardingAction =
  | {
      type: "setFocusedProfileField";
      value: SetStateAction<ProfileOnboardingField>;
    }
  | {
      type: "setActiveListingField";
      value: SetStateAction<ListingOnboardingField>;
    }
  | { type: "setProfileDraft"; value: SetStateAction<ProfileOnboardingDraft> }
  | { type: "setListingDraft"; value: SetStateAction<ListingOnboardingDraft> }
  | { type: "setSelectedCultivarName"; value: SetStateAction<string | null> }
  | { type: "setSelectedCultivarAhsId"; value: SetStateAction<string | null> }
  | { type: "setSelectedListingImageId"; value: SetStateAction<string | null> }
  | { type: "setSelectedListingImageUrl"; value: SetStateAction<string | null> }
  | { type: "setSavedListingId"; value: SetStateAction<string | null> };

function resolveStateAction<T>(previous: T, value: SetStateAction<T>) {
  return typeof value === "function"
    ? (value as (previous: T) => T)(previous)
    : value;
}

function startOnboardingReducer(
  state: StartOnboardingState,
  action: StartOnboardingAction,
): StartOnboardingState {
  switch (action.type) {
    case "setFocusedProfileField":
      return {
        ...state,
        focusedProfileField: resolveStateAction(
          state.focusedProfileField,
          action.value,
        ),
      };
    case "setActiveListingField":
      return {
        ...state,
        activeListingField: resolveStateAction(
          state.activeListingField,
          action.value,
        ),
      };
    case "setProfileDraft":
      return {
        ...state,
        profileDraft: resolveStateAction(state.profileDraft, action.value),
      };
    case "setListingDraft":
      return {
        ...state,
        listingDraft: resolveStateAction(state.listingDraft, action.value),
      };
    case "setSelectedCultivarName":
      return {
        ...state,
        selectedCultivarName: resolveStateAction(
          state.selectedCultivarName,
          action.value,
        ),
      };
    case "setSelectedCultivarAhsId":
      return {
        ...state,
        selectedCultivarAhsId: resolveStateAction(
          state.selectedCultivarAhsId,
          action.value,
        ),
      };
    case "setSelectedListingImageId":
      return {
        ...state,
        selectedListingImageId: resolveStateAction(
          state.selectedListingImageId,
          action.value,
        ),
      };
    case "setSelectedListingImageUrl":
      return {
        ...state,
        selectedListingImageUrl: resolveStateAction(
          state.selectedListingImageUrl,
          action.value,
        ),
      };
    case "setSavedListingId":
      return {
        ...state,
        savedListingId: resolveStateAction(state.savedListingId, action.value),
      };
  }
}

function useOnboardingStateSetters(dispatch: Dispatch<StartOnboardingAction>) {
  return {
    setFocusedProfileField: useCallback(
      (value: SetStateAction<ProfileOnboardingField>) =>
        dispatch({ type: "setFocusedProfileField", value }),
      [dispatch],
    ),
    setActiveListingField: useCallback(
      (value: SetStateAction<ListingOnboardingField>) =>
        dispatch({ type: "setActiveListingField", value }),
      [dispatch],
    ),
    setProfileDraft: useCallback(
      (value: SetStateAction<ProfileOnboardingDraft>) =>
        dispatch({ type: "setProfileDraft", value }),
      [dispatch],
    ),
    setListingDraft: useCallback(
      (value: SetStateAction<ListingOnboardingDraft>) =>
        dispatch({ type: "setListingDraft", value }),
      [dispatch],
    ),
    setSelectedCultivarName: useCallback(
      (value: SetStateAction<string | null>) =>
        dispatch({ type: "setSelectedCultivarName", value }),
      [dispatch],
    ),
    setSelectedCultivarAhsId: useCallback(
      (value: SetStateAction<string | null>) =>
        dispatch({ type: "setSelectedCultivarAhsId", value }),
      [dispatch],
    ),
    setSelectedListingImageId: useCallback(
      (value: SetStateAction<string | null>) =>
        dispatch({ type: "setSelectedListingImageId", value }),
      [dispatch],
    ),
    setSelectedListingImageUrl: useCallback(
      (value: SetStateAction<string | null>) =>
        dispatch({ type: "setSelectedListingImageUrl", value }),
      [dispatch],
    ),
    setSavedListingId: useCallback(
      (value: SetStateAction<string | null>) =>
        dispatch({ type: "setSavedListingId", value }),
      [dispatch],
    ),
  };
}

function useStartOnboardingController({
  membershipPriceDisplay,
}: StartOnboardingPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const getSearchParam = searchParams.get.bind(searchParams);
  const utils = api.useUtils();
  const onboardingPath = SUBSCRIPTION_CONFIG.NEW_USER_ONBOARDING_PATH;

  const [onboardingState, onboardingDispatch] = useReducer(
    startOnboardingReducer,
    {
      focusedProfileField: "gardenName",
      activeListingField: "cultivar",
      profileDraft: DEFAULT_PROFILE_DRAFT,
      listingDraft: DEFAULT_LISTING_DRAFT,
      selectedCultivarName: null,
      selectedCultivarAhsId: null,
      selectedListingImageId: null,
      selectedListingImageUrl: null,
      savedListingId: null,
    },
  );
  const {
    focusedProfileField,
    activeListingField,
    profileDraft,
    listingDraft,
    selectedCultivarName,
    selectedCultivarAhsId,
    selectedListingImageId,
    selectedListingImageUrl,
    savedListingId,
  } = onboardingState;
  const {
    setFocusedProfileField,
    setActiveListingField,
    setProfileDraft,
    setListingDraft,
    setSelectedCultivarName,
    setSelectedCultivarAhsId,
    setSelectedListingImageId,
    setSelectedListingImageUrl,
    setSavedListingId,
  } = useOnboardingStateSetters(onboardingDispatch);

  const profileQuery = api.dashboardDb.userProfile.get.useQuery();
  const currentUserQuery = api.dashboardDb.user.getCurrentUser.useQuery();
  const imagesQuery = api.dashboardDb.image.list.useQuery(undefined, {
    enabled: Boolean(profileQuery.data?.id),
  });
  const listingQuery = api.dashboardDb.listing.list.useQuery();
  const selectedCultivarDetailsQuery = api.dashboardDb.ahs.get.useQuery(
    { id: selectedCultivarAhsId ?? "" },
    { enabled: Boolean(selectedCultivarAhsId) },
  );

  const updateProfileMutation =
    api.dashboardDb.userProfile.update.useMutation();
  const getImagePresignedUrlMutation =
    api.dashboardDb.image.getPresignedUrl.useMutation();
  const createImageMutation = api.dashboardDb.image.create.useMutation();
  const updateImageMutation = api.dashboardDb.image.update.useMutation();
  const createListingMutation = api.dashboardDb.listing.create.useMutation();
  const updateListingMutation = api.dashboardDb.listing.update.useMutation();
  const linkAhsMutation = api.dashboardDb.listing.linkAhs.useMutation();

  const gardenNameInputRef = useRef<HTMLInputElement | null>(null);
  const gardenLocationInputRef = useRef<HTMLInputElement | null>(null);
  const gardenDescriptionInputRef = useRef<HTMLTextAreaElement | null>(null);
  const profileImageEditorRef = useRef<HTMLDivElement | null>(null);
  const listingCultivarRef = useRef<HTMLDivElement | null>(null);
  const listingTitleInputRef = useRef<HTMLInputElement | null>(null);
  const listingDescriptionInputRef = useRef<HTMLTextAreaElement | null>(null);
  const listingImageEditorRef = useRef<HTMLDivElement | null>(null);
  const searchOnboardingCultivars = useCallback(
    (args: { query: string }) => utils.dashboardDb.ahs.search.fetch(args),
    [utils.dashboardDb.ahs.search],
  );

  const { clearOnboardingDraftSnapshot, earliestExistingListing } =
    useOnboardingBootstrapState({
      currentUserEmail: currentUserQuery.data?.clerk?.email,
      currentUserId: currentUserQuery.data?.id,
      images: imagesQuery.data,
      listingDraft,
      listings: listingQuery.data,
      profile: profileQuery.data,
      profileDraft,
      profileUserId: profileQuery.data?.userId,
      savedListingId,
      selectedCultivarAhsId,
      selectedCultivarName,
      setListingDraft,
      setProfileDraft,
      setSavedListingId,
      setSelectedCultivarAhsId,
      setSelectedCultivarName,
      setSelectedListingImageId,
      setSelectedListingImageUrl,
    });
  const earliestPersistedProfileImage = useMemo(() => {
    if (!profileQuery.data?.id) {
      return null;
    }

    const earliestProfileImage = getEarliestByCreatedAt(
      (imagesQuery.data ?? []).filter(
        (image) => image.userProfileId === profileQuery.data?.id,
      ),
    );

    if (!earliestProfileImage) {
      return null;
    }

    return {
      id: earliestProfileImage.id,
      url: normalizePersistedImageUrl(earliestProfileImage.url),
    };
  }, [imagesQuery.data, profileQuery.data?.id]);
  const existingProfileImageUrl = useMemo(() => {
    const candidate = earliestPersistedProfileImage?.url;
    if (!candidate) {
      return null;
    }

    return isStarterProfileImageUrl(candidate) ? null : candidate;
  }, [earliestPersistedProfileImage]);
  const rawStepParam = getSearchParam("step");
  const ensureListingDraftRecord = useCallback(async () => {
    if (savedListingId) {
      return savedListingId;
    }

    const createdListing = await createListingMutation.mutateAsync({
      title:
        listingDraft.title.trim() || ONBOARDING_LISTING_DEFAULTS.draftTitle,
      cultivarReferenceId: listingDraft.cultivarReferenceId,
    });

    await updateListingMutation.mutateAsync({
      id: createdListing.id,
      data: {
        status: ONBOARDING_LISTING_DEFAULTS.defaultStatus,
      },
    });

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
    setSavedListingId,
    updateListingMutation,
    utils.dashboardDb.image.list,
    utils.dashboardDb.listing.list,
  ]);
  const {
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
  } = useOnboardingProfileImageFlow({
    defaultStarterImageUrl: DEFAULT_STARTER_IMAGE_URL,
    existingProfileImageUrl,
    generateStarterImageWithGardenName,
    imagesFetched: imagesQuery.isFetched,
    profileDraft,
    profileId: profileQuery.data?.id,
    setProfileDraft,
  });
  const {
    clearPendingListingUpload,
    handleAhsSelect,
    handleDeferredListingImageCleared,
    handleDeferredListingImageReady,
    isLoadingOnboardingCultivarOptions,
    onboardingCultivarOptions,
    pendingListingUploadBlob,
    pendingListingUploadPreviewUrl,
  } = useOnboardingListingFlow({
    ensureListingDraftRecord,
    isListingsFetched: listingQuery.isFetched,
    listingDraft,
    listings: listingQuery.data,
    profileId: profileQuery.data?.id,
    rawStepParam,
    savedListingId,
    searchOnboardingCultivars,
    selectedCultivarAhsId,
    selectedCultivarName,
    setActiveListingField,
    setListingDraft,
    setSelectedCultivarAhsId,
    setSelectedCultivarName,
    setSelectedListingImageId,
    setSelectedListingImageUrl,
  });
  const profileMissingField = getNextIncompleteProfileField(profileDraft);
  const listingMissingField = getNextIncompleteListingField(listingDraft);

  const selectedCultivarImageUrl =
    selectedCultivarDetailsQuery.data?.ahsImageUrl ?? null;
  const {
    earliestPersistedListingImage,
    isBuyerContactPreviewHydrating,
    isListingCultivarPlaceholder,
    isListingDescriptionInRecommendedRange,
    isListingDescriptionPlaceholder,
    isListingDescriptionTooLong,
    isListingDescriptionTooShort,
    isListingPricePlaceholder,
    isListingTitlePlaceholder,
    isProfileDescriptionInRecommendedRange,
    isProfileDescriptionPlaceholder,
    isProfileDescriptionTooLong,
    isProfileDescriptionTooShort,
    isProfileLocationPlaceholder,
    isProfileNamePlaceholder,
    listingContinueChecklist,
    listingDescriptionCharacterCount,
    listingDescriptionForBuyerContactPreview,
    listingDescriptionPreview,
    listingImagePreviewUrl,
    listingPriceForBuyerContactPreview,
    listingTitleForBuyerContactPreview,
    listingTitlePreview,
    profileContinueChecklist,
    profileDescriptionCharacterCount,
    profileDescriptionForBuyerContactPreview,
    profileDescriptionPreview,
    profileImagePreviewUrl,
    profileLocationForBuyerContactPreview,
    profileLocationPreview,
    profileNameForBuyerContactPreview,
    profileNamePreview,
  } = useOnboardingPreviewState({
    earliestExistingListing,
    images: imagesQuery.data,
    isListingPending: listingQuery.isPending,
    isProfilePending: profileQuery.isPending,
    listingDraft,
    pendingListingUploadPreviewUrl,
    pendingProfileUploadPreviewUrl,
    pendingStarterPreviewUrl,
    profile: profileQuery.data,
    profileDraft,
    savedListingId,
    selectedCultivarImageUrl,
    selectedCultivarName,
    selectedListingImageId,
    selectedListingImageUrl,
    selectedStarterImageUrl,
  });

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
  const {
    isSavingListing,
    isSavingProfile,
    saveListingDraft,
    saveProfileDraft,
  } = useOnboardingSaveFlow({
    applyStarterNameOverlay,
    clearPendingListingUpload,
    clearPendingProfileUpload,
    clearPendingStarterImage,
    createImageRecord: createImageMutation.mutateAsync,
    defaultStarterImageUrl: DEFAULT_STARTER_IMAGE_URL,
    earliestPersistedListingImageId: earliestPersistedListingImage?.id ?? null,
    earliestPersistedProfileImageId: earliestPersistedProfileImage?.id ?? null,
    ensureListingDraftRecord,
    fetchImageBlobFromUrl,
    focusListingField,
    focusProfileField,
    invalidateListingData: () =>
      Promise.all([
        utils.dashboardDb.listing.list.invalidate(),
        utils.dashboardDb.image.list.invalidate(),
      ]).then(() => undefined),
    invalidateProfileData: () =>
      Promise.all([
        utils.dashboardDb.userProfile.get.invalidate(),
        utils.dashboardDb.image.list.invalidate(),
      ]).then(() => undefined),
    linkAhs: linkAhsMutation.mutateAsync,
    listingDraft,
    listingMissingField,
    pendingListingUploadBlob,
    pendingProfileUploadBlob,
    pendingStarterImageBlob,
    profileDraft,
    profileId: profileQuery.data?.id,
    profileImageInputMode,
    profileMissingField,
    selectedCultivarImageUrl,
    selectedListingImageUrl,
    selectedStarterImageUrl,
    setProfileDraft,
    setSelectedListingImageId,
    setSelectedListingImageUrl,
    updateImageRecord: updateImageMutation.mutateAsync,
    updateListing: updateListingMutation.mutateAsync,
    updateProfile: updateProfileMutation.mutateAsync,
    uploadImageBlob: ({ blob, referenceId, type }) =>
      uploadOnboardingImageBlob({
        blob,
        type,
        referenceId,
        getPresignedUrl: getImagePresignedUrlMutation.mutateAsync,
      }),
    useExistingProfileImage,
  });
  const {
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
  } = useOnboardingStepFlow({
    clearOnboardingDraftSnapshot,
    currentUserId: currentUserQuery.data?.id,
    isCurrentUserFetched: currentUserQuery.isFetched,
    isGeneratingStarterImage,
    isListingReadyToContinue: isListingOnboardingDraftComplete(listingDraft),
    isProfileReadyToContinue: isProfileOnboardingDraftComplete(profileDraft),
    isSavingListing,
    isSavingProfile,
    onboardingPath,
    rawStepParam,
    router,
    saveListingDraft,
    saveProfileDraft,
    searchParamsString: searchParams.toString(),
  });

  return {
    activeListingField,
    applyStarterNameOverlay,
    currentStep,
    existingProfileImageUrl,
    focusListingField,
    focusProfileField,
    focusedProfileField,
    gardenDescriptionInputRef,
    gardenLocationInputRef,
    gardenNameInputRef,
    getStepHref,
    goToPreviousStep,
    goToStep,
    handleAhsSelect,
    handleDeferredListingImageCleared,
    handleDeferredListingImageReady,
    handleDeferredProfileImageCleared,
    handleDeferredProfileImageReady,
    handleGardenNameChange,
    handleMembershipContinueForNow,
    handlePrimaryAction,
    handleProfileImageModeChange,
    handleSkipOnboarding,
    handleStarterImageSelect,
    handleStarterOverlayChange,
    handleUseExistingProfileImageChange,
    isBuyerContactPreviewHydrating,
    isGeneratingStarterImage,
    isListingCultivarPlaceholder,
    isListingDescriptionInRecommendedRange,
    isListingDescriptionPlaceholder,
    isListingDescriptionTooLong,
    isListingDescriptionTooShort,
    isListingPricePlaceholder,
    isListingTitlePlaceholder,
    isLoadingOnboardingCultivarOptions,
    isProfileDescriptionInRecommendedRange,
    isProfileDescriptionPlaceholder,
    isProfileDescriptionTooLong,
    isProfileDescriptionTooShort,
    isProfileLocationPlaceholder,
    isProfileNamePlaceholder,
    listingContinueChecklist,
    listingCultivarRef,
    listingDescriptionCharacterCount,
    listingDescriptionForBuyerContactPreview,
    listingDescriptionInputRef,
    listingDescriptionPreview,
    listingDraft,
    listingImageEditorRef,
    listingImagePreviewUrl,
    listingMissingField,
    listingPriceForBuyerContactPreview,
    listingTitleForBuyerContactPreview,
    listingTitleInputRef,
    listingTitlePreview,
    membershipPriceDisplay,
    onboardingCultivarOptions,
    pendingListingUploadPreviewUrl,
    pendingProfileUploadPreviewUrl,
    primaryButtonDisabled,
    primaryButtonLabel,
    profileContinueChecklist,
    profileDescriptionCharacterCount,
    profileDescriptionForBuyerContactPreview,
    profileDescriptionPreview,
    profileDraft,
    profileImageEditorRef,
    profileImageInputMode,
    profileImagePreviewUrl,
    profileLocationForBuyerContactPreview,
    profileLocationPreview,
    profileMissingField,
    profileNameForBuyerContactPreview,
    profileNamePreview,
    profileQuery,
    progressValue,
    savedListingId,
    selectedCultivarDetails: selectedCultivarDetailsQuery.data,
    selectedCultivarName,
    selectedListingImageId,
    selectedListingImageUrl,
    selectedStarterImageUrl,
    setActiveListingField,
    setFocusedProfileField,
    setListingDraft,
    setProfileDraft,
    stepIndex,
    useExistingProfileImage,
  };
}

function StartOnboardingPageClientInner(props: StartOnboardingPageClientProps) {
  const controller = useStartOnboardingController(props);

  return <StartOnboardingLayout {...controller} />;
}

function StartOnboardingLayout(
  props: ReturnType<typeof useStartOnboardingController>,
) {
  const {
    activeListingField,
    applyStarterNameOverlay,
    currentStep,
    existingProfileImageUrl,
    focusListingField,
    focusProfileField,
    focusedProfileField,
    gardenDescriptionInputRef,
    gardenLocationInputRef,
    gardenNameInputRef,
    getStepHref,
    goToPreviousStep,
    goToStep,
    handleAhsSelect,
    handleDeferredListingImageCleared,
    handleDeferredListingImageReady,
    handleDeferredProfileImageCleared,
    handleDeferredProfileImageReady,
    handleGardenNameChange,
    handleMembershipContinueForNow,
    handlePrimaryAction,
    handleProfileImageModeChange,
    handleSkipOnboarding,
    handleStarterImageSelect,
    handleStarterOverlayChange,
    handleUseExistingProfileImageChange,
    isBuyerContactPreviewHydrating,
    isGeneratingStarterImage,
    isListingCultivarPlaceholder,
    isListingDescriptionInRecommendedRange,
    isListingDescriptionPlaceholder,
    isListingDescriptionTooLong,
    isListingDescriptionTooShort,
    isListingPricePlaceholder,
    isListingTitlePlaceholder,
    isLoadingOnboardingCultivarOptions,
    isProfileDescriptionInRecommendedRange,
    isProfileDescriptionPlaceholder,
    isProfileDescriptionTooLong,
    isProfileDescriptionTooShort,
    isProfileLocationPlaceholder,
    isProfileNamePlaceholder,
    listingContinueChecklist,
    listingCultivarRef,
    listingDescriptionCharacterCount,
    listingDescriptionForBuyerContactPreview,
    listingDescriptionInputRef,
    listingDescriptionPreview,
    listingDraft,
    listingImageEditorRef,
    listingImagePreviewUrl,
    listingMissingField,
    listingPriceForBuyerContactPreview,
    listingTitleForBuyerContactPreview,
    listingTitleInputRef,
    listingTitlePreview,
    membershipPriceDisplay,
    onboardingCultivarOptions,
    pendingListingUploadPreviewUrl,
    pendingProfileUploadPreviewUrl,
    primaryButtonDisabled,
    primaryButtonLabel,
    profileContinueChecklist,
    profileDescriptionCharacterCount,
    profileDescriptionForBuyerContactPreview,
    profileDescriptionPreview,
    profileDraft,
    profileImageEditorRef,
    profileImageInputMode,
    profileImagePreviewUrl,
    profileLocationForBuyerContactPreview,
    profileLocationPreview,
    profileMissingField,
    profileNameForBuyerContactPreview,
    profileNamePreview,
    profileQuery,
    progressValue,
    savedListingId,
    selectedCultivarDetails,
    selectedCultivarName,
    selectedStarterImageUrl,
    setActiveListingField,
    setFocusedProfileField,
    setListingDraft,
    setProfileDraft,
    stepIndex,
    useExistingProfileImage,
  } = props;

  return (
    <div
      className="bg-muted/20 min-h-svh"
      data-testid="start-onboarding-page"
      data-profile-ready={profileQuery.data?.id ? "true" : "false"}
    >
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6 lg:px-8 lg:py-10">
        <StartOnboardingHeader
          currentStep={currentStep}
          getStepHref={getStepHref}
          progressValue={progressValue}
          stepIndex={stepIndex}
        />

        {currentStep.id === "build-profile-card" ? (
          <OnboardingProfileEditStep
            existingProfileImageUrl={existingProfileImageUrl}
            flags={{
              applyStarterNameOverlay,
              isGeneratingStarterImage,
              isProfileDescriptionInRecommendedRange,
              isProfileDescriptionPlaceholder,
              isProfileDescriptionTooLong,
              isProfileDescriptionTooShort,
              isProfileLocationPlaceholder,
              isProfileNamePlaceholder,
              profileReady: Boolean(profileQuery.data?.id),
              useExistingProfileImage,
            }}
            focusedProfileField={focusedProfileField}
            gardenDescriptionInputRef={gardenDescriptionInputRef}
            gardenLocationInputRef={gardenLocationInputRef}
            gardenNameInputRef={gardenNameInputRef}
            handleDeferredProfileImageCleared={
              handleDeferredProfileImageCleared
            }
            handleDeferredProfileImageReady={handleDeferredProfileImageReady}
            handleGardenNameChange={handleGardenNameChange}
            handleProfileImageModeChange={handleProfileImageModeChange}
            handleStarterImageSelect={handleStarterImageSelect}
            handleStarterOverlayChange={handleStarterOverlayChange}
            handleUseExistingProfileImageChange={
              handleUseExistingProfileImageChange
            }
            pendingProfileUploadPreviewUrl={pendingProfileUploadPreviewUrl}
            profileContinueChecklist={profileContinueChecklist}
            profileDescriptionCharacterCount={profileDescriptionCharacterCount}
            profileDescriptionPreview={profileDescriptionPreview}
            profileDraft={profileDraft}
            profileImageEditorRef={profileImageEditorRef}
            profileImageInputMode={profileImageInputMode}
            profileImagePreviewUrl={profileImagePreviewUrl}
            profileLocationPreview={profileLocationPreview}
            profileMissingField={profileMissingField}
            profileNamePreview={profileNamePreview}
            selectedStarterImageUrl={selectedStarterImageUrl}
            setFocusedProfileField={setFocusedProfileField}
            setProfileDraft={setProfileDraft}
            focusProfileField={focusProfileField}
          />
        ) : null}

        {currentStep.id === "build-listing-card" ? (
          <OnboardingListingEditStep
            activeListingField={activeListingField}
            focusListingField={focusListingField}
            flags={{
              isListingCultivarPlaceholder,
              isListingDescriptionInRecommendedRange,
              isListingDescriptionPlaceholder,
              isListingDescriptionTooLong,
              isListingDescriptionTooShort,
              isListingPricePlaceholder,
              isListingTitlePlaceholder,
              isLoadingOnboardingCultivarOptions,
            }}
            handleAhsSelect={handleAhsSelect}
            handleDeferredListingImageCleared={
              handleDeferredListingImageCleared
            }
            handleDeferredListingImageReady={handleDeferredListingImageReady}
            listingContinueChecklist={listingContinueChecklist}
            listingCultivarRef={listingCultivarRef}
            listingDescriptionCharacterCount={listingDescriptionCharacterCount}
            listingDescriptionInputRef={listingDescriptionInputRef}
            listingDescriptionPreview={listingDescriptionPreview}
            listingDraft={listingDraft}
            listingImageEditorRef={listingImageEditorRef}
            listingImagePreviewUrl={listingImagePreviewUrl}
            listingMissingField={listingMissingField}
            listingTitleInputRef={listingTitleInputRef}
            listingTitlePreview={listingTitlePreview}
            onboardingCultivarOptions={onboardingCultivarOptions}
            pendingListingUploadPreviewUrl={pendingListingUploadPreviewUrl}
            savedListingId={savedListingId}
            selectedCultivarDetails={selectedCultivarDetails}
            selectedCultivarName={selectedCultivarName}
            setActiveListingField={setActiveListingField}
            setListingDraft={setListingDraft}
          />
        ) : null}

        {currentStep.id === "preview-buyer-contact" ? (
          <OnboardingBuyerContactPreviewStep
            hybridizerYear={
              selectedCultivarDetails
                ? [
                    selectedCultivarDetails.hybridizer,
                    selectedCultivarDetails.year,
                  ]
                    .filter(Boolean)
                    .join(", ")
                : null
            }
            isHydrating={isBuyerContactPreviewHydrating}
            linkedLabel={selectedCultivarName}
            listingDescription={listingDescriptionForBuyerContactPreview}
            listingImageUrl={listingImagePreviewUrl}
            listingPrice={listingPriceForBuyerContactPreview}
            listingTitle={listingTitleForBuyerContactPreview}
            onEditListing={() => goToStep("build-listing-card")}
            onEditProfile={() => goToStep("build-profile-card")}
            profileDescription={profileDescriptionForBuyerContactPreview}
            profileImageUrl={profileImagePreviewUrl}
            profileLocation={profileLocationForBuyerContactPreview}
            profileName={profileNameForBuyerContactPreview}
          />
        ) : null}

        {currentStep.id === "start-membership" ? (
          <OnboardingMembershipStep
            membershipPriceDisplay={membershipPriceDisplay}
            onContinueForNow={handleMembershipContinueForNow}
          />
        ) : null}

        <StartOnboardingFooter
          currentStep={currentStep}
          goToPreviousStep={goToPreviousStep}
          handlePrimaryAction={handlePrimaryAction}
          handleSkipOnboarding={handleSkipOnboarding}
          primaryButtonDisabled={primaryButtonDisabled}
          primaryButtonLabel={primaryButtonLabel}
          stepIndex={stepIndex}
        />
      </div>
    </div>
  );
}

function StartOnboardingHeader({
  currentStep,
  getStepHref,
  progressValue,
  stepIndex,
}: Pick<
  ReturnType<typeof useStartOnboardingController>,
  "currentStep" | "getStepHref" | "progressValue" | "stepIndex"
>) {
  return (
    <header className="space-y-4">
      <div className="space-y-3">
        <Badge variant="secondary" className="w-fit">
          Guided onboarding
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight lg:text-5xl">
          Build your catalog in minutes.
        </h1>
        <p className="text-muted-foreground max-w-3xl text-base lg:text-lg">
          We&apos;ll walk through profile setup and your first listing so buyers
          can discover you before you get started in the dashboard. This takes
          about 2 minutes, and you can edit everything later.
        </p>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 lg:items-center">
          <p className="text-lg leading-tight font-semibold lg:text-xl">
            {currentStep.title}
          </p>
          <Badge
            variant="outline"
            className="mt-0.5 text-xs whitespace-nowrap lg:mt-0"
          >
            Step {stepIndex + 1} of {ONBOARDING_STEPS.length}
          </Badge>
        </div>
      </div>

      <Progress value={progressValue} className="h-2" />

      <div className="pb-1">
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {ONBOARDING_STEPS.map((step, index) => {
            const isCurrent = index === stepIndex;
            const isComplete = index < stepIndex;

            return (
              <Link
                key={step.id}
                href={getStepHref(step.id)}
                scroll={false}
                onClick={(event) => {
                  if (isCurrent) {
                    event.preventDefault();
                  }
                  window.requestAnimationFrame(() => {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  });
                }}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "focus-visible:ring-ring shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-1 focus-visible:outline-none",
                  isCurrent && "border-primary bg-primary/10 text-primary",
                  isComplete &&
                    "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
                  !isCurrent && !isComplete && "text-muted-foreground",
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  {isComplete ? <CheckCircle2 className="size-3.5" /> : null}
                  <span className="lg:hidden">{index + 1}</span>
                  <span className="hidden lg:inline">{step.chipLabel}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}

function StartOnboardingFooter({
  currentStep,
  goToPreviousStep,
  handlePrimaryAction,
  handleSkipOnboarding,
  primaryButtonDisabled,
  primaryButtonLabel,
  stepIndex,
}: Pick<
  ReturnType<typeof useStartOnboardingController>,
  | "currentStep"
  | "goToPreviousStep"
  | "handlePrimaryAction"
  | "handleSkipOnboarding"
  | "primaryButtonDisabled"
  | "primaryButtonLabel"
  | "stepIndex"
>) {
  if (currentStep.id === "start-membership") {
    return null;
  }

  return (
    <footer className="space-y-2 border-t pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-muted-foreground text-sm">
          {currentStep.description}
        </div>
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
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="link"
          onClick={handleSkipOnboarding}
          className="text-muted-foreground hover:text-foreground h-auto p-0 text-xs"
        >
          Skip onboarding…
        </Button>
      </div>
    </footer>
  );
}

export function StartOnboardingPageClient(
  props: StartOnboardingPageClientProps,
) {
  return (
    <Suspense fallback={null}>
      <StartOnboardingPageClientInner {...props} />
    </Suspense>
  );
}

function drawImageCoverSquare({
  context,
  image,
  size,
  filter,
  globalAlpha,
}: {
  context: CanvasRenderingContext2D;
  image: HTMLImageElement;
  size: number;
  filter?: string;
  globalAlpha?: number;
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

  context.save();
  context.filter = filter ?? "none";
  context.globalAlpha = globalAlpha ?? 1;
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
  context.restore();
}

const STARTER_IMAGE_CANVAS_SIZE = 1200;
const STARTER_IMAGE_BLUR_PX = 6;
const STARTER_IMAGE_BLUR_ALPHA = 0.35;
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

  drawImageCoverSquare({
    context,
    image,
    size: STARTER_IMAGE_CANVAS_SIZE,
    filter: `blur(${STARTER_IMAGE_BLUR_PX}px)`,
    globalAlpha: STARTER_IMAGE_BLUR_ALPHA,
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

async function uploadOnboardingImageBlob({
  blob,
  type,
  referenceId,
  getPresignedUrl,
}: {
  blob: Blob;
  type: "profile" | "listing";
  referenceId: string;
  getPresignedUrl: (input: {
    type: "profile" | "listing";
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
  const fileNamePrefix = type === "profile" ? "profile" : "listing";
  const fileName = `onboarding-${fileNamePrefix}-${Date.now()}.jpg`;
  const contentType = blob.type || "image/jpeg";

  const { presignedUrl, key, url } = await getPresignedUrl({
    type,
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

async function fetchImageBlobFromUrl(imageUrl: string) {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Unable to load image asset (${response.status})`);
  }

  return response.blob();
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
    text.length > 28 ? `${text.slice(0, 28).trimEnd()}…` : text;
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
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to create image blob"));
          return;
        }

        resolve(blob);
      },
      type,
      quality,
    );
  });
}
