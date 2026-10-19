import { z } from "zod";

export const CATALOG_IMPORTER_ENTRY_SOURCE = "catalog_importer";
export const CATALOG_IMPORTER_RETURN_PATH = "/catalog-importer";
export const CATALOG_IMPORTER_MEMBERSHIP_RETURN_PATH = "/dashboard/imports";

export const catalogImporterImportIdSchema = z.string().trim().min(1).max(100);

export const catalogImporterCheckoutSourceSchema = z
  .object({
    importId: catalogImporterImportIdSchema,
    entrySource: z.literal(CATALOG_IMPORTER_ENTRY_SOURCE),
    returnTo: z.literal(CATALOG_IMPORTER_RETURN_PATH),
  })
  .strict();

export type CatalogImporterCheckoutSource = z.infer<
  typeof catalogImporterCheckoutSourceSchema
>;

export function createCatalogImporterCheckoutSource(
  importId: string,
): CatalogImporterCheckoutSource {
  return catalogImporterCheckoutSourceSchema.parse({
    importId,
    entrySource: CATALOG_IMPORTER_ENTRY_SOURCE,
    returnTo: CATALOG_IMPORTER_RETURN_PATH,
  });
}

export const catalogImporterViewerStateSchema = z.enum([
  "anonymous",
  "signed_in_nonpro",
  "pro",
]);

export type CatalogImporterViewerState = z.infer<
  typeof catalogImporterViewerStateSchema
>;

export const catalogImporterViewerResponseSchema = z
  .object({
    viewerState: catalogImporterViewerStateSchema,
  })
  .strict();

export type CatalogImporterViewerResolution =
  | { status: "checking" }
  | { status: "unavailable" }
  | {
      status: "ready";
      viewerState: CatalogImporterViewerState;
    };
