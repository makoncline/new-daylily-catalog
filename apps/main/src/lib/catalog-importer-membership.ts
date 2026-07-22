export const CATALOG_IMPORTER_ENTRY_SOURCE = "catalog_importer";
export const CATALOG_IMPORTER_RETURN_PATH = "/catalog-importer";
export const CATALOG_IMPORTER_MEMBERSHIP_RETURN_PATH =
  "/dashboard/imports?membership_started=1";

export type CatalogImporterViewerState =
  | "anonymous"
  | "signed_in_nonpro"
  | "pro"
  | "unknown";
