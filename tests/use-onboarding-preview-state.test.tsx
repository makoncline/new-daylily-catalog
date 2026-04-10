import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useOnboardingPreviewState } from "@/app/start-onboarding/use-onboarding-preview-state";
import {
  DEFAULT_GARDEN_NAME_PLACEHOLDER,
  DEFAULT_LISTING_DESCRIPTION_PLACEHOLDER,
  DEFAULT_LISTING_TITLE_PLACEHOLDER,
  DEFAULT_LOCATION_PLACEHOLDER,
  DEFAULT_PROFILE_DESCRIPTION_PLACEHOLDER,
  ONBOARDING_LISTING_DEFAULTS,
  PROFILE_PLACEHOLDER_IMAGE,
} from "@/app/start-onboarding/onboarding-utils";

function buildArgs(
  overrides: Partial<Parameters<typeof useOnboardingPreviewState>[0]> = {},
): Parameters<typeof useOnboardingPreviewState>[0] {
  return {
    earliestExistingListing: null,
    images: [],
    isListingPending: false,
    isProfilePending: false,
    listingDraft: {
      cultivarReferenceId: null,
      title: "",
      price: null,
      description: "",
      status: null,
    },
    pendingListingUploadPreviewUrl: null,
    pendingProfileUploadPreviewUrl: null,
    pendingStarterPreviewUrl: null,
    profile: undefined,
    profileDraft: {
      gardenName: "",
      location: "",
      description: "",
      profileImageUrl: null,
    },
    savedListingId: null,
    selectedCultivarImageUrl: null,
    selectedCultivarName: null,
    selectedListingImageId: null,
    selectedListingImageUrl: null,
    selectedStarterImageUrl: null,
    ...overrides,
  };
}

describe("useOnboardingPreviewState", () => {
  it("returns placeholders and fallback previews for an empty draft", () => {
    const { result } = renderHook(() =>
      useOnboardingPreviewState(buildArgs()),
    );

    expect(result.current.profileNamePreview).toBe(
      DEFAULT_GARDEN_NAME_PLACEHOLDER,
    );
    expect(result.current.profileLocationPreview).toBe(
      DEFAULT_LOCATION_PLACEHOLDER,
    );
    expect(result.current.profileDescriptionPreview).toBe(
      DEFAULT_PROFILE_DESCRIPTION_PLACEHOLDER,
    );
    expect(result.current.profileImagePreviewUrl).toBe(
      PROFILE_PLACEHOLDER_IMAGE,
    );
    expect(result.current.listingTitlePreview).toBe(
      DEFAULT_LISTING_TITLE_PLACEHOLDER,
    );
    expect(result.current.listingDescriptionPreview).toBe(
      DEFAULT_LISTING_DESCRIPTION_PLACEHOLDER,
    );
    expect(result.current.listingImagePreviewUrl).toBe(
      ONBOARDING_LISTING_DEFAULTS.fallbackImageUrl,
    );
    expect(result.current.isProfileNamePlaceholder).toBe(true);
    expect(result.current.isListingTitlePlaceholder).toBe(true);
    expect(result.current.profileContinueChecklist[0]?.done).toBe(false);
    expect(result.current.listingContinueChecklist[0]?.done).toBe(false);
  });

  it("uses pending previews first and ignores starter images as existing profile images", () => {
    const { result } = renderHook(() =>
      useOnboardingPreviewState(
        buildArgs({
          earliestExistingListing: {
            id: "listing-1",
            title: "Coffee Frenzy",
            description: "Dormant fan",
            price: 25,
            createdAt: new Date("2025-01-02T00:00:00.000Z"),
          } as never,
          images: [
            {
              id: "profile-starter",
              url: "/assets/onboarding-starter-images/Vibrant daylilies in full bloom.png",
              createdAt: new Date("2025-01-01T00:00:00.000Z"),
              userProfileId: "profile-1",
              listingId: null,
            },
            {
              id: "listing-image",
              url: "https://example.com/listing.jpg",
              createdAt: new Date("2025-01-03T00:00:00.000Z"),
              userProfileId: null,
              listingId: "listing-1",
            },
          ] as never,
          pendingListingUploadPreviewUrl: "blob:listing-upload",
          pendingProfileUploadPreviewUrl: "blob:profile-upload",
          profile: {
            id: "profile-1",
            title: "Seeded Garden",
            description: "Seeded description",
            location: "Denver, CO",
          } as never,
          profileDraft: {
            gardenName: "Fresh Garden",
            location: "",
            description: "",
            profileImageUrl: "blob:stale",
          },
          savedListingId: "listing-1",
          selectedCultivarName: "Coffee Frenzy",
          selectedListingImageId: "listing-image",
          selectedListingImageUrl: "blob:stale-listing",
          selectedStarterImageUrl:
            "/assets/onboarding-starter-images/Vibrant daylilies in full bloom.png",
        }),
      ),
    );

    expect(result.current.existingProfileImageUrl).toBeNull();
    expect(result.current.profileImagePreviewUrl).toBe("blob:profile-upload");
    expect(result.current.listingImagePreviewUrl).toBe("blob:listing-upload");
    expect(result.current.profileNamePreview).toBe("Fresh Garden");
    expect(result.current.profileLocationPreview).toBe("Denver, CO");
    expect(result.current.listingTitlePreview).toBe("Coffee Frenzy");
    expect(result.current.listingPriceForBuyerContactPreview).toBe(25);
  });
});
