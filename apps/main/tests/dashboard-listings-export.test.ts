import { describe, expect, it } from "vitest";
import type { ListingData } from "@/app/dashboard/listings/_components/columns";
import {
  createDashboardListingsCsv,
  DASHBOARD_LISTINGS_EXPORT_HEADERS,
} from "@/app/dashboard/listings/_lib/dashboard-listings-export";
import {
  readTempListSheet,
  suggestTempColumnMapping,
} from "@/app/(public)/playground/_lib/temp-list-spreadsheet";
import { parseCatalogImportFile } from "@/lib/catalog-importer-file";

describe("dashboard listings export", () => {
  it("round trips seller fields and cultivar identity through the Playground", async () => {
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
      lists: [
        { id: "list-1", title: "Front, display" },
        { id: "list-2", title: "Sale" },
      ],
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
    const {
      sheets: [sheet],
    } = await parseCatalogImportFile(file);
    const { listings, issues } = readTempListSheet(
      sheet!,
      0,
      suggestTempColumnMapping(sheet!, 0),
    );
    const { rows } = sheet!;

    expect(rows[0]).toEqual([...DASHBOARD_LISTINGS_EXPORT_HEADERS]);
    expect(issues).toEqual([]);
    expect(listings).toMatchObject([
      {
        description: 'Rose flower, 6" bloom',
        price: 25,
        privateNote: "Keep for fall",
        cultivarReferenceId: "cr-example-1",
        name: 'Seller "A" Daylily',
        lists: ["Front, display", "Sale"],
      },
    ]);
    expect(rows[1]?.[6]).toBe(
      "https://daylilycatalog.com/cultivar/a-~22quoted~22-daylily",
    );
    expect(rows[1]?.[8]).toBe("Front, display\nSale");
  });
});
