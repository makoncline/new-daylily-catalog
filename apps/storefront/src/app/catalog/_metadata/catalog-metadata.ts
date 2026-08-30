import "server-only";

import type { Metadata } from "next";

import type { CatalogSearchParams } from "@/components/catalog/catalog-page";
import { getStorefrontSiteConfig } from "@/config/storefront-site-config";
import { getFirstStorefrontImage } from "@/lib/storefront-images";
import { getStorefrontSnapshot } from "@/server/storefront";
import type { StorefrontList, StorefrontSnapshot } from "@/types";
import {
  findStorefrontListBySlug,
  getStorefrontForSaleListings,
  getStorefrontListingsForList,
  getStorefrontSearchResult,
  sortStorefrontListings,
  type StorefrontBloomSize,
  type StorefrontListingFilters,
  type StorefrontPriceRange,
  type StorefrontScapeHeight,
} from "@/types/storefront-query";

const PAGE_SIZE = 24;

type CatalogMetadataKind = "all" | "for-sale" | "search" | "list";

interface CatalogMetadataOptions {
  kind: CatalogMetadataKind;
  listSlug?: string;
  searchParams: Promise<CatalogSearchParams>;
}

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

function getPagePath(basePath: string, page: number) {
  return page > 1 ? basePath + "?page=" + page : basePath;
}

function getCatalogCopy(kind: Exclude<CatalogMetadataKind, "list">): {
  title: string;
  description: string;
} {
  switch (kind) {
    case "all":
      return {
        title: "All daylilies",
        description: "Browse every public daylily listing.",
      };
    case "for-sale":
      return {
        title: "Daylilies for sale",
        description: "Browse daylilies that are listed for sale.",
      };
    case "search":
      return {
        title: "Search daylilies",
        description:
          "Search daylilies by name, public list, cultivar traits, and price.",
      };
  }
}

function getCatalogListings(
  kind: CatalogMetadataKind,
  snapshot: StorefrontSnapshot,
  selectedList: StorefrontList | null,
) {
  if (selectedList) {
    return getStorefrontListingsForList(snapshot, selectedList);
  }
  if (kind === "for-sale") {
    return getStorefrontForSaleListings(snapshot);
  }
  return sortStorefrontListings(snapshot.listings);
}

export async function getCatalogMetadata({
  kind,
  listSlug,
  searchParams,
}: CatalogMetadataOptions): Promise<Metadata> {
  const [snapshot, resolvedSearchParams] = await Promise.all([
    getStorefrontSnapshot(),
    searchParams,
  ]);
  const site = getStorefrontSiteConfig();
  const selectedList =
    kind === "list" && listSlug
      ? findStorefrontListBySlug(snapshot, listSlug)
      : null;

  if (kind === "list" && !selectedList) {
    return {
      title: "Catalog not found",
      robots: { index: false, follow: false },
    };
  }

  const copy = selectedList
    ? {
        title: selectedList.title,
        description:
          selectedList.description ??
          "Browse " + selectedList.title + " daylilies.",
      }
    : getCatalogCopy(kind as Exclude<CatalogMetadataKind, "list">);
  const basePath = selectedList
    ? "/catalog/" + selectedList.slug
    : "/catalog/" + kind;
  const requestedPage = Number(
    getFirstSearchParam(resolvedSearchParams, "page") || "1",
  );
  const result = getStorefrontSearchResult(
    getCatalogListings(kind, snapshot, selectedList),
    getListingFilters(resolvedSearchParams),
    snapshot.lists,
    requestedPage,
    PAGE_SIZE,
  );
  const title =
    result.page > 1 ? copy.title + " - Page " + result.page : copy.title;
  const description =
    result.page > 1
      ? copy.description + " Page " + result.page + "."
      : copy.description;
  const resultImage = getFirstStorefrontImage(
    result.listings.at(0)?.images ?? [],
  );
  const socialImages = resultImage
    ? [{ url: resultImage.url, alt: `${result.listings[0]!.title} daylily` }]
    : site.brand.socialImage
      ? [
          {
            url: site.brand.socialImage.path,
            width: site.brand.socialImage.width,
            height: site.brand.socialImage.height,
            type: site.brand.socialImage.type,
            alt: `${site.brand.name} logo`,
          },
        ]
      : undefined;
  const canonicalPath = getPagePath(basePath, result.page);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    pagination: {
      previous:
        result.page > 1 ? getPagePath(basePath, result.page - 1) : undefined,
      next:
        result.page < result.pageCount
          ? getPagePath(basePath, result.page + 1)
          : undefined,
    },
    openGraph: {
      type: "website",
      siteName: site.brand.name,
      title,
      description,
      url: canonicalPath,
      ...(socialImages ? { images: socialImages } : {}),
    },
    twitter: {
      card: socialImages ? "summary_large_image" : "summary",
      title,
      description,
      ...(socialImages
        ? { images: socialImages.map((image) => image.url) }
        : {}),
    },
  };
}
