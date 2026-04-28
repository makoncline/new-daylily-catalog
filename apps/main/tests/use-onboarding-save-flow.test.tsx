import { act, renderHook, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useOnboardingSaveFlow } from "@/app/start-onboarding/use-onboarding-save-flow";
import {
  ONBOARDING_LISTING_DEFAULTS,
  type ListingOnboardingDraft,
  type ProfileOnboardingDraft,
} from "@/app/start-onboarding/onboarding-utils";

const capturePosthogEventMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/analytics/posthog", () => ({
  capturePosthogEvent: capturePosthogEventMock,
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorMock,
  },
}));

interface RenderSaveFlowOptions
  extends Partial<Parameters<typeof useOnboardingSaveFlow>[0]> {
  initialListingDraft?: ListingOnboardingDraft;
  initialProfileDraft?: ProfileOnboardingDraft;
}

function renderSaveFlow({
  initialListingDraft = {
    cultivarReferenceId: "cultivar-1",
    title: "Coffee Frenzy fan",
    price: 18,
    description: "Healthy dormant fan",
    status: ONBOARDING_LISTING_DEFAULTS.defaultStatus,
  },
  initialProfileDraft = {
    gardenName: "Mesa Daylilies",
    location: "Denver, CO",
    description: "Ships healthy dormant fans.",
    profileImageUrl: "https://example.com/profile.jpg",
  },
  ...overrides
}: RenderSaveFlowOptions = {}) {
  return renderHook(() => {
    const [profileDraft, setProfileDraft] =
      useState<ProfileOnboardingDraft>(initialProfileDraft);
    const [selectedListingImageId, setSelectedListingImageId] = useState<
      string | null
    >(null);
    const [selectedListingImageUrl, setSelectedListingImageUrl] = useState<
      string | null
    >(null);

    const saveFlow = useOnboardingSaveFlow({
      applyStarterNameOverlay: true,
      clearPendingListingUpload: vi.fn(),
      clearPendingProfileUpload: vi.fn(),
      clearPendingStarterImage: vi.fn(),
      createImageRecord: vi.fn().mockResolvedValue(undefined),
      defaultStarterImageUrl: "/starter.jpg",
      earliestPersistedListingImageId: null,
      earliestPersistedProfileImageId: null,
      ensureListingDraftRecord: vi.fn().mockResolvedValue("listing-1"),
      fetchImageBlobFromUrl: vi.fn(),
      focusListingField: vi.fn(),
      focusProfileField: vi.fn(),
      invalidateListingData: vi.fn().mockResolvedValue(undefined),
      invalidateProfileData: vi.fn().mockResolvedValue(undefined),
      linkAhs: vi.fn().mockResolvedValue(undefined),
      listingDraft: initialListingDraft,
      listingMissingField: null,
      pendingListingUploadBlob: null,
      pendingProfileUploadBlob: null,
      pendingStarterImageBlob: null,
      profileDraft,
      profileId: "profile-1",
      profileImageInputMode: "upload",
      profileMissingField: null,
      selectedCultivarImageUrl: "https://example.com/cultivar.jpg",
      selectedListingImageUrl,
      selectedStarterImageUrl: "/starter.jpg",
      setProfileDraft,
      setSelectedListingImageId,
      setSelectedListingImageUrl,
      updateImageRecord: vi.fn().mockResolvedValue({ id: "updated-image-1" }),
      updateListing: vi.fn().mockResolvedValue(undefined),
      updateProfile: vi.fn().mockResolvedValue(undefined),
      uploadImageBlob: vi.fn().mockResolvedValue({
        key: "upload-key",
        url: "https://example.com/uploaded.jpg",
      }),
      useExistingProfileImage: false,
      ...overrides,
    });

    return {
      ...saveFlow,
      profileDraft,
      selectedListingImageId,
      selectedListingImageUrl,
    };
  });
}

