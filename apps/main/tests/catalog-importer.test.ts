import { describe, expect, it } from "vitest";
import {
  CATALOG_IMPORT_IMAGE_PREVIEW_WARNING_PREFIX,
  applyAutomaticCultivarMatches,
  assignCatalogImportDuplicateGroups,
  createCatalogCleanSpreadsheet,
  createCatalogEnrichedSpreadsheet,
  createCatalogImportRows,
  createCatalogImportSampleSpreadsheet,
  createCatalogImportTemplateCsv,
  detectHeaderRow,
  getAutomaticCultivarMatch,
  getCatalogImportMappedColumnLabel,
  getCatalogImportState,
  getSourceColumns,
  suggestColumnMapping,
  type SpreadsheetCell,
} from "@/lib/catalog-importer";
import { getCultivarMatchConfidence } from "@/lib/cultivar-match-score";
import { getCatalogImporterSubmissionSample } from "@/lib/catalog-importer-submission-sample";

describe("catalog importer normalization", () => {
  it("maps unique canonical seller columns without dropping their data", () => {
    const rows: SpreadsheetCell[][] = [
      ["Cultivar", "Price", "Description", "Private Note"],
      ["A.W. Shucks", 25, "Purple bloom", "Back garden"],
    ];

    expect(suggestColumnMapping(rows, 0)).toEqual({
      cultivarReferenceId: null,
      description: 2,
      imageUrl: null,
      price: 1,
      privateNote: 3,
      title: 0,
    });
  });

  it("uses catalog field names for mapped spreadsheet columns", () => {
    const mapping = {
      cultivarReferenceId: 5,
      description: 2,
      imageUrl: 4,
      price: 1,
      privateNote: 3,
      title: 0,
    };

    expect(
      Array.from({ length: 6 }, (_, columnIndex) =>
        getCatalogImportMappedColumnLabel(mapping, columnIndex),
      ),
    ).toEqual([
      "Name",
      "Price",
      "Description",
      "Private Note",
      "Image URL",
      "Daylily Catalog ID",
    ]);
    expect(getCatalogImportMappedColumnLabel(mapping, 6)).toBeNull();
  });

  it("limits quiet-launch logging to the header and first five nonempty rows", () => {
    const sample = getCatalogImporterSubmissionSample({
      headerRowIndex: 0,
      mapping: {
        cultivarReferenceId: null,
        description: 2,
        imageUrl: null,
        price: 1,
        privateNote: null,
        title: 0,
      },
      parsedSpreadsheet: {
        fileName: "seller-list.xlsx",
        sheets: [
          {
            name: "Inventory",
            rows: [
              ["name", "price", "description"],
              ...Array.from({ length: 7 }, (_, index) => [
                `Daylily ${index + 1}`,
                index + 10,
                `Description ${index + 1}`,
              ]),
            ],
          },
        ],
      },
      selectedSheetIndex: 0,
    });

    expect(sample).toMatchObject({
      header: ["name", "price", "description"],
      rows: [
        ["Daylily 1", "10", "Description 1"],
        ["Daylily 2", "11", "Description 2"],
        ["Daylily 3", "12", "Description 3"],
        ["Daylily 4", "13", "Description 4"],
        ["Daylily 5", "14", "Description 5"],
      ],
      source: "upload",
    });
  });

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

  it("treats common not-for-sale markers and zero as a blank price", () => {
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
        ["Aerial Art", 0],
        ["All American Chief", "0.00"],
        ["Always Afternoon", "12.00"],
        ["American Revolution", "12.50"],
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
      { price: null, priceWarning: null },
      { price: null, priceWarning: null },
      { price: 12, priceWarning: null },
      { price: null, priceWarning: "12.50" },
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
      linkProvenance: "user-confirmed" as const,
      linkState: "linked" as const,
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
      description: 12,
      price: 16,
      title: 3,
    });
    const standardizedHeader = [...header];
    standardizedHeader[3] = "Name";
    standardizedHeader[12] = "Description";
    standardizedHeader[13] = "Private Note";
    standardizedHeader[14] = "Image URL";
    standardizedHeader[16] = "Price";
    expect(enriched.sheets[0]?.rows).toEqual([
      [
        ...standardizedHeader,
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
        "https://example.com/daylily image.jpg",
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
    expect(
      suggestColumnMapping(enriched.sheets[0]!.rows, headerRowIndex),
    ).toMatchObject({
      cultivarReferenceId: header.length,
      title: 3,
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
        row.sourceRow === 3 ? { ...row, outputState: "removed" as const } : row,
      ),
      parsedSpreadsheet: {
        fileName: "seller-list.csv",
        sheets: [{ name: "CSV", rows }],
      },
      selectedSheetIndex: 0,
    });

    expect(enriched.sheets[0]?.rows).toEqual([
      [
        "Name",
        "Price",
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
      imageUrl: null,
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
      imageUrl: null,
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
        imageUrl: null,
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
          linkProvenance: "saved-id",
          linkState: "linked",
          match,
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
        "Name",
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

  it("derives listing, link, review, issue, and unique-cultivar counts once", () => {
    const rows = createCatalogImportRows({
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
        ["Linked one", 10],
        ["Linked duplicate", 12],
        ["Needs review", 14],
        ["Intentionally unmatched", 16],
        ["Price issue", "two for $30"],
        ["Removed listing", 20],
        ["2023", ""],
      ],
    });
    const match = {
      awardNames: "Award of Merit",
      bloomSizeIn: null,
      bloomSeason: null,
      color: "Red",
      confidence: 100,
      cultivarReferenceId: "cultivar-1",
      displayName: "Linked cultivar",
      form: null,
      hybridizer: "Example",
      imageAsset: null,
      imageUrl: "https://example.com/reference.jpg",
      listingCount: 0,
      normalizedName: "linked cultivar",
      ploidy: null,
      rebloom: null,
      scapeHeightIn: null,
      year: 2017,
    };
    const state = getCatalogImportState(
      assignCatalogImportDuplicateGroups(
        rows.map((row, index) => {
          if (index < 2) {
            return {
              ...row,
              linkProvenance:
                index === 0
                  ? ("exact-name" as const)
                  : ("user-confirmed" as const),
              linkState: "linked" as const,
              match,
            };
          }
          if (index === 3) {
            return {
              ...row,
              linkState: "intentionally-unmatched" as const,
            };
          }
          if (index === 5) {
            return { ...row, outputState: "removed" as const };
          }
          return row;
        }),
      ),
      8,
    );

    expect(state.counts).toMatchObject({
      detectedListingCount: 6,
      duplicateGroupCount: 1,
      includedListingCount: 5,
      intentionallyUnmatchedCount: 1,
      issueCount: 1,
      linkedListingCount: 2,
      pendingCultivarDecisionCount: 2,
      priceIssueCount: 1,
      requiredDataDecisionCount: 1,
      reviewQueueCount: 2,
      sourceRowCount: 8,
      uniqueCultivarCount: 1,
      warningCount: 1,
    });
    expect(state.enrichment).toEqual({
      awardWinningCultivarCount: 1,
      hybridizerCount: 1,
      referencePhotoListingCount: 2,
      registrationYearMax: 2017,
      registrationYearMin: 2017,
      searchableAttributeCount: 4,
    });
    expect(state.sourceRows).toHaveLength(7);
    expect(state.detectedRows).toHaveLength(6);
    expect(state.includedRows).toHaveLength(5);
    expect(state.requiredDataDecisionRows).toHaveLength(1);
    expect(state.warningRows).toHaveLength(1);
    expect(state.reviewRows.map((row) => row.title)).toEqual([
      "Needs review",
      "Price issue",
    ]);
  });

  it("ignores spreadsheet image URLs in the MVP", () => {
    const rows = createCatalogImportRows({
      headerRowIndex: 0,
      mapping: {
        cultivarReferenceId: null,
        description: null,
        imageUrl: 1,
        price: null,
        privateNote: null,
        title: 0,
      },
      rows: [
        ["name", "image"],
        ["Malformed image", "not-a-url"],
        ["Blocked preview", "https://example.com/blocked.jpg"],
      ],
    });
    const state = getCatalogImportState(
      rows.map((row) =>
        row.sourceTitle === "Blocked preview"
          ? {
              ...row,
              imageUrlWarning: `${CATALOG_IMPORT_IMAGE_PREVIEW_WARNING_PREFIX}${row.imageUrl}`,
            }
          : row,
      ),
    );

    expect(state.counts).toMatchObject({
      issueCount: 0,
      requiredDataDecisionCount: 0,
      warningCount: 0,
    });
    expect(rows.every((row) => row.imageUrl === "")).toBe(true);
  });

  it("keeps an accepted seller image URL in the prepared workbook", () => {
    const imageUrl = "https://seller.example/daylily.jpg";
    const rows: SpreadsheetCell[][] = [
      ["name", "image url"],
      ["Blocked preview", imageUrl],
    ];
    const mapping = suggestColumnMapping(rows, 0);
    const [row] = createCatalogImportRows({
      headerRowIndex: 0,
      mapping,
      rows,
    });

    const enriched = createCatalogEnrichedSpreadsheet({
      headerRowIndex: 0,
      mapping,
      matchedRows: [
        {
          ...row!,
          imagePreviewAccepted: true,
          imageUrl: "",
          imageUrlWarning: null,
        },
      ],
      parsedSpreadsheet: {
        fileName: "catalog.xlsx",
        sheets: [{ name: "Catalog", rows }],
      },
      selectedSheetIndex: 0,
    });

    expect(enriched.sheets[0]?.rows[1]?.[1]).toBe(imageUrl);
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
        linkState: "pending",
        match: null,
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
    const [restoredRow] = applyAutomaticCultivarMatches({
      automaticMatches: new Map(),
      cultivarReferenceMatches: new Map([["cultivar-saved", savedMatch]]),
      rows: [row!],
    });

    expect([restoredRow]).toMatchObject([
      {
        cultivarReferenceIdWarning: null,
        linkProvenance: "saved-id",
        linkState: "linked",
        match: {
          cultivarReferenceId: "cultivar-saved",
          displayName: "Registered Name",
        },
        sourceCultivarReferenceId: "cultivar-saved",
      },
    ]);
    expect(getCatalogImportState([restoredRow!]).counts).toMatchObject({
      linkedListingCount: 1,
      pendingCultivarDecisionCount: 0,
      uniqueCultivarCount: 1,
    });
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

    const [invalidIdRow] = applyAutomaticCultivarMatches({
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
    });

    expect([invalidIdRow]).toMatchObject([
      {
        cultivarReferenceIdWarning: "missing-id",
        linkState: "pending",
        match: null,
      },
    ]);
    expect(getCatalogImportState([invalidIdRow!]).counts).toMatchObject({
      pendingCultivarDecisionCount: 1,
      reviewQueueCount: 0,
      savedIdIssueCount: 1,
    });
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

  it("offers a clean catalog and a full enriched original from the same decisions", () => {
    const sourceRows: SpreadsheetCell[][] = [
      ["plant", "cost", "seller notes", "unrelated"],
      ["VANGUARD", "two for $30", "Front table", "keep me"],
      ["VANGUARD backup", "12", "Duplicate tray", "also keep me"],
    ];
    const mapping = {
      cultivarReferenceId: null,
      description: null,
      imageUrl: null,
      price: 1,
      privateNote: 2,
      title: 0,
    };
    const [linked, excluded] = createCatalogImportRows({
      headerRowIndex: 0,
      mapping,
      rows: sourceRows,
    });
    const match = {
      awardNames: null,
      bloomSizeIn: null,
      bloomSeason: null,
      color: null,
      confidence: 100,
      cultivarReferenceId: "cultivar-vanguard",
      displayName: "Vanguard",
      form: null,
      hybridizer: "Stamile",
      imageAsset: null,
      imageUrl: null,
      listingCount: 1,
      normalizedName: "vanguard",
      ploidy: null,
      rebloom: null,
      scapeHeightIn: null,
      year: 2017,
    };
    const matchedRows = [
      {
        ...linked!,
        match,
        price: 15,
        priceWarning: null,
        linkProvenance: "user-confirmed" as const,
        linkState: "linked" as const,
      },
      { ...excluded!, outputState: "removed" as const },
    ];
    const parsedSpreadsheet = {
      fileName: "seller-list.xlsx",
      sheets: [
        { name: "Inventory", rows: sourceRows },
        { name: "Notes", rows: [["Keep this sheet exactly"]] },
      ],
    };

    const clean = createCatalogCleanSpreadsheet({
      matchedRows,
      parsedSpreadsheet,
    });
    const enriched = createCatalogEnrichedSpreadsheet({
      headerRowIndex: 0,
      mapping,
      matchedRows,
      parsedSpreadsheet,
      retainExcludedRows: true,
      selectedSheetIndex: 0,
    });

    expect(clean.sheets).toEqual([
      {
        name: "Catalog",
        rows: [
          [
            "Name",
            "Price",
            "Description",
            "Private Note",
            "Daylily Catalog ID",
            "Daylily Catalog Cultivar Name",
            "Daylily Catalog Cultivar URL",
          ],
          [
            "Vanguard",
            15,
            "",
            "Front table",
            "cultivar-vanguard",
            "Vanguard",
            "https://daylilycatalog.com/cultivar/vanguard",
          ],
        ],
      },
    ]);
    expect(enriched.sheets[0]?.rows[0]).toEqual([
      "Name",
      "Price",
      "Private Note",
      "unrelated",
      "Daylily Catalog ID",
      "Daylily Catalog Cultivar Name",
      "Daylily Catalog Cultivar URL",
    ]);
    expect(enriched.sheets[0]?.rows[1]).toEqual([
      "Vanguard",
      15,
      "Front table",
      "keep me",
      "cultivar-vanguard",
      "Vanguard",
      "https://daylilycatalog.com/cultivar/vanguard",
    ]);
    expect(enriched.sheets[0]?.rows[2]?.slice(0, 4)).toEqual([
      "VANGUARD backup",
      "12",
      "Duplicate tray",
      "also keep me",
    ]);
    expect(enriched.sheets[1]?.rows).toEqual([["Keep this sheet exactly"]]);
  });
});
