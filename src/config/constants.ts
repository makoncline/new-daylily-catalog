import { Package, Globe, Star, HeartHandshake } from "lucide-react";

export const TIME = {
  HOUR_IN_MS: 1000 * 60 * 60,
  DAY_IN_MS: 1000 * 60 * 60 * 24,
} as const;

export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGES_PER_LISTING: 4,
  MAX_IMAGES_PER_PROFILE: 4,
} as const;

export const TABLE_CONFIG = {
  MIN_COLUMN_WIDTH: 100,
  MAX_COLUMN_WIDTH: 300,
  ROW_HEIGHT: 24, // h-12 = 3rem = 48px
  PAGINATION: {
    DEFAULT_PAGE_INDEX: 0,
    DEFAULT_PAGE_SIZE: 12,
    LISTS_PAGE_SIZE_DEFAULT: 20,
    PAGE_SIZE_OPTIONS: [12, 24, 36, 48, 60] as number[],
    DASHBOARD_PAGE_SIZE_OPTIONS: [20, 50, 100, 200] as number[],
    DASHBOARD_PAGE_SIZE_DEFAULT: 100,
  },
} as const;

export const LISTING_TABLE_COLUMN_NAMES = {
  // Core columns
  title: "Title",
  images: "Images",
  price: "Price",
  description: "Description",
  privateNote: "Private Notes",
  lists: "Lists",
  status: "Status",

  // AHS Listing columns
  summary: "Daylily Database Description",
  hybridizer: "Hybridizer",
  year: "Year",
  scapeHeight: "Scape Height",
  bloomSize: "Bloom Size",
  bloomSeason: "Bloom Season",
  ploidy: "Ploidy",
  foliageType: "Foliage Type",
  bloomHabit: "Bloom Habit",
  color: "Color",
  form: "Form",
  fragrance: "Fragrance",
  budcount: "Bud Count",
  branches: "Branches",

  // Metadata columns
  createdAt: "Created",
  updatedAt: "Updated",
} as const;

export const LIST_TABLE_COLUMN_NAMES = {
  title: "Title",
  description: "Description",
  listingsCount: "Listings",
  createdAt: "Created",
  updatedAt: "Updated",
} as const;

export const LISTING_CONFIG = {
  DEFAULT_NAME: "New Listing",
  IMAGES: {
    MAX_COUNT: UPLOAD_CONFIG.MAX_IMAGES_PER_LISTING,
    MAX_SIZE: UPLOAD_CONFIG.MAX_FILE_SIZE,
  },
  FREE_TIER_MAX_LISTINGS: 25,
} as const;

export const LIST_CONFIG = {
  BADGE: {
    MAX_NAME_LENGTH: 20,
  },
  FREE_TIER_MAX_LISTS: 1,
} as const;

export const FEEDBACK_CONFIG = {
  BOARD_SLUG: "daylily-catalog",
  FORM_URL: "https://coda.io/form/Ideas-Bugs_dWgu2I2WTqJ",
} as const;

export const CACHE_CONFIG = {
  PUBLIC_ROUTER: {
    TTL_S: 60 * 60, // Time in seconds to cache public router data. 1 hour
  },
} as const;

export const METADATA_CONFIG = {
  SITE_NAME: "Daylily Catalog",
  DEFAULT_TITLE: "Daylily Catalog | Create Your Online Daylily Catalog",
  DEFAULT_DESCRIPTION:
    "Create a stunning catalog for your daylily collection. Auto-populate listings from our database of 100,000+ registered cultivars, organize your garden, and share your passion with fellow enthusiasts.",
  TWITTER_HANDLE: "@daylilycatalog",
  TWITTER_CARD_TYPE: "summary_large_image",
  LOCALE: "en_US",
} as const;

export const PRO_FEATURES = [
  {
    id: "listings",
    text: "Unlimited listings and photos",
    icon: Package,
  },
  {
    id: "lists",
    text: "Custom domain name",
    icon: Globe,
  },
  {
    id: "photos",
    text: "Featured placement in the catalog",
    icon: Star,
  },
  {
    id: "domain",
    text: "Priority customer support",
    icon: HeartHandshake,
  },
] as const;

// Add more config objects as needed
export const APP_CONFIG = {
  UPLOAD: UPLOAD_CONFIG,
  LISTING: LISTING_CONFIG,
  LIST: LIST_CONFIG,
  FEEDBACK: FEEDBACK_CONFIG,
  TABLE: TABLE_CONFIG,
  CACHE: CACHE_CONFIG,
  METADATA: METADATA_CONFIG,
} as const;

export const STATUS = {
  PUBLISHED: null,
  HIDDEN: "HIDDEN",
} as const;
