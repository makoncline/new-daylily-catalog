import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "@/env";
import { reportError } from "@/lib/error-utils";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import { searchCultivars } from "@/server/search/cultivar-search";
import {
  buildPublicSearchCandidate,
  checkPublicSearchCandidate,
  getPublicSearchCandidatePath,
} from "@/server/search/public-search-candidate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function authorize(request: Request) {
  const token = env.SEARCH_INDEX_CANDIDATE_TOKEN;
  if (!token || token.length < 32 || process.env.VERCEL === "1")
    return json({ error: "disabled" }, 404);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${token}`);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return json({ error: "unauthorized" }, 401);
  }
}

function failed(error: unknown) {
  reportError({ error, context: { source: "search-candidate" } });
  return json({ error: "candidate_operation_failed" }, 500);
}

// Call through the running app so the existing singleton owns replica access.
export async function POST(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;
  try {
    const result = await buildPublicSearchCandidate();
    return json({
      cultivars: result.cultivars,
      linkedListings: result.linkedListings,
      elapsedMs: result.elapsedMs,
      quickCheck: result.quickCheck,
      schemaVersion: result.schemaVersion,
    });
  } catch (error) {
    return failed(error);
  }
}

const querySchema = z
  .object({
    q: z.string().max(128).optional(),
    hybridizer: z.string().max(128).optional(),
    award: z.string().max(128).optional(),
  })
  .strict();

export async function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;
  const parsed = querySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success) return json({ error: "invalid_query" }, 400);
  try {
    const index = await checkPublicSearchCandidate();
    if (!index.exists) return json({ index }, 404);
    const results = await searchCultivars(
      {
        ...parsed.data,
        baseUrl: getCanonicalBaseUrl(),
        includeParentageTrees: false,
        listingLimit: 0,
        limit: 25,
        prefixLastToken: true,
        sort: parsed.data.q ? "relevance" : "name",
      },
      getPublicSearchCandidatePath(),
    );
    return json({ index, results });
  } catch (error) {
    return failed(error);
  }
}
