// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  ANONYMOUS_ONBOARDING_DRAFT_KEY,
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
      },
    });

    expect(writeAnonymousOnboardingDraft(draft)).toBe(true);

    const loaded = readAnonymousOnboardingDraft();
    expect(loaded).toMatchObject({
      version: 1,
      draftId: "draft-1",
      email: "seller@example.com",
      profile: {
        gardenName: "Example Garden",
        location: "Denver, CO",
        description: "Example description",
        profileImageSource: null,
      },
    });
  });

  it("drops invalid stored data and continues with a fresh draft", () => {
    window.localStorage.setItem(ANONYMOUS_ONBOARDING_DRAFT_KEY, "{bad json");

    const loaded = readAnonymousOnboardingDraft();

    expect(loaded.draftId).toMatch(/^draft-|[0-9a-f-]{36}/);
    expect(loaded.email).toBeNull();
    expect(window.localStorage.getItem(ANONYMOUS_ONBOARDING_DRAFT_KEY)).toBeNull();
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
    expect(window.localStorage.getItem(ANONYMOUS_ONBOARDING_DRAFT_KEY)).toBeNull();
  });

  it("preserves the furthest reached step when reading older drafts", () => {
    const parsed = parseAnonymousOnboardingDraft({
      version: 1,
      draftId: "draft-before-step-history",
      email: "seller@example.com",
      step: "preview",
      createdAt: "2026-07-09T00:00:00.000Z",
      updatedAt: "2026-07-09T00:00:00.000Z",
      profile: {},
      listingPreview: {},
    });

    expect(parsed?.furthestStep).toBe("preview");
  });

  it("keeps the example listing title empty until the user types one", () => {
    const draft = createAnonymousOnboardingDraft();

    expect(draft.listingPreview.cultivarKey).toBe("cr-ahs-176320");
    expect(draft.listingPreview.title).toBe("");
  });

  it("normalizes the legacy generated listing title from stored drafts", () => {
    const parsed = parseAnonymousOnboardingDraft({
      version: 1,
      draftId: "draft-legacy-title",
      email: null,
      step: "listing",
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
