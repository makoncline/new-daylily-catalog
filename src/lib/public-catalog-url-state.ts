export type PublicCatalogSearchParamRecord = Record<
  string,
  string | string[] | undefined
>;

export function parsePositiveInteger(
  value: string | null | undefined,
  fallback = 1,
) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

export function toPublicCatalogSearchParams(
  searchParams: PublicCatalogSearchParamRecord | undefined,
) {
  const params = new URLSearchParams();

  if (!searchParams) {
    return params;
  }

  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, entry));
      return;
    }

    if (typeof value === "string") {
      params.set(key, value);
    }
  });

  return params;
}

export function hasNonPageProfileParams(params: URLSearchParams) {
  return Array.from(params.keys()).some((key) => key !== "page");
}

export function getPublicProfilePagePath(slug: string, page: number) {
  if (page <= 1) {
    return `/${slug}`;
  }

  return `/${slug}?page=${page}`;
}

export function getPublicCatalogSearchPath(slug: string, page: number) {
  if (page <= 1) {
    return `/${slug}/search`;
  }

  return `/${slug}/search?page=${page}`;
}

export function getPublicCatalogForSaleSearchPath(slug: string) {
  return `/${slug}/search?price=true`;
}

export function getPublicCatalogListSearchPath(slug: string, listId: string) {
  return `/${slug}/search?lists=${encodeURIComponent(listId)}`;
}

export function getPublicProfilePaginationHref(
  slug: string,
  page: number,
  anchor = "listings",
) {
  const pagePath = getPublicProfilePagePath(slug, page);
  if (!anchor) {
    return pagePath;
  }

  return `${pagePath}#${anchor}`;
}
