import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getRequestBaseUrl } from "@/lib/agent-readiness";
import { getCultivarSearchTelemetryProperties } from "@/lib/analytics/cultivar-search-telemetry";
import { reportError } from "@/lib/error-utils";
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

type SearchRequestStatus = "error" | "index_unavailable" | "success";

function roundDurationMs(durationMs: number) {
  return Math.round(durationMs * 10) / 10;
}

function getRequestId(request: Request) {
  return (
    request.headers.get("cf-ray") ??
    request.headers.get("x-request-id") ??
    randomUUID()
  );
}

function getTelemetryHeaders(requestId: string, durationMs: number) {
  return {
    "X-Cultivar-Search-Duration-Ms": String(roundDurationMs(durationMs)),
    "X-Cultivar-Search-Request-Id": requestId,
  };
}

function logSearchRequest({
  durationMs,
  errorName,
  hasMore,
  httpStatus,
  mode,
  requestId,
  resultsReturned,
  searchParams,
  status,
}: {
  durationMs: number;
  errorName?: string;
  hasMore?: boolean;
  httpStatus: number;
  mode: "full" | "summary";
  requestId: string;
  resultsReturned?: number;
  searchParams: URLSearchParams;
  status: SearchRequestStatus;
}) {
  const payload = JSON.stringify({
    component: "public-cultivar-search",
    event: "public_cultivar_search_request",
    timestamp: new Date().toISOString(),
    request_id: requestId,
    status,
    http_status: httpStatus,
    duration_ms: roundDurationMs(durationMs),
    mode,
    source_surface: mode === "summary" ? "public_page" : "public_api",
    results_returned: resultsReturned,
    has_more: hasMore,
    error_name: errorName,
    ...getCultivarSearchTelemetryProperties(searchParams),
  });

  if (status === "success") {
    console.info(payload);
  } else if (status === "index_unavailable") {
    console.warn(payload);
  } else {
    console.error(payload);
  }
}

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

  const startedAt = performance.now();
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const summaryMode = searchParams.get("mode") === "summary";
  const mode = summaryMode ? "summary" : "full";

  try {
    const summaryLimit = summaryMode ? getSummaryLimit(searchParams) : null;
    const results = await searchCultivars({
      award: searchParams.get("award") ?? undefined,
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
      flowerShow: searchParams.get("flowerShow") ?? undefined,
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
      photosFirst: getBooleanParam(searchParams, "photosFirst"),
      ploidy: searchParams.get("ploidy") ?? undefined,
      prefixLastToken: summaryMode,
      priceMax: getNumberParam(searchParams, "priceMax"),
      priceMin: getNumberParam(searchParams, "priceMin"),
      q: searchParams.get("q") ?? undefined,
      scapeHeightMax: getNumberParam(searchParams, "scapeHeightMax"),
      scapeHeightMin: getNumberParam(searchParams, "scapeHeightMin"),
      sculptedType: searchParams.get("sculptedType") ?? undefined,
      offset: summaryMode ? getNumberParam(searchParams, "offset") : undefined,
      sort: getSortParam(searchParams),
      yearMax: getNumberParam(searchParams, "yearMax"),
      yearMin: getNumberParam(searchParams, "yearMin"),
    });

    const hasMore = summaryLimit ? results.length > summaryLimit : false;
    const responseResults = summaryLimit
      ? results.slice(0, summaryLimit)
      : results;

    const durationMs = performance.now() - startedAt;
    logSearchRequest({
      durationMs,
      hasMore: summaryMode ? hasMore : undefined,
      httpStatus: 200,
      mode,
      requestId,
      resultsReturned: responseResults.length,
      searchParams,
      status: "success",
    });

    return NextResponse.json(
      {
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
      },
      { headers: getTelemetryHeaders(requestId, durationMs) },
    );
  } catch (error) {
    if (error instanceof PublicSearchIndexUnavailableError) {
      const durationMs = performance.now() - startedAt;
      logSearchRequest({
        durationMs,
        httpStatus: 503,
        mode,
        requestId,
        searchParams,
        status: "index_unavailable",
      });

      return NextResponse.json(
        {
          error: "public_search_index_unavailable",
          message: "The public search index is building. Try again shortly.",
          searchIndex: toPublicSearchStatus(error.status),
        },
        {
          headers: {
            "Retry-After": "30",
            ...getTelemetryHeaders(requestId, durationMs),
          },
          status: 503,
        },
      );
    }

    const durationMs = performance.now() - startedAt;
    logSearchRequest({
      durationMs,
      errorName: error instanceof Error ? error.name : "UnknownError",
      httpStatus: 500,
      mode,
      requestId,
      searchParams,
      status: "error",
    });
    reportError({
      error,
      context: {
        requestId,
        source: "public-cultivar-search",
      },
    });

    return NextResponse.json(
      {
        error: "internal_server_error",
        message: "Cultivar search could not be loaded.",
      },
      {
        headers: getTelemetryHeaders(requestId, durationMs),
        status: 500,
      },
    );
  }
}
