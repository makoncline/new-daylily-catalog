export interface ProfileOnboardingDraft {
  gardenName: string;
  location: string;
  description: string;
  profileImageUrl: string | null;
}

export interface ListingOnboardingDraft {
  cultivarReferenceId: string | null;
  title: string;
  price: number | null;
  description: string;
}

export type ProfileOnboardingField =
  | "image"
  | "gardenName"
  | "location"
  | "description";

export type ListingOnboardingField =
  | "cultivar"
  | "title"
  | "price"
  | "description";

export type OnboardingStepId =
  | "build-profile-card"
  | "preview-profile-card"
  | "build-listing-card"
  | "preview-listing-card"
  | "preview-cultivar-page"
  | "search-and-filter-demo";

export interface OnboardingStep {
  id: OnboardingStepId;
  title: string;
  description: string;
}

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    id: "build-profile-card",
    title: "Build your catalog card",
    description: "Add your garden name, location, image, and description.",
  },
  {
    id: "preview-profile-card",
    title: "See it on catalogs",
    description: "Preview how buyers discover your profile.",
  },
  {
    id: "build-listing-card",
    title: "Build your first listing",
    description: "Link a cultivar, set your title, price, and details.",
  },
  {
    id: "preview-listing-card",
    title: "See your listing card",
    description: "Review the finished listing presentation.",
  },
  {
    id: "preview-cultivar-page",
    title: "See buyer paths",
    description: "Preview profile + listing actions on cultivar pages.",
  },
  {
    id: "search-and-filter-demo",
    title: "Search and filter demo",
    description: "See basic and advanced search working together.",
  },
] as const;

export const STARTER_PROFILE_IMAGES = [
  {
    id: "bouquet",
    label: "Bouquet",
    url: "/assets/onboarding-starter-images/bouquet.png",
  },
  {
    id: "winding-path-garden",
    label: "Winding Path",
    url: "/assets/onboarding-starter-images/winding-path.png",
  },
] as const;

export interface OnboardingSearchDemoListing {
  id: string;
  title: string;
  description: string;
  price: number | null;
  hasCultivarLink: boolean;
}

export interface OnboardingSearchDemoFilters {
  query: string;
  forSaleOnly: boolean;
  maxPrice: number | null;
  linkedOnly: boolean;
}

export const ONBOARDING_SEARCH_DEMO_LISTINGS: readonly OnboardingSearchDemoListing[] =
  [
    {
      id: "sample-1",
      title: "Moonlit Petals",
      description: "Creamy yellow bloom with a soft ruffled edge.",
      price: 22,
      hasCultivarLink: true,
    },
    {
      id: "sample-2",
      title: "Summer Amber",
      description: "Reliable rebloomer with warm amber tones.",
      price: 18,
      hasCultivarLink: true,
    },
    {
      id: "sample-3",
      title: "Garden Companion",
      description: "A bundle listing for new collectors.",
      price: null,
      hasCultivarLink: false,
    },
  ] as const;

function hasText(value: string) {
  return value.trim().length > 0;
}

export function isProfileOnboardingDraftComplete(
  draft: ProfileOnboardingDraft,
) {
  return (
    draft.profileImageUrl !== null &&
    hasText(draft.gardenName) &&
    hasText(draft.description)
  );
}

export function isListingOnboardingDraftComplete(
  draft: ListingOnboardingDraft,
) {
  return (
    draft.cultivarReferenceId !== null &&
    hasText(draft.title) &&
    draft.price !== null &&
    hasText(draft.description)
  );
}

export function getNextIncompleteProfileField(
  draft: ProfileOnboardingDraft,
): ProfileOnboardingField | null {
  if (!hasText(draft.gardenName)) {
    return "gardenName";
  }

  if (draft.profileImageUrl === null) {
    return "image";
  }

  if (!hasText(draft.description)) {
    return "description";
  }

  return null;
}

export function getNextIncompleteListingField(
  draft: ListingOnboardingDraft,
): ListingOnboardingField | null {
  if (draft.cultivarReferenceId === null) {
    return "cultivar";
  }

  if (!hasText(draft.title)) {
    return "title";
  }

  if (draft.price === null) {
    return "price";
  }

  if (!hasText(draft.description)) {
    return "description";
  }

  return null;
}

export function filterOnboardingSearchDemoListings(
  listings: readonly OnboardingSearchDemoListing[],
  filters: OnboardingSearchDemoFilters,
) {
  const normalizedQuery = filters.query.trim().toLowerCase();

  return listings.filter((listing) => {
    if (
      normalizedQuery &&
      !`${listing.title} ${listing.description}`
        .toLowerCase()
        .includes(normalizedQuery)
    ) {
      return false;
    }

    if (filters.forSaleOnly && listing.price === null) {
      return false;
    }

    if (
      filters.maxPrice !== null &&
      listing.price !== null &&
      listing.price > filters.maxPrice
    ) {
      return false;
    }

    if (filters.maxPrice !== null && listing.price === null) {
      return false;
    }

    if (filters.linkedOnly && !listing.hasCultivarLink) {
      return false;
    }

    return true;
  });
}
