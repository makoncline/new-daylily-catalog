import { publicDb } from "@/server/db";
import { publicJson, publicReadResponse } from "@/server/api/public-http";
import {
  pagePublicProfiles,
  publicProfilePageSchema,
} from "@/server/services/public-profile-search";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const seen = new Set<string>();
  const entries: Array<[string, unknown]> = [];
  for (const [key, value] of params) {
    if (seen.has(key)) return publicJson({ error: "invalid_query" }, 400);
    seen.add(key);
    entries.push([key, key === "limit" ? Number(value) : value]);
  }
  const input = publicProfilePageSchema.safeParse(Object.fromEntries(entries));
  if (!input.success) return publicJson({ error: "invalid_query" }, 400);
  return publicReadResponse("public-profiles-api", () =>
    pagePublicProfiles({ database: publicDb, input: input.data }),
  );
}
