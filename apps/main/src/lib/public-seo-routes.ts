export type PublicSeoRouteType =
  | "home"
  | "catalogs_index"
  | "cultivar_page"
  | "listing_page"
  | "profile_page"
  | "profile_page_paginated";

export type PublicSeoHtmlCachePolicy = {
  sMaxAge: number;
  staleWhileRevalidate: number;
};

export const PUBLIC_SEO_HTML_CACHE_POLICY_BY_ROUTE_TYPE = {
  catalogs_index: { sMaxAge: 900, staleWhileRevalidate: 86400 },
  cultivar_page: { sMaxAge: 900, staleWhileRevalidate: 86400 },
  home: { sMaxAge: 900, staleWhileRevalidate: 86400 },
  listing_page: { sMaxAge: 900, staleWhileRevalidate: 86400 },
  profile_page: { sMaxAge: 900, staleWhileRevalidate: 86400 },
  profile_page_paginated: { sMaxAge: 900, staleWhileRevalidate: 86400 },
} satisfies Record<PublicSeoRouteType, PublicSeoHtmlCachePolicy>;

const RESERVED_PUBLIC_SINGLE_SEGMENT_ROUTES = new Set([
  "auth-error",
  "icon",
  "kitchen-sink",
  "llms-full.txt",
  "llms.txt",
  "openapi.json",
  "robots.txt",
  "sentry-example-page",
  "sitemap.xml",
  "start-membership",
  "start-onboarding",
]);

const RESERVED_PUBLIC_FIRST_SEGMENTS = new Set([
  "_next",
  "api",
  "catalog",
  "dashboard",
  "images",
  "onboarding",
  "subscribe",
  "users",
]);

function isSlugSegment(value: string | undefined) {
  return typeof value === "string" && /^[a-z0-9][a-z0-9_-]*$/i.test(value);
}

function isPositiveIntegerSegment(value: string | undefined) {
  return typeof value === "string" && /^[1-9]\d*$/.test(value);
}

export function getPublicSeoRouteType(
  pathname: string,
): PublicSeoRouteType | null {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.some((segment) => segment.includes("."))) {
    return null;
  }

  if (segments.length === 0) {
    return "home";
  }

  const [firstSegment, secondSegment, thirdSegment] = segments;
  if (!firstSegment) {
    return null;
  }

  if (segments.length === 1) {
    if (firstSegment === "catalogs") {
      return "catalogs_index";
    }

    if (
      RESERVED_PUBLIC_SINGLE_SEGMENT_ROUTES.has(firstSegment) ||
      RESERVED_PUBLIC_FIRST_SEGMENTS.has(firstSegment)
    ) {
      return null;
    }

    return isSlugSegment(firstSegment) ? "profile_page" : null;
  }

  if (segments.length === 2) {
    if (firstSegment === "cultivar" && isSlugSegment(secondSegment)) {
      return "cultivar_page";
    }

    if (
      !RESERVED_PUBLIC_FIRST_SEGMENTS.has(firstSegment) &&
      isSlugSegment(firstSegment) &&
      isSlugSegment(secondSegment) &&
      secondSegment !== "search" &&
      secondSegment !== "page"
    ) {
      return "listing_page";
    }

    return null;
  }

  if (
    segments.length === 3 &&
    !RESERVED_PUBLIC_FIRST_SEGMENTS.has(firstSegment) &&
    isSlugSegment(firstSegment) &&
    secondSegment === "page" &&
    isPositiveIntegerSegment(thirdSegment)
  ) {
    return "profile_page_paginated";
  }

  return null;
}
