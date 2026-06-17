"use client";

import { useCallback, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import { capturePosthogEvent } from "@/lib/analytics/posthog";
import { getErrorMessage } from "@/lib/error-utils";
import {
  ONBOARDING_LISTING_DEFAULTS,
  type ListingOnboardingDraft,
  type ListingOnboardingField,
  type ProfileOnboardingDraft,
  type ProfileOnboardingField,
  isListingOnboardingDraftComplete,
  isProfileOnboardingDraftComplete,
  isStarterProfileImageUrl,
} from "./onboarding-utils";

interface UploadedImage {
  imageId: string;
  key: string;
  r2OriginalKey?: string;
  url: string;
}

interface UseOnboardingSaveFlowArgs {
  applyStarterNameOverlay: boolean;
  clearPendingListingUpload: () => void;
  clearPendingProfileUpload: () => void;
  clearPendingStarterImage: () => void;
  createImageRecord: (args: {
    imageId?: string;
    key: string;
    referenceId: string;
    r2OriginalKey?: string;
    type: "listing" | "profile";
    url: string;
  }) => Promise<{ id: string } | void>;
  defaultStarterImageUrl: string | null;
  ensureListingDraftRecord: () => Promise<string>;
  fetchImageBlobFromUrl: (imageUrl: string) => Promise<Blob>;
  focusListingField: (field: ListingOnboardingField) => void;
  focusProfileField: (field: ProfileOnboardingField) => void;
  invalidateListingData: () => Promise<void>;
  invalidateProfileData: () => Promise<void>;
  linkAhs: (args: {
    cultivarReferenceId: string;
    id: string;
    syncName: false;
  }) => Promise<unknown>;
  listingDraft: ListingOnboardingDraft;
  listingMissingField: ListingOnboardingField | null;
  pendingListingUploadBlob: Blob | null;
  pendingProfileUploadBlob: Blob | null;
  pendingStarterImageBlob: Blob | null;
  profileDraft: ProfileOnboardingDraft;
  profileId: string | null | undefined;
  profileImageInputMode: "starter" | "upload";
  profileMissingField: ProfileOnboardingField | null;
  selectedCultivarImageUrl: string | null;
  selectedListingImageUrl: string | null;
  selectedStarterImageUrl: string | null;
  setProfileDraft: Dispatch<SetStateAction<ProfileOnboardingDraft>>;
  setSelectedListingImageId: Dispatch<SetStateAction<string | null>>;
  setSelectedListingImageUrl: Dispatch<SetStateAction<string | null>>;
  updateListing: (args: {
    data: {
      description: string;
      price: number | null;
      status: typeof ONBOARDING_LISTING_DEFAULTS.defaultStatus;
      title: string;
    };
    id: string;
  }) => Promise<unknown>;
  updateProfile: (args: {
    data: {
      description: string;
      location: string;
      title: string;
    };
  }) => Promise<unknown>;
  uploadImageBlob: (args: {
    blob: Blob;
    referenceId: string;
    type: "listing" | "profile";
  }) => Promise<UploadedImage>;
  useExistingProfileImage: boolean;
}

export function useOnboardingSaveFlow({
  applyStarterNameOverlay,
  clearPendingListingUpload,
  clearPendingProfileUpload,
  clearPendingStarterImage,
  createImageRecord,
  defaultStarterImageUrl,
  ensureListingDraftRecord,
  fetchImageBlobFromUrl,
  focusListingField,
  focusProfileField,
  invalidateListingData,
  invalidateProfileData,
  linkAhs,
  listingDraft,
  listingMissingField,
  pendingListingUploadBlob,
  pendingProfileUploadBlob,
  pendingStarterImageBlob,
  profileDraft,
  profileId,
  profileImageInputMode,
  profileMissingField,
  selectedCultivarImageUrl,
  selectedListingImageUrl,
  selectedStarterImageUrl,
  setProfileDraft,
  setSelectedListingImageId,
  setSelectedListingImageUrl,
  updateListing,
  updateProfile,
  uploadImageBlob,
  useExistingProfileImage,
}: UseOnboardingSaveFlowArgs) {
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingListing, setIsSavingListing] = useState(false);

  const saveProfileDraft = useCallback(async () => {
    if (!profileId) {
      toast.error("Unable to load your profile.");
      return false;
    }

    if (!isProfileOnboardingDraftComplete(profileDraft)) {
      focusProfileField(profileMissingField ?? "gardenName");
      toast.error("Complete image and seller name first.");
      return false;
    }

    setIsSavingProfile(true);

    try {
      let uploadedProfileImage: UploadedImage | null = null;

      if (pendingProfileUploadBlob) {
        const nextUploadedProfileImage = await uploadImageBlob({
          blob: pendingProfileUploadBlob,
          type: "profile",
          referenceId: profileId,
        });
        uploadedProfileImage = nextUploadedProfileImage;

        clearPendingProfileUpload();
        setProfileDraft((previous) => ({
          ...previous,
          profileImageUrl: nextUploadedProfileImage.url,
        }));
      } else if (
        profileImageInputMode === "starter" &&
        !useExistingProfileImage &&
        profileDraft.profileImageUrl
      ) {
        try {
          const starterBlobToUpload =
            pendingStarterImageBlob ??
            (isStarterProfileImageUrl(profileDraft.profileImageUrl)
              ? await fetchImageBlobFromUrl(profileDraft.profileImageUrl)
              : null);

          if (!starterBlobToUpload) {
            throw new Error("Starter profile image is not ready to upload.");
          }

          uploadedProfileImage = await uploadImageBlob({
            blob: starterBlobToUpload,
            type: "profile",
            referenceId: profileId,
          });

          clearPendingStarterImage();
          setProfileDraft((previous) => ({
            ...previous,
            profileImageUrl: uploadedProfileImage?.url ?? null,
          }));
        } catch (error) {
          const fallbackStarterImageUrl =
            selectedStarterImageUrl ?? defaultStarterImageUrl;
          clearPendingStarterImage();
          setProfileDraft((previous) => ({
            ...previous,
            profileImageUrl: fallbackStarterImageUrl,
          }));
          console.error(
            "Failed to upload starter overlay image during onboarding; using starter image fallback.",
            error,
          );
        }
      }

      await updateProfile({
        data: {
          title: profileDraft.gardenName.trim(),
          location: profileDraft.location.trim(),
          description: profileDraft.description.trim(),
        },
      });

      if (uploadedProfileImage) {
        try {
          await createImageRecord({
            type: "profile",
            referenceId: profileId,
            imageId: uploadedProfileImage.imageId,
            url: uploadedProfileImage.url,
            key: uploadedProfileImage.key,
            r2OriginalKey: uploadedProfileImage.r2OriginalKey,
          });
        } catch (error) {
          console.error(
            "Failed to save onboarding profile image record.",
            error,
          );
        }
      }

      await invalidateProfileData();

      capturePosthogEvent("onboarding_profile_saved", {
        has_location: profileDraft.location.trim().length > 0,
        used_starter_image: profileImageInputMode === "starter",
        used_name_overlay: applyStarterNameOverlay,
      });

      return true;
    } catch (error) {
      toast.error("Failed to save profile", {
        description: getErrorMessage(error),
      });
      return false;
    } finally {
      setIsSavingProfile(false);
    }
  }, [
    applyStarterNameOverlay,
    clearPendingProfileUpload,
    clearPendingStarterImage,
    createImageRecord,
    defaultStarterImageUrl,
    fetchImageBlobFromUrl,
    focusProfileField,
    invalidateProfileData,
    pendingProfileUploadBlob,
    pendingStarterImageBlob,
    profileDraft,
    profileId,
    profileImageInputMode,
    profileMissingField,
    selectedStarterImageUrl,
    setProfileDraft,
    updateProfile,
    uploadImageBlob,
    useExistingProfileImage,
  ]);

  const saveListingDraft = useCallback(async () => {
    if (!isListingOnboardingDraftComplete(listingDraft)) {
      focusListingField(listingMissingField ?? "cultivar");
      toast.error("Complete cultivar, listing name, and price first.");
      return false;
    }

    setIsSavingListing(true);

    try {
      const listingId = await ensureListingDraftRecord();

      if (listingDraft.cultivarReferenceId) {
        await linkAhs({
          id: listingId,
          cultivarReferenceId: listingDraft.cultivarReferenceId,
          syncName: false,
        });
      }

      await updateListing({
        id: listingId,
        data: {
          title: listingDraft.title.trim(),
          price: listingDraft.price,
          description: listingDraft.description.trim(),
          status: ONBOARDING_LISTING_DEFAULTS.defaultStatus,
        },
      });

      let listingImageToSave: string | null =
        selectedListingImageUrl ?? selectedCultivarImageUrl ?? null;
      let listingImageKeyToSave: string | null = null;
      let uploadedListingImage: UploadedImage | null = null;
      let shouldPersistUploadedListingImage = false;

      if (pendingListingUploadBlob) {
        uploadedListingImage = await uploadImageBlob({
          blob: pendingListingUploadBlob,
          type: "listing",
          referenceId: listingId,
        });

        listingImageToSave = uploadedListingImage.url;
        listingImageKeyToSave = uploadedListingImage.key;
        shouldPersistUploadedListingImage = true;
        clearPendingListingUpload();
        setSelectedListingImageUrl(uploadedListingImage.url);
      }

      if (
        listingImageToSave &&
        uploadedListingImage &&
        shouldPersistUploadedListingImage &&
        listingImageKeyToSave
      ) {
        const createdImage = await createImageRecord({
          type: "listing",
          referenceId: listingId,
          imageId: uploadedListingImage.imageId,
          url: listingImageToSave,
          key: listingImageKeyToSave,
          r2OriginalKey: uploadedListingImage.r2OriginalKey,
        });
        if (createdImage?.id) {
          setSelectedListingImageId(createdImage.id);
        }
      }

      await invalidateListingData();

      capturePosthogEvent("onboarding_listing_saved", {
        has_price: listingDraft.price !== null,
        has_custom_image: selectedListingImageUrl !== null,
        has_cultivar_image:
          selectedListingImageUrl === null && selectedCultivarImageUrl !== null,
        cultivar_linked: listingDraft.cultivarReferenceId !== null,
      });

      return true;
    } catch (error) {
      toast.error("Failed to save listing", {
        description: getErrorMessage(error),
      });
      return false;
    } finally {
      setIsSavingListing(false);
    }
  }, [
    clearPendingListingUpload,
    createImageRecord,
    ensureListingDraftRecord,
    focusListingField,
    invalidateListingData,
    linkAhs,
    listingDraft,
    listingMissingField,
    pendingListingUploadBlob,
    selectedCultivarImageUrl,
    selectedListingImageUrl,
    setSelectedListingImageId,
    setSelectedListingImageUrl,
    updateListing,
    uploadImageBlob,
  ]);

  return {
    isSavingListing,
    isSavingProfile,
    saveListingDraft,
    saveProfileDraft,
  };
}
