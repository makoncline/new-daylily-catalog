import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TagPrintTable } from "@/app/dashboard/tags/_components/tag-print-table";

const readModel = vi.hoisted(() => ({
  isReady: false,
  listingRows: [],
  lists: [],
  listingsById: new Map(),
}));
vi.mock(
  "@/app/dashboard/_lib/dashboard-db/use-dashboard-listing-read-model",
  () => ({
    useDashboardListingReadModel: () => readModel,
  }),
);
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/tags",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
afterEach(cleanup);

describe("Tags data states", () => {
  it("shows loading before reporting no listings", () => {
    readModel.isReady = false;
    const view = render(<TagPrintTable />);
    expect(
      screen.getByRole("status", { name: "Loading listings" }),
    ).toBeVisible();
    expect(screen.queryByText("No listings")).not.toBeInTheDocument();
    readModel.isReady = true;
    view.rerender(<TagPrintTable />);
    expect(screen.getByText("No listings")).toBeVisible();
    expect(
      screen.queryByRole("status", { name: "Loading listings" }),
    ).not.toBeInTheDocument();
  });
});
