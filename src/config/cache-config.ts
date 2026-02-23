const SECOND = 1;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

const SECOND_IN_MS = 1000;

export const CACHE_CONFIG = {
  DURATIONS: {
    SECOND,
    MINUTE,
    HOUR,
    DAY,
    WEEK,
  },
  SERVER: {
    DEFAULT_REVALIDATE_SECONDS: DAY,
  },
  PUBLIC: {
    STATIC_REVALIDATE_SECONDS: DAY,
    SITEMAP_REVALIDATE_SECONDS: WEEK,
    SEARCH: {
      SERVER_REVALIDATE_SECONDS: DAY,
      CLIENT_STALE_TIME_MS: DAY * SECOND_IN_MS,
      CLIENT_GC_TIME_MS: DAY * SECOND_IN_MS * 2,
      CLIENT_REFETCH_ON_MOUNT: true as const,
      CLIENT_REFETCH_ON_WINDOW_FOCUS: false,
      CLIENT_REFETCH_ON_RECONNECT: false,
    },
    CLIENT_QUERY: {
      STALE_TIME_MS: DAY * SECOND_IN_MS,
      GC_TIME_MS: DAY * SECOND_IN_MS * 2,
      REFETCH_ON_MOUNT: true as const,
      REFETCH_ON_WINDOW_FOCUS: false,
      REFETCH_ON_RECONNECT: false,
    },
  },
  TAGS: {
    PUBLIC_PROFILES: "public:profiles",
    PUBLIC_PROFILE: "public:profile",
    PUBLIC_LISTINGS: "public:listings",
    PUBLIC_LISTING_DETAIL: "public:listings:detail",
    PUBLIC_LISTINGS_PAGE: "public:listings:page",
    PUBLIC_FOR_SALE_COUNT: "public:listings:for-sale-count",
    PUBLIC_CATALOG_ROUTES: "public:catalog-routes",
    PUBLIC_CULTIVAR_PAGE: "public:cultivar:page",
    PUBLIC_CULTIVAR_SEGMENTS: "public:cultivar:segments",
    PUBLIC_CULTIVAR_SITEMAP: "public:cultivar:sitemap",
  },
} as const;
