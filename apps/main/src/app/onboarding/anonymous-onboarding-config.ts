import type {
  AnonymousOnboardingDraft,
  AnonymousOnboardingStepId,
} from "./anonymous-onboarding-draft";

export interface MembershipPriceDisplay {
  amount: string;
  interval: string;
  monthlyEquivalent: string | null;
}

export interface AnonymousOnboardingPageClientProps {
  membershipPriceDisplay: MembershipPriceDisplay | null;
}

export interface ExampleCultivar {
  key: string;
  name: string;
  hybridizerYear: string;
  imageUrl: string;
}

export const PROFILE_PLACEHOLDER_IMAGE =
  "/assets/onboarding-generated/profile-placeholder.png";
export const LISTING_FALLBACK_IMAGE =
  "/assets/onboarding-generated/listing-fallback.png";
export const DEFAULT_GARDEN_NAME_PLACEHOLDER = "Your Garden Name";
export const DEFAULT_LOCATION_PLACEHOLDER = "Your City, ST";
export const DEFAULT_PROFILE_DESCRIPTION_PLACEHOLDER =
  "Daylily collector in Your City, ST offering healthy dormant fans, clearly labeled plants, and prompt replies with spring and fall shipping.";
export const DEFAULT_LISTING_DESCRIPTION_PLACEHOLDER =
  "Healthy dormant fan with strong roots, clearly labeled, and ready for spring shipping or local pickup.";

export const ANONYMOUS_ONBOARDING_STEPS: {
  id: AnonymousOnboardingStepId;
  title: string;
  chipLabel: string;
  description: string;
}[] = [
  {
    id: "email",
    title: "Start with your email",
    chipLabel: "Email",
    description: "Use the email you want for your Daylily Catalog account.",
  },
  {
    id: "profile",
    title: "Build your catalog card",
    chipLabel: "Profile",
    description:
      "Complete this card so buyers can recognize your garden and feel confident reaching out.",
  },
  {
    id: "listing",
    title: "Build your first listing",
    chipLabel: "Listing",
    description:
      "A clear title, price, and description help buyers decide to message you.",
  },
  {
    id: "preview",
    title: "Preview your catalog",
    chipLabel: "Catalog preview",
    description:
      "Preview your catalog and listing cards, then see how buyers contact you.",
  },
  {
    id: "checkout",
    title: "Get listed",
    chipLabel: "Get listed",
    description: "Start your free trial now.",
  },
];

export const EXAMPLE_CULTIVARS: ExampleCultivar[] = [
  {
    key: "coffee-frenzy",
    name: "Coffee Frenzy",
    hybridizerYear: "Reed, 2012",
    imageUrl: LISTING_FALLBACK_IMAGE,
  },
  {
    key: "stella-de-oro",
    name: "Stella de Oro",
    hybridizerYear: "Jablonski, 1975",
    imageUrl: "/assets/catalog-blooms.webp",
  },
  {
    key: "happy-returns",
    name: "Happy Returns",
    hybridizerYear: "Apps, 1991",
    imageUrl: "/assets/hero-garden.webp",
  },
];

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function getProfilePreview(draft: AnonymousOnboardingDraft) {
  return {
    title: draft.profile.gardenName.trim() || DEFAULT_GARDEN_NAME_PLACEHOLDER,
    location: draft.profile.location.trim() || DEFAULT_LOCATION_PLACEHOLDER,
    description:
      draft.profile.description.trim() ||
      DEFAULT_PROFILE_DESCRIPTION_PLACEHOLDER,
    imageUrl: draft.profile.profileImageDataUrl ?? PROFILE_PLACEHOLDER_IMAGE,
  };
}

export function getListingPreview(draft: AnonymousOnboardingDraft) {
  const selectedCultivar =
    EXAMPLE_CULTIVARS.find(
      (cultivar) => cultivar.key === draft.listingPreview.cultivarKey,
    ) ?? EXAMPLE_CULTIVARS[0]!;

  return {
    selectedCultivar,
    title: draft.listingPreview.title.trim() || selectedCultivar.name,
    description:
      draft.listingPreview.description.trim() ||
      DEFAULT_LISTING_DESCRIPTION_PLACEHOLDER,
    imageUrl: draft.listingPreview.imageDataUrl ?? selectedCultivar.imageUrl,
  };
}
