import { NextResponse } from "next/server";
import {
  getPublicSearchApiDisabledResponse,
  isPublicSearchApiEnabled,
  toPublicSearchStatus,
} from "@/server/search/public-search-api-platform";
import {
  searchCultivarFacetValues,
  type CultivarSearchFacet,
} from "@/server/search/cultivar-search";
import { PublicSearchIndexUnavailableError } from "@/server/search/public-search-index";

export const runtime = "nodejs";

function isCultivarSearchFacet(
  value: string | null,
): value is CultivarSearchFacet {
  return (
    value === "award" ||
    value === "flowerShow" ||
    value === "hybridizer" ||
    value === "sculptedType"
  );
}

export async function GET(request: Request) {
  if (!isPublicSearchApiEnabled()) {
    return getPublicSearchApiDisabledResponse();
  }

  const { searchParams } = new URL(request.url);
  const facet = searchParams.get("facet");
  if (!isCultivarSearchFacet(facet)) {
    return NextResponse.json(
      {
        error: "invalid_facet",
        message:
          "Facet must be award, flowerShow, hybridizer, or sculptedType.",
      },
      { status: 400 },
    );
  }

  try {
    const options = await searchCultivarFacetValues({
      facet,
      query: searchParams.get("q") ?? undefined,
    });
    return NextResponse.json({ options });
  } catch (error) {
    if (error instanceof PublicSearchIndexUnavailableError) {
      return NextResponse.json(
        {
          error: "public_search_index_unavailable",
          message: "The public search index is building. Try again shortly.",
          searchIndex: toPublicSearchStatus(error.status),
        },
        {
          headers: { "Retry-After": "30" },
          status: 503,
        },
      );
    }

    throw error;
  }
}
