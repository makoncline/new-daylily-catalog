import type { CultivarNameMatchResult } from "@/lib/catalog-importer";

export async function requestCultivarMatches({
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
