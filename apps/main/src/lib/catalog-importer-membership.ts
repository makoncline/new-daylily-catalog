import { z } from "zod";

export const CATALOG_IMPORTER_ENTRY_SOURCE = "catalog_importer";
export const CATALOG_IMPORTER_RETURN_PATH = "/catalog-importer";
export const CATALOG_IMPORTER_MEMBERSHIP_RETURN_PATH = "/dashboard/imports";

export const catalogImporterConversionIdSchema = z.string().uuid();

export const catalogImporterCheckoutSourceSchema = z
  .object({
    conversionId: catalogImporterConversionIdSchema,
    entrySource: z.literal(CATALOG_IMPORTER_ENTRY_SOURCE),
    returnTo: z.literal(CATALOG_IMPORTER_RETURN_PATH),
  })
  .strict();

export type CatalogImporterCheckoutSource = z.infer<
  typeof catalogImporterCheckoutSourceSchema
>;

export function createCatalogImporterCheckoutSource(
  conversionId: string,
): CatalogImporterCheckoutSource {
  return catalogImporterCheckoutSourceSchema.parse({
    conversionId,
    entrySource: CATALOG_IMPORTER_ENTRY_SOURCE,
    returnTo: CATALOG_IMPORTER_RETURN_PATH,
  });
}

export function createCatalogImporterCheckoutPath(conversionId: string) {
  const source = createCatalogImporterCheckoutSource(conversionId);
  const params = new URLSearchParams({
    conversion_id: source.conversionId,
    entry: source.entrySource,
    return_to: source.returnTo,
  });
  return `/catalog-importer/checkout?${params.toString()}`;
}

export function parseCatalogImporterCheckoutSource(params: {
  conversion_id?: string | string[];
  entry?: string | string[];
  return_to?: string | string[];
}) {
  const parsed = catalogImporterCheckoutSourceSchema.safeParse({
    conversionId: params.conversion_id,
    entrySource: params.entry,
    returnTo: params.return_to,
  });
  return parsed.success ? parsed.data : null;
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
