export const ANONYMOUS_ONBOARDING_DRAFT_VERSION = 2;
export const ANONYMOUS_ONBOARDING_FLOW_VERSION = "real_product_v2" as const;
export const ANONYMOUS_ONBOARDING_DRAFT_KEY = "daylily:onboarding-draft:v2";
export const LEGACY_ANONYMOUS_ONBOARDING_DRAFT_KEY =
  "daylily:onboarding-draft:v1";
export const MAX_ONBOARDING_IMAGE_DATA_URL_LENGTH = 250_000;

export function createAnonymousOnboardingId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `onboarding-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

export type AnonymousOnboardingStepId =
  | "workflow"
  | "catalog-size"
  | "buyer-need"
  | "problem"
  | "search-tour"
  | "proof"
  | "personalize"
  | "email"
  | "profile"
  | "listing-demo"
  | "buyer-preview"
  | "checkout";

export type AnonymousOnboardingWorkflow =
  | "facebook"
  | "document"
  | "website"
  | "direct"
  | "exploring";

export type AnonymousOnboardingCatalogSize =
  | "under_25"
  | "25_99"
  | "100_499"
  | "500_plus"
  | "unknown";

export type AnonymousOnboardingBuyerNeed =
  | "current_availability"
  | "find_cultivar"
  | "narrow_traits"
  | "compare_and_contact"
  | "unknown";

export interface AnonymousOnboardingProfileDraft {
  gardenName: string;
  location: string;
  description: string;
  profileImageDataUrl: string | null;
  profileImageSource: "starter" | "upload" | null;
  starterImageUrl: string | null;
  starterImageApplyNameOverlay: boolean;
}

export interface AnonymousOnboardingListingPreviewDraft {
  cultivarKey: string;
  title: string;
  price: number | null;
  description: string;
  imageDataUrl: string | null;
  status: "for_sale" | "display_only";
  hasPhoto: boolean;
}

export interface AnonymousOnboardingCollectionItem {
  cultivarReferenceId: string;
  name: string;
  hybridizer: string | null;
  year: string | null;
  imageUrl: string | null;
  scapeHeight: string | null;
  bloomSize: string | null;
  bloomSeason: string | null;
  form: string | null;
  ploidy: string | null;
  foliageType: string | null;
  color: string | null;
  fragrance: string | null;
  parentage: string | null;
  quantity: number | null;
  price: number | null;
  status: "for_sale" | "display_only";
  description: string;
}

export interface AnonymousOnboardingDraft {
  version: typeof ANONYMOUS_ONBOARDING_DRAFT_VERSION;
  flowVersion: typeof ANONYMOUS_ONBOARDING_FLOW_VERSION;
  draftId: string;
  email: string | null;
  step: AnonymousOnboardingStepId;
  furthestStep: AnonymousOnboardingStepId;
  createdAt: string;
  updatedAt: string;
  workflow: AnonymousOnboardingWorkflow | null;
  catalogSize: AnonymousOnboardingCatalogSize | null;
  buyerNeed: AnonymousOnboardingBuyerNeed | null;
  collection: AnonymousOnboardingCollectionItem[];
  searchTour: {
    usedBasic: boolean;
    usedAdvanced: boolean;
    advancedSkipped: boolean;
    completedAt: string | null;
  };
  proof: {
    viewedCatalogExample: boolean;
    viewedListingExample: boolean;
  };
  ahaReachedAt: string | null;
  profile: AnonymousOnboardingProfileDraft;
  listingPreview: AnonymousOnboardingListingPreviewDraft;
}

type AnonymousOnboardingDraftOverrides = Omit<
  Partial<AnonymousOnboardingDraft>,
  "profile" | "listingPreview" | "searchTour" | "proof" | "collection"
> & {
  profile?: Partial<AnonymousOnboardingProfileDraft>;
  listingPreview?: Partial<AnonymousOnboardingListingPreviewDraft>;
  searchTour?: Partial<AnonymousOnboardingDraft["searchTour"]>;
  proof?: Partial<AnonymousOnboardingDraft["proof"]>;
  collection?: AnonymousOnboardingCollectionItem[];
};

export const DEFAULT_ANONYMOUS_ONBOARDING_PROFILE: AnonymousOnboardingProfileDraft =
  {
    gardenName: "",
    location: "",
    description: "",
    profileImageDataUrl: null,
    profileImageSource: null,
    starterImageUrl: null,
    starterImageApplyNameOverlay: true,
  };

const DEFAULT_ANONYMOUS_ONBOARDING_CULTIVAR_KEY = "cr-ahs-176320";

export const DEFAULT_ANONYMOUS_ONBOARDING_LISTING: AnonymousOnboardingListingPreviewDraft =
  {
    cultivarKey: DEFAULT_ANONYMOUS_ONBOARDING_CULTIVAR_KEY,
    title: "",
    price: null,
    description: "",
    imageDataUrl: null,
    status: "for_sale",
    hasPhoto: true,
  };

const LEGACY_DEFAULT_CULTIVAR_KEY = "coffee-frenzy";
const LEGACY_GENERATED_LISTING_TITLE = "Coffee Frenzy Spring Fan";

function nowIso() {
  return new Date().toISOString();
}

export function createAnonymousOnboardingDraft(
  overrides?: AnonymousOnboardingDraftOverrides,
): AnonymousOnboardingDraft {
  const timestamp = nowIso();
  const {
    profile: profileOverrides,
    listingPreview: listingOverrides,
    searchTour: searchTourOverrides,
    proof: proofOverrides,
    collection: collectionOverrides,
    ...rootOverrides
  } = overrides ?? {};
  return {
    version: ANONYMOUS_ONBOARDING_DRAFT_VERSION,
    flowVersion: ANONYMOUS_ONBOARDING_FLOW_VERSION,
    draftId: createAnonymousOnboardingId(),
    email: null,
    step: "workflow",
    furthestStep: overrides?.step ?? "workflow",
    createdAt: timestamp,
    updatedAt: timestamp,
    workflow: null,
    catalogSize: null,
    buyerNeed: null,
    collection: collectionOverrides ?? [],
    ahaReachedAt: null,
    ...rootOverrides,
    profile: {
      ...DEFAULT_ANONYMOUS_ONBOARDING_PROFILE,
      ...profileOverrides,
    },
    listingPreview: {
      ...DEFAULT_ANONYMOUS_ONBOARDING_LISTING,
      ...listingOverrides,
    },
    searchTour: {
      usedBasic: false,
      usedAdvanced: false,
      advancedSkipped: false,
      completedAt: null,
      ...searchTourOverrides,
    },
    proof: {
      viewedCatalogExample: false,
      viewedListingExample: false,
      ...proofOverrides,
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

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function readProfileImageSource(value: unknown) {
  return value === "starter" || value === "upload" ? value : null;
}

function readNullablePrice(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function readNullableCount(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

function readCollection(value: unknown): AnonymousOnboardingCollectionItem[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 12).flatMap((candidate) => {
    if (!isStringRecord(candidate)) return [];
    const cultivarReferenceId = readString(candidate.cultivarReferenceId);
    const name = readString(candidate.name);
    if (!cultivarReferenceId || !name) return [];

    return [
      {
        cultivarReferenceId,
        name,
        hybridizer: readNullableString(candidate.hybridizer),
        year: readNullableString(candidate.year),
        imageUrl: readNullableString(candidate.imageUrl),
        scapeHeight: readNullableString(candidate.scapeHeight),
        bloomSize: readNullableString(candidate.bloomSize),
        bloomSeason: readNullableString(candidate.bloomSeason),
        form: readNullableString(candidate.form),
        ploidy: readNullableString(candidate.ploidy),
        foliageType: readNullableString(candidate.foliageType),
        color: readNullableString(candidate.color),
        fragrance: readNullableString(candidate.fragrance),
        parentage: readNullableString(candidate.parentage),
        quantity: readNullableCount(candidate.quantity),
        price: readNullablePrice(candidate.price),
        status:
          candidate.status === "display_only" ? "display_only" : "for_sale",
        description: readString(candidate.description),
      },
    ];
  });
}

function readListingTitle(value: unknown) {
  const title = readString(value);
  return title === LEGACY_GENERATED_LISTING_TITLE ? "" : title;
}

function readListingCultivarKey(value: unknown) {
  const cultivarKey = readString(value);
  return !cultivarKey || cultivarKey === LEGACY_DEFAULT_CULTIVAR_KEY
    ? DEFAULT_ANONYMOUS_ONBOARDING_LISTING.cultivarKey
    : cultivarKey;
}

const ONBOARDING_STEPS: AnonymousOnboardingStepId[] = [
  "workflow",
  "catalog-size",
  "buyer-need",
  "problem",
  "search-tour",
  "proof",
  "personalize",
  "email",
  "profile",
  "listing-demo",
  "buyer-preview",
  "checkout",
];

function readStep(value: unknown): AnonymousOnboardingStepId {
  return ONBOARDING_STEPS.includes(value as AnonymousOnboardingStepId)
    ? (value as AnonymousOnboardingStepId)
    : "workflow";
}

function readWorkflow(value: unknown): AnonymousOnboardingWorkflow | null {
  return ["facebook", "document", "website", "direct", "exploring"].includes(
    value as string,
  )
    ? (value as AnonymousOnboardingWorkflow)
    : null;
}

function readCatalogSize(
  value: unknown,
): AnonymousOnboardingCatalogSize | null {
  return ["under_25", "25_99", "100_499", "500_plus", "unknown"].includes(
    value as string,
  )
    ? (value as AnonymousOnboardingCatalogSize)
    : null;
}

function readBuyerNeed(value: unknown): AnonymousOnboardingBuyerNeed | null {
  return [
    "current_availability",
    "find_cultivar",
    "narrow_traits",
    "compare_and_contact",
    "unknown",
  ].includes(value as string)
    ? (value as AnonymousOnboardingBuyerNeed)
    : null;
}

function parseCurrentDraft(rawDraft: Record<string, unknown>) {
  const profile = isStringRecord(rawDraft.profile) ? rawDraft.profile : {};
  const listing = isStringRecord(rawDraft.listingPreview)
    ? rawDraft.listingPreview
    : {};
  const searchTour = isStringRecord(rawDraft.searchTour)
    ? rawDraft.searchTour
    : {};
  const proof = isStringRecord(rawDraft.proof) ? rawDraft.proof : {};
  const draftId = readString(rawDraft.draftId);
  if (!draftId) return null;

  return createAnonymousOnboardingDraft({
    draftId,
    email: readNullableString(rawDraft.email),
    step: readStep(rawDraft.step),
    furthestStep: readStep(rawDraft.furthestStep ?? rawDraft.step),
    createdAt: readString(rawDraft.createdAt) || nowIso(),
    updatedAt: readString(rawDraft.updatedAt) || nowIso(),
    workflow: readWorkflow(rawDraft.workflow),
    catalogSize: readCatalogSize(rawDraft.catalogSize),
    buyerNeed: readBuyerNeed(rawDraft.buyerNeed),
    collection: readCollection(rawDraft.collection),
    searchTour: {
      usedBasic: readBoolean(searchTour.usedBasic, false),
      usedAdvanced: readBoolean(searchTour.usedAdvanced, false),
      advancedSkipped: readBoolean(searchTour.advancedSkipped, false),
      completedAt: readNullableString(searchTour.completedAt),
    },
    proof: {
      viewedCatalogExample: readBoolean(proof.viewedCatalogExample, false),
      viewedListingExample: readBoolean(proof.viewedListingExample, false),
    },
    ahaReachedAt: readNullableString(rawDraft.ahaReachedAt),
    profile: {
      gardenName: readString(profile.gardenName),
      location: readString(profile.location),
      description: readString(profile.description),
      profileImageDataUrl: readNullableString(profile.profileImageDataUrl),
      profileImageSource: readProfileImageSource(profile.profileImageSource),
      starterImageUrl: readNullableString(profile.starterImageUrl),
      starterImageApplyNameOverlay: readBoolean(
        profile.starterImageApplyNameOverlay,
        true,
      ),
    },
    listingPreview: {
      cultivarKey: readListingCultivarKey(listing.cultivarKey),
      title: readListingTitle(listing.title),
      price: readNullablePrice(listing.price),
      description: readString(listing.description),
      imageDataUrl: readNullableString(listing.imageDataUrl),
      status: listing.status === "display_only" ? "display_only" : "for_sale",
      hasPhoto: readBoolean(listing.hasPhoto, true),
    },
  });
}

function migrateLegacyDraft(rawDraft: Record<string, unknown>) {
  const draftId = readString(rawDraft.draftId);
  if (!draftId) return null;
  const profile = isStringRecord(rawDraft.profile) ? rawDraft.profile : {};
  const listing = isStringRecord(rawDraft.listingPreview)
    ? rawDraft.listingPreview
    : {};
  const email = readNullableString(rawDraft.email);

  return createAnonymousOnboardingDraft({
    draftId,
    email,
    step: "workflow",
    furthestStep: "workflow",
    createdAt: readString(rawDraft.createdAt) || nowIso(),
    updatedAt: readString(rawDraft.updatedAt) || nowIso(),
    profile: {
      gardenName: readString(profile.gardenName),
      location: "",
      description: "",
      profileImageDataUrl: null,
      profileImageSource: null,
      starterImageUrl: null,
      starterImageApplyNameOverlay: true,
    },
    listingPreview: {
      cultivarKey: readListingCultivarKey(listing.cultivarKey),
      title: readListingTitle(listing.title),
      price: readNullablePrice(listing.price),
      description: readString(listing.description),
      imageDataUrl: readNullableString(listing.imageDataUrl),
      status: "for_sale",
      hasPhoto: Boolean(readNullableString(listing.imageDataUrl)),
    },
  });
}

export function parseAnonymousOnboardingDraft(
  rawDraft: unknown,
): AnonymousOnboardingDraft | null {
  if (!isStringRecord(rawDraft)) return null;
  if (rawDraft.version === ANONYMOUS_ONBOARDING_DRAFT_VERSION) {
    return parseCurrentDraft(rawDraft);
  }
  if (rawDraft.version === 1) {
    return migrateLegacyDraft(rawDraft);
  }
  return null;
}
