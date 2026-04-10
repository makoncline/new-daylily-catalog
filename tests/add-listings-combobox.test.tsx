import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddListingsCombobox } from "@/app/dashboard/lists/[listId]/_components/add-listings-combobox";

const addListingToListMock = vi.hoisted(() => vi.fn());
const toastSuccessMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());

vi.mock("@/app/dashboard/_lib/dashboard-db/use-seeded-dashboard-db-query", () => ({
  useSeededDashboardDbQuery: () => ({
    data: [
      {
        id: "listing-1",
        title: "Moonlit Smile",
      },
      {
        id: "listing-2",
        title: "Solar Echo",
      },
    ],
    isReady: true,
  }),
}));

vi.mock("@/app/dashboard/_lib/dashboard-db/lists-collection", () => ({
  addListingToList: addListingToListMock,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

describe("AddListingsCombobox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    addListingToListMock.mockResolvedValue(undefined);
    globalThis.ResizeObserver = class ResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    };
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("filters listings by search text and adds the selected listing", async () => {
    const onMutationSuccess = vi.fn();

    render(
      <AddListingsCombobox
        listId="list-1"
        onMutationSuccess={onMutationSuccess}
      />,
    );

    fireEvent.click(screen.getByTestId("add-listings-trigger"));

    fireEvent.change(screen.getByTestId("add-listings-search-input"), {
      target: { value: "solar" },
    });

    expect(screen.queryByText("Moonlit Smile")).not.toBeInTheDocument();
    expect(screen.getByText("Solar Echo")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Solar Echo"));

    await waitFor(() => {
      expect(addListingToListMock).toHaveBeenCalledWith({
        listId: "list-1",
        listingId: "listing-2",
      });
    });
    expect(toastSuccessMock).toHaveBeenCalledWith("Listing added to list");
    expect(onMutationSuccess).toHaveBeenCalledTimes(1);
    expect(toastErrorMock).not.toHaveBeenCalled();
  });
});
