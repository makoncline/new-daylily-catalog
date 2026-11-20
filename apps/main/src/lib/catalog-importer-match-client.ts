import { CATALOG_IMPORT_MATCH_BATCH_SIZE } from "@/config/catalog-importer";
import type { CultivarNameMatchResult } from "@/lib/catalog-importer";

async function requestCultivarMatchChunk({
  cultivarReferenceIds,
  includeCandidates,
  names,
  signal,
}: {
  cultivarReferenceIds?: Array<string | null>;
  includeCandidates: boolean;
  names: string[];
  signal?: AbortSignal;
}) {
  const response = await fetch("/api/v1/cultivars/match", {
    body: JSON.stringify({
      cultivarReferenceIds,
      includeCandidates,
      names,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
    signal,
  });
  const payload = (await response.json()) as {
    error?: string;
    message?: string;
    results?: CultivarNameMatchResult[];
  };

  if (!response.ok || !payload.results) {
    throw new Error(
      payload.message ?? payload.error ?? "Cultivar matching failed.",
    );
  }

  return payload.results;
}

export async function requestCultivarMatches({
  names,
  cultivarReferenceIds,
  includeCandidates,
  signal,
}: {
  cultivarReferenceIds?: Array<string | null>;
  includeCandidates: boolean;
  names: string[];
  signal?: AbortSignal;
}) {
  const results: CultivarNameMatchResult[] = [];
  for (let offset = 0; offset < names.length; ) {
    let end = offset;
    let characters = 0;
    while (
      end < names.length &&
      end - offset < CATALOG_IMPORT_MATCH_BATCH_SIZE &&
      characters + names[end]!.length <= 30_000
    ) {
      characters += names[end]!.length;
      end++;
    }
    if (end === offset)
      throw new Error("A name is too long to check. Shorten it and retry.");
    signal?.throwIfAborted();
    const chunk = await requestCultivarMatchChunk({
      names: names.slice(offset, end),
      cultivarReferenceIds: cultivarReferenceIds?.slice(offset, end),
      includeCandidates,
      signal,
    });
    if (chunk.length !== end - offset) {
      throw new Error(
        "The name check returned incomplete results. Select Check names to retry.",
      );
    }
    results.push(...chunk);
    offset = end;
  }
  return results;
}
