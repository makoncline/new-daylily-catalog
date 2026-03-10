export const IMAGES = {
  DEFAULT_META: "/assets/hero-garden.webp",
  DEFAULT_CATALOG: "/assets/catalog-blooms.webp",
  DEFAULT_LISTING: "/assets/cultivar-grid.webp",
} as const;

// Ensure all image paths exist at build time
export const ALL_IMAGE_PATHS = Object.values(IMAGES);
