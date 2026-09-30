import { z } from "zod";
import type {
  CultivarMatchCandidate,
  ParsedSpreadsheet,
} from "@/lib/catalog-importer";
import type { CatalogSearchListingRow } from "@/components/public-catalog-search/public-catalog-search-columns";
import { getCultivarImage } from "@/app/(public)/catalog-importer/_lib/catalog-importer-presentation";
import { requestCultivarMatches } from "@/lib/catalog-importer-match-client";

// Match the existing cultivar social card palette.
export const TEMP_TEXT_CARD_COLORS = {
  print: { background: "#ffffff", ink: "#193124" },
  share: { background: "#07120e", ink: "#f7f5ec" },
};

export const TEMP_LIST_STORAGE_KEY = "daylily-catalog:temp-list";
export const MAX_TEMP_LISTINGS = 100;
export const tempListingSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(160),
  price: z.number().finite().nonnegative().nullable(),
  description: z.string(),
  privateNote: z.string(),
  cultivarReferenceId: z.string().nullable(),
});
export const tempListSchema = z.array(tempListingSchema).max(MAX_TEMP_LISTINGS);
export type TempListing = z.infer<typeof tempListingSchema>;
export interface TempPreviewRow extends CatalogSearchListingRow {
  listing: TempListing;
  match: CultivarMatchCandidate | null;
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
  signal?: AbortSignal,
) {
  if (listings.length > MAX_TEMP_LISTINGS) {
    throw new Error(
      `A temp list can contain up to ${MAX_TEMP_LISTINGS} flowers.`,
    );
  }
  return requestCultivarMatches({
    names: listings.map((row) => row.name),
    cultivarReferenceIds: listings.map((row) => row.cultivarReferenceId),
    includeCandidates: false,
    signal,
  });
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
    lists: [],
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

export function createTempListSpreadsheet(
  rows: TempPreviewRow[],
): ParsedSpreadsheet {
  return {
    fileName: "temp-list.xlsx",
    source: "manual",
    sheets: [
      {
        name: "Temp list",
        rows: [
          [
            "Cultivar name",
            "Price",
            "Description",
            "Private note",
            "Cultivar reference ID",
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
          ],
          ...rows.map(({ listing, match }) => [
            listing.name,
            listing.price,
            listing.description,
            listing.privateNote,
            listing.cultivarReferenceId,
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
          ]),
        ],
      },
    ],
  };
}
