import { publicDb } from "@/server/db";
import { publicJson, publicReadResponse } from "@/server/api/public-http";
import {
  publicListingSearchSchema,
  searchPublicListings,
} from "@/server/services/public-listing-search";

export const runtime = "nodejs";

const booleanFields = new Set(["hasPhoto", "hasPrice"]);
const numberFields = new Set(["limit", "priceMax", "priceMin"]);
function parseQuery(params: URLSearchParams) {
  const input: Record<string, unknown> = {};
  for (const [key, value] of params) {
    if (key in input) return null;
    if (booleanFields.has(key)) {
      if (value !== "true" && value !== "false") return null;
      input[key] = value === "true";
    } else if (numberFields.has(key)) {
      if (!value.trim()) return null;
      input[key] = Number(value);
    } else {
      input[key] = value;
    }
  }
  const parsed = publicListingSearchSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

export async function GET(request: Request) {
  const input = parseQuery(new URL(request.url).searchParams);
  if (!input) return publicJson({ error: "invalid_query" }, 400);
  return publicReadResponse("public-listings-api", () =>
    searchPublicListings({ database: publicDb, input }),
  );
}
