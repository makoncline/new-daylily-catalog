import { afterEach, describe, expect, it, vi } from "vitest";
import writeExcelFile from "write-excel-file/node";
import readExcelFile from "read-excel-file/node";
import {
  createTempListSpreadsheet,
  createTempListing,
  matchTempListings,
  tempListSchema,
  toTempPreviewRow,
} from "@/app/(public)/playground/_lib/temp-list";

afterEach(() => vi.unstubAllGlobals());

describe("temp list matching", () => {
  it("checks 350 rows in ordered API chunks and retries a later failure without changing the source", async () => {
    const listings = Array.from({ length: 350 }, (_, index) => ({
      ...createTempListing(`Flower ${index}`),
      cultivarReferenceId: `reference-${index}`,
    }));
    let fail = true;
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(async (_url, options) => {
        const body = JSON.parse(String(options?.body)) as {
          names: string[];
          cultivarReferenceIds: string[];
        };
        expect(body.names.length).toBeLessThanOrEqual(250);
        expect(
          body.names.reduce((total, name) => total + name.length, 0),
        ).toBeLessThanOrEqual(30_000);
        if (body.cultivarReferenceIds[0] === "reference-250" && fail) {
          fail = false;
          return Response.json(
            { error: "Later chunk failed" },
            { status: 503 },
          );
        }
        return Response.json({
          results: body.names.map((name, index) => ({
            inputName: name,
            inputCultivarReferenceId: body.cultivarReferenceIds[index],
            exactMatch: null,
            candidates: [],
          })),
        });
      });
    vi.stubGlobal("fetch", fetchMock);
    const before = JSON.stringify(listings);
    await expect(matchTempListings(listings)).rejects.toThrow(
      "Later chunk failed",
    );
    expect(JSON.stringify(listings)).toBe(before);
    const results = await matchTempListings(listings);
    expect(results.map((row) => row.inputName)).toEqual(
      listings.map((row) => row.name),
    );
    expect(results.map((row) => row.inputCultivarReferenceId)).toEqual(
      listings.map((row) => row.cultivarReferenceId),
    );
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(tempListSchema.parse(listings)).toHaveLength(350);
    const longNames = Array.from({ length: 350 }, (_, index) =>
      createTempListing(`Flower ${index}`.padEnd(160, "x")),
    );
    expect(await matchTempListings(longNames)).toHaveLength(350);
  });
});

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
