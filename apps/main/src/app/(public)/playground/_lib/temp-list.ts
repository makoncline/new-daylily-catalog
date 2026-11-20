import { z } from "zod";
import { listingFormSchema } from "@/types/schemas/listing";
import {
  MAX_CULTIVAR_MATCH_NAME_LENGTH,
  CATALOG_LISTING_HEADERS,
  createCatalogListingCells,
  normalizeCatalogListNames,
  parsePriceValue,
  type CatalogImportPreparedListing,
  type CultivarMatchCandidate,
  type CultivarNameMatchResult,
  type ParsedSpreadsheet,
} from "@/lib/catalog-importer";
import type { CatalogSearchListingRow } from "@/components/public-catalog-search/public-catalog-search-columns";
import {
  getCultivarImage,
  getCultivarTraitSummary,
} from "@/lib/catalog-presentation";
import { MAX_CATALOG_IMPORT_ROWS_PER_SHEET } from "@/lib/catalog-importer-file";
import { requestCultivarMatches } from "@/lib/catalog-importer-match-client";

export const TEMP_TEXT_CARD_COLORS = {
  print: { background: "#ffffff", ink: "#193124" },
  share: { background: "#07120e", ink: "#f7f5ec" },
};

export const TEMP_LIST_CULTIVAR_HEADERS = [
  "Registered name",
  "Hybridizer",
  "Year",
  "Scape height (in)",
  "Bloom size (in)",
  "Bloom season",
  "Form",
  "Ploidy",
  "Foliage type",
  "Bloom habit",
  "Rebloom",
  "Bud count",
  "Branches",
  "Fragrance",
  "Parentage",
  "Color",
  "Sculpted types",
  "Awards",
  "Flower show",
] as const;

export const TEMP_LIST_STORAGE_KEY = "daylily-catalog:temp-list";
export const MAX_TEMP_LISTINGS = MAX_CATALOG_IMPORT_ROWS_PER_SHEET;
export const tempListingSchema = z.object({
  id: z.string(),
  name: listingFormSchema.shape.title.unwrap(),
  price: listingFormSchema.shape.price.unwrap().unwrap().nullable(),
  description: listingFormSchema.shape.description.unwrap().unwrap(),
  privateNote: listingFormSchema.shape.privateNote.unwrap().unwrap(),
  lists: z.array(z.string()).optional(),
  cultivarReferenceId: z.string().nullable(),
  extraFields: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .optional(),
});
// Storage reads must not reject saved rows because input limits changed.
export const tempListSchema = z.array(tempListingSchema);
export const tempListingInputSchema = tempListingSchema.extend({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(200, "Use 200 characters or fewer."),
  description: z.string().max(10_000, "Use 10,000 characters or fewer."),
  privateNote: z.string().max(10_000, "Use 10,000 characters or fewer."),
  lists: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(200, "Use 200 characters or fewer for each list name."),
    )
    .max(100, "Use 100 lists or fewer for each row.")
    .optional(),
});
export type TempListing = z.infer<typeof tempListingSchema>;
export type TempListingDraft = Omit<TempListing, "price"> & { price: string };
export type TempImportField =
  | "name"
  | "lists"
  | "price"
  | "description"
  | "privateNote"
  | "cultivarReferenceId";
export interface TempFieldError {
  field: TempImportField;
  message: string;
}
export interface TempImportIssue {
  id: string;
  name: string;
  draft: TempListingDraft;
  errors: TempFieldError[];
  rowNumber?: number;
  preserveLinks: boolean;
  preserveNames?: boolean;
}
export function toTempListingDraft(listing: TempListing): TempListingDraft {
  return {
    ...listing,
    price: listing.price === null ? "" : String(listing.price),
  };
}
export function createTempImportIssue(
  draft: TempListingDraft,
  errors: TempFieldError[],
  rowNumber?: number,
  preserveLinks = false,
): TempImportIssue {
  return {
    id: draft.id,
    name:
      draft.name.trim() || (rowNumber ? `Row ${rowNumber}` : "Unnamed flower"),
    draft,
    errors,
    rowNumber,
    preserveLinks,
  };
}
export function validateTempListingDraft(
  draft: TempListingDraft,
  rowNumber?: number,
  preserveLinks = false,
):
  | { success: true; listing: TempListing }
  | { success: false; issue: TempImportIssue } {
  const price = parsePriceValue(draft.price);
  const parsed = tempListingInputSchema.safeParse({
    ...draft,
    name: draft.name.trim(),
    price: price.price,
    cultivarReferenceId: (draft.cultivarReferenceId ?? "").trim() || null,
  });
  const errors: TempFieldError[] = price.warning
    ? [{ field: "price", message: "Use zero or a positive price." }]
    : [];
  if (!parsed.success) {
    const fields: TempImportField[] = [
      "name",
      "lists",
      "price",
      "description",
      "privateNote",
      "cultivarReferenceId",
    ];
    for (const field of fields)
      for (const issue of parsed.error.issues.filter(
        (issue) => issue.path[0] === field,
      ))
        errors.push({ field, message: issue.message });
  }
  if (parsed.success && !errors.length)
    return { success: true, listing: parsed.data };
  return {
    success: false,
    issue: createTempImportIssue(draft, errors, rowNumber, preserveLinks),
  };
}
export interface TempInputBatch {
  listings: TempListing[];
  issues?: TempImportIssue[];
  preserveLinks?: boolean;
  preserveNames?: boolean;
}
export interface TempPreviewRow extends CatalogSearchListingRow {
  listing: TempListing;
  match: CultivarMatchCandidate | null;
}

