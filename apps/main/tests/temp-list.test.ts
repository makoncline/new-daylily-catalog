import { describe, expect, it } from "vitest";
import writeExcelFile from "write-excel-file/node";
import readExcelFile from "read-excel-file/node";
import {
  createTempListSpreadsheet,
  tempListSchema,
  toTempPreviewRow,
} from "@/app/(public)/temp-list/_lib/temp-list";

describe("temp list spreadsheet", () => {
  it("exports restored browser fields without losing decimals, notes, or unlinked entries", async () => {
    const saved = JSON.stringify([
      {
        id: "one",
        name: "Millions of Peaches",
        price: 15.5,
        description: "Peach blooms\nReady to divide",
        privateNote: "East garden — row 2",
        cultivarReferenceId: null,
      },
      {
        id: "two",
        name: "Garden seedling",
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
    expect(output[0]?.data).toHaveLength(3);
    expect(output[0]?.data[1]?.slice(0, 5)).toEqual([
      "Millions of Peaches",
      15.5,
      "Peach blooms\nReady to divide",
      "East garden — row 2",
      null,
    ]);
    expect(output[0]?.data[2]?.slice(0, 5)).toEqual([
      "Garden seedling",
      0,
      null,
      "Keep",
      null,
    ]);
  });
});
