export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_IMAGES_PER_LISTING: 10,
} as const;

export const LISTING_CONFIG = {
  DEFAULT_NAME: "New Listing",
} as const;

// Add more config objects as needed
export const APP_CONFIG = {
  UPLOAD: UPLOAD_CONFIG,
  LISTING: LISTING_CONFIG,
} as const;
