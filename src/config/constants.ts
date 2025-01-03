export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_IMAGES_PER_LISTING: 4,
} as const;

export const LISTING_CONFIG = {
  DEFAULT_NAME: "New Listing",
  IMAGES: {
    MAX_COUNT: UPLOAD_CONFIG.MAX_IMAGES_PER_LISTING,
    MAX_SIZE: UPLOAD_CONFIG.MAX_FILE_SIZE,
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
} as const;
