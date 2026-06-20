// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  ANONYMOUS_ONBOARDING_DRAFT_KEY,
  clearAnonymousOnboardingDraft,
  createAnonymousOnboardingDraft,
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
});
