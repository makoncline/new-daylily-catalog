"use client";

import type { RouterOutputs } from "@/trpc/react";
import {
  DEFAULT_GARDEN_NAME_PLACEHOLDER,
  DEFAULT_LISTING_DESCRIPTION_PLACEHOLDER,
  DEFAULT_LISTING_TITLE_PLACEHOLDER,
  DEFAULT_LOCATION_PLACEHOLDER,
  DEFAULT_PROFILE_DESCRIPTION_PLACEHOLDER,
  getEarliestByCreatedAt,
  isStarterProfileImageUrl,
  normalizePersistedImageUrl,
  ONBOARDING_LISTING_DEFAULTS,
  ONBOARDING_LISTING_DESCRIPTION_GUIDANCE,
  ONBOARDING_PROFILE_DESCRIPTION_SEO_GUIDANCE,
  PROFILE_PLACEHOLDER_IMAGE,
  type ListingOnboardingDraft,
  type ProfileOnboardingDraft,
} from "./onboarding-utils";

type DashboardImage = RouterOutputs["dashboardDb"]["image"]["list"][number];
type DashboardListing = RouterOutputs["dashboardDb"]["listing"]["list"][number];
type DashboardProfile = RouterOutputs["dashboardDb"]["userProfile"]["get"];

interface UseOnboardingPreviewStateArgs {
  earliestExistingListing: DashboardListing | null;
  images: DashboardImage[] | undefined;
  isListingPending: boolean;
  isProfilePending: boolean;
  listingDraft: ListingOnboardingDraft;
  pendingListingUploadPreviewUrl: string | null;
  pendingProfileUploadPreviewUrl: string | null;
  pendingStarterPreviewUrl: string | null;
  profile: DashboardProfile | undefined;
  profileDraft: ProfileOnboardingDraft;
  savedListingId: string | null;
  selectedCultivarImageUrl: string | null;
  selectedCultivarName: string | null;
  selectedListingImageId: string | null;
  selectedListingImageUrl: string | null;
  selectedStarterImageUrl: string | null;
}

