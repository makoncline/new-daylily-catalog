import { describe, expect, it } from "vitest";
import {
  applyAutomaticCultivarMatches,
  createCatalogImportCsv,
  createCatalogImportRows,
  createCatalogImportTemplateCsv,
  detectHeaderRow,
  getAutomaticCultivarMatch,
  getSourceColumns,
  suggestColumnMapping,
  type SpreadsheetCell,
} from "@/lib/catalog-importer";
import { getCultivarMatchConfidence } from "@/lib/cultivar-match-score";

describe("catalog importer normalization", () => {
  it("infers a headerless name-location-price sheet and removes inventory suffixes", () => {
    const rows: SpreadsheetCell[][] = [
      [" ", " ", " "],
      ["50,000 WATTS - 2", "H R18", 35],
      ["A MEMORY OF ERNEST YEARWOOD - 8", "A R9", 25],
      ["50,000 WATTS - 4", "H R19", "0/$10"],
    ];
    const headerRowIndex = detectHeaderRow(rows);
    const columns = getSourceColumns(rows, headerRowIndex);
    const mapping = suggestColumnMapping(rows, headerRowIndex, columns);
    const importedRows = createCatalogImportRows({
      headerRowIndex,
      mapping: { ...mapping, price: 2, privateNote: 1 },
      rows,
    });

    expect(headerRowIndex).toBeNull();
    expect(mapping).toMatchObject({
      price: null,
      privateNote: null,
      title: 0,
    });
    expect(importedRows[0]).toMatchObject({
      price: 35,
      privateNote: "H R18",
      sourceRow: 2,
      sourceTitle: "50,000 WATTS - 2",
      title: "50,000 WATTS",
    });
    expect(importedRows[2]).toMatchObject({
      duplicateOfSourceRow: 2,
      price: null,
      priceWarning: "0/$10",
      privateNote: "H R19",
    });
  });

  it("maps a wide headed sheet to the listing fields and exports canonical matches", () => {
    const header = Array.from<SpreadsheetCell>({ length: 17 }).fill(null);
    header[3] = "Cultivar";
    header[12] = "Description";
    header[16] = "Price";
    const data = Array.from<SpreadsheetCell>({ length: 17 }).fill(null);
    data[3] = "A.W. Shucks";
    data[12] = "Spider, dark red";
    data[16] = 25;
    const rows = [header, data];
    const headerRowIndex = detectHeaderRow(rows);
    const mapping = suggestColumnMapping(rows, headerRowIndex);
    const importedRows = createCatalogImportRows({
      headerRowIndex,
      mapping: { ...mapping, description: 12, price: 16 },
      rows,
    });
    const matchedRows = importedRows.map((row) => ({
      ...row,
      match: {
        bloomSizeIn: 5,
        bloomSeason: "Midseason",
        color: "Red",
        confidence: 98,
        cultivarReferenceId: "cultivar-1",
        displayName: "A. W. Shucks",
        form: "Spider",
        hybridizer: "Herrington",
        imageAsset: null,
        imageUrl: "https://media.daylilycatalog.com/cultivar-1.jpg",
        listingCount: 2,
        normalizedName: "a. w. shucks",
        ploidy: "Diploid",
        rebloom: true,
        scapeHeightIn: 34,
        year: 2014,
      },
      matchStatus: "selected" as const,
    }));
    const csv = createCatalogImportCsv(matchedRows);

    expect(headerRowIndex).toBe(0);
    expect(mapping).toMatchObject({
      description: null,
      price: null,
      title: 3,
    });
    expect(csv).toBe(
      [
        "name,price,description,privateNote,cultivarReferenceId,cultivarUrl",
        'A. W. Shucks,25,"Spider, dark red",,cultivar-1,https://daylilycatalog.com/cultivar/a~2e-w~2e-shucks',
      ].join("\r\n"),
    );
  });

  it("maps every field in the downloadable template", () => {
    const rows: SpreadsheetCell[][] = createCatalogImportTemplateCsv()
      .split(/\r?\n/)
      .map((row) => row.split(","));
    const headerRowIndex = detectHeaderRow(rows);
    const mapping = suggestColumnMapping(rows, headerRowIndex);

    expect(headerRowIndex).toBe(0);
    expect(mapping).toEqual({
      description: 2,
      imageUrl: 4,
      price: 1,
      privateNote: 3,
      title: 0,
    });
  });

  it("does not mistake a labeled registration year for a listing price", () => {
    const rows: SpreadsheetCell[][] = [
      ["CULTIVAR", "ABBR", "BREEDER", "YEAR", "PEDIGREE"],
      ["Aaron's Giggles", "AG", "Herr", 2013, "Roger Herr x Bella Sera"],
      [
        "Absolute Treasure",
        "AT",
        "Stamile",
        1997,
        "Chance Encounter x Seedling",
      ],
    ];
    const headerRowIndex = detectHeaderRow(rows);
    const mapping = suggestColumnMapping(rows, headerRowIndex);

    expect(headerRowIndex).toBe(0);
    expect(mapping).toMatchObject({
      price: null,
      privateNote: null,
      title: 0,
    });
  });

  it("gives useful confidence to punctuation differences and common typos", () => {
    expect(getCultivarMatchConfidence("AW Shucks", "A.W. Shucks")).toBe(98);
    expect(
      getCultivarMatchConfidence("Adentures in Oz", "Adventures in Oz"),
    ).toBeGreaterThanOrEqual(90);
    expect(
      getCultivarMatchConfidence("Alexa Kathyrn", "Alexa Kathryn"),
    ).toBeGreaterThanOrEqual(90);
  });

  it("automatically links only one candidate over 90 percent", () => {
    const candidate = {
      bloomSizeIn: null,
      bloomSeason: null,
      color: null,
      confidence: 96,
      cultivarReferenceId: "cultivar-1",
      displayName: "A Memory of Earnest Yearwood",
      form: null,
      hybridizer: null,
      imageAsset: null,
      imageUrl: null,
      listingCount: 0,
      normalizedName: "a memory of earnest yearwood",
      ploidy: null,
      rebloom: null,
      scapeHeightIn: null,
      year: null,
    };

    expect(
      getAutomaticCultivarMatch({
        candidates: [candidate],
        exactMatch: null,
        inputName: "A Memory of Ernest Yearwood",
        normalizedInput: "a memory of ernest yearwood",
      }),
    ).toBe(candidate);
    expect(
      getAutomaticCultivarMatch({
        candidates: [
          candidate,
          {
            ...candidate,
            confidence: 93,
            cultivarReferenceId: "cultivar-2",
          },
        ],
        exactMatch: null,
        inputName: "Ambiguous",
        normalizedInput: "ambiguous",
      }),
    ).toBeNull();
    expect(
      getAutomaticCultivarMatch({
        candidates: [{ ...candidate, confidence: 90 }],
        exactMatch: null,
        inputName: "Borderline",
        normalizedInput: "borderline",
      }),
    ).toBeNull();
  });

  it("builds a bounded public sample from confidently matched rows only", () => {
    const rows = createCatalogImportRows({
      headerRowIndex: 0,
      mapping: {
        description: null,
        imageUrl: null,
        price: null,
        privateNote: null,
        title: 0,
      },
      rows: [["name"], ["First"], ["Second"], ["Third"]],
    });
    const match = {
      bloomSizeIn: null,
      bloomSeason: null,
      color: null,
      confidence: 96,
      cultivarReferenceId: "cultivar-2",
      displayName: "Second",
      form: null,
      hybridizer: null,
      imageAsset: null,
      imageUrl: null,
      listingCount: 0,
      normalizedName: "second",
      ploidy: null,
      rebloom: null,
      scapeHeightIn: null,
      year: null,
    };

    expect(
      applyAutomaticCultivarMatches({
        automaticMatches: new Map([
          ["second", match],
          ["third", { ...match, cultivarReferenceId: "cultivar-3" }],
        ]),
        limit: 1,
        matchedOnly: true,
        rows,
      }),
    ).toMatchObject([
      {
        match: { cultivarReferenceId: "cultivar-2" },
        title: "Second",
      },
    ]);
  });
});
