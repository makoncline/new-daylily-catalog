import { describe, expect, it } from "vitest";
import { buildDashboardListingListFilterOptions } from "@/app/dashboard/_components/dashboard-listing-filter-toolbar";

describe("buildDashboardListingListFilterOptions", () => {
  it("counts how many listings belong to each list", () => {
    const options = buildDashboardListingListFilterOptions({
      lists: [
        { id: "list-1", title: "For Sale" },
        { id: "list-2", title: "Featured" },
        { id: "list-3", title: "Garden" },
      ],
      listings: [
        {
          lists: [{ id: "list-1", title: "For Sale" }],
        },
        {
          lists: [
            { id: "list-1", title: "For Sale" },
            { id: "list-2", title: "Featured" },
          ],
        },
        {
          lists: [],
        },
      ],
    });

    expect(options).toEqual([
      { label: "For Sale", value: "list-1", count: 2 },
      { label: "Featured", value: "list-2", count: 1 },
      { label: "Garden", value: "list-3", count: 0 },
    ]);
  });
});
