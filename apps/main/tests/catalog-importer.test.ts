import { describe, expect, it } from "vitest";
import {
  applyAutomaticCultivarMatches,
  assignCatalogImportDuplicateGroups,
  createCatalogEnrichedSpreadsheet,
  createCatalogImportRows,
  createCatalogImportSampleSpreadsheet,
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

  it("treats common not-for-sale markers as a blank price", () => {
    const importedRows = createCatalogImportRows({
      headerRowIndex: 0,
      mapping: {
        cultivarReferenceId: null,
        description: null,
        imageUrl: null,
        price: 1,
        privateNote: null,
        title: 0,
      },
      rows: [
        ["name", "price"],
        ["A.W. Shucks", "NFS"],
        ["Abilene Sunrise", "not for sale"],
      ],
    });

    expect(
      importedRows.map((row) => ({
        price: row.price,
        priceWarning: row.priceWarning,
      })),
    ).toEqual([
      { price: null, priceWarning: null },
      { price: null, priceWarning: null },
    ]);
  });

  it("creates a cleaned copy while preserving seller-owned workbook data", () => {
    const header = Array.from<SpreadsheetCell>({ length: 17 }).fill(null);
    header[3] = "Cultivar";
    header[12] = "Description";
    header[13] = "Private note";
    header[14] = "Image URL";
    header[16] = "Price";
    const data = Array.from<SpreadsheetCell>({ length: 17 }).fill(null);
    data[2] = "Seller-owned value";
    data[3] = "  AW SHUCKS  ";
    data[12] = "  Spider,   dark red  ";
    data[13] = "  Back   garden  ";
    data[14] = "https://example.com/daylily image.jpg";
    data[16] = "$25.00";
    const rows = [header, data];
    const headerRowIndex = detectHeaderRow(rows);
    const mapping = suggestColumnMapping(rows, headerRowIndex);
    const importedRows = createCatalogImportRows({
      headerRowIndex,
      mapping: {
        ...mapping,
        description: 12,
        imageUrl: 14,
        price: 16,
        privateNote: 13,
      },
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
    const enriched = createCatalogEnrichedSpreadsheet({
      headerRowIndex,
      mapping: {
        ...mapping,
        description: 12,
        imageUrl: 14,
        price: 16,
        privateNote: 13,
      },
      matchedRows,
      parsedSpreadsheet: {
        fileName: "seller-list.xlsx",
        sheets: [
          { name: "Inventory", rows },
          { name: "Notes", rows: [["Keep this sheet"], ["Seller notes"]] },
        ],
      },
      selectedSheetIndex: 0,
    });

    expect(headerRowIndex).toBe(0);
    expect(mapping).toMatchObject({
      description: null,
      price: null,
      title: 3,
    });
    expect(enriched.sheets[0]?.rows).toEqual([
      [
        ...header,
        "Daylily Catalog ID",
        "Daylily Catalog Cultivar Name",
        "Daylily Catalog Cultivar URL",
      ],
      [
        null,
        null,
        "Seller-owned value",
        "A. W. Shucks",
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        "Spider, dark red",
        "Back garden",
        "https://example.com/daylily%20image.jpg",
        null,
        25,
        "cultivar-1",
        "A. W. Shucks",
        "https://daylilycatalog.com/cultivar/a~2e-w~2e-shucks",
      ],
    ]);
    expect(enriched.sheets[1]).toEqual({
      name: "Notes",
      rows: [["Keep this sheet"], ["Seller notes"]],
    });
    expect(rows[1]).toEqual(data);
  });

  it("clears an invalid source price when the user leaves the repaired price blank", () => {
    const rows: SpreadsheetCell[][] = [
      ["name", "price"],
      ["Aerial Art", "two for $30"],
    ];
    const mapping = {
      cultivarReferenceId: null,
      description: null,
      imageUrl: null,
      price: 1,
      privateNote: null,
      title: 0,
    };
    const [importedRow] = createCatalogImportRows({
      headerRowIndex: 0,
      mapping,
      rows,
    });
    const enriched = createCatalogEnrichedSpreadsheet({
      headerRowIndex: 0,
      mapping,
      matchedRows: [
        {
          ...importedRow!,
          price: null,
          priceWarning: null,
        },
      ],
      parsedSpreadsheet: {
        fileName: "seller-list.csv",
        sheets: [{ name: "CSV", rows }],
      },
      selectedSheetIndex: 0,
    });

    expect(enriched.sheets[0]?.rows[1]?.[1]).toBe("");
  });

  it("keeps unresolved seller values and omits only explicitly removed rows", () => {
    const rows: SpreadsheetCell[][] = [
      ["name", "price", "image URL", "seller field"],
      [
        "  Mystery Bloom  ",
        "two for $30",
        "example.com/daylily.jpg",
        "Keep this value",
      ],
      ["Remove Me", 10, "https://example.com/remove.jpg", "Remove this row"],
    ];
    const mapping = {
      cultivarReferenceId: null,
      description: null,
      imageUrl: 2,
      price: 1,
      privateNote: null,
      title: 0,
    };
    const importedRows = createCatalogImportRows({
      headerRowIndex: 0,
      mapping,
      rows,
    });
    const enriched = createCatalogEnrichedSpreadsheet({
      headerRowIndex: 0,
      mapping,
      matchedRows: importedRows.map((row) =>
        row.sourceRow === 3 ? { ...row, removed: true } : row,
      ),
      parsedSpreadsheet: {
        fileName: "seller-list.csv",
        sheets: [{ name: "CSV", rows }],
      },
      selectedSheetIndex: 0,
    });

    expect(enriched.sheets[0]?.rows).toEqual([
      [
        "name",
        "price",
        "image URL",
        "seller field",
        "Daylily Catalog ID",
        "Daylily Catalog Cultivar Name",
        "Daylily Catalog Cultivar URL",
      ],
      [
        "  Mystery Bloom  ",
        "two for $30",
        "example.com/daylily.jpg",
        "Keep this value",
        "",
        "",
        "",
      ],
    ]);
  });

  it("maps every field in the downloadable template", () => {
    const rows: SpreadsheetCell[][] = createCatalogImportTemplateCsv()
      .split(/\r?\n/)
      .map((row) => row.split(","));
    const headerRowIndex = detectHeaderRow(rows);
    const mapping = suggestColumnMapping(rows, headerRowIndex);

    expect(headerRowIndex).toBe(0);
    expect(mapping).toEqual({
      cultivarReferenceId: null,
      description: 2,
      imageUrl: 4,
      price: 1,
      privateNote: 3,
      title: 0,
    });
  });

  it("provides a ready-to-map sample catalog with review and issue examples", () => {
    const spreadsheet = createCatalogImportSampleSpreadsheet();
    const rows = spreadsheet.sheets[0]?.rows ?? [];
    const headerRowIndex = detectHeaderRow(rows);
    const mapping = suggestColumnMapping(rows, headerRowIndex);
    const importedRows = createCatalogImportRows({
      headerRowIndex,
      mapping,
      rows,
    });

    expect(spreadsheet.fileName).toBe("Sample daylily catalog.csv");
    expect(mapping).toEqual({
      cultivarReferenceId: null,
      description: 2,
      imageUrl: 4,
      price: 1,
      privateNote: 3,
      title: 0,
    });
    expect(importedRows).toHaveLength(10);
    expect(importedRows.some((row) => row.title === "Vanguard 2")).toBe(true);
    expect(importedRows.some((row) => row.priceWarning !== null)).toBe(true);
    expect(importedRows.some((row) => row.duplicateOfSourceRow !== null)).toBe(
      true,
    );
  });

  it.each(["Daylily Catalog ID", "cultivarReferenceId"])(
    "restores mappings from the %s column when an enriched template is uploaded again",
    (idHeader) => {
      const rows: SpreadsheetCell[][] = [
        [
          "name",
          "price",
          "description",
          "private note",
          "image url",
          idHeader,
          "Daylily Catalog Cultivar Name",
          "Daylily Catalog Cultivar URL",
        ],
        [
          "Stella de Oro",
          12,
          "Golden yellow",
          "Front garden",
          "",
          "cultivar-1",
          "Stella de Oro",
          "https://daylilycatalog.com/cultivar/stella-de-oro",
        ],
      ];

      expect(suggestColumnMapping(rows, 0)).toEqual({
        cultivarReferenceId: 5,
        description: 2,
        imageUrl: 4,
        price: 1,
        privateNote: 3,
        title: 0,
      });
    },
  );

  it("renames legacy enrichment columns instead of appending duplicates", () => {
    const rows: SpreadsheetCell[][] = [
      ["name", "cultivarReferenceId", "registeredCultivarName", "cultivarUrl"],
      [
        "A.W. Shucks",
        "cultivar-1",
        "Old display name",
        "https://example.com/old",
      ],
    ];
    const mapping = suggestColumnMapping(rows, 0);
    const [row] = createCatalogImportRows({
      headerRowIndex: 0,
      mapping,
      rows,
    });
    const match = {
      bloomSizeIn: null,
      bloomSeason: null,
      color: null,
      confidence: 100,
      cultivarReferenceId: "cultivar-1",
      displayName: "A.W. Shucks",
      form: null,
      hybridizer: null,
      imageAsset: null,
      imageUrl: null,
      listingCount: 0,
      normalizedName: "a. w. shucks",
      ploidy: null,
      rebloom: null,
      scapeHeightIn: null,
      year: null,
    };

    const enriched = createCatalogEnrichedSpreadsheet({
      headerRowIndex: 0,
      mapping,
      matchedRows: [
        {
          ...row!,
          match,
          matchStatus: "exact",
        },
      ],
      parsedSpreadsheet: {
        fileName: "catalog.xlsx",
        sheets: [{ name: "Catalog", rows }],
      },
      selectedSheetIndex: 0,
    });

    expect(enriched.sheets[0]?.rows).toEqual([
      [
        "name",
        "Daylily Catalog ID",
        "Daylily Catalog Cultivar Name",
        "Daylily Catalog Cultivar URL",
      ],
      [
        "A.W. Shucks",
        "cultivar-1",
        "A.W. Shucks",
        "https://daylilycatalog.com/cultivar/a~2e-w~2e-shucks",
      ],
    ]);
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

  it("groups possible duplicates by linked cultivar ID", () => {
    const rows = createCatalogImportRows({
      headerRowIndex: 0,
      mapping: {
        cultivarReferenceId: null,
        description: null,
        imageUrl: null,
        price: null,
        privateNote: null,
        title: 0,
      },
      rows: [["name"], ["A W Shucks"], ["A.W. Shucks plant two"]],
    });
    const match = {
      bloomSizeIn: null,
      bloomSeason: null,
      color: null,
      confidence: 100,
      cultivarReferenceId: "cultivar-aw-shucks",
      displayName: "A.W. Shucks",
      form: null,
      hybridizer: null,
      imageAsset: null,
      imageUrl: null,
      listingCount: 0,
      normalizedName: "a.w. shucks",
      ploidy: null,
      rebloom: null,
      scapeHeightIn: null,
      year: null,
    };

    const grouped = assignCatalogImportDuplicateGroups(
      rows.map((row) => ({ ...row, match })),
    );

    expect(grouped[0]?.duplicateOfSourceRow).toBeNull();
    expect(grouped[1]?.duplicateOfSourceRow).toBe(2);

    const accepted = grouped.map((row) => ({
      ...row,
      duplicateAccepted: true,
      duplicateOfSourceRow: null,
    }));

    expect(
      assignCatalogImportDuplicateGroups(accepted).every(
        (row) => row.duplicateOfSourceRow === null,
      ),
    ).toBe(true);
  });

  it("keeps the best candidate for rows that still need review", () => {
    const [row] = createCatalogImportRows({
      headerRowIndex: 0,
      mapping: {
        cultivarReferenceId: null,
        description: null,
        imageUrl: null,
        price: null,
        privateNote: null,
        title: 0,
      },
      rows: [["name"], ["Vanguard 2"]],
    });
    const suggestion = {
      bloomSizeIn: null,
      bloomSeason: null,
      color: null,
      confidence: 82,
      cultivarReferenceId: "cultivar-vanguard",
      displayName: "Vanguard",
      form: null,
      hybridizer: null,
      imageAsset: null,
      imageUrl: null,
      listingCount: 0,
      normalizedName: "vanguard",
      ploidy: null,
      rebloom: null,
      scapeHeightIn: null,
      year: null,
    };

    expect(
      applyAutomaticCultivarMatches({
        automaticMatches: new Map(),
        rows: [row!],
        suggestedMatches: new Map([["vanguard 2", suggestion]]),
      }),
    ).toMatchObject([
      {
        match: null,
        matchStatus: "pending",
        suggestedMatch: {
          confidence: 82,
          cultivarReferenceId: "cultivar-vanguard",
        },
      },
    ]);
  });

  it("restores a saved cultivar reference ID before matching by name", () => {
    const rows: SpreadsheetCell[][] = [
      ["name", "Daylily Catalog ID"],
      ["A seller spelling", "cultivar-saved"],
    ];
    const mapping = suggestColumnMapping(rows, 0);
    const [row] = createCatalogImportRows({
      headerRowIndex: 0,
      mapping,
      rows,
    });
    const savedMatch = {
      bloomSizeIn: null,
      bloomSeason: null,
      color: null,
      confidence: 100,
      cultivarReferenceId: "cultivar-saved",
      displayName: "Registered Name",
      form: null,
      hybridizer: null,
      imageAsset: null,
      imageUrl: null,
      listingCount: 0,
      normalizedName: "registered name",
      ploidy: null,
      rebloom: null,
      scapeHeightIn: null,
      year: null,
    };

    expect(mapping.cultivarReferenceId).toBe(1);
    expect(
      applyAutomaticCultivarMatches({
        automaticMatches: new Map(),
        cultivarReferenceMatches: new Map([["cultivar-saved", savedMatch]]),
        rows: [row!],
      }),
    ).toMatchObject([
      {
        cultivarReferenceIdWarning: null,
        match: {
          cultivarReferenceId: "cultivar-saved",
          displayName: "Registered Name",
        },
        sourceCultivarReferenceId: "cultivar-saved",
      },
    ]);
  });

  it("flags an unknown saved cultivar ID instead of replacing it by name", () => {
    const [row] = createCatalogImportRows({
      headerRowIndex: 0,
      mapping: {
        cultivarReferenceId: 1,
        description: null,
        imageUrl: null,
        price: null,
        privateNote: null,
        title: 0,
      },
      rows: [
        ["name", "cultivarReferenceId"],
        ["A.W. Shucks", "missing-id"],
      ],
    });

    expect(
      applyAutomaticCultivarMatches({
        automaticMatches: new Map([
          [
            "a w shucks",
            {
              bloomSizeIn: null,
              bloomSeason: null,
              color: null,
              confidence: 100,
              cultivarReferenceId: "different-id",
              displayName: "A.W. Shucks",
              form: null,
              hybridizer: null,
              imageAsset: null,
              imageUrl: null,
              listingCount: 0,
              normalizedName: "a w shucks",
              ploidy: null,
              rebloom: null,
              scapeHeightIn: null,
              year: null,
            },
          ],
        ]),
        invalidCultivarReferenceIds: new Set(["missing-id"]),
        rows: [row!],
      }),
    ).toMatchObject([
      {
        cultivarReferenceIdWarning: "missing-id",
        match: null,
        matchStatus: "unmatched",
      },
    ]);
  });

  it("clears an unknown saved cultivar ID from prepared identity fields", () => {
    const rows: SpreadsheetCell[][] = [
      ["name", "Daylily Catalog ID"],
      ["A.W. Shucks", "missing-id"],
    ];
    const mapping = suggestColumnMapping(rows, 0);
    const [row] = createCatalogImportRows({
      headerRowIndex: 0,
      mapping,
      rows,
    });
    const [unresolvedRow] = applyAutomaticCultivarMatches({
      automaticMatches: new Map(),
      invalidCultivarReferenceIds: new Set(["missing-id"]),
      rows: [row!],
    });

    const enriched = createCatalogEnrichedSpreadsheet({
      headerRowIndex: 0,
      mapping,
      matchedRows: [unresolvedRow!],
      parsedSpreadsheet: {
        fileName: "catalog.xlsx",
        sheets: [{ name: "Catalog", rows }],
      },
      selectedSheetIndex: 0,
    });

    expect(enriched.sheets[0]?.rows[1]?.[1]).toBe("");
  });
});
