import { z } from "zod";

export const CATALOG_IMPORT_BATCH_SIZE = 100;
export const CATALOG_IMPORT_BATCH_LIST_LIMIT = 100;

export const catalogImportCultivarIdSchema = z.string().min(1).max(200);

export const catalogImportRowSchema = z.strictObject({
  title: z
    .string()
    .trim()
    .min(1, "Cultivar name is required.")
    .max(200, "Cultivar name exceeds 200 characters."),
  price: z.number().nonnegative().nullable(),
  description: z
    .string()
    .trim()
    .max(10_000, "Description exceeds 10,000 characters.")
    .nullable(),
  privateNote: z
    .string()
    .trim()
    .max(10_000, "Private note exceeds 10,000 characters.")
    .nullable(),
  lists: z
    .array(
      z.string().trim().min(1).max(200, "A list name exceeds 200 characters."),
    )
    .max(CATALOG_IMPORT_BATCH_LIST_LIMIT, "A row can have at most 100 lists.")
    .default([]),
  cultivarReferenceId: catalogImportCultivarIdSchema.nullable(),
});

export type CatalogImportRowInput = z.output<typeof catalogImportRowSchema>;