describe("useOnboardingSaveFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks incomplete profile saves and focuses the missing field", async () => {
    const focusProfileField = vi.fn();
    const updateProfile = vi.fn();
    const { result } = renderSaveFlow({
      focusProfileField,
      initialProfileDraft: {
        gardenName: "",
        location: "",
        description: "",
        profileImageUrl: null,
      },
      profileMissingField: "gardenName",
      updateProfile,
    });

    await act(async () => {
      await expect(result.current.saveProfileDraft()).resolves.toBe(false);
    });

    expect(focusProfileField).toHaveBeenCalledWith("gardenName");
    expect(updateProfile).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith(
      "Complete image and seller name first.",
    );
  });

  it("saves a profile upload and persists the image record", async () => {
    const clearPendingProfileUpload = vi.fn();
    const createImageRecord = vi.fn().mockResolvedValue(undefined);
    const invalidateProfileData = vi.fn().mockResolvedValue(undefined);
    const updateProfile = vi.fn().mockResolvedValue(undefined);
    const uploadImageBlob = vi.fn().mockResolvedValue({
      key: "profile-key",
      url: "https://example.com/profile-uploaded.jpg",
    });

    const { result } = renderSaveFlow({
      clearPendingProfileUpload,
      createImageRecord,
      invalidateProfileData,
      pendingProfileUploadBlob: new Blob(["profile"], { type: "image/jpeg" }),
      profileImageInputMode: "upload",
      updateProfile,
      uploadImageBlob,
    });

    await act(async () => {
      await expect(result.current.saveProfileDraft()).resolves.toBe(true);
    });

    await waitFor(() => {
      expect(result.current.profileDraft.profileImageUrl).toBe(
        "https://example.com/profile-uploaded.jpg",
      );
    });

    const uploadArgs = uploadImageBlob.mock.calls[0]?.[0] as
      | {
          blob: Blob;
          referenceId: string;
          type: "listing" | "profile";
        }
      | undefined;

    expect(uploadArgs?.blob).toBeInstanceOf(Blob);
    expect(uploadArgs?.referenceId).toBe("profile-1");
    expect(uploadArgs?.type).toBe("profile");
    expect(clearPendingProfileUpload).toHaveBeenCalledTimes(1);
    expect(updateProfile).toHaveBeenCalledWith({
      data: {
        description: "Ships healthy dormant fans.",
        location: "Denver, CO",
        title: "Mesa Daylilies",
      },
    });
    expect(createImageRecord).toHaveBeenCalledWith({
      key: "profile-key",
      referenceId: "profile-1",
      type: "profile",
      url: "https://example.com/profile-uploaded.jpg",
    });
    expect(invalidateProfileData).toHaveBeenCalledTimes(1);
    expect(capturePosthogEventMock).toHaveBeenCalledWith(
      "onboarding_profile_saved",
      expect.objectContaining({
        used_starter_image: false,
      }),
    );
  });

  it("saves a listing upload, links the cultivar, and records the image id", async () => {
    const createImageRecord = vi.fn().mockResolvedValue({ id: "image-1" });
    const ensureListingDraftRecord = vi.fn().mockResolvedValue("listing-1");
    const invalidateListingData = vi.fn().mockResolvedValue(undefined);
    const linkAhs = vi.fn().mockResolvedValue(undefined);
    const updateListing = vi.fn().mockResolvedValue(undefined);
    const uploadImageBlob = vi.fn().mockResolvedValue({
      key: "listing-key",
      url: "https://example.com/listing-uploaded.jpg",
    });

    const { result } = renderSaveFlow({
      createImageRecord,
      ensureListingDraftRecord,
      invalidateListingData,
      linkAhs,
      pendingListingUploadBlob: new Blob(["listing"], { type: "image/jpeg" }),
      updateListing,
      uploadImageBlob,
    });

    await act(async () => {
      await expect(result.current.saveListingDraft()).resolves.toBe(true);
    });

    await waitFor(() => {
      expect(result.current.selectedListingImageId).toBe("image-1");
    });

    expect(ensureListingDraftRecord).toHaveBeenCalledTimes(1);
    expect(linkAhs).toHaveBeenCalledWith({
      cultivarReferenceId: "cultivar-1",
      id: "listing-1",
      syncName: false,
    });
    expect(updateListing).toHaveBeenCalledWith({
      data: {
        description: "Healthy dormant fan",
        price: 18,
        status: ONBOARDING_LISTING_DEFAULTS.defaultStatus,
        title: "Coffee Frenzy fan",
      },
      id: "listing-1",
    });
    expect(createImageRecord).toHaveBeenCalledWith({
      key: "listing-key",
      referenceId: "listing-1",
      type: "listing",
      url: "https://example.com/listing-uploaded.jpg",
    });
    expect(result.current.selectedListingImageUrl).toBe(
      "https://example.com/listing-uploaded.jpg",
    );
    expect(invalidateListingData).toHaveBeenCalledTimes(1);
    expect(capturePosthogEventMock).toHaveBeenCalledWith(
      "onboarding_listing_saved",
      expect.objectContaining({
        has_custom_image: false,
      }),
    );
  });
});
