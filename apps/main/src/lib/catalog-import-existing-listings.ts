import { normalizeCultivarName } from "@/lib/utils/cultivar-utils";

export interface CatalogImportComparableListing {
  cultivarReferenceId: string | null;
  description: string | null;
  price: number | null;
  privateNote: string | null;
  title: string;
}

export interface CatalogImportExistingListing
  extends CatalogImportComparableListing {
  id: string;
}

export type CatalogImportExistingListingMatch =
  | { kind: "none"; listings: [] }
  | {
      kind: "exact" | "possible";
      listings: CatalogImportExistingListing[];
    };

function normalizeText(value: string | null) {
  return value?.trim() ?? "";
}

function sameIdentity(
  incoming: CatalogImportComparableListing,
  existing: CatalogImportExistingListing,
) {
  if (incoming.cultivarReferenceId && existing.cultivarReferenceId) {
    return incoming.cultivarReferenceId === existing.cultivarReferenceId;
  }

  const incomingName = normalizeCultivarName(incoming.title);
  return (
    (incomingName?.length ?? 0) > 0 &&
    incomingName === normalizeCultivarName(existing.title)
  );
}

export function getCatalogImportExistingListingDifferences(
  incoming: CatalogImportComparableListing,
  existing: CatalogImportExistingListing,
) {
  const differences: string[] = [];

  if (
    normalizeCultivarName(incoming.title) !==
    normalizeCultivarName(existing.title)
  ) {
    differences.push("name");
  }
  if (incoming.cultivarReferenceId !== existing.cultivarReferenceId) {
    differences.push("cultivar link");
  }
  if (incoming.price !== existing.price) {
    differences.push("price");
  }
  if (
    normalizeText(incoming.description) !== normalizeText(existing.description)
  ) {
    differences.push("description");
  }
  if (
    normalizeText(incoming.privateNote) !== normalizeText(existing.privateNote)
  ) {
    differences.push("private note");
  }

  return differences;
}

export function getCatalogImportExistingListingMatch(
  incoming: CatalogImportComparableListing,
  existingListings: CatalogImportExistingListing[],
): CatalogImportExistingListingMatch {
  const identityMatches = existingListings.filter((listing) =>
    sameIdentity(incoming, listing),
  );
  if (identityMatches.length === 0) {
    return { kind: "none", listings: [] };
  }

  const exactMatches = identityMatches.filter(
    (listing) =>
      getCatalogImportExistingListingDifferences(incoming, listing).length ===
      0,
  );

  return exactMatches.length > 0
    ? { kind: "exact", listings: exactMatches }
    : { kind: "possible", listings: identityMatches };
}
