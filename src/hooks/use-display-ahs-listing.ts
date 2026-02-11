"use client";

import { useMemo } from "react";
import { useCultivarReferenceLinkingEnabled } from "@/hooks/use-cultivar-reference-linking-enabled";
import {
  getDisplayAhsListing,
  type AhsDisplaySource,
  withDisplayAhsListing,
  withDisplayAhsListings,
} from "@/lib/utils/ahs-display";

export function useDisplayAhsListing<TAhsListing>(
  source: AhsDisplaySource<TAhsListing>,
): TAhsListing | null {
  const cultivarReferenceLinkingEnabled = useCultivarReferenceLinkingEnabled();

  return useMemo(
    () => getDisplayAhsListing(source, cultivarReferenceLinkingEnabled),
    [source, cultivarReferenceLinkingEnabled],
  );
}

export function useListingWithDisplayAhs<
  TSource extends AhsDisplaySource<unknown>,
>(source: TSource): TSource {
  const cultivarReferenceLinkingEnabled = useCultivarReferenceLinkingEnabled();

  return useMemo(
    () => withDisplayAhsListing(source, cultivarReferenceLinkingEnabled),
    [source, cultivarReferenceLinkingEnabled],
  );
}

export function useListingsWithDisplayAhs<
  TSource extends AhsDisplaySource<unknown>,
>(sources: TSource[] | undefined): TSource[] {
  const cultivarReferenceLinkingEnabled = useCultivarReferenceLinkingEnabled();

  return useMemo(
    () =>
      withDisplayAhsListings(
        sources ?? [],
        cultivarReferenceLinkingEnabled,
      ),
    [sources, cultivarReferenceLinkingEnabled],
  );
}

