import { isCultivarReferenceLinkingEnabled } from "@/lib/cultivar-reference-linking";

export interface AhsDisplaySource<TAhsListing> {
  ahsListing?: TAhsListing | null;
  cultivarReference?: {
    ahsListing?: TAhsListing | null;
  } | null;
}

export function getDisplayAhsListing<TAhsListing>(
  source: AhsDisplaySource<TAhsListing>,
  cultivarReferenceLinkingEnabled = isCultivarReferenceLinkingEnabled(),
): TAhsListing | null {
  // Baseline-cutover cleanup:
  // After AHS V2 is fully rolled out, remove this branch and always return
  // `source.cultivarReference?.ahsListing ?? null`.
  if (!cultivarReferenceLinkingEnabled) {
    return source.ahsListing ?? null;
  }

  return source.cultivarReference?.ahsListing ?? source.ahsListing ?? null;
}

export function withDisplayAhsListing<TSource extends AhsDisplaySource<unknown>>(
  source: TSource,
  cultivarReferenceLinkingEnabled = isCultivarReferenceLinkingEnabled(),
): TSource {
  return {
    ...source,
    ahsListing: getDisplayAhsListing(source, cultivarReferenceLinkingEnabled),
  };
}

export function withDisplayAhsListings<TSource extends AhsDisplaySource<unknown>>(
  sources: TSource[],
  cultivarReferenceLinkingEnabled = isCultivarReferenceLinkingEnabled(),
): TSource[] {
  return sources.map((source) =>
    withDisplayAhsListing(source, cultivarReferenceLinkingEnabled),
  );
}
