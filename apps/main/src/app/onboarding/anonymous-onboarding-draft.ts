import {
  ANONYMOUS_ONBOARDING_DRAFT_KEY,
  LEGACY_ANONYMOUS_ONBOARDING_DRAFT_KEY,
  createAnonymousOnboardingDraft,
  parseAnonymousOnboardingDraft,
  type AnonymousOnboardingDraft,
} from "@/lib/onboarding/anonymous-onboarding-draft";

export {
  ANONYMOUS_ONBOARDING_DRAFT_KEY,
  ANONYMOUS_ONBOARDING_FLOW_VERSION,
  ANONYMOUS_ONBOARDING_DRAFT_VERSION,
  DEFAULT_ANONYMOUS_ONBOARDING_LISTING,
  DEFAULT_ANONYMOUS_ONBOARDING_PROFILE,
  LEGACY_ANONYMOUS_ONBOARDING_DRAFT_KEY,
  createAnonymousOnboardingId,
  createAnonymousOnboardingDraft,
  parseAnonymousOnboardingDraft,
} from "@/lib/onboarding/anonymous-onboarding-draft";
export type {
  AnonymousOnboardingDraft,
  AnonymousOnboardingBuyerNeed,
  AnonymousOnboardingCatalogSize,
  AnonymousOnboardingCollectionItem,
  AnonymousOnboardingListingPreviewDraft,
  AnonymousOnboardingProfileDraft,
  AnonymousOnboardingStepId,
  AnonymousOnboardingWorkflow,
} from "@/lib/onboarding/anonymous-onboarding-draft";

type DraftStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

function getStorage(storage?: DraftStorage | null) {
  if (storage) return storage;
  return typeof window === "undefined" ? null : window.localStorage;
}

export function readAnonymousOnboardingDraft(
  storage?: DraftStorage | null,
): AnonymousOnboardingDraft {
  const selectedStorage = getStorage(storage);
  if (!selectedStorage) return createAnonymousOnboardingDraft();

  try {
    const rawValue = selectedStorage.getItem(ANONYMOUS_ONBOARDING_DRAFT_KEY);
    const legacyRawValue = selectedStorage.getItem(
      LEGACY_ANONYMOUS_ONBOARDING_DRAFT_KEY,
    );
    if (!rawValue && !legacyRawValue) return createAnonymousOnboardingDraft();

    const parsed = parseAnonymousOnboardingDraft(
      JSON.parse(rawValue ?? legacyRawValue!),
    );
    if (!parsed) return createAnonymousOnboardingDraft();

    if (!rawValue && legacyRawValue) {
      selectedStorage.setItem(
        ANONYMOUS_ONBOARDING_DRAFT_KEY,
        JSON.stringify(parsed),
      );
      selectedStorage.removeItem(LEGACY_ANONYMOUS_ONBOARDING_DRAFT_KEY);
    }
    return parsed;
  } catch {
    try {
      selectedStorage.removeItem(ANONYMOUS_ONBOARDING_DRAFT_KEY);
      selectedStorage.removeItem(LEGACY_ANONYMOUS_ONBOARDING_DRAFT_KEY);
    } catch {
      // Storage cleanup is best-effort; callers can still continue in memory.
    }
    return createAnonymousOnboardingDraft();
  }
}

export function writeAnonymousOnboardingDraft(
  draft: AnonymousOnboardingDraft,
  storage?: DraftStorage | null,
) {
  const selectedStorage = getStorage(storage);
  if (!selectedStorage) return false;

  try {
    selectedStorage.setItem(
      ANONYMOUS_ONBOARDING_DRAFT_KEY,
      JSON.stringify({ ...draft, updatedAt: new Date().toISOString() }),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearAnonymousOnboardingDraft(storage?: DraftStorage | null) {
  const selectedStorage = getStorage(storage);
  if (!selectedStorage) return false;

  try {
    selectedStorage.removeItem(ANONYMOUS_ONBOARDING_DRAFT_KEY);
    selectedStorage.removeItem(LEGACY_ANONYMOUS_ONBOARDING_DRAFT_KEY);
    return true;
  } catch {
    return false;
  }
}
