import { afterEach, describe, expect, it, vi } from "vitest";
import writeExcelFile from "write-excel-file/node";
import readExcelFile from "read-excel-file/node";
import {
  applyAutomaticCultivarMatches,
  createCatalogImportRows,
  getSourceColumns,
  suggestColumnMapping,
  prepareCatalogImportListing,
  type SpreadsheetCell,
  type CultivarMatchCandidate,
} from "@/lib/catalog-importer";
import {
  createTempListSpreadsheet,
  createTempListing,
  matchTempListings,
  MAX_TEMP_LISTINGS,
  tempListSchema,
  toTempPreviewRow,
} from "@/app/(public)/temp-list/_lib/temp-list";

afterEach(() => vi.unstubAllGlobals());

describe("temp list matching", () => {
  it("uses one exact lookup and rejects oversized lists before making a request", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ results: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const listings = Array.from({ length: MAX_TEMP_LISTINGS }, (_, index) =>
      createTempListing(`Flower ${index}`),
    );
    await matchTempListings(listings);
    expect(fetchMock).toHaveBeenCalledOnce();
    const requestBody = fetchMock.mock.calls[0]?.[1]?.body;
    if (typeof requestBody !== "string") throw new Error("Expected JSON body");
    const body: unknown = JSON.parse(requestBody);
    expect(body).toMatchObject({
      names: listings.map((listing) => listing.name),
      includeCandidates: false,
    });
    await expect(
      matchTempListings([...listings, createTempListing("One too many")]),
    ).rejects.toThrow("up to 100 flowers");
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

describe("temp list spreadsheet", () => {
  it("round trips restored browser fields through XLSX and import preparation", async () => {
    const saved = JSON.stringify([
      {
        id: "one",
        name: "Millions of Peaches - club stock",
        price: 15.5,
        description: "Peach blooms\nReady to divide",
        privateNote: "East garden\nrow 2",
        cultivarReferenceId: "peaches-reference",
      },
      {
        id: "two",
        name: "Seedling - 2",
        price: 0,
        description: "",
        privateNote: "Keep",
        cultivarReferenceId: null,
      },
    ]);
    const listings = tempListSchema.parse(JSON.parse(saved));
    const spreadsheet = createTempListSpreadsheet(
      listings.map((listing) => toTempPreviewRow(listing, null)),
    );
    const buffer = await writeExcelFile(
      spreadsheet.sheets.map((sheet) => ({
        sheet: sheet.name,
        data: sheet.rows,
      })),
    ).toBuffer();
    const output = await readExcelFile(buffer);
    const rows = output[0]!.data as SpreadsheetCell[][];
    const imported = createCatalogImportRows({
      rows,
      headerRowIndex: 0,
      mapping: suggestColumnMapping(rows, 0, getSourceColumns(rows, 0)),
    });
    const candidate: CultivarMatchCandidate = {
      cultivarReferenceId: "peaches-reference",
      displayName: "Millions of Peaches",
      normalizedName: "millions of peaches",
      confidence: 100,
      bloomSizeIn: null,
      bloomSeason: null,
      color: null,
      form: null,
      hybridizer: null,
      imageAsset: null,
      imageUrl: null,
      listingCount: 0,
      ploidy: null,
      rebloom: null,
      scapeHeightIn: null,
      year: null,
    };
    const matched = applyAutomaticCultivarMatches({
      rows: imported,
      automaticMatches: new Map(),
      cultivarReferenceMatches: new Map([
        [candidate.cultivarReferenceId, candidate],
      ]),
    });
    expect(matched.map(prepareCatalogImportListing)).toEqual(
      listings.map((listing) => ({
        title: listing.name,
        price: listing.price,
        description: listing.description || null,
        privateNote: listing.privateNote || null,
        cultivarReferenceId: listing.cultivarReferenceId,
      })),
    );
    expect(output[0]?.data).toHaveLength(3);
    expect(output[0]?.data[1]?.slice(0, 5)).toEqual([
      "Millions of Peaches - club stock",
      15.5,
      "Peach blooms\nReady to divide",
      "East garden\nrow 2",
      "peaches-reference",
    ]);
    expect(output[0]?.data[2]?.slice(0, 5)).toEqual([
      "Seedling - 2",
      0,
      null,
      "Keep",
      null,
    ]);
  });
});