export function getTempCultivarQueryKey(listings: TempListing[]) {
  return [
    "temp-list-cultivars",
    [
      ...new Set(
        listings.flatMap((listing) =>
          listing.cultivarReferenceId ? [listing.cultivarReferenceId] : [],
        ),
      ),
    ].sort(),
  ] as const;
}

export function createTempListing(name: string): TempListing {
  return {
    id: crypto.randomUUID(),
    name,
    price: null,
    description: "",
    privateNote: "",
    cultivarReferenceId: null,
  };
}

export async function matchTempListings(
  listings: TempListing[],
  {
    signal,
    includeCandidates = false,
    preserveLinks = false,
  }: {
    signal?: AbortSignal;
    includeCandidates?: boolean;
    preserveLinks?: boolean;
  } = {},
): Promise<CultivarNameMatchResult[]> {
  const queries = listings
    .map((listing, index) => ({ listing, index }))
    .filter(
      ({ listing }) =>
        Boolean(listing.cultivarReferenceId) ||
        (!preserveLinks &&
          listing.name.length <= MAX_CULTIVAR_MATCH_NAME_LENGTH),
    );
  const results = queries.length
    ? await requestCultivarMatches({
        names: queries.map(({ listing }) =>
          listing.cultivarReferenceId ? "Linked cultivar" : listing.name,
        ),
        cultivarReferenceIds: queries.map(
          ({ listing }) => listing.cultivarReferenceId,
        ),
        includeCandidates,
        signal,
      })
    : [];
  const byIndex = new Map(
    queries.map(({ index }, offset) => [index, results[offset]]),
  );
  return listings.map((listing, index) => ({
    inputCultivarReferenceId: listing.cultivarReferenceId,
    normalizedInput: null,
    candidates: [],
    exactMatch: null,
    ...byIndex.get(index),
    inputName: listing.name,
  }));
}

export function getTempDescription(
  listing: TempListing,
  match: CultivarMatchCandidate | null,
) {
  return (
    listing.description ||
    (match ? getCultivarTraitSummary(match).join(" · ") : "")
  );
}

export function toTempPreviewRow(
  listing: TempListing,
  match: CultivarMatchCandidate | null,
): TempPreviewRow {
  const image = getCultivarImage(match);
  return {
    listing,
    match,
    title: listing.name,
    description: listing.description,
    price: listing.price,
    lists: (listing.lists ?? []).map((title) => ({ id: title, title })),
    images: image ? [image] : [],
    cultivarReference: match
      ? {
          ahsListing: { name: match.displayName },
          normalizedName: match.normalizedName,
        }
      : null,
    ahsListing: match
      ? {
          ...match,
          bloomSize: match.bloomSizeIn,
          scapeHeight: match.scapeHeightIn,
          budcount: match.budCount,
          bloomHabit: [match.bloomHabit, match.rebloom ? "Reblooms" : null]
            .filter(Boolean)
            .join(", "),
        }
      : null,
  };
}

export function prepareTempCatalogListing(
  listing: TempListing,
): CatalogImportPreparedListing {
  return {
    title: listing.name,
    cultivarReferenceId: listing.cultivarReferenceId,
    price: listing.price,
    description: listing.description || null,
    privateNote: listing.privateNote || null,
    lists: normalizeCatalogListNames(listing.lists ?? []),
  };
}

export function createTempListSpreadsheet(
  rows: TempPreviewRow[],
): ParsedSpreadsheet {
  const extraLabels = [
    ...new Set(
      rows.flatMap(({ listing }) =>
        (listing.extraFields ?? []).map((field) => field.label),
      ),
    ),
  ];
  return {
    fileName: "playground-catalog.xlsx",
    source: "manual",
    sheets: [
      {
        name: "Playground catalog",
        rows: [
          [
            ...CATALOG_LISTING_HEADERS,
            ...TEMP_LIST_CULTIVAR_HEADERS,
            ...extraLabels.map((label) => `Imported: ${label}`),
          ],
          ...rows.map(({ listing, match }) => [
            ...createCatalogListingCells(prepareTempCatalogListing(listing)),
            match?.displayName ?? null,
            match?.hybridizer ?? null,
            match?.year ?? null,
            match?.scapeHeightIn ?? null,
            match?.bloomSizeIn ?? null,
            match?.bloomSeason ?? null,
            match?.form ?? null,
            match?.ploidy ?? null,
            match?.foliageType ?? null,
            match?.bloomHabit ?? null,
            match?.rebloom ?? null,
            match?.budCount ?? null,
            match?.branches ?? null,
            match?.fragrance ?? null,
            match?.parentage ?? null,
            match?.color ?? null,
            match?.sculptedTypes ?? null,
            match?.awardNames ?? null,
            match?.flowerShow ?? null,
            ...extraLabels.map(
              (label) =>
                listing.extraFields?.find((field) => field.label === label)
                  ?.value ?? "",
            ),
          ]),
        ],
      },
    ],
  };
}
