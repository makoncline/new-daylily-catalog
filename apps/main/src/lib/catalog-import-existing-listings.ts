import type { CatalogImportPreparedListing } from "@/lib/catalog-importer";

export type CatalogImportComparableListing = Pick<
  CatalogImportPreparedListing,
  "cultivarReferenceId" | "title" | "price" | "description" | "privateNote"
>;

export interface CatalogImportExistingListing
  extends CatalogImportComparableListing {
  id: string;
}

export type CatalogImportExistingListingMatch =
  | { kind: "none"; listings: [] }
  | {
      kind: "duplicate" | "ambiguous";
      listings: CatalogImportExistingListing[];
    };

export function normalizeCatalogImportName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function getCatalogImportExistingListingMatch(
  incoming: CatalogImportComparableListing,
  existingListings: CatalogImportExistingListing[],
): CatalogImportExistingListingMatch {
  const matches = existingListings.filter((existing) => {
    return (
      incoming.cultivarReferenceId === existing.cultivarReferenceId &&
      incoming.title.trim() === existing.title.trim() &&
      incoming.price === existing.price &&
      (incoming.description ?? "").trim() ===
        (existing.description ?? "").trim() &&
      (incoming.privateNote ?? "").trim() ===
        (existing.privateNote ?? "").trim()
    );
  });

  if (matches.length === 0) return { kind: "none", listings: [] };
  return {
    kind: matches.length === 1 ? "duplicate" : "ambiguous",
    listings: matches,
  };
}
