import "server-only";

import {
  PUBLIC_CLOUDFLARE_CACHE_CONTROL,
  PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER,
  PUBLIC_CLOUDFLARE_CACHE_TAG,
} from "@/lib/public-cache-policy";
import {
  getFirstStorefrontImage,
  getOrderedStorefrontImages,
  getStorefrontThumbnailUrl,
} from "@/lib/storefront-images";
import {
  StorefrontContractError,
  StorefrontNotFoundError,
  StorefrontUnavailableError,
} from "@/server/storefront/errors";
import type {
  StorefrontCultivarDetails,
  StorefrontList,
  StorefrontListing,
  StorefrontSnapshot,
} from "@/types/storefront";
import type {
  StorefrontBloomSize,
  StorefrontListingFilters,
  StorefrontPriceRange,
  StorefrontScapeHeight,
} from "@/types/storefront-query";
import {
  findStorefrontListBySlug,
  findStorefrontListingBySlug,
  getStorefrontForSaleListings,
  getStorefrontListingsForList,
  getStorefrontSearchResult,
  sortStorefrontListings,
} from "@/types/storefront-query";

const PUBLIC_API_VERSION = 1 as const;
const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;
const publicApiHeaders = {
  "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
  [PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER]: PUBLIC_CLOUDFLARE_CACHE_CONTROL,
  "Cache-Tag": PUBLIC_CLOUDFLARE_CACHE_TAG,
};

const noStoreHeaders = {
  "Cache-Control": "no-store",
  [PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER]: "no-store",
};

type StorefrontSnapshotLoader = () => Promise<StorefrontSnapshot>;
type CatalogKind = "all" | "for-sale" | "search" | "list";

interface ResolvedCatalog {
  kind: CatalogKind;
  slug: string;
  title: string;
  description: string | null;
  listings: StorefrontListing[];
}

const catalogTitleCollator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

function publicJson(value: unknown) {
  return Response.json(value, { headers: publicApiHeaders });
}

function errorJson(status: number, code: string, message: string): Response {
  return Response.json(
    {
      version: PUBLIC_API_VERSION,
      error: { code, message },
    },
    { status, headers: noStoreHeaders },
  );
}

function loadErrorResponse(error: unknown) {
  if (error instanceof StorefrontNotFoundError) {
    return errorJson(404, "storefront_not_found", "Storefront not found.");
  }

  if (
    error instanceof StorefrontUnavailableError ||
    error instanceof StorefrontContractError
  ) {
    return errorJson(
      503,
      "storefront_unavailable",
      "Storefront data is unavailable.",
    );
  }

  return errorJson(
    500,
    "internal_server_error",
    "The public catalog could not be loaded.",
  );
}

function serializeCultivarDetails(details: StorefrontCultivarDetails) {
  return {
    name: details.name,
    ahsImageUrl: details.ahsImageUrl,
    hybridizer: details.hybridizer,
    year: details.year,
    seedlingNum: details.seedlingNum,
    scapeHeight: details.scapeHeight,
    bloomSize: details.bloomSize,
    bloomSeason: details.bloomSeason,
    rebloom: details.rebloom,
    ploidy: details.ploidy,
    foliageType: details.foliageType,
    bloomHabit: details.bloomHabit,
    color: details.color,
    form: details.form,
    parentage: details.parentage,
    fragrance: details.fragrance,
    budcount: details.budcount,
    branches: details.branches,
    sculpting: details.sculpting,
    foliage: details.foliage,
    flower: details.flower,
  };
}

function serializeListing(
  listing: StorefrontListing,
  lists: readonly StorefrontList[],
) {
  const publicLists = lists
    .filter((list) => list.listingIds.includes(listing.id))
    .map((list) => ({
      slug: list.slug,
      title: list.title,
      description: list.description,
      url: `/catalog/${list.slug}`,
      apiUrl: `/api/catalog/${list.slug}`,
    }))
    .sort(
      (left, right) =>
        catalogTitleCollator.compare(left.title, right.title) ||
        left.slug.localeCompare(right.slug),
    );

  return {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    description: listing.description,
    price: listing.price,
    forSale: listing.price !== null && listing.price > 0,
    images: getOrderedStorefrontImages(listing.images).map((image) => ({
      url: image.url,
      thumbUrl: image.thumbUrl,
      blurUrl: image.blurUrl,
      order: image.order,
    })),
    cultivar: listing.cultivar
      ? {
          normalizedName: listing.cultivar.normalizedName,
          details: listing.cultivar.details
            ? serializeCultivarDetails(listing.cultivar.details)
            : null,
        }
      : null,
    catalogs: publicLists,
    updatedAt: listing.updatedAt,
    url: `/${listing.slug}`,
    apiUrl: `/api/listings/${listing.slug}`,
  };
}

function resolveCatalog(
  snapshot: StorefrontSnapshot,
  catalogSlug: string,
): ResolvedCatalog | null {
  const slug = catalogSlug.trim().toLowerCase();

  if (slug === "all") {
    return {
      kind: "all",
      slug,
      title: "All daylilies",
      description:
        "Every public listing, including display-only plants and plants that are not in a public list.",
      listings: sortStorefrontListings(snapshot.listings),
    };
  }

  if (slug === "for-sale") {
    return {
      kind: "for-sale",
      slug,
      title: "Daylilies for sale",
      description: "Every public listing with a current price.",
      listings: getStorefrontForSaleListings(snapshot),
    };
  }

  if (slug === "search") {
    return {
      kind: "search",
      slug,
      title: "Search the collection",
      description:
        "Search every public listing by public list, cultivar traits, price, and note.",
      listings: sortStorefrontListings(snapshot.listings),
    };
  }

  const list = findStorefrontListBySlug(snapshot, slug);
  if (!list) {
    return null;
  }

  return {
    kind: "list",
    slug: list.slug,
    title: list.title,
    description: list.description,
    listings: sortStorefrontListings(
      getStorefrontListingsForList(snapshot, list),
    ),
  };
}

