export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
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
    PAGE_SIZE_OPTIONS: [12, 24, 36, 48, 60],
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
} as const;

export const LIST_CONFIG = {
  BADGE: {
    MAX_NAME_LENGTH: 20,
  },
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

// Add more config objects as needed
export const APP_CONFIG = {
  UPLOAD: UPLOAD_CONFIG,
  LISTING: LISTING_CONFIG,
  FEEDBACK: FEEDBACK_CONFIG,
  TABLE: TABLE_CONFIG,
  CACHE: CACHE_CONFIG,
  METADATA: METADATA_CONFIG,
} as const;

export const STATUS = {
  PUBLISHED: "",
  HIDDEN: "HIDDEN",
} as const;
