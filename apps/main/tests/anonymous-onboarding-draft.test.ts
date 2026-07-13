// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  ANONYMOUS_ONBOARDING_DRAFT_KEY,
  LEGACY_ANONYMOUS_ONBOARDING_DRAFT_KEY,
  clearAnonymousOnboardingDraft,
  createAnonymousOnboardingDraft,
  parseAnonymousOnboardingDraft,
  readAnonymousOnboardingDraft,
  writeAnonymousOnboardingDraft,
} from "@/app/onboarding/anonymous-onboarding-draft";

describe("anonymous onboarding draft storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("saves and loads a versioned anonymous draft", () => {
    const draft = createAnonymousOnboardingDraft({
      draftId: "draft-1",
      email: "seller@example.com",
      profile: {
        gardenName: "Example Garden",
        location: "Denver, CO",
        description: "Example description",
        profileImageDataUrl: null,
        profileImageSource: null,
        starterImageUrl: null,
        starterImageApplyNameOverlay: true,
      },
      collection: [
        {
          cultivarReferenceId: "cr-primal",
          name: "Primal Scream",
          hybridizer: "Curt Hanson",
          year: "1994",
          imageUrl: "https://media.example/primal.webp",
          scapeHeight: '34"',
          bloomSize: '7.5"',
          bloomSeason: "Early midseason",
          form: "Unusual form",
          ploidy: "Tetraploid",
          foliageType: "Dormant",
          color: "Orange",
          fragrance: null,
          parentage: null,
          quantity: 3,
          price: 25,
          status: "for_sale",
          description: "Strong double fan",
        },
      ],
    });

    expect(writeAnonymousOnboardingDraft(draft)).toBe(true);

    const loaded = readAnonymousOnboardingDraft();
    expect(loaded).toMatchObject({
      version: 2,
      draftId: "draft-1",
      email: "seller@example.com",
      profile: {
        gardenName: "Example Garden",
        location: "Denver, CO",
        description: "Example description",
        profileImageSource: null,
      },
      collection: [
        expect.objectContaining({
          cultivarReferenceId: "cr-primal",
          name: "Primal Scream",
          quantity: 3,
          price: 25,
        }),
      ],
    });
  });

  it("drops invalid stored data and continues with a fresh draft", () => {
    window.localStorage.setItem(ANONYMOUS_ONBOARDING_DRAFT_KEY, "{bad json");

    const loaded = readAnonymousOnboardingDraft();

    expect(loaded.draftId).toMatch(/^draft-|[0-9a-f-]{36}/);
    expect(loaded.email).toBeNull();
    expect(
      window.localStorage.getItem(ANONYMOUS_ONBOARDING_DRAFT_KEY),
    ).toBeNull();
  });

  it("updates and clears the stored draft", () => {
    const updated = createAnonymousOnboardingDraft({
      email: "lead@example.com",
      step: "profile",
    });

    expect(writeAnonymousOnboardingDraft(updated)).toBe(true);
    expect(updated.email).toBe("lead@example.com");
    expect(readAnonymousOnboardingDraft()).toMatchObject({
      email: "lead@example.com",
      step: "profile",
    });

    expect(clearAnonymousOnboardingDraft()).toBe(true);
    expect(
      window.localStorage.getItem(ANONYMOUS_ONBOARDING_DRAFT_KEY),
    ).toBeNull();
  });

  it("preserves the furthest reached step in current drafts", () => {
    const parsed = parseAnonymousOnboardingDraft({
      version: 2,
      draftId: "draft-before-step-history",
      email: "seller@example.com",
      step: "buyer-preview",
      createdAt: "2026-07-09T00:00:00.000Z",
      updatedAt: "2026-07-09T00:00:00.000Z",
      profile: {},
      listingPreview: {},
    });

    expect(parsed?.furthestStep).toBe("buyer-preview");
  });

  it("keeps only the v1 garden name and restarts the new collection flow", () => {
    window.localStorage.setItem(
      LEGACY_ANONYMOUS_ONBOARDING_DRAFT_KEY,
      JSON.stringify({
        version: 1,
        draftId: "legacy-draft",
        email: "legacy@example.com",
        step: "preview",
        furthestStep: "checkout",
        createdAt: "2026-07-09T00:00:00.000Z",
        updatedAt: "2026-07-10T00:00:00.000Z",
        profile: {
          gardenName: "Legacy Garden",
          location: "Denver, CO",
          description: "Preserve me",
        },
        listingPreview: {
          cultivarKey: "cr-ahs-176320",
          title: "Legacy preview",
          price: 30,
          description: "Legacy listing preview",
        },
      }),
    );

    const migrated = readAnonymousOnboardingDraft();

    expect(migrated).toMatchObject({
      version: 2,
      flowVersion: "real_product_v2",
      draftId: "legacy-draft",
      email: "legacy@example.com",
      step: "workflow",
      furthestStep: "workflow",
      profile: {
        gardenName: "Legacy Garden",
        location: "",
        description: "",
        profileImageDataUrl: null,
      },
      listingPreview: {
        title: "Legacy preview",
        price: 30,
      },
    });
    expect(
      window.localStorage.getItem(LEGACY_ANONYMOUS_ONBOARDING_DRAFT_KEY),
    ).toBeNull();
    expect(
      window.localStorage.getItem(ANONYMOUS_ONBOARDING_DRAFT_KEY),
    ).not.toBeNull();
  });

  it("keeps the example listing title empty until the user types one", () => {
    const draft = createAnonymousOnboardingDraft();

    expect(draft.listingPreview.cultivarKey).toBe("cr-ahs-176320");
    expect(draft.listingPreview.title).toBe("");
  });

  it("normalizes the legacy generated listing title from stored drafts", () => {
    const parsed = parseAnonymousOnboardingDraft({
      version: 2,
      draftId: "draft-legacy-title",
      email: null,
      step: "listing-demo",
      createdAt: "2026-06-30T00:00:00.000Z",
      updatedAt: "2026-06-30T00:00:00.000Z",
      profile: {},
      listingPreview: {
        cultivarKey: "coffee-frenzy",
        title: "Coffee Frenzy Spring Fan",
        price: 25,
        description: "",
        imageDataUrl: null,
      },
    });

    expect(parsed?.listingPreview.cultivarKey).toBe("cr-ahs-176320");
    expect(parsed?.listingPreview.title).toBe("");
  });
});
