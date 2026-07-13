import type {
  AnonymousOnboardingCatalogSize,
  AnonymousOnboardingStepId,
  AnonymousOnboardingWorkflow,
} from "./anonymous-onboarding-draft";

export interface MembershipPriceDisplay {
  amount: string;
  interval: string;
  monthlyEquivalent: string | null;
}

export interface AnonymousOnboardingPageClientProps {
  membershipPriceDisplay: MembershipPriceDisplay;
}

export const ANONYMOUS_ONBOARDING_STEPS: {
  id: AnonymousOnboardingStepId;
  title: string;
  chipLabel: string;
  description: string;
}[] = [
  {
    id: "workflow",
    title: "Your current setup",
    chipLabel: "Your needs",
    description: "Tell us how you share and roughly how much you manage.",
  },
  {
    id: "buyer-need",
    title: "Find your cultivars",
    chipLabel: "Your cultivars",
    description:
      "Search the real cultivar database and choose plants you grow.",
  },
  {
    id: "problem",
    title: "See the enrichment",
    chipLabel: "Before & after",
    description: "See your inventory transformed with real data and photos.",
  },
  {
    id: "search-tour",
    title: "Edit private listings",
    chipLabel: "Listings",
    description:
      "Set real availability, price, and seller notes in a browser-only workspace.",
  },
  {
    id: "proof",
    title: "Try the buyer experience",
    chipLabel: "Buyers & sharing",
    description:
      "Search your catalog and see a listing shared in Facebook or iMessage.",
  },
  {
    id: "personalize",
    title: "Make the preview yours",
    chipLabel: "Your preview",
    description: "Add the garden or seller name buyers know.",
  },
  {
    id: "email",
    title: "Save your preview",
    chipLabel: "Save",
    description: "Use the email you want for checkout and your login code.",
  },
  {
    id: "checkout",
    title: "Start your trial",
    chipLabel: "Start trial",
    description: "Start your free trial and open your dashboard.",
  },
];

export const WORKFLOW_OPTIONS: Array<{
  id: AnonymousOnboardingWorkflow;
  label: string;
  description: string;
}> = [
  {
    id: "facebook",
    label: "Facebook posts or messages",
    description: "I use posts, albums, groups, or Messenger.",
  },
  {
    id: "document",
    label: "A spreadsheet, PDF, brochure, or emailed list",
    description: "I maintain a file and send updated versions.",
  },
  {
    id: "website",
    label: "My own website",
    description: "My availability or cultivar details live elsewhere.",
  },
  {
    id: "direct",
    label: "I answer each buyer individually",
    description: "People contact me first, then I explain what is available.",
  },
  {
    id: "exploring",
    label: "I am not actively selling yet",
    description: "I am collecting, hybridizing, or exploring a future catalog.",
  },
];

export const CATALOG_SIZE_OPTIONS: Array<{
  id: AnonymousOnboardingCatalogSize;
  label: string;
  description: string;
}> = [
  {
    id: "under_25",
    label: "Fewer than 25",
    description: "A short seasonal list",
  },
  { id: "25_99", label: "25–99", description: "A growing collection" },
  {
    id: "100_499",
    label: "100–499",
    description: "A large searchable catalog",
  },
  { id: "500_plus", label: "500 or more", description: "A deep collection" },
  {
    id: "unknown",
    label: "I am not sure yet",
    description: "An estimate can wait",
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
