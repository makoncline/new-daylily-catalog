import { describe, expect, it } from "vitest";
import {
  filterOnboardingSearchDemoListings,
  getNextIncompleteListingField,
  getNextIncompleteProfileField,
  isListingOnboardingDraftComplete,
  isProfileOnboardingDraftComplete,
  ONBOARDING_SEARCH_DEMO_LISTINGS,
} from "@/app/start-onboarding/onboarding-utils";

describe("start onboarding utils", () => {
  it("tracks profile draft completeness and next incomplete field", () => {
    const emptyDraft = {
      profileImageUrl: null,
      gardenName: "",
      location: "",
      description: "",
    };

    expect(isProfileOnboardingDraftComplete(emptyDraft)).toBe(false);
    expect(getNextIncompleteProfileField(emptyDraft)).toBe("gardenName");

    const withName = { ...emptyDraft, gardenName: "Sunrise Daylily Farm" };
    expect(getNextIncompleteProfileField(withName)).toBe("image");

    const withImage = { ...withName, profileImageUrl: "/assets/bouquet.png" };
    expect(getNextIncompleteProfileField(withImage)).toBe("description");

    const completeDraft = {
      ...withImage,
      description: "Family-grown daylilies with seasonal shipping updates.",
    };
    expect(isProfileOnboardingDraftComplete(completeDraft)).toBe(true);
    expect(getNextIncompleteProfileField(completeDraft)).toBeNull();
  });

  it("tracks listing draft completeness and next incomplete field", () => {
    const emptyDraft = {
      cultivarReferenceId: null,
      title: "",
      price: null,
      description: "",
    };

    expect(isListingOnboardingDraftComplete(emptyDraft)).toBe(false);
    expect(getNextIncompleteListingField(emptyDraft)).toBe("cultivar");

    const withCultivar = {
      ...emptyDraft,
      cultivarReferenceId: "cultivar-ref-1",
    };
    expect(getNextIncompleteListingField(withCultivar)).toBe("title");

    const withTitle = { ...withCultivar, title: "Moonlit Petals division" };
    expect(getNextIncompleteListingField(withTitle)).toBe("price");

    const withPrice = { ...withTitle, price: 25 };
    expect(getNextIncompleteListingField(withPrice)).toBe("description");

    const completeDraft = {
      ...withPrice,
      description: "Fresh fan with healthy roots and spring shipping.",
    };
    expect(isListingOnboardingDraftComplete(completeDraft)).toBe(true);
    expect(getNextIncompleteListingField(completeDraft)).toBeNull();
  });

  it("filters onboarding search listings with combined criteria", () => {
    const filtered = filterOnboardingSearchDemoListings(
      ONBOARDING_SEARCH_DEMO_LISTINGS,
      {
        query: "amber",
        forSaleOnly: true,
        maxPrice: 20,
        linkedOnly: true,
      },
    );

    expect(filtered).toEqual([
      expect.objectContaining({
        id: "sample-2",
        title: "Summer Amber",
      }),
    ]);
  });

  it("drops unpriced listings when max price filter is set", () => {
    const filtered = filterOnboardingSearchDemoListings(
      ONBOARDING_SEARCH_DEMO_LISTINGS,
      {
        query: "",
        forSaleOnly: false,
        maxPrice: 30,
        linkedOnly: false,
      },
    );

    expect(filtered.every((listing) => listing.price !== null)).toBe(true);
  });
});
