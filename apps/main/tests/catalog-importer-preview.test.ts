import { describe, expect, it } from "vitest";
import {
  getCatalogPreviewDescription,
  getCatalogPreviewImage,
} from "@/app/(public)/catalog-importer/_components/catalog-importer-catalog-preview";
import type { CatalogImportRow } from "@/lib/catalog-importer";

function previewRow(
  overrides: Partial<CatalogImportRow> = {},
): CatalogImportRow {
  return {
    cultivarReferenceIdWarning: null,
    description: "Seller description",
    duplicateAccepted: false,
    duplicateOfSourceRow: null,
    id: "row-1",
    imageUrl: "https://seller.example/listing.jpg",
    imageUrlWarning: null,
    match: {
      bloomSizeIn: 6,
      bloomSeason: "Midseason",
      color: "Purple",
      confidence: 100,
      cultivarReferenceId: "cultivar-1",
      displayName: "Vanguard",
      form: "Single",
      hybridizer: "Stamile",
      imageAsset: {
        blurUrl: "https://media.example/blur.jpg",
        displayUrl: "https://media.example/display.jpg",
        id: "asset-1",
        originalUrl: "https://media.example/original.jpg",
        status: "ready",
        thumbUrl: "https://media.example/thumb.jpg",
      },
      imageUrl: "https://media.example/display.jpg",
      listingCount: 1,
      normalizedName: "vanguard",
      ploidy: "Tetraploid",
      rebloom: true,
      scapeHeightIn: 30,
      year: 2017,
    },
    matchStatus: "exact",
    price: 25,
    priceWarning: null,
    privateNote: "",
    removed: false,
    skipped: false,
    sourceCultivarReferenceId: "",
    sourceImageUrl: "https://seller.example/listing.jpg",
    sourcePrice: "25",
    sourceRow: 2,
    sourceTitle: "VANGUARD",
    suggestedMatch: null,
    title: "Vanguard",
    ...overrides,
  };
}

describe("catalog importer preview content", () => {
  it("uses seller fields first and cultivar reference data as fallback", () => {
    const row = previewRow();

    expect(getCatalogPreviewImage(row)).toEqual({
      id: "uploaded-row-1",
      url: "https://seller.example/listing.jpg",
    });
    expect(getCatalogPreviewDescription(row)).toBe("Seller description");

    const fallbackRow = previewRow({ description: "", imageUrl: "" });
    expect(getCatalogPreviewImage(fallbackRow)).toMatchObject({
      id: "asset-1",
      url: "https://media.example/display.jpg",
    });
    expect(getCatalogPreviewDescription(fallbackRow)).toContain("Purple");
  });
});
