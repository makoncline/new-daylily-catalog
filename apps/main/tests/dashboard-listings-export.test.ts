import { describe, expect, it } from "vitest";
import type { ListingData } from "@/app/dashboard/listings/_components/columns";
import {
  createDashboardListingsCsv,
  DASHBOARD_LISTINGS_EXPORT_HEADERS,
} from "@/app/dashboard/listings/_lib/dashboard-listings-export";
import {
  createCatalogImportRows,
  getSourceColumns,
  suggestColumnMapping,
} from "@/lib/catalog-importer";
import { parseCatalogImportFile } from "@/lib/catalog-importer-file";

describe("dashboard listings export", () => {
  it("round trips seller fields and cultivar identity through the import builder", async () => {
    const listing = {
      ahsListing: {
        bloomHabit: "Reblooms",
        bloomSeason: "Midseason",
        bloomSize: '6"',
        branches: 3,
        budcount: 18,
        color: "Rose, with a gold throat",
        foliageType: "Dormant",
        form: "Single",
        fragrance: "Fragrant",
        hybridizer: "Example",
        name: 'A "Quoted" Daylily',
        ploidy: "Tetraploid",
        scapeHeight: '32"',
        year: "2024",
      },
      createdAt: new Date("2026-07-01T12:00:00.000Z"),
      cultivarReferenceId: "cr-example-1",
      cultivarReferenceImage: null,
      cultivarReferenceNormalizedName: 'a "quoted" daylily',
      description: 'Rose flower, 6" bloom',
      images: [],
      lists: [{ id: "list-1", title: "Front, display" }],
      price: 25,
      privateNote: "Keep for fall",
      status: "ACTIVE",
      title: 'Seller "A" Daylily',
      updatedAt: new Date("2026-07-02T12:00:00.000Z"),
    } as unknown as ListingData;

    const csv = createDashboardListingsCsv([listing]);
    const file = new File([csv], "listings.csv", { type: "text/csv" });
    Object.defineProperty(file, "text", {
      value: async () => csv,
    });
    const spreadsheet = await parseCatalogImportFile(file);
    const rows = spreadsheet.sheets[0]?.rows ?? [];
    const columns = getSourceColumns(rows, 0);
    const mapping = suggestColumnMapping(rows, 0, columns);
    const importRows = createCatalogImportRows({
      headerRowIndex: 0,
      mapping,
      rows,
    });

    expect(rows[0]).toEqual([...DASHBOARD_LISTINGS_EXPORT_HEADERS]);
    expect(mapping).toMatchObject({
      cultivarReferenceId: 4,
      description: 2,
      price: 1,
      privateNote: 3,
      title: 0,
    });
    expect(importRows[0]).toMatchObject({
      description: 'Rose flower, 6" bloom',
      price: 25,
      privateNote: "Keep for fall",
      sourceCultivarReferenceId: "cr-example-1",
      sourceTitle: 'Seller "A" Daylily',
    });
    expect(rows[1]?.[6]).toBe(
      "https://daylilycatalog.com/cultivar/a-~22quoted~22-daylily",
    );
    expect(rows[1]?.[8]).toBe("Front, display");
  });
});