function serializeCatalog(catalog: ResolvedCatalog) {
  const image = getFirstStorefrontImage(catalog.listings.at(0)?.images ?? []);
  return {
    kind: catalog.kind,
    slug: catalog.slug,
    title: catalog.title,
    description: catalog.description,
    imageUrl: image ? getStorefrontThumbnailUrl(image) : null,
    totalCount: catalog.listings.length,
    url: `/catalog/${catalog.slug}`,
    apiUrl: `/api/catalog/${catalog.slug}`,
  };
}

function getCatalogs(snapshot: StorefrontSnapshot) {
  const forSale = resolveCatalog(snapshot, "for-sale")!;
  const all = resolveCatalog(snapshot, "all")!;
  const search = resolveCatalog(snapshot, "search")!;
  const publicLists = snapshot.lists
    .map((list) => resolveCatalog(snapshot, list.slug)!)
    .sort(
      (left, right) =>
        right.listings.length - left.listings.length ||
        catalogTitleCollator.compare(left.title, right.title) ||
        left.slug.localeCompare(right.slug),
    );

  return [forSale, ...publicLists, all, search];
}

function getPositiveInteger(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getEnumValue<T extends string>(
  value: string | null,
  allowedValues: readonly T[],
): T | "" {
  return value && allowedValues.includes(value as T) ? (value as T) : "";
}

function getCatalogFilters(searchParams: URLSearchParams) {
  const text = (name: string) => searchParams.get(name) ?? "";
  const filters: StorefrontListingFilters = {
    name: text("name"),
    char: text("char"),
    list: text("list"),
    hybridizer: text("hybridizer"),
    year: text("year"),
    ploidy: text("ploidy"),
    color: text("color"),
    form: text("form"),
    foliageType: text("foliageType"),
    note: text("note"),
    fragrance: text("fragrance"),
    bloomSize: getEnumValue<StorefrontBloomSize>(
      searchParams.get("bloomSize"),
      ["miniature", "small", "large", "extra-large"],
    ),
    scapeHeight: getEnumValue<StorefrontScapeHeight>(
      searchParams.get("scapeHeight"),
      ["miniature", "short", "medium", "tall", "extra-tall"],
    ),
    bloomSeason: text("bloomSeason"),
    rebloom: (searchParams.get("rebloom") ?? "").toLowerCase() === "true",
    price: getEnumValue<StorefrontPriceRange>(searchParams.get("price"), [
      "under-10",
      "10-to-19",
      "20-to-29",
      "30-to-39",
      "40-to-49",
      "50-plus",
    ]),
  };

  return filters;
}

export function createCatalogsHandler(loadSnapshot: StorefrontSnapshotLoader) {
  return async function handleCatalogs(): Promise<Response> {
    try {
      const snapshot = await loadSnapshot();
      return publicJson({
        version: PUBLIC_API_VERSION,
        generatedAt: snapshot.generatedAt,
        catalogs: getCatalogs(snapshot).map(serializeCatalog),
      });
    } catch (error) {
      return loadErrorResponse(error);
    }
  };
}

export function createCatalogHandler(loadSnapshot: StorefrontSnapshotLoader) {
  return async function handleCatalog(
    request: Request,
    catalogSlug: string,
  ): Promise<Response> {
    try {
      const snapshot = await loadSnapshot();
      const catalog = resolveCatalog(snapshot, catalogSlug);
      if (!catalog) {
        return errorJson(404, "catalog_not_found", "Catalog not found.");
      }

      const searchParams = new URL(request.url).searchParams;
      const requestedPage = getPositiveInteger(searchParams.get("page"), 1);
      const pageSize = Math.min(
        getPositiveInteger(searchParams.get("limit"), DEFAULT_PAGE_SIZE),
        MAX_PAGE_SIZE,
      );
      const result = getStorefrontSearchResult(
        catalog.listings,
        getCatalogFilters(searchParams),
        snapshot.lists,
        requestedPage,
        pageSize,
      );

      return publicJson({
        version: PUBLIC_API_VERSION,
        generatedAt: snapshot.generatedAt,
        catalog: serializeCatalog(catalog),
        pagination: {
          page: result.page,
          limit: result.pageSize,
          total: result.total,
          totalPages: result.pageCount,
        },
        listings: result.listings.map((listing) =>
          serializeListing(listing, snapshot.lists),
        ),
      });
    } catch (error) {
      return loadErrorResponse(error);
    }
  };
}

export function createListingHandler(loadSnapshot: StorefrontSnapshotLoader) {
  return async function handleListing(listingSlug: string): Promise<Response> {
    try {
      const snapshot = await loadSnapshot();
      const listing = findStorefrontListingBySlug(snapshot, listingSlug);
      if (!listing) {
        return errorJson(404, "listing_not_found", "Listing not found.");
      }

      return publicJson({
        version: PUBLIC_API_VERSION,
        generatedAt: snapshot.generatedAt,
        listing: serializeListing(listing, snapshot.lists),
      });
    } catch (error) {
      return loadErrorResponse(error);
    }
  };
}
