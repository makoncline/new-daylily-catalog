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
  status: typeof STATUS.HIDDEN | null;
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
  | "build-listing-card"
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
    id: "build-listing-card",
    title: "Build your first listing",
    chipLabel: "Listing",
    description:
      "A clear title, price, and description help buyers decide to message you.",
  },
  {
    id: "preview-buyer-contact",
    title: "Preview your catalog",
    chipLabel: "Catalog preview",
    description:
      "Preview your catalog and listing cards, then see how buyers contact you.",
  },
  {
    id: "start-membership",
    title: "Get listed",
    chipLabel: "Get listed",
    description:
      "Start your free trial now, or keep unlisted and finish setup in your dashboard.",
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

export const PROFILE_PLACEHOLDER_IMAGE =
  "/assets/onboarding-generated/profile-placeholder.png";
export const DEFAULT_GARDEN_NAME_PLACEHOLDER = "Your Garden Name";
export const DEFAULT_LOCATION_PLACEHOLDER = "Your City, ST";
export const DEFAULT_PROFILE_DESCRIPTION_PLACEHOLDER =
  "Daylily collector in Your City, ST offering healthy dormant fans, clearly labeled plants, and prompt replies with spring and fall shipping.";
export const DEFAULT_LISTING_TITLE_PLACEHOLDER =
  "Coffee Frenzy spring fan (1 healthy dormant fan)";
export const DEFAULT_LISTING_DESCRIPTION_PLACEHOLDER =
  "Healthy dormant fan with strong roots, clearly labeled, and ready for spring shipping or local pickup.";

export function isStarterProfileImageUrl(url: string | null | undefined) {
  if (!url) {
    return false;
  }

  return STARTER_PROFILE_IMAGES.some((image) => image.url === url);
}

export function getCreatedAtTimestamp(
  value: Date | string | null | undefined,
) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return new Date(value).getTime();
}

export function getEarliestByCreatedAt<T extends { createdAt: Date | string }>(
  rows: T[],
) {
  if (rows.length === 0) {
    return null;
  }

  return rows.reduce((earliest, current) => {
    if (!earliest) {
      return current;
    }

    const earliestTimestamp = getCreatedAtTimestamp(earliest.createdAt);
    const currentTimestamp = getCreatedAtTimestamp(current.createdAt);
    return currentTimestamp < earliestTimestamp ? current : earliest;
  }, rows[0] ?? null);
}

export function normalizePersistedImageUrl(value: string | null | undefined) {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    return null;
  }

  return trimmedValue.startsWith("blob:") ? null : trimmedValue;
}

export function normalizeCultivarSearchValue(
  value: string | null | undefined,
) {
  return (value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

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
  defaultStatus: STATUS.PUBLISHED,
  fallbackImageUrl: "/assets/onboarding-generated/listing-fallback.png",
} as const;

export const ONBOARDING_PROFILE_DESCRIPTION_SEO_GUIDANCE = {
  minLength: 80,
  maxLength: 160,
  conciseTip:
    "Appears on your catalog card and in Google search results. Mention what you grow, where you ship, and one trust detail (shipping window, plant condition, or response time).",
} as const;

export const ONBOARDING_LISTING_DESCRIPTION_GUIDANCE = {
  minLength: 70,
  maxLength: 150,
  conciseTip:
    "Appears on your listing card and on Google search results. Mention plant condition, quantity/size, and why this listing is worth contacting you about.",
} as const;

export function getDescriptionLengthAimText({
  minLength,
  maxLength,
}: {
  minLength: number;
  maxLength: number;
}) {
  return `Aim for ${minLength}-${maxLength} characters.`;
}

function hasText(value: string) {
  return value.trim().length > 0;
}

export function isProfileOnboardingDraftComplete(
  draft: ProfileOnboardingDraft,
) {
  return draft.profileImageUrl !== null && hasText(draft.gardenName);
}

export function isListingOnboardingDraftComplete(
  draft: ListingOnboardingDraft,
) {
  return (
    draft.cultivarReferenceId !== null &&
    hasText(draft.title) &&
    draft.price !== null
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

  return null;
}
