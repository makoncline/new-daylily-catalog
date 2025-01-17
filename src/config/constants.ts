export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_IMAGES_PER_LISTING: 4,
} as const;

export const TABLE_CONFIG = {
  CELL_TEXT_LENGTH: 50, // Maximum characters to show in table cells before truncating
  MIN_COLUMN_WIDTH: 100,
  MAX_COLUMN_WIDTH: 300,
  PAGINATION: {
    DEFAULT_PAGE_INDEX: 0,
    DEFAULT_PAGE_SIZE: 10,
    PAGE_SIZE_OPTIONS: [10, 20, 30, 40, 50],
  },
} as const;

export const COLUMN_NAMES = {
  // Core columns
  name: "Name",
  price: "Price",
  publicNote: "Public Note",
  privateNote: "Private Note",

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

// Add more config objects as needed
export const APP_CONFIG = {
  UPLOAD: UPLOAD_CONFIG,
  LISTING: LISTING_CONFIG,
  FEEDBACK: FEEDBACK_CONFIG,
  TABLE: TABLE_CONFIG,
} as const;
