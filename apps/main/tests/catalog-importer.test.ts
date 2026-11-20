import { describe, expect, it } from "vitest";
import {
  detectHeaderRow,
  parsePriceValue,
  suggestColumnMapping,
  type SpreadsheetCell,
} from "@/lib/catalog-importer";
import { getCultivarMatchConfidence } from "@/lib/cultivar-match-score";

describe("catalog importer normalization", () => {
  it("maps unique canonical seller columns without dropping their data", () => {
    const rows: SpreadsheetCell[][] = [
      ["Cultivar", "Price", "Description", "Private Note"],
      ["A.W. Shucks", 25, "Purple bloom", "Back garden"],
    ];

    expect(suggestColumnMapping(rows, 0)).toEqual({
      lists: null,
      cultivarReferenceId: null,
      description: 2,
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

  it("keeps zero and decimal prices and treats not-for-sale prices as blank", () => {
    expect(parsePriceValue("0")).toMatchObject({ price: 0, warning: null });
    expect(parsePriceValue("$12.50")).toMatchObject({
      price: 12.5,
      warning: null,
    });
    expect(parsePriceValue("NFS")).toMatchObject({
      price: null,
      warning: null,
    });
  });
});
