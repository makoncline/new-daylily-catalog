import type { OptimizedImageSource } from "@/components/optimized-image";
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
  membershipPriceDisplay: MembershipPriceDisplay;
  exampleCultivars: ExampleCultivar[];
}

export interface ExampleCultivar {
  key: string;
  name: string;
  hybridizerYear: string;
  imageUrl: string;
  imageAsset?: OptimizedImageSource["imageAsset"];
}

export interface StarterProfileImage {
  id: string;
  label: string;
  url: string;
}

export const STARTER_PROFILE_IMAGES: StarterProfileImage[] = [
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
];

export const LISTING_FALLBACK_IMAGE =
  "/assets/onboarding-generated/listing-fallback.png";
export const DEFAULT_GARDEN_NAME_PLACEHOLDER = "Your Garden Name";
export const DEFAULT_LOCATION_PLACEHOLDER = "Your City, ST";
export const DEFAULT_PROFILE_DESCRIPTION_PLACEHOLDER =
  "Daylily collector in Your City, ST offering healthy dormant fans, clearly labeled plants, and prompt replies with spring and fall shipping.";
export const DEFAULT_LISTING_DESCRIPTION_PLACEHOLDER =
  "Healthy dormant fan with strong roots, clearly labeled, and ready for spring shipping or local pickup.";
export const DEFAULT_LISTING_PRICE_PLACEHOLDER = 25;

export function getListingTitlePlaceholder(cultivarName: string) {
  return `${cultivarName} Spring Fan`;
}

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
    title: "Start your trial",
    chipLabel: "Start trial",
    description: "Start your free trial and open your dashboard.",
  },
];

export const ONBOARDING_EXAMPLE_CULTIVAR_REFERENCE_IDS = [
  "cr-ahs-176320",
  "cr-ahs-170157",
  "cr-ahs-8527",
] as const;

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
    imageUrl: draft.profile.profileImageDataUrl,
  };
}

export function getListingPreview(
  draft: AnonymousOnboardingDraft,
  exampleCultivars: ExampleCultivar[],
) {
  if (exampleCultivars.length === 0) {
    throw new Error("Onboarding example cultivars are not configured.");
  }

  const selectedCultivar =
    exampleCultivars.find(
      (cultivar) => cultivar.key === draft.listingPreview.cultivarKey,
    ) ?? exampleCultivars[0]!;
  const titlePlaceholder = getListingTitlePlaceholder(selectedCultivar.name);

  return {
    selectedCultivar,
    title: draft.listingPreview.title.trim() || titlePlaceholder,
    titlePlaceholder,
    price:
      draft.listingPreview.price ?? DEFAULT_LISTING_PRICE_PLACEHOLDER,
    description:
      draft.listingPreview.description.trim() ||
      DEFAULT_LISTING_DESCRIPTION_PLACEHOLDER,
    imageUrl: draft.listingPreview.imageDataUrl ?? selectedCultivar.imageUrl,
    imageAsset: draft.listingPreview.imageDataUrl
      ? undefined
      : selectedCultivar.imageAsset,
  };
}
