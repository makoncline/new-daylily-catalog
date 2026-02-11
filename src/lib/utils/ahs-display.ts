export interface AhsDisplaySource<TAhsListing> {
  ahsListing?: TAhsListing | null;
  cultivarReference?: {
    ahsListing?: TAhsListing | null;
  } | null;
}

export type WithDisplayAhsListing<
  TSource extends AhsDisplaySource<unknown>,
> = Omit<TSource, "ahsListing"> & {
  ahsListing: NonNullable<TSource["cultivarReference"]> extends {
    ahsListing?: infer TAhsListing | null;
  }
    ? TAhsListing | null
    : TSource["ahsListing"];
};

export function getDisplayAhsListing<TAhsListing>(
  source: AhsDisplaySource<TAhsListing>,
): TAhsListing | null {
  return source.cultivarReference?.ahsListing ?? null;
}

export function withDisplayAhsListing<TSource extends AhsDisplaySource<unknown>>(
  source: TSource,
): WithDisplayAhsListing<TSource> {
  return {
    ...source,
    ahsListing: getDisplayAhsListing(source),
  } as WithDisplayAhsListing<TSource>;
}

export function withDisplayAhsListings<TSource extends AhsDisplaySource<unknown>>(
  sources: TSource[],
): WithDisplayAhsListing<TSource>[] {
  return sources.map((source) => withDisplayAhsListing(source));
}
