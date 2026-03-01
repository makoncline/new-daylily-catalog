import { describe, expect, it } from "vitest";
import { STATUS } from "@/config/constants";
import {
  getNextIncompleteListingField,
  getNextIncompleteProfileField,
  isListingOnboardingDraftComplete,
  isProfileOnboardingDraftComplete,
  ONBOARDING_STEPS,
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
      status: STATUS.HIDDEN,
    };

    expect(isListingOnboardingDraftComplete(emptyDraft)).toBe(false);
    expect(getNextIncompleteListingField(emptyDraft)).toBe("cultivar");

    const withCultivar = {
      ...emptyDraft,
      cultivarReferenceId: "cultivar-ref-1",
    };
    expect(getNextIncompleteListingField(withCultivar)).toBe("title");

    const withTitle = { ...withCultivar, title: "Moonlit Petals division" };
    expect(getNextIncompleteListingField(withTitle)).toBeNull();

    const completeDraft = { ...withTitle };
    expect(isListingOnboardingDraftComplete(completeDraft)).toBe(true);
    expect(getNextIncompleteListingField(completeDraft)).toBeNull();
  });

  it("keeps onboarding steps in the intended sequence", () => {
    expect(ONBOARDING_STEPS.map((step) => step.id)).toEqual([
      "build-profile-card",
      "preview-profile-card",
      "build-listing-card",
      "preview-listing-card",
      "preview-buyer-contact",
      "start-membership",
    ]);
  });
});
