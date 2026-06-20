export const ANONYMOUS_ONBOARDING_DRAFT_VERSION = 1;
export const ANONYMOUS_ONBOARDING_DRAFT_KEY = "daylily:onboarding-draft:v1";
export const MAX_ONBOARDING_IMAGE_DATA_URL_LENGTH = 250_000;

export type AnonymousOnboardingStepId =
  | "email"
  | "profile"
  | "listing"
  | "preview"
  | "checkout";

export interface AnonymousOnboardingProfileDraft {
  gardenName: string;
  location: string;
  description: string;
  profileImageDataUrl: string | null;
}

export interface AnonymousOnboardingListingPreviewDraft {
  cultivarKey: string;
  title: string;
  price: number | null;
  description: string;
  imageDataUrl: string | null;
}

export interface AnonymousOnboardingDraft {
  version: typeof ANONYMOUS_ONBOARDING_DRAFT_VERSION;
  draftId: string;
  email: string | null;
  step: AnonymousOnboardingStepId;
  createdAt: string;
  updatedAt: string;
  profile: AnonymousOnboardingProfileDraft;
  listingPreview: AnonymousOnboardingListingPreviewDraft;
}

export const DEFAULT_ANONYMOUS_ONBOARDING_PROFILE: AnonymousOnboardingProfileDraft =
  {
    gardenName: "",
    location: "",
    description: "",
    profileImageDataUrl: null,
  };

export const DEFAULT_ANONYMOUS_ONBOARDING_LISTING: AnonymousOnboardingListingPreviewDraft =
  {
    cultivarKey: "coffee-frenzy",
    title: "Coffee Frenzy Spring Fan",
    price: 25,
    description:
      "Healthy dormant fan with strong roots, clearly labeled, and ready for spring shipping or local pickup.",
    imageDataUrl: null,
  };

function nowIso() {
  return new Date().toISOString();
}

export function createAnonymousOnboardingDraft(
  overrides?: Partial<AnonymousOnboardingDraft>,
): AnonymousOnboardingDraft {
  const timestamp = nowIso();
  const baseDraft: Omit<
    AnonymousOnboardingDraft,
    "profile" | "listingPreview"
  > = {
    version: ANONYMOUS_ONBOARDING_DRAFT_VERSION,
    draftId: crypto.randomUUID(),
    email: null,
    step: "email",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return {
    ...baseDraft,
    ...overrides,
    profile: {
      ...DEFAULT_ANONYMOUS_ONBOARDING_PROFILE,
      ...overrides?.profile,
    },
    listingPreview: {
      ...DEFAULT_ANONYMOUS_ONBOARDING_LISTING,
      ...overrides?.listingPreview,
    },
  };
}

function isStringRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readNullableString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readNullablePrice(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function readStep(value: unknown): AnonymousOnboardingStepId {
  switch (value) {
    case "email":
    case "profile":
    case "listing":
    case "preview":
    case "checkout":
      return value;
    default:
      return "email";
  }
}

export function parseAnonymousOnboardingDraft(
  rawDraft: unknown,
): AnonymousOnboardingDraft | null {
  if (!isStringRecord(rawDraft)) {
    return null;
  }

  if (rawDraft.version !== ANONYMOUS_ONBOARDING_DRAFT_VERSION) {
    return null;
  }

  const draftId = readString(rawDraft.draftId);
  if (!draftId) {
    return null;
  }

  const profile = isStringRecord(rawDraft.profile)
    ? rawDraft.profile
    : undefined;
  const listingPreview = isStringRecord(rawDraft.listingPreview)
    ? rawDraft.listingPreview
    : undefined;

  return createAnonymousOnboardingDraft({
    draftId,
    email: readNullableString(rawDraft.email),
    step: readStep(rawDraft.step),
    createdAt: readString(rawDraft.createdAt) || nowIso(),
    updatedAt: readString(rawDraft.updatedAt) || nowIso(),
    profile: {
      gardenName: readString(profile?.gardenName),
      location: readString(profile?.location),
      description: readString(profile?.description),
      profileImageDataUrl: readNullableString(profile?.profileImageDataUrl),
    },
    listingPreview: {
      cultivarKey:
        readString(listingPreview?.cultivarKey) ||
        DEFAULT_ANONYMOUS_ONBOARDING_LISTING.cultivarKey,
      title:
        readString(listingPreview?.title) ||
        DEFAULT_ANONYMOUS_ONBOARDING_LISTING.title,
      price: readNullablePrice(listingPreview?.price),
      description:
        readString(listingPreview?.description) ||
        DEFAULT_ANONYMOUS_ONBOARDING_LISTING.description,
      imageDataUrl: readNullableString(listingPreview?.imageDataUrl),
    },
  });
}
