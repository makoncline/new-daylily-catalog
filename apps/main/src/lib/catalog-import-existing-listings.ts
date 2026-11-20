import type { CatalogImportPreparedListing } from "@/lib/catalog-importer";

type CatalogImportListingIdentity = Pick<
  CatalogImportPreparedListing,
  "title" | "cultivarReferenceId"
>;

export function normalizeCatalogImportName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function catalogImportListingKey(listing: CatalogImportListingIdentity) {
  return JSON.stringify([
    normalizeCatalogImportName(listing.title),
    listing.cultivarReferenceId,
  ]);
}
