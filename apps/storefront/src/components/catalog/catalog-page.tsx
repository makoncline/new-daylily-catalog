import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { getStorefrontSnapshot } from "@/server/storefront";
import {
  getFirstStorefrontImage,
  getStorefrontThumbnailUrl,
} from "@/lib/storefront-images";
import type { StorefrontList, StorefrontListing } from "@/types";
import {
  findStorefrontListBySlug,
  getStorefrontFilterOptions,
  getStorefrontForSaleListings,
  getStorefrontListingsForList,
  getStorefrontSearchResult,
  sortStorefrontListings,
  type StorefrontBloomSize,
  type StorefrontListingFilters,
  type StorefrontPriceRange,
  type StorefrontScapeHeight,
} from "@/types/storefront-query";

import { CatalogBrowser } from "./catalog-browser";
import type { CatalogListingCardData } from "./listing-card";

const PAGE_SIZE = 24;

export type CatalogSearchParams = Record<string, string | string[] | undefined>;

function getFirstSearchParam(searchParams: CatalogSearchParams, name: string) {
  const value = searchParams[name];
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function getListingFilters(
  searchParams: CatalogSearchParams,
): StorefrontListingFilters {
  return {
    name: getFirstSearchParam(searchParams, "name"),
    char: getFirstSearchParam(searchParams, "char"),
    list: getFirstSearchParam(searchParams, "list"),
    hybridizer: getFirstSearchParam(searchParams, "hybridizer"),
    year: getFirstSearchParam(searchParams, "year"),
    ploidy: getFirstSearchParam(searchParams, "ploidy"),
    color: getFirstSearchParam(searchParams, "color"),
    form: getFirstSearchParam(searchParams, "form"),
    foliageType: getFirstSearchParam(searchParams, "foliageType"),
    note: getFirstSearchParam(searchParams, "note"),
    fragrance: getFirstSearchParam(searchParams, "fragrance"),
    bloomSize: getFirstSearchParam(searchParams, "bloomSize") as
      | StorefrontBloomSize
      | "",
    scapeHeight: getFirstSearchParam(searchParams, "scapeHeight") as
      | StorefrontScapeHeight
      | "",
    bloomSeason: getFirstSearchParam(searchParams, "bloomSeason"),
    rebloom: getFirstSearchParam(searchParams, "rebloom") === "true",
    price: getFirstSearchParam(searchParams, "price") as
      | StorefrontPriceRange
      | "",
  };
}

function getListTitlesByListingId(
  listings: readonly StorefrontListing[],
  lists: readonly StorefrontList[],
) {
  const pageListingIds = new Set(listings.map((listing) => listing.id));
  const value = new Map<string, string[]>();

  for (const list of lists) {
    for (const listingId of list.listingIds) {
      if (!pageListingIds.has(listingId)) continue;
      value.set(listingId, [...(value.get(listingId) ?? []), list.title]);
    }
  }

  return value;
}

function getCardListings(
  listings: readonly StorefrontListing[],
  lists: readonly StorefrontList[],
): CatalogListingCardData[] {
  const listTitlesByListingId = getListTitlesByListingId(listings, lists);

  return listings.map((listing) => {
    const image = getFirstStorefrontImage(listing.images);
    return {
      id: listing.id,
      slug: listing.slug,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      imageUrl: image?.url ?? null,
      cartImageUrl: image ? getStorefrontThumbnailUrl(image) : null,
      imageBlurUrl: image?.blurUrl ?? null,
      listTitles: listTitlesByListingId.get(listing.id) ?? [],
    };
  });
}

interface CatalogPageProps {
  kind: "all" | "for-sale" | "search" | "list";
  listSlug?: string;
  searchParams: Promise<CatalogSearchParams>;
}

export async function CatalogPage({
  kind,
  listSlug,
  searchParams,
}: CatalogPageProps) {
  await connection();
  const [snapshot, resolvedSearchParams] = await Promise.all([
    getStorefrontSnapshot(),
    searchParams,
  ]);
  const selectedList =
    kind === "list" && listSlug
      ? findStorefrontListBySlug(snapshot, listSlug)
      : null;
  if (kind === "list" && !selectedList) notFound();

  const listings = selectedList
    ? getStorefrontListingsForList(snapshot, selectedList)
    : kind === "for-sale"
      ? getStorefrontForSaleListings(snapshot)
      : sortStorefrontListings(snapshot.listings);
  const title =
    selectedList?.title ??
    (kind === "for-sale"
      ? "Daylilies for sale"
      : kind === "search"
        ? "Search the collection"
        : "All daylilies");
  const description =
    selectedList?.description ??
    (kind === "for-sale"
      ? "Browse daylilies that are currently listed with a price."
      : kind === "search"
        ? "Use cultivar traits, public lists, price, and notes to find a daylily."
        : "Browse every public listing, including display-only plants and plants that are not in a public list.");
  const filters = getListingFilters(resolvedSearchParams);
  const requestedPage = Number(
    getFirstSearchParam(resolvedSearchParams, "page") || "1",
  );
  const result = getStorefrontSearchResult(
    listings,
    filters,
    snapshot.lists,
    requestedPage,
    PAGE_SIZE,
  );
  const filterOptions = getStorefrontFilterOptions(listings, snapshot.lists);
  const listOptions =
    kind === "search"
      ? [
          ...snapshot.lists.map((list) => ({
            value: list.slug,
            label: list.title,
          })),
          { value: "no-list", label: "No list" },
        ]
      : [];

  return (
    <Suspense
      fallback={
        <p className="text-muted-foreground py-16">Loading catalog filters…</p>
      }
    >
      <CatalogBrowser
        title={title}
        description={description}
        listings={getCardListings(result.listings, snapshot.lists)}
        filters={filters}
        filterOptions={{
          chars: filterOptions.chars,
          hybridizers: filterOptions.hybridizers,
          years: filterOptions.years,
          ploidies: filterOptions.ploidies,
          forms: filterOptions.forms,
          foliageTypes: filterOptions.foliageTypes,
          fragrances: filterOptions.fragrances,
          bloomSeasons: filterOptions.bloomSeasons,
        }}
        listOptions={listOptions}
        pagination={{
          page: result.page,
          pageCount: result.pageCount,
          total: result.total,
        }}
        allowListFilter={kind === "search"}
      />
    </Suspense>
  );
}