export function useOnboardingPreviewState({
  earliestExistingListing,
  images,
  isListingPending,
  isProfilePending,
  listingDraft,
  pendingListingUploadPreviewUrl,
  pendingProfileUploadPreviewUrl,
  pendingStarterPreviewUrl,
  profile,
  profileDraft,
  savedListingId,
  selectedCultivarImageUrl,
  selectedCultivarName,
  selectedListingImageId,
  selectedListingImageUrl,
  selectedStarterImageUrl,
}: UseOnboardingPreviewStateArgs) {
  const persistedProfileTitle = profile?.title?.trim() ?? "";
  const persistedProfileDescription = profile?.description?.trim() ?? "";
  const persistedProfileLocation = profile?.location?.trim() ?? "";
  const profileDraftImageUrl = normalizePersistedImageUrl(
    profileDraft.profileImageUrl,
  );
  const selectedStarterImagePreviewUrl = normalizePersistedImageUrl(
    selectedStarterImageUrl,
  );
  const profileNameDraftValue = profileDraft.gardenName.trim();
  const profileDescriptionDraftValue = profileDraft.description.trim();
  const profileLocationDraftValue = profileDraft.location.trim();

  const earliestProfileImage = profile?.id
    ? getEarliestByCreatedAt(
        (images ?? []).filter((image) => image.userProfileId === profile.id),
      )
    : null;
  const earliestPersistedProfileImage = earliestProfileImage
    ? {
        id: earliestProfileImage.id,
        url: normalizePersistedImageUrl(earliestProfileImage.url),
      }
    : null;
  const existingProfileImageUrl = earliestPersistedProfileImage?.url
    ? isStarterProfileImageUrl(earliestPersistedProfileImage.url)
      ? null
      : earliestPersistedProfileImage.url
    : null;

  const persistedListingTitle = earliestExistingListing?.title?.trim() ?? "";
  const persistedListingDescription =
    earliestExistingListing?.description?.trim() ?? "";
  const persistedListingPrice = earliestExistingListing?.price ?? null;
  const listingIdForPreview = savedListingId ?? earliestExistingListing?.id ?? null;

  const earliestListingImage = listingIdForPreview
    ? getEarliestByCreatedAt(
        (images ?? []).filter((image) => image.listingId === listingIdForPreview),
      )
    : null;
  const earliestPersistedListingImage = earliestListingImage
    ? {
        id: earliestListingImage.id,
        url: normalizePersistedImageUrl(earliestListingImage.url),
      }
    : null;

  const persistedListingImageUrl = earliestPersistedListingImage?.url ?? null;
  const listingTitleDraftValue = listingDraft.title.trim();
  const listingDescriptionDraftValue = listingDraft.description.trim();
  const listingDescriptionCharacterCount = listingDescriptionDraftValue.length;
  const profileDescriptionCharacterCount = profileDescriptionDraftValue.length;

  return {
    earliestPersistedListingImage,
    earliestPersistedProfileImage,
    existingProfileImageUrl,
    isBuyerContactPreviewHydrating: isProfilePending || isListingPending,
    isListingCultivarPlaceholder: !selectedCultivarName,
    isListingDescriptionInRecommendedRange:
      listingDescriptionCharacterCount >=
        ONBOARDING_LISTING_DESCRIPTION_GUIDANCE.minLength &&
      listingDescriptionCharacterCount <=
        ONBOARDING_LISTING_DESCRIPTION_GUIDANCE.maxLength,
    isListingDescriptionPlaceholder:
      listingDescriptionDraftValue.length === 0 &&
      persistedListingDescription.length === 0,
    isListingDescriptionTooLong:
      listingDescriptionCharacterCount >
      ONBOARDING_LISTING_DESCRIPTION_GUIDANCE.maxLength,
    isListingDescriptionTooShort:
      listingDescriptionCharacterCount > 0 &&
      listingDescriptionCharacterCount <
        ONBOARDING_LISTING_DESCRIPTION_GUIDANCE.minLength,
    isListingPricePlaceholder: listingDraft.price === null,
    isListingTitlePlaceholder:
      listingTitleDraftValue.length === 0 && persistedListingTitle.length === 0,
    isProfileDescriptionInRecommendedRange:
      profileDescriptionCharacterCount >=
        ONBOARDING_PROFILE_DESCRIPTION_SEO_GUIDANCE.minLength &&
      profileDescriptionCharacterCount <=
        ONBOARDING_PROFILE_DESCRIPTION_SEO_GUIDANCE.maxLength,
    isProfileDescriptionPlaceholder:
      profileDescriptionDraftValue.length === 0 &&
      persistedProfileDescription.length === 0,
    isProfileDescriptionTooLong:
      profileDescriptionCharacterCount >
      ONBOARDING_PROFILE_DESCRIPTION_SEO_GUIDANCE.maxLength,
    isProfileDescriptionTooShort:
      profileDescriptionCharacterCount > 0 &&
      profileDescriptionCharacterCount <
        ONBOARDING_PROFILE_DESCRIPTION_SEO_GUIDANCE.minLength,
    isProfileLocationPlaceholder:
      profileLocationDraftValue.length === 0 &&
      persistedProfileLocation.length === 0,
    isProfileNamePlaceholder:
      profileNameDraftValue.length === 0 && persistedProfileTitle.length === 0,
    listingContinueChecklist: [
      {
        key: "cultivar",
        label: "Link to a registered cultivar",
        done: listingDraft.cultivarReferenceId !== null,
        required: true,
      },
      {
        key: "title",
        label: "Add a listing name",
        done: listingDraft.title.trim().length > 0,
        required: true,
      },
      {
        key: "price",
        label: "Add a price",
        done: listingDraft.price !== null,
        required: true,
      },
      {
        key: "description",
        label: "Add a description",
        done: listingDraft.description.trim().length > 0,
        required: false,
      },
      {
        key: "photo",
        label: "Add a photo",
        done: Boolean(selectedListingImageId),
        required: false,
      },
    ] as const,
    listingDescriptionCharacterCount,
    listingDescriptionForBuyerContactPreview:
      listingDescriptionDraftValue || persistedListingDescription,
    listingDescriptionPreview:
      listingDescriptionDraftValue ||
      persistedListingDescription ||
      DEFAULT_LISTING_DESCRIPTION_PLACEHOLDER,
    listingImagePreviewUrl:
      pendingListingUploadPreviewUrl ??
      normalizePersistedImageUrl(selectedListingImageUrl) ??
      persistedListingImageUrl ??
      selectedCultivarImageUrl ??
      ONBOARDING_LISTING_DEFAULTS.fallbackImageUrl,
    listingPriceForBuyerContactPreview:
      listingDraft.price ?? persistedListingPrice,
    listingTitleForBuyerContactPreview:
      listingTitleDraftValue || persistedListingTitle,
    listingTitlePreview:
      listingTitleDraftValue ||
      persistedListingTitle ||
      DEFAULT_LISTING_TITLE_PLACEHOLDER,
    profileContinueChecklist: [
      {
        key: "image",
        label: "Choose a profile image",
        done: profileDraft.profileImageUrl !== null,
        required: true,
      },
      {
        key: "seller-name",
        label: "Add your seller name",
        done: profileDraft.gardenName.trim().length > 0,
        required: true,
      },
      {
        key: "description",
        label: "Add a seller description",
        done: profileDraft.description.trim().length > 0,
        required: false,
      },
      {
        key: "location",
        label: "Add your location",
        done: profileDraft.location.trim().length > 0,
        required: false,
      },
    ] as const,
    profileDescriptionCharacterCount,
    profileDescriptionForBuyerContactPreview:
      profileDescriptionDraftValue || persistedProfileDescription,
    profileDescriptionPreview:
      profileDescriptionDraftValue ||
      persistedProfileDescription ||
      DEFAULT_PROFILE_DESCRIPTION_PLACEHOLDER,
    profileImagePreviewUrl:
      pendingStarterPreviewUrl ??
      pendingProfileUploadPreviewUrl ??
      profileDraftImageUrl ??
      selectedStarterImagePreviewUrl ??
      PROFILE_PLACEHOLDER_IMAGE,
    profileLocationForBuyerContactPreview:
      profileLocationDraftValue || persistedProfileLocation,
    profileLocationPreview:
      profileLocationDraftValue ||
      persistedProfileLocation ||
      DEFAULT_LOCATION_PLACEHOLDER,
    profileNameForBuyerContactPreview:
      profileNameDraftValue || persistedProfileTitle,
    profileNamePreview:
      profileNameDraftValue ||
      persistedProfileTitle ||
      DEFAULT_GARDEN_NAME_PLACEHOLDER,
  };
}
