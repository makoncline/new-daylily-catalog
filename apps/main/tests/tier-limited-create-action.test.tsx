import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateListingButton } from "@/app/dashboard/listings/_components/create-listing-button";
import { CreateListButton } from "@/app/dashboard/lists/_components/create-list-button";
import { APP_CONFIG } from "@/config/constants";

const mocks = vi.hoisted(() => ({
  listCount: vi.fn(),
  listings: vi.fn(),
  openCreateList: vi.fn(),
  openCreateListing: vi.fn(),
  usePro: vi.fn(),
}));

vi.mock("@/hooks/use-pro", () => ({
  usePro: mocks.usePro,
}));

vi.mock(
  "@/app/dashboard/_lib/dashboard-db/use-seeded-dashboard-db-query",
  () => ({
    useSeededDashboardDbQuery: mocks.listings,
  }),
);

vi.mock("@/app/dashboard/_lib/dashboard-db/listings-collection", () => ({
  listingsCollection: {},
}));

vi.mock("@/app/dashboard/_lib/dashboard-timing", () => ({
  logDashboardTiming: vi.fn(),
}));

vi.mock(
  "@/app/dashboard/listings/_components/create-listing-dialog",
  () => ({
    useCreateListing: () => ({
      openCreateListing: mocks.openCreateListing,
    }),
  }),
);

vi.mock("@/app/dashboard/lists/_components/create-list-dialog", () => ({
  useCreateList: () => ({
    openCreateList: mocks.openCreateList,
  }),
}));

vi.mock("@/trpc/react", () => ({
  api: {
    dashboardDb: {
      list: {
        count: {
          useQuery: mocks.listCount,
        },
      },
    },
  },
}));

vi.mock("@/components/checkout-button", () => ({
  CheckoutButton: () => <button type="button">Checkout</button>,
}));

describe("dashboard create buttons", () => {
  beforeEach(() => {
    mocks.openCreateList.mockReset();
    mocks.openCreateListing.mockReset();
  });

  it("disables listing and list creation until account data is loaded", () => {
    mocks.usePro.mockReturnValue({ isLoading: true, isPro: false });
    mocks.listings.mockReturnValue({ data: [], isReady: false });
    mocks.listCount.mockReturnValue({ data: undefined, isLoading: true });

    const listing = render(<CreateListingButton />);
    expect(
      screen.getByRole("button", { name: "Create Listing" }),
    ).toBeDisabled();
    listing.unmount();

    render(<CreateListButton />);
    expect(screen.getByRole("button", { name: "Create List" })).toBeDisabled();
  });

  it("opens each create path for a loaded Pro account", () => {
    mocks.usePro.mockReturnValue({ isLoading: false, isPro: true });
    mocks.listings.mockReturnValue({
      data: Array(APP_CONFIG.LISTING.FREE_TIER_MAX_LISTINGS).fill({}),
      isReady: true,
    });
    mocks.listCount.mockReturnValue({
      data: APP_CONFIG.LIST.FREE_TIER_MAX_LISTS,
      isLoading: false,
    });

    const listing = render(<CreateListingButton />);
    fireEvent.click(screen.getByRole("button", { name: "Create Listing" }));
    expect(mocks.openCreateListing).toHaveBeenCalledOnce();
    listing.unmount();

    render(<CreateListButton />);
    fireEvent.click(screen.getByRole("button", { name: "Create List" }));
    expect(mocks.openCreateList).toHaveBeenCalledOnce();
  });

  it("opens each upgrade path for a loaded free account at its limit", () => {
    mocks.usePro.mockReturnValue({ isLoading: false, isPro: false });
    mocks.listings.mockReturnValue({
      data: Array(APP_CONFIG.LISTING.FREE_TIER_MAX_LISTINGS).fill({}),
      isReady: true,
    });
    mocks.listCount.mockReturnValue({
      data: APP_CONFIG.LIST.FREE_TIER_MAX_LISTS,
      isLoading: false,
    });

    const listing = render(<CreateListingButton />);
    fireEvent.click(screen.getByRole("button", { name: "Create Listing" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Upgrade Required");
    expect(mocks.openCreateListing).not.toHaveBeenCalled();
    listing.unmount();

    render(<CreateListButton />);
    fireEvent.click(screen.getByRole("button", { name: "Create List" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Upgrade to Pro");
    expect(mocks.openCreateList).not.toHaveBeenCalled();
  });
});
