import { describe, expect, it } from "vitest";
import { baseListingColumns } from "@/app/dashboard/listings/_components/columns";
import { getColumns as getManageListColumns } from "@/app/dashboard/lists/[listId]/_components/columns";

const getColumnIds = (columns: { id?: string }[]) =>
  columns
    .map((column) => column.id)
    .filter((id): id is string => typeof id === "string");

describe("manage list table columns", () => {
  it("matches dashboard listings columns after select column", () => {
    const dashboardColumnIds = getColumnIds(baseListingColumns);
    const manageListColumnIds = getColumnIds(getManageListColumns());

    expect(manageListColumnIds[0]).toBe("select");
    expect(manageListColumnIds.slice(1)).toStrictEqual(dashboardColumnIds);
  });
});
