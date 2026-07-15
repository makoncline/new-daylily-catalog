import { NextResponse } from "next/server";
import { getRequestBaseUrl } from "@/lib/agent-readiness";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import {
  getPublicSearchApiDisabledResponse,
  isPublicSearchApiEnabled,
  toPublicSearchStatus,
} from "@/server/search/public-search-api-platform";
import { searchCultivars } from "@/server/search/cultivar-search";
import { PublicSearchIndexUnavailableError } from "@/server/search/public-search-index";
import type { CultivarSearchSort } from "@/server/search/cultivar-search";

export const runtime = "nodejs";

function getNumberParam(params: URLSearchParams, key: string) {
  const value = params.get(key);
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getBooleanParam(params: URLSearchParams, key: string) {
  const value = params.get(key);
  if (!value) {
    return undefined;
  }

  return value === "true" || value === "1";
}

function getSortParam(params: URLSearchParams): CultivarSearchSort | undefined {
  const value = params.get("sort");
  if (
    value === "relevance" ||
    value === "name" ||
    value === "newest" ||
    value === "oldest" ||
    value === "mostListed"
  ) {
    return value;
  }

  return undefined;
}

function getSummaryLimit(params: URLSearchParams) {
  const requestedLimit = getNumberParam(params, "limit") ?? 24;
  return Math.min(Math.max(Math.trunc(requestedLimit), 1), 48);
}

export async function GET(request: Request) {
  if (!isPublicSearchApiEnabled()) {
    return getPublicSearchApiDisabledResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const summaryMode = searchParams.get("mode") === "summary";
    const summaryLimit = summaryMode ? getSummaryLimit(searchParams) : null;
    const results = await searchCultivars({
      baseUrl: getRequestBaseUrl(request) ?? getCanonicalBaseUrl(),
      bloomHabit: searchParams.get("bloomHabit") ?? undefined,
      bloomSizeMax: getNumberParam(searchParams, "bloomSizeMax"),
      bloomSizeMin: getNumberParam(searchParams, "bloomSizeMin"),
      bloomSeason: searchParams.get("bloomSeason") ?? undefined,
      branchesMax: getNumberParam(searchParams, "branchesMax"),
      branchesMin: getNumberParam(searchParams, "branchesMin"),
      budCountMax: getNumberParam(searchParams, "budCountMax"),
      budCountMin: getNumberParam(searchParams, "budCountMin"),
      color: searchParams.get("color") ?? undefined,
      cultivarName: searchParams.get("cultivarName") ?? undefined,
      foliageType: searchParams.get("foliageType") ?? undefined,
      form: searchParams.get("form") ?? undefined,
      fragrance: searchParams.get("fragrance") ?? undefined,
      hasCultivarPhoto: getBooleanParam(searchParams, "hasCultivarPhoto"),
      hasForSaleListings: getBooleanParam(searchParams, "hasForSaleListings"),
      hasPhoto: getBooleanParam(searchParams, "hasPhoto"),
      hasListings: getBooleanParam(searchParams, "hasListings"),
      hybridizer: searchParams.get("hybridizer") ?? undefined,
      includeParentageTrees: !summaryMode,
      limit: summaryLimit
        ? summaryLimit + 1
        : getNumberParam(searchParams, "limit"),
      listingDescription: searchParams.get("listingDescription") ?? undefined,
      listingLimit: summaryMode
        ? 0
        : getNumberParam(searchParams, "listingLimit"),
      listingTitle: searchParams.get("listingTitle") ?? undefined,
      parentage: searchParams.get("parentage") ?? undefined,
      ploidy: searchParams.get("ploidy") ?? undefined,
      prefixLastToken: summaryMode,
      priceMax: getNumberParam(searchParams, "priceMax"),
      priceMin: getNumberParam(searchParams, "priceMin"),
      q: searchParams.get("q") ?? undefined,
      scapeHeightMax: getNumberParam(searchParams, "scapeHeightMax"),
      scapeHeightMin: getNumberParam(searchParams, "scapeHeightMin"),
      offset: summaryMode ? getNumberParam(searchParams, "offset") : undefined,
      sort: getSortParam(searchParams),
      yearMax: getNumberParam(searchParams, "yearMax"),
      yearMin: getNumberParam(searchParams, "yearMin"),
    });

    const hasMore = summaryLimit ? results.length > summaryLimit : false;
    const responseResults = summaryLimit
      ? results.slice(0, summaryLimit)
      : results;

    return NextResponse.json({
      results: responseResults,
      ...(summaryLimit
        ? {
            pagination: {
              hasMore,
              limit: summaryLimit,
              nextOffset: hasMore
                ? (getNumberParam(searchParams, "offset") ?? 0) + summaryLimit
                : null,
            },
          }
        : {}),
    });
  } catch (error) {
    if (error instanceof PublicSearchIndexUnavailableError) {
      return NextResponse.json(
        {
          error: "public_search_index_unavailable",
          message: "The public search index is building. Try again shortly.",
          searchIndex: toPublicSearchStatus(error.status),
        },
        {
          headers: {
            "Retry-After": "30",
          },
          status: 503,
        },
      );
    }

    throw error;
  }
}
