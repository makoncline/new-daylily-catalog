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
  | "preview-buyer-contact"
  | "start-membership";

export interface OnboardingStep {
  id: OnboardingStepId;
  title: string;
  chipLabel: string;
  description: string;
}

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    id: "build-profile-card",
    title: "Build your catalog card",
    chipLabel: "Profile",
    description:
      "Complete this card so buyers can recognize your garden and feel confident reaching out.",
  },
  {
    id: "preview-profile-card",
    title: "See it on catalogs",
    chipLabel: "Catalog preview",
    description:
      "This preview shows how customers discover your catalog while browsing.",
  },
  {
    id: "build-listing-card",
    title: "Build your first listing",
    chipLabel: "Listing",
    description:
      "A clear title, price, and description help buyers decide to message you.",
  },
  {
    id: "preview-listing-card",
    title: "See your listing card",
    chipLabel: "Listing preview",
    description:
      "This is how your listing appears when buyers compare options side by side.",
  },
  {
    id: "preview-buyer-contact",
    title: "See buyer inquiry flow",
    chipLabel: "Buyer contact",
    description:
      "Buyers can email you directly or send one message with cart details, then arrange payment and shipping with you.",
  },
  {
    id: "start-membership",
    title: "Get started",
    chipLabel: "Get started",
    description:
      "Start your free trial now, or continue for now and finish setup in your dashboard.",
  },
] as const;

export const STARTER_PROFILE_IMAGES = [
  {
    id: "dew-kissed-daylily-leaf-at-dawn",
    label: "Dew-Kissed Leaf",
    url: "/assets/onboarding-starter-images/Dew-kissed daylily leaf at dawn.png",
  },
  {
    id: "gardening-essentials-on-a-potting-bench",
    label: "Potting Bench",
    url: "/assets/onboarding-starter-images/Gardening essentials on a potting bench.png",
  },
  {
    id: "lush-green-daylily-leaves-in-morning-light",
    label: "Morning Leaves",
    url: "/assets/onboarding-starter-images/Lush green daylily leaves in morning light.png",
  },
  {
    id: "morning-serenity-along-the-garden-path",
    label: "Garden Path",
    url: "/assets/onboarding-starter-images/Morning serenity along the garden path.png",
  },
  {
    id: "serene-midday-sky-with-clouds",
    label: "Midday Sky",
    url: "/assets/onboarding-starter-images/Serene midday sky with clouds.png",
  },
  {
    id: "soft-sage-daylily-leaf-pattern",
    label: "Sage Pattern",
    url: "/assets/onboarding-starter-images/Soft sage daylily leaf pattern.png",
  },
  {
    id: "soft-watercolor-daylilies-with-white-space",
    label: "Watercolor Daylilies",
    url: "/assets/onboarding-starter-images/Soft watercolor daylilies with white space.png",
  },
  {
    id: "vibrant-daylilies-in-full-bloom",
    label: "Full Bloom",
    url: "/assets/onboarding-starter-images/Vibrant daylilies in full bloom.png",
  },
  {
    id: "vibrant-orange-daylily-in-bloom",
    label: "Orange Bloom",
    url: "/assets/onboarding-starter-images/Vibrant orange daylily in bloom.png",
  },
] as const;

export const ONBOARDING_LISTING_DEFAULTS = {
  onboardingCultivarQueries: [
    "coffee frenzy",
    "stella de oro",
    "happy returns",
    "chicago apache",
  ],
  defaultCultivarName: "Coffee Frenzy",
  limitedSearchMessage:
    "Only a limited set of varieties is available during onboarding. You can search the full Daylily Database from your dashboard.",
  draftTitle: "My first listing",
  contactPreviewFallbackPrice: 10,
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

export const ONBOARDING_PROFILE_DESCRIPTION_SEO_GUIDANCE = {
  minLength: 80,
  maxLength: 160,
  conciseTip:
    "Appears on your catalog card and in Google snippets. Mention what you grow, where you ship, and one trust detail (shipping window, plant condition, or response time).",
} as const;

export const ONBOARDING_LISTING_DESCRIPTION_GUIDANCE = {
  minLength: 70,
  maxLength: 150,
  conciseTip:
    "Buyers scan this first. Mention plant condition, quantity/size, and shipping or pickup timing.",
} as const;

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
  return draft.cultivarReferenceId !== null && hasText(draft.title);
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

  return null;
}
