import { NextResponse } from "next/server";
import { getRequestBaseUrl } from "@/lib/agent-readiness";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import {
  getPublicSearchApiDisabledResponse,
  isPublicSearchApiEnabled,
} from "@/server/search/public-search-api-platform";
import { searchCultivars } from "@/server/search/cultivar-search";

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

export async function GET(request: Request) {
  if (!isPublicSearchApiEnabled()) {
    return getPublicSearchApiDisabledResponse();
  }

  const { searchParams } = new URL(request.url);
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
    hasForSaleListings: getBooleanParam(searchParams, "hasForSaleListings"),
    hasPhoto: getBooleanParam(searchParams, "hasPhoto"),
    hasListings: getBooleanParam(searchParams, "hasListings"),
    hybridizer: searchParams.get("hybridizer") ?? undefined,
    limit: getNumberParam(searchParams, "limit"),
    listingDescription: searchParams.get("listingDescription") ?? undefined,
    listingLimit: getNumberParam(searchParams, "listingLimit"),
    listingTitle: searchParams.get("listingTitle") ?? undefined,
    parentage: searchParams.get("parentage") ?? undefined,
    ploidy: searchParams.get("ploidy") ?? undefined,
    priceMax: getNumberParam(searchParams, "priceMax"),
    priceMin: getNumberParam(searchParams, "priceMin"),
    q: searchParams.get("q") ?? undefined,
    scapeHeightMax: getNumberParam(searchParams, "scapeHeightMax"),
    scapeHeightMin: getNumberParam(searchParams, "scapeHeightMin"),
    yearMax: getNumberParam(searchParams, "yearMax"),
    yearMin: getNumberParam(searchParams, "yearMin"),
  });

  return NextResponse.json({
    results,
  });
}
