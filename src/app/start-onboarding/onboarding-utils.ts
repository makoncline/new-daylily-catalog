import { STATUS } from "@/config/constants";

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
  | "description"
  | "image";

export type OnboardingStepId =
  | "build-profile-card"
  | "preview-profile-card"
  | "build-listing-card"
  | "preview-listing-card"
  | "preview-buyer-contact";

export interface OnboardingStep {
  id: OnboardingStepId;
  title: string;
  description: string;
}

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    id: "build-profile-card",
    title: "Build your catalog card",
    description:
      "Complete this card so buyers can recognize your garden and feel confident reaching out.",
  },
  {
    id: "preview-profile-card",
    title: "See it on catalogs",
    description:
      "This preview shows how customers discover your catalog while browsing.",
  },
  {
    id: "build-listing-card",
    title: "Build your first listing",
    description:
      "A clear title, price, and description help buyers decide to message you.",
  },
  {
    id: "preview-listing-card",
    title: "See your listing card",
    description:
      "This is how your listing appears when buyers compare options side by side.",
  },
  {
    id: "preview-buyer-contact",
    title: "See buyer inquiry flow",
    description:
      "Buyers can visit your catalog, add items to cart, then message you to arrange payment and shipping.",
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

export const ONBOARDING_LISTING_DEFAULTS = {
  cultivarQuery: "coffee frenzy",
  cultivarName: "Coffee Frenzy",
  fallbackCultivarQuery: "stella de oro",
  draftTitle: "My first listing",
  defaultStatus: STATUS.HIDDEN,
  fallbackImageUrl: "/assets/cultivar-grid.webp",
} as const;

export const ONBOARDING_PROFILE_DISCOVERY_EXAMPLES = [
  {
    id: "prairie-bloom",
    title: "Prairie Bloom Gardens",
    description: "Seasonal favorites and regional shipping updates weekly.",
    imageUrl: "/assets/aerial-garden.webp",
    location: "Eugene, OR",
  },
  {
    id: "willow-daylilies",
    title: "Willow Daylilies",
    description: "Collector-focused stock with curated cultivar groupings.",
    imageUrl: "/assets/hero-garden.webp",
    location: "Boise, ID",
  },
] as const;

export const ONBOARDING_LISTING_DISCOVERY_EXAMPLES = [
  {
    id: "amber-twilight",
    title: "Amber Twilight",
    description: "Dormant fan, healthy roots, spring shipping window.",
    price: 27,
    linkedLabel: "Amber Twilight",
    hybridizerYear: "Smith, 2012",
    imageUrl: "/assets/hero-garden.webp",
  },
  {
    id: "collector-mix",
    title: "Collector Mix",
    description: "Unlinked starter pack listing for local pickup events.",
    price: null,
    linkedLabel: null,
    hybridizerYear: null,
    imageUrl: "/assets/aerial-garden.webp",
  },
] as const;

export const ONBOARDING_BUYER_FLOW_BULLETS = [
  "Customers can open your catalog profile and send you an email message directly, even without adding items to cart.",
  "Priced listings can be added to cart so buyers can send one email message with exactly what they want.",
  "After inquiry, you and the buyer arrange payment and shipping directly. Daylily Catalog does not process checkout.",
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
