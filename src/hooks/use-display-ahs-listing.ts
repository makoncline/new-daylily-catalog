"use client";

import { useMemo } from "react";
import {
  getDisplayAhsListing,
  type AhsDisplaySource,
  type WithDisplayAhsListing,
  withDisplayAhsListing,
  withDisplayAhsListings,
} from "@/lib/utils/ahs-display";

export function useDisplayAhsListing<TAhsListing>(
  source: AhsDisplaySource<TAhsListing>,
): TAhsListing | null {
  return useMemo(() => getDisplayAhsListing(source), [source]);
}

export function useListingWithDisplayAhs<
  TSource extends AhsDisplaySource<unknown>,
>(source: TSource): WithDisplayAhsListing<TSource> {
  return useMemo(() => withDisplayAhsListing(source), [source]);
}

export function useListingsWithDisplayAhs<
  TSource extends AhsDisplaySource<unknown>,
>(sources: TSource[] | undefined): WithDisplayAhsListing<TSource>[] {
  return useMemo(
    () => withDisplayAhsListings(sources ?? []),
    [sources],
  );
}
