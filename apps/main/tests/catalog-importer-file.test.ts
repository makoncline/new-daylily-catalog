import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  downloadCatalogImportFile,
  parseCatalogImportFile,
} from "@/lib/catalog-importer-file";

const xlsx = vi.hoisted(() => ({
  read: vi.fn(),
  toFile: vi.fn(),
  write: vi.fn(),
}));

vi.mock("read-excel-file/browser", () => ({
  default: xlsx.read,
}));

vi.mock("write-excel-file/browser", () => ({
  default: xlsx.write,
}));

describe("catalog importer XLSX download", () => {
  beforeEach(() => {
    xlsx.read.mockReset();
    xlsx.toFile.mockReset();
    xlsx.write.mockReset();
    xlsx.write.mockReturnValue({ toFile: xlsx.toFile });
  });

  it("preserves XLSX text values returned by the reader", async () => {
    xlsx.read.mockResolvedValue([
      {
        data: [["name", "description"], ["  A &amp; B  ", " "]],
        sheet: "Inventory",
      },
    ]);
    const file = new File(["xlsx"], "catalog.xlsx");

    const spreadsheet = await parseCatalogImportFile(file);

    expect(xlsx.read).toHaveBeenCalledWith(file, { trim: false });
    expect(spreadsheet.sheets[0]?.rows).toEqual([
      ["name", "description"],
      ["  A &amp; B  ", " "],
    ]);
  });

  it("writes every sheet as values without adding workbook formatting", async () => {
    const date = new Date("2026-07-18T00:00:00.000Z");

    await downloadCatalogImportFile({
      fileName: "catalog-daylily-catalog.xlsx",
      spreadsheet: {
        fileName: "catalog.xlsx",
        sheets: [
          {
            name: "Inventory",
            rows: [
              ["name", "date"],
              ["Vanguard", date],
            ],
          },
          { name: "Notes", rows: [["Keep this value"]] },
        ],
      },
    });

    expect(xlsx.write).toHaveBeenCalledWith([
      {
        data: [
          ["name", "date"],
          ["Vanguard", date],
        ],
        dateFormat: "yyyy-mm-dd",
        sheet: "Inventory",
      },
      {
        data: [["Keep this value"]],
        dateFormat: "yyyy-mm-dd",
        sheet: "Notes",
      },
    ]);
    expect(xlsx.toFile).toHaveBeenCalledWith("catalog-daylily-catalog.xlsx");
  });
});
